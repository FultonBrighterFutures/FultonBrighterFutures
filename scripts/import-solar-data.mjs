import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import XLSX from 'xlsx'
import {
  DEFAULT_EMISSION_RATE_LB_PER_MWH,
  readEmissionRateCell,
  summarizeCo2Totals,
} from '../src/data/co2Emissions.js'
import {
  BUILDING_NAMES,
  getBuildingDisplayName,
  getBuildingName,
  isKnownBuildingId,
  setBuildingDisplayNameOverrides,
} from '../src/data/buildingRegistry.js'
import { parseSolarCostSheet } from '../src/data/parseSolarCostWorkbook.js'
import { calcSolarSavingsTotals } from '../src/data/parseSolarSavingsWorkbook.js'
import { parseSolarWorkbookSheets } from '../src/data/parseSolarWorkbook.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const dataDir = join(root, 'public/data')
const defaultSourcesDir = join(dataDir, 'sources')
const defaultRuntimeDir = join(dataDir, 'runtime')
const SAVINGS_ENERGY_AUTHORITY_IDS = new Set(['maxwell-rd-driver-services'])

function mergeBuildingCatalog(energyBuildings, costBuildings) {
  const buildingMap = new Map()

  for (const building of [...energyBuildings, ...costBuildings]) {
    if (!buildingMap.has(building.id)) {
      buildingMap.set(building.id, {
        id: building.id,
        name: getBuildingName(building.id),
        displayName: getBuildingDisplayName(building.id),
        rawName: building.rawName ?? building.name,
      })
      continue
    }

    const existing = buildingMap.get(building.id)
    if (!existing.rawName && building.rawName) {
      existing.rawName = building.rawName
    }
  }

  return Array.from(buildingMap.values()).sort((a, b) => a.name.localeCompare(b.name))
}

function energyEntryKey(entry) {
  return `${entry.buildingId}:${entry.year}:${entry.month}`
}

function complementEnergyMonthly(primaryRows, supplementalRows) {
  const byKey = new Map()
  let replacedPrimaryRows = 0

  for (const entry of primaryRows) {
    if (SAVINGS_ENERGY_AUTHORITY_IDS.has(entry.buildingId)) {
      replacedPrimaryRows += 1
      continue
    }

    const key = energyEntryKey(entry)
    if (byKey.has(key)) {
      throw new Error(`[import-data] Duplicate primary energy observation: ${key}`)
    }
    byKey.set(key, entry)
  }

  let complemented = 0
  let authoritativeRows = 0
  const conflicts = []

  for (const entry of supplementalRows) {
    if (!(entry.kWh > 0)) continue

    const key = energyEntryKey(entry)
    if (SAVINGS_ENERGY_AUTHORITY_IDS.has(entry.buildingId)) {
      if (byKey.has(key)) {
        throw new Error(`[import-data] Duplicate authoritative energy observation: ${key}`)
      }
      byKey.set(key, entry)
      authoritativeRows += 1
      continue
    }

    const existing = byKey.get(key)
    if (!existing) {
      byKey.set(key, entry)
      complemented += 1
      continue
    }

    const difference = Math.abs(existing.kWh - entry.kWh)
    const relativeDifference = difference / Math.max(existing.kWh, entry.kWh)
    if (difference > 1 && relativeDifference > 0.02) {
      conflicts.push({
        key,
        primaryKwh: existing.kWh,
        supplementalKwh: entry.kWh,
      })
    }
  }

  const monthly = [...byKey.values()].sort(
    (a, b) =>
      a.year - b.year ||
      a.month - b.month ||
      a.buildingId.localeCompare(b.buildingId),
  )

  return {
    monthly,
    complemented,
    authoritativeRows,
    replacedPrimaryRows,
    conflicts,
  }
}

function withEnergySummary(energyData, monthly) {
  const kwhByYear = {}
  for (const entry of monthly) {
    kwhByYear[entry.year] = (kwhByYear[entry.year] ?? 0) + entry.kWh
  }

  return {
    ...energyData,
    years: [...new Set(monthly.map((entry) => entry.year))].sort((a, b) => a - b),
    monthly,
    totalKwhProduced: Math.round(
      monthly.reduce((sum, entry) => sum + entry.kWh, 0),
    ),
    kwhByYear: Object.fromEntries(
      Object.entries(kwhByYear)
        .sort(([a], [b]) => Number(a) - Number(b))
        .map(([year, value]) => [year, Math.round(value)]),
    ),
  }
}

function validateRenderableBuildings(dataset, positionsPath, { strict = true } = {}) {
  const positionsPayload = JSON.parse(readFileSync(positionsPath, 'utf8'))
  const positionedIds = new Set(
    (positionsPayload.buildings ?? []).map((building) => building.id),
  )
  const catalogIds = new Set(dataset.buildings.map((building) => building.id))

  const unpositionedIds = [...catalogIds].filter((id) => !positionedIds.has(id))
  const unknownPositionIds = [...positionedIds].filter((id) => !catalogIds.has(id))
  const unknownMetricIds = [...dataset.monthly, ...dataset.monthlyCost]
    .map((entry) => entry.buildingId)
    .filter((id) => !catalogIds.has(id))

  if (strict && unpositionedIds.length) {
    throw new Error(
      `[import-data] Buildings without render positions: ${unpositionedIds.join(', ')}`,
    )
  }
  if (strict && unknownPositionIds.length) {
    throw new Error(
      `[import-data] Render positions without catalog buildings: ${unknownPositionIds.join(', ')}`,
    )
  }
  if (unknownMetricIds.length) {
    throw new Error(
      `[import-data] Metric rows with unknown buildings: ${[...new Set(unknownMetricIds)].join(', ')}`,
    )
  }

  return { unpositionedIds, unknownPositionIds }
}

/** Parse trailing date from names like "Solar Monthly Savings 2026-7-24.xlsx". */
function parseSavingsFileDate(name) {
  const match = name.match(/(\d{4})-(\d{1,2})-(\d{1,2})\.xlsx$/i)
  if (!match) return 0
  return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
}

/** Prefer the newest dated Solar Monthly Savings workbook in the sources dir. */
function findSavingsWorkbookName(sourcesDir) {
  const matches = readdirSync(sourcesDir).filter(
    (name) =>
      /^Solar Monthly Savings.*\.xlsx$/i.test(name) && !name.startsWith('~$'),
  )
  if (!matches.length) return null

  matches.sort((a, b) => parseSavingsFileDate(b) - parseSavingsFileDate(a))
  return matches[0]
}

function sheetRows(workbook, sheetName) {
  const sheet = workbook.Sheets[sheetName]
  if (!sheet) return null
  return XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })
}

function loadSavingsWorkbook(sourcesDir) {
  const savingsWorkbookName = findSavingsWorkbookName(sourcesDir)
  if (!savingsWorkbookName) return null

  const workbook = XLSX.read(readFileSync(join(sourcesDir, savingsWorkbookName)), {
    type: 'buffer',
  })
  return { name: savingsWorkbookName, workbook }
}

function findEmissionRateLbPerMWh(savingsWorkbook, log = console.log) {
  if (savingsWorkbook) {
    const sheet =
      savingsWorkbook.Sheets.kWh ?? savingsWorkbook.Sheets[savingsWorkbook.SheetNames[0]]
    const rate = readEmissionRateCell(sheet)
    if (rate) {
      log(`Emission rate ($AM$3) from savings workbook: ${rate} lb/MWh`)
      return rate
    }
  }

  log(`Emission rate ($AM$3): using default ${DEFAULT_EMISSION_RATE_LB_PER_MWH} lb/MWh`)
  return DEFAULT_EMISSION_RATE_LB_PER_MWH
}

function computeSavingsTotals(savingsPack, energyMonthly, log = console.warn) {
  if (!savingsPack) {
    log('[import-data] Solar Monthly Savings workbook not found — totalSavings omitted.')
    return {
      buildings: [],
      monthlyCost: [],
      costYears: [],
      totalSavings: 0,
      savingsByYear: {},
      savingsFormula: null,
      savingsRates: null,
      savingsWorkbookName: null,
    }
  }

  const kWh = sheetRows(savingsPack.workbook, 'kWh')
  const elecRates = sheetRows(savingsPack.workbook, 'Elec Rates')
  const csRates = sheetRows(savingsPack.workbook, 'CS Rates')

  if (!kWh || !elecRates || !csRates) {
    log('[import-data] Savings workbook missing kWh / Elec Rates / CS Rates sheets.')
    return {
      buildings: [],
      monthlyCost: [],
      costYears: [],
      totalSavings: 0,
      savingsByYear: {},
      savingsFormula: null,
      savingsRates: null,
      savingsWorkbookName: savingsPack.name,
    }
  }

  const totals = calcSolarSavingsTotals(
    { kWh, elecRates, csRates },
    (serial) => XLSX.SSF.parse_date_code(serial),
    energyMonthly,
  )

  return { ...totals, savingsWorkbookName: savingsPack.name }
}

function loadDisplayNameOverrides(sourcesDir) {
  const path = join(sourcesDir, 'building-display-names.json')
  if (!existsSync(path)) return {}
  return JSON.parse(readFileSync(path, 'utf8'))
}

function loadSavingsRateOverrides(sourcesDir) {
  const path = join(sourcesDir, 'savings-rate-overrides.json')
  if (!existsSync(path)) return null
  try {
    const raw = JSON.parse(readFileSync(path, 'utf8'))
    const elecRate = Number(raw.elecRate)
    const csRate = Number(raw.csRate)
    if (!Number.isFinite(elecRate) || !Number.isFinite(csRate)) return null
    return {
      elecRate,
      csRate,
      savingsPerKwh: elecRate - csRate,
      year: raw.year ?? null,
      month: raw.month ?? null,
      source: 'savings-rate-overrides.json',
    }
  } catch {
    return null
  }
}

function applySavingsRateOverrides(savingsRates, override, log) {
  if (!override) return savingsRates
  const next = {
    ...(savingsRates ?? {}),
    elecRate: override.elecRate,
    csRate: override.csRate,
    savingsPerKwh: override.savingsPerKwh,
    overrideSource: override.source,
  }
  if (override.year != null) next.year = override.year
  if (override.month != null) next.month = override.month
  log(
    `Applied key rate overrides: Elec $${override.elecRate.toFixed(4)}/kWh, CS $${override.csRate.toFixed(4)}/kWh`,
  )
  return next
}

function collectUnknownBuildings(buildings) {
  return buildings
    .filter((building) => !isKnownBuildingId(building.id))
    .map((building) => ({
      id: building.id,
      rawName: building.rawName ?? building.name,
      displayName: building.displayName,
    }))
}

/**
 * Import Excel sources into runtime/solar-data.json.
 *
 * @param {{
 *   sourcesDir?: string,
 *   runtimeDir?: string,
 *   write?: boolean,
 *   validatePositions?: boolean | 'report',
 *   log?: (...args: unknown[]) => void,
 *   warn?: (...args: unknown[]) => void,
 * }} [options]
 */
export function runImport(options = {}) {
  const sourcesDir = options.sourcesDir ?? defaultSourcesDir
  const runtimeDir = options.runtimeDir ?? defaultRuntimeDir
  const write = options.write !== false
  const validatePositionsOption = options.validatePositions ?? true
  const shouldValidatePositions = validatePositionsOption !== false
  const log = options.log ?? console.log
  const warn = options.warn ?? console.warn

  const energyInputPath = join(sourcesDir, 'solar-data.xlsx')
  const costInputPath = join(sourcesDir, 'solar-cost.xlsx')
  const positionsPath = join(runtimeDir, 'building-positions.json')
  const outputPath = join(runtimeDir, 'solar-data.json')

  setBuildingDisplayNameOverrides(loadDisplayNameOverrides(sourcesDir))

  const logs = []
  const captureLog = (...args) => {
    const line = args.map(String).join(' ')
    logs.push(line)
    log(...args)
  }
  const captureWarn = (...args) => {
    const line = args.map(String).join(' ')
    logs.push(line)
    warn(...args)
  }

  if (!existsSync(energyInputPath)) {
    throw new Error(`[import-data] Missing required file: ${energyInputPath}`)
  }

  const energyWorkbook = XLSX.read(readFileSync(energyInputPath), { type: 'buffer' })
  const energySheets = energyWorkbook.SheetNames.map((sheetName) => ({
    sheetName,
    rows: XLSX.utils.sheet_to_json(energyWorkbook.Sheets[sheetName], {
      header: 1,
      defval: '',
    }),
  }))

  let energyData = parseSolarWorkbookSheets(energySheets)

  let costData = { buildings: [], monthlyCost: [], costYears: [] }
  try {
    const costWorkbook = XLSX.read(readFileSync(costInputPath), { type: 'buffer' })
    const costSheetName =
      costWorkbook.SheetNames.find((name) => name !== 'Report Overview') ??
      costWorkbook.SheetNames[0]
    const costRows = XLSX.utils.sheet_to_json(costWorkbook.Sheets[costSheetName], {
      header: 1,
      defval: '',
    })
    costData = parseSolarCostSheet(costRows)
  } catch (error) {
    captureWarn(
      '[import-data] Could not read solar-cost.xlsx — savings data will be empty.',
      error.message,
    )
  }

  const savingsPack = loadSavingsWorkbook(sourcesDir)
  const savingsTotals = computeSavingsTotals(savingsPack, energyData.monthly, captureWarn)
  const energyMerge = complementEnergyMonthly(
    energyData.monthly,
    savingsTotals.monthlyKwh ?? [],
  )
  energyData = withEnergySummary(energyData, energyMerge.monthly)
  const emissionRateLbPerMWh = findEmissionRateLbPerMWh(savingsPack?.workbook, captureLog)
  const co2Totals = summarizeCo2Totals(energyData.kwhByYear, emissionRateLbPerMWh)

  const rateBasedSavings = savingsTotals.monthlyCost?.length > 0
  const savingsBuildings = savingsTotals.buildings ?? []
  const monthlyCost = rateBasedSavings ? savingsTotals.monthlyCost : costData.monthlyCost
  const costYears = rateBasedSavings ? savingsTotals.costYears : costData.costYears
  const rateOverrides = loadSavingsRateOverrides(sourcesDir)
  const savingsRates = applySavingsRateOverrides(
    savingsTotals.savingsRates ?? null,
    rateOverrides,
    captureLog,
  )

  const dataset = {
    ...energyData,
    buildings: mergeBuildingCatalog(
      energyData.buildings,
      rateBasedSavings ? savingsBuildings : costData.buildings,
    ),
    monthlyCost,
    costYears,
    totalSavings: savingsTotals.totalSavings,
    savingsByYear: savingsTotals.savingsByYear,
    savingsFormula: savingsTotals.savingsFormula,
    savingsRates,
    totalCo2SavedLbs: co2Totals.totalCo2SavedLbs,
    co2ByYear: co2Totals.co2ByYear,
    emissionRateLbPerMWh,
    emissionRateSource: 'Excel $AM$3 — eGRID SRSO CO₂ rate (lb/MWh)',
    energyMerge: {
      strategy:
        'solar-data.xlsx values take precedence; missing months use savings workbook kWh; designated buildings use the savings workbook as authoritative',
      authoritativeBuildingIds: [...SAVINGS_ENERGY_AUTHORITY_IDS],
      authoritativeRows: energyMerge.authoritativeRows,
      replacedPrimaryRows: energyMerge.replacedPrimaryRows,
      complementedRows: energyMerge.complemented,
      conflictingRows: energyMerge.conflicts.length,
    },
    sourceFiles: {
      energy: 'solar-data.xlsx',
      cost: rateBasedSavings
        ? (savingsTotals.savingsWorkbookName ?? 'Solar Monthly Savings *.xlsx')
        : 'solar-cost.xlsx',
      emissionRate: savingsTotals.savingsWorkbookName ?? 'Solar Monthly Savings *.xlsx',
      savings: savingsTotals.savingsWorkbookName ?? 'Solar Monthly Savings *.xlsx',
      rateOverrides: rateOverrides ? 'savings-rate-overrides.json' : null,
    },
    importedAt: new Date().toISOString(),
    sheetNames: energyWorkbook.SheetNames,
  }

  const unknownBuildings = collectUnknownBuildings(dataset.buildings)

  let positionCheck = { unpositionedIds: [], unknownPositionIds: [] }
  if (shouldValidatePositions) {
    const strict = validatePositionsOption !== 'report'
    positionCheck = validateRenderableBuildings(dataset, positionsPath, { strict })
    if (!strict && positionCheck.unpositionedIds.length) {
      captureWarn(
        `[import-data] Buildings without render positions (reported only): ${positionCheck.unpositionedIds.join(', ')}`,
      )
    }
  }

  if (write) {
    writeFileSync(outputPath, `${JSON.stringify(dataset, null, 2)}\n`, 'utf8')
  }

  captureLog(
    `Imported ${dataset.monthly.length} energy rows across ${dataset.years.length} year(s): ${dataset.years.join(', ')}`,
  )
  captureLog(
    `Imported ${dataset.monthlyCost.length} cost rows across ${dataset.costYears.length} year(s): ${dataset.costYears.join(', ')}`,
  )
  captureLog(`Buildings: ${dataset.buildings.length}`)
  captureLog(`Complemented energy rows: ${energyMerge.complemented}`)
  captureLog(
    `Authoritative savings-workbook energy rows: ${energyMerge.authoritativeRows} (replaced ${energyMerge.replacedPrimaryRows} primary rows)`,
  )
  if (energyMerge.conflicts.length) {
    captureWarn(
      `[import-data] ${energyMerge.conflicts.length} overlapping energy rows differ by more than 2%; solar-data.xlsx values were kept.`,
    )
  }
  captureLog(`Total kWh produced: ${Math.round(dataset.totalKwhProduced).toLocaleString()}`)
  captureLog(
    `kWh by year: ${Object.entries(dataset.kwhByYear)
      .map(([year, value]) => `${year}=${Number(value).toLocaleString()}`)
      .join(', ')}`,
  )
  captureLog(`Total CO₂ saved: ${Math.round(dataset.totalCo2SavedLbs).toLocaleString()} lbs`)
  captureLog(
    `CO₂ by year: ${Object.entries(dataset.co2ByYear)
      .map(([year, value]) => `${year}=${Number(value).toLocaleString()} lbs`)
      .join(', ')}`,
  )
  captureLog(`Total savings: $${Math.round(dataset.totalSavings).toLocaleString()}`)
  if (dataset.savingsRates) {
    const { elecRate, csRate, savingsPerKwh, year, month } = dataset.savingsRates
    captureLog(
      `Latest rates (${year}-${month}): Elec $${elecRate.toFixed(4)}/kWh, CS $${csRate.toFixed(4)}/kWh, savings $${savingsPerKwh.toFixed(4)}/kWh`,
    )
  }
  if (dataset.savingsByYear && Object.keys(dataset.savingsByYear).length) {
    captureLog(
      `Savings by year: ${Object.entries(dataset.savingsByYear)
        .map(([year, value]) => `${year}=$${Number(value).toLocaleString()}`)
        .join(', ')}`,
    )
  }
  if (write) {
    captureLog(`Wrote ${outputPath}`)
  }

  return {
    dataset,
    outputPath,
    energyMerge,
    unknownBuildings,
    knownBuildingCount: Object.keys(BUILDING_NAMES).length,
    positionCheck,
    logs,
  }
}

const isCli =
  Boolean(process.argv[1]) &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href

if (isCli) {
  runImport()
}
