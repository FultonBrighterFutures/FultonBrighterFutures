import { resolveBuildingRecord } from './buildingRegistry.js'

/**
 * Cost savings from the Solar Monthly Savings workbook:
 *
 *   savings ($) = kWh × (Elec Rate − CS Rate)
 *
 * Sheets are column-aligned (same building in column B/C/… on each tab).
 * “CS Rates” is Cherry Street (community solar) contract rate.
 * Each month uses that month’s rates when present; otherwise the most recent
 * prior rate for the same building. Energy-workbook monthly rows fill any
 * months missing from the savings kWh sheet (same rate fallback).
 */

function excelYearMonth(serial, parseDateCode) {
  const parsed = parseDateCode(serial)
  if (!parsed) return null
  return { year: parsed.y, month: parsed.m }
}

function toNumber(value) {
  if (value === '' || value == null) return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

function isMetaHeader(value) {
  const label = String(value ?? '').toLowerCase()
  return (
    !label ||
    label.includes('average') ||
    label.includes('grand total') ||
    label.includes('total kwh') ||
    label.includes('co2') ||
    label.includes('egrid') ||
    label.includes('contract')
  )
}

function lastBuildingColumn(headerRow) {
  let last = 0
  for (let col = 1; col < headerRow.length; col++) {
    if (isMetaHeader(headerRow[col])) break
    last = col
  }
  return last
}

function indexRowsByYearMonth(rows, parseDateCode) {
  const index = new Map()
  for (let rowIndex = 2; rowIndex < rows.length; rowIndex++) {
    const serial = rows[rowIndex][0]
    if (typeof serial !== 'number') continue
    const ymd = excelYearMonth(serial, parseDateCode)
    if (!ymd) continue
    index.set(`${ymd.year}-${ymd.month}`, rowIndex)
  }
  return index
}

/** Sorted "YYYY-M" keys from a year-month row index. */
function sortedRateKeys(rateIndex) {
  return [...rateIndex.keys()].sort((a, b) => {
    const [ay, am] = a.split('-').map(Number)
    const [by, bm] = b.split('-').map(Number)
    return ay - by || am - bm
  })
}

/**
 * Prefer the exact month’s rate row; otherwise the most recent prior month.
 * @param {Map<string, number>} rateIndex
 * @param {string[]} keysSorted
 * @param {number} year
 * @param {number} month
 */
function resolveRateRow(rateIndex, keysSorted, year, month) {
  const exact = rateIndex.get(`${year}-${month}`)
  if (exact != null) return exact

  let fallback = null
  for (const key of keysSorted) {
    const [y, m] = key.split('-').map(Number)
    if (y > year || (y === year && m > month)) break
    fallback = rateIndex.get(key)
  }
  return fallback
}

/**
 * @param {object} workbookSheets
 * @param {unknown[][]} workbookSheets.kWh
 * @param {unknown[][]} workbookSheets.elecRates
 * @param {unknown[][]} workbookSheets.csRates
 * @param {(serial: number) => { y: number, m: number, d: number } | null} parseDateCode
 * @param {Array<{ buildingId: string, year: number, month: number, kWh: number }>} [energyMonthly]
 */
export function calcSolarSavingsTotals(
  { kWh, elecRates, csRates },
  parseDateCode,
  energyMonthly = [],
) {
  const sharedLast = Math.min(
    lastBuildingColumn(kWh[1] ?? []),
    lastBuildingColumn(elecRates[1] ?? []),
    lastBuildingColumn(csRates[1] ?? []),
  )

  const kWhIndex = indexRowsByYearMonth(kWh, parseDateCode)
  const elecIndex = indexRowsByYearMonth(elecRates, parseDateCode)
  const csIndex = indexRowsByYearMonth(csRates, parseDateCode)
  const elecKeys = sortedRateKeys(elecIndex)
  const csKeys = sortedRateKeys(csIndex)

  const colByBuildingId = new Map()
  const buildingMap = new Map()
  for (let col = 1; col <= sharedLast; col++) {
    const record = resolveBuildingRecord(String(kWh[1][col] ?? ''))
    colByBuildingId.set(record.id, col)
    if (!buildingMap.has(record.id)) {
      buildingMap.set(record.id, record)
    }
  }

  const savingsByYear = {}
  const monthlyCost = []
  const coveredMonths = new Set()

  const yearsInWorkbook = new Set()
  for (const key of kWhIndex.keys()) {
    yearsInWorkbook.add(Number(key.split('-')[0]))
  }

  for (const year of [...yearsInWorkbook].sort((a, b) => a - b)) {
    let total = 0
    for (let month = 1; month <= 12; month++) {
      const key = `${year}-${month}`
      const kWhRow = kWhIndex.get(key)
      if (kWhRow == null) continue

      coveredMonths.add(key)
      const elecRow = resolveRateRow(elecIndex, elecKeys, year, month)
      const csRow = resolveRateRow(csIndex, csKeys, year, month)

      for (let col = 1; col <= sharedLast; col++) {
        const kwh = toNumber(kWh[kWhRow][col])
        if (kwh == null || kwh <= 0) continue

        const elec = elecRow != null ? toNumber(elecRates[elecRow][col]) : null
        const cs = csRow != null ? toNumber(csRates[csRow][col]) : null
        if (elec == null || cs == null) continue

        const dollars = kwh * (elec - cs)
        total += dollars

        const building = resolveBuildingRecord(String(kWh[1][col] ?? ''))
        monthlyCost.push({
          buildingId: building.id,
          year,
          month,
          dollars,
        })
      }
    }

    savingsByYear[year] = total
  }

  // Fill months present in solar-data.xlsx energy but missing from savings kWh.
  if (energyMonthly.length && sharedLast > 0) {
    for (const entry of energyMonthly) {
      if (!(entry.kWh > 0)) continue
      const key = `${entry.year}-${entry.month}`
      if (coveredMonths.has(key)) continue

      const col = colByBuildingId.get(entry.buildingId)
      if (col == null) continue

      const elecRow = resolveRateRow(elecIndex, elecKeys, entry.year, entry.month)
      const csRow = resolveRateRow(csIndex, csKeys, entry.year, entry.month)
      const elec = elecRow != null ? toNumber(elecRates[elecRow][col]) : null
      const cs = csRow != null ? toNumber(csRates[csRow][col]) : null
      if (elec == null || cs == null) continue

      const dollars = entry.kWh * (elec - cs)
      savingsByYear[entry.year] = (savingsByYear[entry.year] ?? 0) + dollars
      monthlyCost.push({
        buildingId: entry.buildingId,
        year: entry.year,
        month: entry.month,
        dollars,
      })
      coveredMonths.add(key)
    }
  }

  const totalSavings = Math.round(
    Object.values(savingsByYear).reduce((sum, value) => sum + value, 0),
  )

  const roundedByYear = Object.fromEntries(
    Object.entries(savingsByYear)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([year, value]) => [year, Math.round(value)]),
  )

  const costYears = [
    ...new Set(monthlyCost.map((entry) => entry.year)),
  ].sort((a, b) => a - b)

  return {
    buildings: Array.from(buildingMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name),
    ),
    monthlyCost,
    costYears,
    savingsByYear: roundedByYear,
    totalSavings,
    savingsFormula:
      'kWh × (Elec Rate − CS Rate); each month uses that month’s rates when available',
  }
}
