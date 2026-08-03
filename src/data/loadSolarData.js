let solarDataCache = null

/**
 * Loads normalized solar production data generated from public/data/sources/solar-data.xlsx
 * by `npm run import-data`.
 *
 * @returns {Promise<{
 *   years: number[],
 *   buildings: Array<{ id: string, name: string }>,
 *   monthly: Array<{ buildingId: string, year: number, month: number, kWh: number }>,
 *   totalKwhProduced?: number,
 *   kwhByYear?: Record<string, number>,
 *   totalSavings?: number,
 *   savingsByYear?: Record<string, number>,
 *   totalCo2SavedLbs?: number,
 *   co2ByYear?: Record<string, number>,
 *   sourceFile?: string,
 *   importedAt?: string,
 * }>}
 */
export async function loadSolarDataset() {
  if (solarDataCache) {
    return solarDataCache
  }

  const response = await fetch('/data/runtime/solar-data.json')

  if (!response.ok) {
    console.warn('[data] Missing or unreadable JSON: /data/runtime/solar-data.json — run npm run import-data')
    solarDataCache = { years: [], buildings: [], monthly: [] }
    return solarDataCache
  }

  solarDataCache = await response.json()
  return solarDataCache
}

/** Clear in-memory cache (useful after re-import during dev). */
export function clearSolarDataCache() {
  solarDataCache = null
}
