/**
 * EPA Greenhouse Gas Equivalencies Calculator factors
 * @see https://www.epa.gov/energy/greenhouse-gas-equivalencies-calculator-calculations-and-references
 *
 * Home electricity use (2022): 12,194 kWh / home / year
 * Miles driven (avg gasoline passenger vehicle): 3.93 × 10⁻⁴ metric tons CO₂e / mile
 */

/** Average U.S. home electricity use, kWh/year (EPA / EIA 2022). */
export const KWH_PER_HOME_PER_YEAR = 12_194

/** lbs per metric ton (EPA conversion). */
export const LBS_PER_METRIC_TON = 2_204.6

/**
 * Metric tons CO₂e per mile driven by an average gasoline-powered passenger vehicle.
 * EPA: 8.89e-3 mt CO₂/gal ÷ 22.8 mpg ÷ 0.994 CO₂-to-GHG ratio
 */
export const METRIC_TONS_CO2E_PER_MILE = 3.93e-4

function formatCount(raw, sourceValue) {
  const value = Number(sourceValue)
  if (!Number.isFinite(value) || value <= 0) return null

  const rounded = Math.round(raw)
  if (rounded < 1) return '< 1'
  return rounded.toLocaleString()
}

/**
 * @param {number} kwh
 * @returns {number}
 */
export function homesPoweredFromKwh(kwh) {
  const value = Number(kwh)
  if (!Number.isFinite(value) || value <= 0) return 0
  return value / KWH_PER_HOME_PER_YEAR
}

/**
 * @param {number} lbs
 * @returns {number}
 */
export function milesDrivenFromCo2Lbs(lbs) {
  const value = Number(lbs)
  if (!Number.isFinite(value) || value <= 0) return 0
  const metricTons = value / LBS_PER_METRIC_TON
  return metricTons / METRIC_TONS_CO2E_PER_MILE
}

/**
 * @param {number} kwh
 * @returns {{ text: string, icon: 'home' } | null}
 */
export function formatEnergyEquivalency(kwh) {
  const homes = homesPoweredFromKwh(kwh)
  const count = formatCount(homes, kwh)
  if (!count) return null
  return {
    text: `≈ ${count} homes powered for a year`,
    icon: 'home',
  }
}

/**
 * @param {number} lbs
 * @returns {{ text: string, icon: 'car' } | null}
 */
export function formatCo2Equivalency(lbs) {
  const miles = milesDrivenFromCo2Lbs(lbs)
  const count = formatCount(miles, lbs)
  if (!count) return null
  return {
    text: `≈ ${count} miles driven`,
    icon: 'car',
  }
}
