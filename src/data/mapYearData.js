/**
 * Maps solar-data.json → values each Three.js scene reads in applyYear().
 *
 * Flow: timeline year change → ThreePanel → loadSolarDataset() → mapSceneYearData() → applyYear({ data })
 */

import { mapSolarCo2Year, mapSolarEnergyYear } from './parseSolarWorkbook'
import { mapSolarSavingYear } from './parseSolarCostWorkbook'

function isSolarDataset(value) {
  return Boolean(value?.buildings && value?.years && (value?.monthly || value?.monthlyCost))
}

// Energy scene — solar-data.xlsx (via solar-data.json) → per-building kWh totals.
export function mapEnergyYearData(datasetOrRows, year) {
  if (isSolarDataset(datasetOrRows)) {
    return mapSolarEnergyYear(datasetOrRows, year)
  }

  return {
    year,
    generationTwh: 0,
    capacityGw: 0,
    totalAnnualKwh: 0,
    buildings: [],
    raw: {},
  }
}

// CO2 scene — solar-data.json kWh × emission rate → per-building CO₂ saved (lbs).
export function mapCo2YearData(datasetOrRows, year) {
  if (isSolarDataset(datasetOrRows) && datasetOrRows.monthly?.length) {
    return mapSolarCo2Year(datasetOrRows, year)
  }

  return {
    year,
    emissionsGt: 0,
    reductionPct: 0,
    buildings: [],
    raw: {},
  }
}

// Saving scene — kWh × (Elec Rate − CS Rate) from Savings workbook (via solar-data.json).
export function mapSavingYearData(datasetOrRows, year) {
  if (isSolarDataset(datasetOrRows) && datasetOrRows.monthlyCost?.length) {
    const saving = mapSolarSavingYear(datasetOrRows, year)
    const energy = mapSolarEnergyYear(datasetOrRows, year)
    const energyById = new Map(energy.buildings.map((building) => [building.id, building]))

    return {
      ...saving,
      buildings: saving.buildings.map((building) => ({
        ...building,
        annualKwh: energyById.get(building.id)?.annualKwh ?? 0,
      })),
      energyBuildings: energy.buildings,
    }
  }

  return {
    year,
    savingsIndex: 0,
    hectaresRestored: 0,
    raw: {},
  }
}

const mappers = {
  energy: mapEnergyYearData,
  co2: mapCo2YearData,
  saving: mapSavingYearData,
}

/**
 * @param {string} variant
 * @param {object} dataset - Parsed solar-data.json dataset
 * @param {number} year
 * @returns {Record<string, unknown>}
 */
export function mapSceneYearData(variant, dataset, year) {
  const mapper = mappers[variant]
  if (!mapper) return { year }
  return mapper(dataset, year)
}
