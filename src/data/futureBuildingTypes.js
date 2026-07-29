import { calcCo2SavedLbs } from './co2Emissions.js'

/**
 * Georgia / Atlanta solar assumptions for Look Ahead user-placed buildings.
 *
 * Production yield: ~1,350 kWh per kW-DC per year in the Atlanta metro
 * (NREL PVWatts / Georgia Solar Authority ballpark for central Georgia).
 *
 * System sizes are illustrative mid-small rooftop arrays so one school add
 * does not overwhelm the ~230k kWh county baseline visualization.
 *
 * Money saved uses the same workbook formula as the county dataset:
 *   savings ($) = kWh × (Elec Rate − CS Rate)
 * where CS is the Cherry Street / community-solar contract rate.
 */

export const ATLANTA_KWH_PER_KW_YEAR = 1350
export const PANEL_WATTAGE = 400

/**
 * Fallback if solar-data.json has no savingsRates yet (pre-import).
 * Rough midpoints from the June 2026 Elec / CS rate sheets.
 */
export const FALLBACK_ELEC_RATE = 0.168
export const FALLBACK_CS_RATE = 0.109

export const FUTURE_BUILDING_TYPES = [
  {
    id: 'office',
    label: 'OFFICE',
    displayName: 'Office',
    systemKw: 20,
    panelCount: 50,
  },
  {
    id: 'home',
    label: 'HOME',
    displayName: 'Home',
    systemKw: 8,
    panelCount: 20,
  },
  {
    id: 'school',
    label: 'SCHOOL',
    displayName: 'School',
    systemKw: 40,
    panelCount: 100,
  },
  {
    id: 'shop',
    label: 'SHOP',
    displayName: 'Shop',
    systemKw: 12,
    panelCount: 30,
  },
]

const TYPES_BY_ID = Object.fromEntries(FUTURE_BUILDING_TYPES.map((type) => [type.id, type]))

export function getFutureBuildingType(typeId) {
  return TYPES_BY_ID[typeId] ?? null
}

/**
 * Resolve Elec / CS rates for Look Ahead savings.
 * Prefers imported `savingsRates` from solar-data.json.
 *
 * @param {{ elecRate?: number, csRate?: number, savingsPerKwh?: number } | null | undefined} rates
 */
export function resolveSavingsRates(rates) {
  const elecRate =
    Number.isFinite(rates?.elecRate) && rates.elecRate > 0
      ? rates.elecRate
      : FALLBACK_ELEC_RATE
  const csRate =
    Number.isFinite(rates?.csRate) && rates.csRate >= 0 ? rates.csRate : FALLBACK_CS_RATE
  const savingsPerKwh =
    Number.isFinite(rates?.savingsPerKwh) && rates.savingsPerKwh > 0
      ? rates.savingsPerKwh
      : Math.max(0, elecRate - csRate)

  return { elecRate, csRate, savingsPerKwh }
}

/**
 * @param {string} typeId
 * @param {{ elecRate?: number, csRate?: number, savingsPerKwh?: number } | null} [rates]
 * @returns {{
 *   annualKwh: number,
 *   annualCo2Lbs: number,
 *   annualSavings: number,
 *   systemKw: number,
 *   panelCount: number,
 *   elecRate: number,
 *   csRate: number,
 *   savingsPerKwh: number,
 * } | null}
 */
export function estimateBuildingMetrics(typeId, rates = null) {
  const type = getFutureBuildingType(typeId)
  if (!type) return null

  const { elecRate, csRate, savingsPerKwh } = resolveSavingsRates(rates)
  const annualKwh = Math.round(type.systemKw * ATLANTA_KWH_PER_KW_YEAR)
  const annualCo2Lbs = Math.round(calcCo2SavedLbs(annualKwh))
  const annualSavings = Math.round(annualKwh * savingsPerKwh)

  return {
    annualKwh,
    annualCo2Lbs,
    annualSavings,
    systemKw: type.systemKw,
    panelCount: type.panelCount,
    elecRate,
    csRate,
    savingsPerKwh,
  }
}
