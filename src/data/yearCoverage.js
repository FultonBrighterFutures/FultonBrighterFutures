const MONTH_LABELS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

/**
 * Newest year present in imported solar-data.json.
 * @param {{ years?: number[] } | number[] | null | undefined} datasetOrYears
 * @param {number} [fallback=2026]
 */
export function latestDataYear(datasetOrYears, fallback = 2026) {
  const years = Array.isArray(datasetOrYears)
    ? datasetOrYears
    : (datasetOrYears?.years ?? [])
  const numeric = [...new Set(years.map(Number))].filter((year) => Number.isFinite(year))
  if (!numeric.length) return fallback
  return Math.max(...numeric)
}

/**
 * Month coverage for energy rows in a given year.
 * @param {{ monthly?: Array<{ year: number, month: number, kWh?: number }> } | null | undefined} dataset
 * @param {number} year
 * @returns {{ firstMonth: number, lastMonth: number, months: number[], isPartial: boolean } | null}
 */
export function getEnergyMonthSpan(dataset, year) {
  const months = new Set()
  for (const entry of dataset?.monthly ?? []) {
    if (entry.year !== year) continue
    if (!(Number(entry.kWh) > 0)) continue
    const month = Number(entry.month)
    if (month >= 1 && month <= 12) months.add(month)
  }

  if (!months.size) return null

  const sorted = [...months].sort((a, b) => a - b)
  const firstMonth = sorted[0]
  const lastMonth = sorted[sorted.length - 1]
  return {
    firstMonth,
    lastMonth,
    months: sorted,
    isPartial: firstMonth > 1 || lastMonth < 12 || sorted.length < 12,
  }
}

/**
 * HUD subtitle like "(Jan–Jun 2026)" when a year is incomplete; otherwise null.
 * @param {{ monthly?: Array<{ year: number, month: number, kWh?: number }> } | null | undefined} dataset
 * @param {number} year
 */
export function formatPartialYearSubtitle(dataset, year) {
  const span = getEnergyMonthSpan(dataset, year)
  if (!span?.isPartial) return null
  const start = MONTH_LABELS[span.firstMonth - 1]
  const end = MONTH_LABELS[span.lastMonth - 1]
  if (span.firstMonth === span.lastMonth) {
    return `(${start} ${year})`
  }
  return `(${start}–${end} ${year})`
}
