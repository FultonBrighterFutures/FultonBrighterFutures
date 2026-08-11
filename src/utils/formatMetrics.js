/**
 * Display formatters — keep units consistent across all scenes.
 * Energy: kWh | CO₂: lbs | Money: full dollars (no K/M abbreviations)
 */

/** When solar is active but calculated savings are $0 or negative (e.g. already-low local rates). */
export const DEFERRED_SAVINGS_NOTE =
  'This building already has a low electricity rate, so dollar savings are expected to grow over time.'

export function hasNoCurrentSavings(dollars) {
  const value = Number(dollars)
  return !Number.isFinite(value) || value <= 0
}

export function formatEnergyKwh(kwh) {
  const value = Number(kwh)
  if (!Number.isFinite(value) || value <= 0) return '0 kWh'
  return `${Math.round(value).toLocaleString()} kWh`
}

export function formatCo2Lbs(lbs) {
  const value = Number(lbs)
  if (!Number.isFinite(value) || value <= 0) return '0 lbs'
  return `${Math.round(value).toLocaleString()} lbs`
}

export function formatDollars(dollars) {
  const value = Number(dollars)
  if (!Number.isFinite(value) || value <= 0) return '$0'
  return `$${Math.round(value).toLocaleString()}`
}
