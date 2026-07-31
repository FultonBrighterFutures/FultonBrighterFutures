import { resolveBuildingRecord } from './buildingRegistry.js'

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const BUILDING_HEADER_RE = /\s*-\s*SOL\d/i
const YEAR_COL = 3

function parseDollars(value) {
  if (value == null || value === '') return 0
  const cleaned = String(value).replace(/[$,]/g, '').trim()
  if (!cleaned || Number.isNaN(Number(cleaned))) return 0
  return Number(cleaned)
}

function findMonthHeaderRow(rows, startRowIndex) {
  for (let rowIndex = startRowIndex; rowIndex < Math.min(startRowIndex + 12, rows.length); rowIndex++) {
    const row = rows[rowIndex]
    const monthCols = []

    for (let colIndex = 0; colIndex < row.length; colIndex++) {
      const label = String(row[colIndex] ?? '').trim()
      const month = MONTH_NAMES.findIndex((name) => name.toLowerCase() === label.toLowerCase()) + 1
      if (month > 0) {
        monthCols.push({ month, colIndex })
      }
    }

    if (monthCols.length >= 6) {
      return { rowIndex, monthCols }
    }
  }

  return null
}

function parseYearValue(row) {
  const fromYearCol = Number(row[YEAR_COL])
  if (Number.isFinite(fromYearCol) && fromYearCol >= 2000 && fromYearCol <= 2100) {
    return fromYearCol
  }

  for (let colIndex = 0; colIndex <= YEAR_COL; colIndex++) {
    const value = Number(row[colIndex])
    if (Number.isFinite(value) && value >= 2000 && value <= 2100) {
      return value
    }
  }

  return null
}

/**
 * Parse solar-cost.xlsx Sheet1 — monthly Solar PV cost ($) per building per year.
 *
 * @param {unknown[][]} rows
 */
export function parseSolarCostSheet(rows) {
  const normalizedRows = rows.map((row) => (Array.isArray(row) ? row : []))
  const monthlyCost = []
  const buildingMap = new Map()
  const years = new Set()

  for (let rowIndex = 0; rowIndex < normalizedRows.length; rowIndex++) {
    const headerCell = String(normalizedRows[rowIndex][0] ?? '')
    if (!BUILDING_HEADER_RE.test(headerCell)) continue

    const building = resolveBuildingRecord(headerCell)
    if (!buildingMap.has(building.id)) {
      buildingMap.set(building.id, building)
    }

    const monthHeader = findMonthHeaderRow(normalizedRows, rowIndex + 1)
    if (!monthHeader) continue

    for (let dataRowIndex = monthHeader.rowIndex + 1; dataRowIndex < normalizedRows.length; dataRowIndex++) {
      const row = normalizedRows[dataRowIndex]
      const nextHeader = String(row[0] ?? '')
      if (BUILDING_HEADER_RE.test(nextHeader)) break

      const year = parseYearValue(row)
      if (!year) continue

      years.add(year)

      for (const { month, colIndex } of monthHeader.monthCols) {
        const dollars = parseDollars(row[colIndex])
        if (dollars <= 0) continue
        monthlyCost.push({
          buildingId: building.id,
          year,
          month,
          dollars,
        })
      }
    }
  }

  return {
    buildings: Array.from(buildingMap.values()).sort((a, b) => a.name.localeCompare(b.name)),
    monthlyCost,
    costYears: Array.from(years).sort((a, b) => a - b),
  }
}

/**
 * Aggregate monthly cost rows into per-building stats for a timeline year.
 *
 * @param {{ buildings: Array<{id:string,name:string}>, monthlyCost: Array<{buildingId:string,year:number,month:number,dollars:number}> }} dataset
 * @param {number} year
 */
export function mapSolarSavingYear(dataset, year) {
  const buildings = (dataset.buildings ?? []).map((building) => ({
    id: building.id,
    name: building.displayName ?? building.name,
    annualSavings: 0,
    cumulativeSavings: 0,
    active: false,
  }))

  const byBuilding = new Map(buildings.map((building) => [building.id, building]))

  for (const entry of dataset.monthlyCost ?? []) {
    const record = byBuilding.get(entry.buildingId)
    if (!record) continue

    if (entry.year <= year) {
      record.cumulativeSavings += entry.dollars
    }

    if (entry.year === year) {
      record.annualSavings += entry.dollars
      if (entry.dollars !== 0) {
        record.active = true
      }
    }
  }

  const buildingList = Array.from(byBuilding.values())
  const totalAnnualSavings = buildingList.reduce((sum, building) => sum + building.annualSavings, 0)
  const totalCumulativeSavings = buildingList.reduce((sum, building) => sum + building.cumulativeSavings, 0)

  return {
    year,
    totalAnnualSavings,
    totalCumulativeSavings,
    savingsIndex: totalAnnualSavings,
    buildings: buildingList,
  }
}
