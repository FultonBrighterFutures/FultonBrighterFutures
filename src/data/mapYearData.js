/**
 * Maps raw CSV rows → values each Three.js scene reads in applyYear().
 *
 * Flow: timeline year change → ThreePanel → loadSceneCsv() → mapSceneYearData() → applyYear({ data })
 */

import { mapDataTestCo2 } from './mapDataTestCo2'
import { mapSolarCo2Year, mapSolarEnergyYear } from './parseSolarWorkbook'
import { mapSolarSavingYear } from './parseSolarCostWorkbook'

function rowForYear(rows, year) {
  return rows.find((row) => Number(row.year) === year) ?? {}
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function isSolarDataset(value) {
  return Boolean(value?.buildings && value?.years && (value?.monthly || value?.monthlyCost))
}

function isDataTestDataset(value) {
  return Boolean(value?.buildings && value?.monthly)
}

// Energy scene — solar-data.xlsx (via solar-data.json) → per-building kWh totals.
export function mapEnergyYearData(datasetOrRows, year) {
  if (isSolarDataset(datasetOrRows)) {
    return mapSolarEnergyYear(datasetOrRows, year)
  }

  const rows = datasetOrRows
  const row = rowForYear(rows, year)

  return {
    year,
    generationTwh: toNumber(row.generation_twh ?? row.generationTwh),
    capacityGw: toNumber(row.capacity_gw ?? row.capacityGw),
    totalAnnualKwh: toNumber(row.generation_twh ?? row.generationTwh) * 1_000_000_000,
    buildings: [],
    raw: row,
  }
}

// CO2 scene — solar-data.json kWh × $AM$3 → per-building CO₂ saved (lbs).
export function mapCo2YearData(datasetOrRows, year) {
  if (isSolarDataset(datasetOrRows) && datasetOrRows.monthly?.length) {
    return mapSolarCo2Year(datasetOrRows, year)
  }

  if (isDataTestDataset(datasetOrRows)) {
    return mapDataTestCo2(datasetOrRows, year)
  }

  const row = rowForYear(datasetOrRows, year)

  return {
    year,
    emissionsGt: toNumber(row.emissions_gt ?? row.emissionsGt),
    reductionPct: toNumber(row.reduction_pct ?? row.reductionPct),
    buildings: [],
    raw: row,
  }
}

// Saving scene — kWh × (Elec Rate − CS Rate) from Savings workbook (via solar-data.json).
export function mapSavingYearData(datasetOrRows, year) {
  if (isSolarDataset(datasetOrRows) && datasetOrRows.monthlyCost?.length) {
    return mapSolarSavingYear(datasetOrRows, year)
  }

  const rows = datasetOrRows
  const row = rowForYear(rows, year)

  return {
    year,
    savingsIndex: toNumber(row.savings_index ?? row.savingsIndex),
    hectaresRestored: toNumber(row.hectares_restored ?? row.hectaresRestored),
    raw: row,
  }
}

const mappers = {
  energy: mapEnergyYearData,
  co2: mapCo2YearData,
  saving: mapSavingYearData,
}

/**
 * @param {string} variant
 * @param {Record<string, string>[]} rows - All rows from the scene CSV
 * @param {number} year
 * @returns {Record<string, unknown>}
 */
export function mapSceneYearData(variant, rows, year) {
  const mapper = mappers[variant]
  if (!mapper) return { year }
  return mapper(rows, year)
}
