import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import XLSX from 'xlsx'
import {
  DEFAULT_EMISSION_RATE_LB_PER_MWH,
  readEmissionRateCell,
  summarizeCo2Totals,
} from '../src/data/co2Emissions.js'
import { getBuildingDisplayName } from '../src/data/buildingRegistry.js'
import { parseSolarCostSheet } from '../src/data/parseSolarCostWorkbook.js'
import { calcSolarSavingsTotals } from '../src/data/parseSolarSavingsWorkbook.js'
import { parseSolarWorkbookSheets } from '../src/data/parseSolarWorkbook.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const dataDir = join(root, 'public/data')
const energyInputPath = join(dataDir, 'solar-data.xlsx')
const costInputPath = join(dataDir, 'solar-cost.xlsx')
const outputPath = join(dataDir, 'solar-data.json')

function mergeBuildingCatalog(energyBuildings, costBuildings) {
  const buildingMap = new Map()

  for (const building of [...energyBuildings, ...costBuildings]) {
    if (!buildingMap.has(building.id)) {
      buildingMap.set(building.id, {
        id: building.id,
        name: getBuildingDisplayName(building.id),
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

/** Parse trailing date from names like "Solar Monthly Savings 2026-7-24.xlsx". */
function parseSavingsFileDate(name) {
  const match = name.match(/(\d{4})-(\d{1,2})-(\d{1,2})\.xlsx$/i)
  if (!match) return 0
  return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
}

/** Prefer the newest dated Solar Monthly Savings workbook in public/data/. */
function findSavingsWorkbookName() {
  const matches = readdirSync(dataDir).filter(
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

function loadSavingsWorkbook() {
  const savingsWorkbookName = findSavingsWorkbookName()
  if (!savingsWorkbookName) return null

  const workbook = XLSX.read(readFileSync(join(dataDir, savingsWorkbookName)), {
    type: 'buffer',
  })
  return { name: savingsWorkbookName, workbook }
}

function findEmissionRateLbPerMWh(savingsWorkbook) {
  if (savingsWorkbook) {
    const sheet =
      savingsWorkbook.Sheets.kWh ?? savingsWorkbook.Sheets[savingsWorkbook.SheetNames[0]]
    const rate = readEmissionRateCell(sheet)
    if (rate) {
      console.log(`Emission rate ($AM$3) from savings workbook: ${rate} lb/MWh`)
      return rate
    }
  }

  console.log(`Emission rate ($AM$3): using default ${DEFAULT_EMISSION_RATE_LB_PER_MWH} lb/MWh`)
  return DEFAULT_EMISSION_RATE_LB_PER_MWH
}

function computeSavingsTotals(savingsPack, energyMonthly) {
  if (!savingsPack) {
    console.warn('[import-data] Solar Monthly Savings workbook not found — totalSavings omitted.')
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
    console.warn('[import-data] Savings workbook missing kWh / Elec Rates / CS Rates sheets.')
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

const energyWorkbook = XLSX.read(readFileSync(energyInputPath), { type: 'buffer' })
const energySheets = energyWorkbook.SheetNames.map((sheetName) => ({
  sheetName,
  rows: XLSX.utils.sheet_to_json(energyWorkbook.Sheets[sheetName], {
    header: 1,
    defval: '',
  }),
}))

const energyData = parseSolarWorkbookSheets(energySheets)

let costData = { buildings: [], monthlyCost: [], costYears: [] }
try {
  const costWorkbook = XLSX.read(readFileSync(costInputPath), { type: 'buffer' })
  const costSheetName = costWorkbook.SheetNames.find((name) => name !== 'Report Overview') ?? costWorkbook.SheetNames[0]
  const costRows = XLSX.utils.sheet_to_json(costWorkbook.Sheets[costSheetName], {
    header: 1,
    defval: '',
  })
  costData = parseSolarCostSheet(costRows)
} catch (error) {
  console.warn('[import-data] Could not read solar-cost.xlsx — savings data will be empty.', error.message)
}

const savingsPack = loadSavingsWorkbook()
const savingsTotals = computeSavingsTotals(savingsPack, energyData.monthly)
const emissionRateLbPerMWh = findEmissionRateLbPerMWh(savingsPack?.workbook)
const co2Totals = summarizeCo2Totals(energyData.kwhByYear, emissionRateLbPerMWh)

// Prefer rate-based monthly savings (kWh × (Elec − CS)) when the Savings
// workbook is available; fall back to solar-cost.xlsx dollar rows otherwise.
const rateBasedSavings = savingsTotals.monthlyCost?.length > 0
const savingsBuildings = savingsTotals.buildings ?? []
const monthlyCost = rateBasedSavings ? savingsTotals.monthlyCost : costData.monthlyCost
const costYears = rateBasedSavings ? savingsTotals.costYears : costData.costYears

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
  savingsRates: savingsTotals.savingsRates ?? null,
  totalCo2SavedLbs: co2Totals.totalCo2SavedLbs,
  co2ByYear: co2Totals.co2ByYear,
  emissionRateLbPerMWh,
  emissionRateSource: 'Excel $AM$3 — eGRID SRSO CO₂ rate (lb/MWh)',
  sourceFiles: {
    energy: 'solar-data.xlsx',
    cost: rateBasedSavings
      ? (savingsTotals.savingsWorkbookName ?? 'Solar Monthly Savings *.xlsx')
      : 'solar-cost.xlsx',
    emissionRate: savingsTotals.savingsWorkbookName ?? 'Solar Monthly Savings *.xlsx',
    savings: savingsTotals.savingsWorkbookName ?? 'Solar Monthly Savings *.xlsx',
  },
  importedAt: new Date().toISOString(),
  sheetNames: energyWorkbook.SheetNames,
}

writeFileSync(outputPath, `${JSON.stringify(dataset, null, 2)}\n`, 'utf8')

console.log(`Imported ${dataset.monthly.length} energy rows across ${dataset.years.length} year(s): ${dataset.years.join(', ')}`)
console.log(`Imported ${dataset.monthlyCost.length} cost rows across ${dataset.costYears.length} year(s): ${dataset.costYears.join(', ')}`)
console.log(`Buildings: ${dataset.buildings.length}`)
console.log(`Total kWh produced: ${Math.round(dataset.totalKwhProduced).toLocaleString()}`)
console.log(
  `kWh by year: ${Object.entries(dataset.kwhByYear)
    .map(([year, value]) => `${year}=${Number(value).toLocaleString()}`)
    .join(', ')}`,
)
console.log(`Total CO₂ saved: ${Math.round(dataset.totalCo2SavedLbs).toLocaleString()} lbs`)
console.log(
  `CO₂ by year: ${Object.entries(dataset.co2ByYear)
    .map(([year, value]) => `${year}=${Number(value).toLocaleString()} lbs`)
    .join(', ')}`,
)
console.log(`Total savings: $${Math.round(dataset.totalSavings).toLocaleString()}`)
if (dataset.savingsRates) {
  const { elecRate, csRate, savingsPerKwh, year, month } = dataset.savingsRates
  console.log(
    `Latest rates (${year}-${month}): Elec $${elecRate.toFixed(4)}/kWh, CS $${csRate.toFixed(4)}/kWh, savings $${savingsPerKwh.toFixed(4)}/kWh`,
  )
}
if (dataset.savingsByYear && Object.keys(dataset.savingsByYear).length) {
  console.log(
    `Savings by year: ${Object.entries(dataset.savingsByYear)
      .map(([year, value]) => `${year}=$${Number(value).toLocaleString()}`)
      .join(', ')}`,
  )
}
console.log(`Wrote ${outputPath}`)
