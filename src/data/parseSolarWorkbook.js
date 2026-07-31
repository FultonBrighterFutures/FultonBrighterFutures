import { resolveBuildingRecord } from './buildingRegistry.js'
import { calcCo2SavedLbs, DEFAULT_EMISSION_RATE_LB_PER_MWH } from './co2Emissions.js'

const YEAR_HEADER_RE = /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{4})\s*-\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{4})$/i
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const SKIP_BUILDING_NAMES = new Set(['total', 'grand total'])
const YEAR_SHEET_RE = /^(20\d{2})$/
const BUILDING_NAME_COL = 2

function isCurrencyLabel(value) {
  return /^\$[\d,]+(?:\.\d+)?$/.test(value)
}

function isLikelyBuildingName(value) {
  if (!value) return false
  if (YEAR_HEADER_RE.test(value)) return false
  if (isCurrencyLabel(value)) return false
  if (/^[\d,.$]+$/.test(value)) return false
  if (SKIP_BUILDING_NAMES.has(value.toLowerCase())) return false
  if (MONTH_NAMES.some((name) => name.toLowerCase() === value.toLowerCase())) return false
  return /[A-Za-z]/.test(value)
}

function cellValue(row, index) {
  const value = row?.[index]
  if (value == null) return ''
  return String(value).trim()
}

function parseKwh(value) {
  if (value == null) return 0
  const cleaned = String(value).replace(/[$,]/g, '').trim()
  if (!cleaned || Number.isNaN(Number(cleaned))) return 0
  return Number(cleaned)
}

function findYearHeader(rows) {
  for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    for (let colIndex = 0; colIndex < rows[rowIndex].length; colIndex++) {
      const match = cellValue(rows[rowIndex], colIndex).match(YEAR_HEADER_RE)
      if (!match) continue
      return { rowIndex, year: Number(match[2]) }
    }
  }
  return null
}

function findMonthHeaderRow(rows, startRowIndex) {
  for (let rowIndex = startRowIndex; rowIndex < Math.min(startRowIndex + 8, rows.length); rowIndex++) {
    const row = rows[rowIndex]
    const monthColumns = []

    for (let colIndex = 0; colIndex < row.length; colIndex++) {
      const label = cellValue(row, colIndex)
      const month = MONTH_NAMES.findIndex((name) => name.toLowerCase() === label.toLowerCase()) + 1
      if (month > 0) {
        monthColumns.push({ month, colIndex })
      }
    }

    if (monthColumns.length >= 6) {
      return { rowIndex, monthColumns }
    }
  }

  return null
}

function findBuildingNameColumn(row) {
  const preferred = cellValue(row, BUILDING_NAME_COL)
  if (isLikelyBuildingName(preferred)) {
    return BUILDING_NAME_COL
  }

  for (let colIndex = 0; colIndex < row.length; colIndex++) {
    const value = cellValue(row, colIndex)
    if (isLikelyBuildingName(value)) {
      return colIndex
    }
  }

  return BUILDING_NAME_COL
}

function parseYearSection(rows, startRowIndex = 0) {
  const sectionRows = rows.slice(startRowIndex)
  const header = findYearHeader(sectionRows)
  if (!header) return null

  const monthHeader = findMonthHeaderRow(sectionRows, header.rowIndex)
  if (!monthHeader) return null

  const monthly = []
  const buildingMap = new Map()

  for (let rowIndex = monthHeader.rowIndex + 1; rowIndex < sectionRows.length; rowIndex++) {
    const row = sectionRows[rowIndex]
    const nameCol = findBuildingNameColumn(row)
    const rawName = cellValue(row, nameCol)

    if (!rawName || !isLikelyBuildingName(rawName)) continue
    if (SKIP_BUILDING_NAMES.has(rawName.toLowerCase())) break

    const building = resolveBuildingRecord(rawName)
    if (!buildingMap.has(building.id)) {
      buildingMap.set(building.id, { ...building, slug: building.id })
    }

    for (const { month, colIndex } of monthHeader.monthColumns) {
      const kWh = parseKwh(row[colIndex])
      if (kWh <= 0) continue
      monthly.push({ buildingId: building.id, year: header.year, month, kWh })
    }
  }

  return {
    year: header.year,
    buildings: Array.from(buildingMap.values()),
    monthly,
    nextRowIndex: rows.length,
  }
}

/**
 * Parse one worksheet (array-of-arrays) from solar-data.xlsx.
 * Each sheet is expected to follow the Fulton County "one page per year" layout.
 *
 * @param {unknown[][]} rows
 * @param {string} [sheetName]
 */
export function parseSolarSheet(rows, sheetName = '') {
  const normalizedRows = rows.map((row) => (Array.isArray(row) ? row : []))

  let yearFromName = null
  const sheetYearMatch = sheetName.match(/(20\d{2})/)
  if (sheetYearMatch) {
    yearFromName = Number(sheetYearMatch[1])
  }

  const section = parseYearSection(normalizedRows, 0)
  if (!section) {
    if (yearFromName == null) return null
    return { year: yearFromName, buildings: [], monthly: [] }
  }

  if (yearFromName != null && section.year !== yearFromName) {
    section.year = yearFromName
    section.monthly = section.monthly.map((entry) => ({ ...entry, year: yearFromName }))
  }

  return section
}

/**
 * Merge parsed sheet sections into one normalized dataset.
 *
 * @param {Array<{ sheetName: string, rows: unknown[][] }>} sheets
 */
export function parseSolarWorkbookSheets(sheets) {
  const buildingMap = new Map()
  const monthly = []
  const years = new Set()

  for (const { sheetName, rows } of sheets) {
    if (!YEAR_SHEET_RE.test(sheetName)) continue

    const section = parseSolarSheet(rows, sheetName)
    if (!section) continue

    years.add(section.year)

    for (const building of section.buildings) {
      if (!buildingMap.has(building.id)) {
        buildingMap.set(building.id, building)
      }
    }

    monthly.push(...section.monthly)
  }

  const kwhByYear = {}
  for (const entry of monthly) {
    kwhByYear[entry.year] = (kwhByYear[entry.year] ?? 0) + entry.kWh
  }

  const roundedKwhByYear = Object.fromEntries(
    Object.entries(kwhByYear)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([year, value]) => [year, Math.round(value)]),
  )

  const totalKwhProduced = Math.round(
    monthly.reduce((sum, entry) => sum + entry.kWh, 0),
  )

  return {
    sourceFormat: 'fulton-monthly-trends',
    years: Array.from(years).sort((a, b) => a - b),
    buildings: Array.from(buildingMap.values()).sort((a, b) => a.name.localeCompare(b.name)),
    monthly,
    /** All-time total kWh across every building and year in the workbook. */
    totalKwhProduced,
    /** Rounded annual kWh totals keyed by year. */
    kwhByYear: roundedKwhByYear,
  }
}

/**
 * Aggregate monthly rows into per-building stats for a timeline year.
 *
 * @param {{ buildings: Array<{id:string,name:string}>, monthly: Array<{buildingId:string,year:number,month:number,kWh:number}> }} dataset
 * @param {number} year
 */
export function mapSolarEnergyYear(dataset, year) {
  const byBuilding = new Map(
    dataset.buildings.map((building) => [
      building.id,
      {
        id: building.id,
        name: building.displayName ?? building.name,
        annualKwh: 0,
        cumulativeKwh: 0,
        active: false,
      },
    ]),
  )

  for (const entry of dataset.monthly) {
    const record = byBuilding.get(entry.buildingId)
    if (!record) continue

    if (entry.year <= year) {
      record.cumulativeKwh += entry.kWh
    }

    if (entry.year === year) {
      record.annualKwh += entry.kWh
      if (entry.kWh > 0) {
        record.active = true
      }
    }
  }

  const buildings = Array.from(byBuilding.values())
  const totalAnnualKwh = buildings.reduce((sum, building) => sum + building.annualKwh, 0)
  const totalCumulativeKwh = buildings.reduce((sum, building) => sum + building.cumulativeKwh, 0)

  return {
    year,
    totalAnnualKwh,
    totalCumulativeKwh,
    generationTwh: totalAnnualKwh / 1_000_000_000,
    buildings,
  }
}

/**
 * CO₂ stats using solar-data.json kWh and the Savings workbook formula:
 * CO₂ saved (lbs) = (kWh / 1000) × emissionRateLbPerMWh ($AM$3)
 */
export function mapSolarCo2Year(dataset, year) {
  const emissionRateLbPerMWh =
    dataset.emissionRateLbPerMWh ?? DEFAULT_EMISSION_RATE_LB_PER_MWH
  const energy = mapSolarEnergyYear(dataset, year)

  const buildings = energy.buildings.map((building) => ({
    ...building,
    annualCo2Lbs: calcCo2SavedLbs(building.annualKwh, emissionRateLbPerMWh),
    cumulativeCo2Lbs: calcCo2SavedLbs(building.cumulativeKwh, emissionRateLbPerMWh),
  }))

  return {
    year,
    emissionRateLbPerMWh,
    totalAnnualCo2Lbs: calcCo2SavedLbs(energy.totalAnnualKwh, emissionRateLbPerMWh),
    totalCumulativeCo2Lbs: calcCo2SavedLbs(energy.totalCumulativeKwh, emissionRateLbPerMWh),
    buildings,
  }
}
