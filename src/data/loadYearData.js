import { parseCsv } from './parseCsv'
import { parseDataTest } from './parseDataTest'
import { loadSolarDataset } from './loadSolarData'
import { publicUrl } from '../utils/publicUrl'

/** Scene keys that load data from public/data/ */
export const DATA_SCENES = ['energy', 'co2', 'saving']

const csvCache = new Map()
let dataTestCache = null

/**
 * Loads and parses DataTest.csv for the CO2 building map prototype.
 * @returns {Promise<ReturnType<typeof parseDataTest>>}
 */
export async function loadDataTestDataset() {
  if (dataTestCache) {
    return dataTestCache
  }

  const dataTestUrl = publicUrl('/data/DataTest.csv')
  const response = await fetch(dataTestUrl)

  if (!response.ok) {
    console.warn(`[data] Missing or unreadable CSV: ${dataTestUrl}`)
    dataTestCache = parseDataTest('')
    return dataTestCache
  }

  const text = await response.text()
  dataTestCache = parseDataTest(text)
  return dataTestCache
}

/**
 * Loads and parses a scene CSV from public/data/.
 * Files are cached in memory after the first fetch.
 *
 * For `co2`, loads the wide-format DataTest.csv via loadDataTestDataset().
 *
 * @param {string} variant - Scene key (energy | co2 | saving)
 * @returns {Promise<Record<string, string>[] | ReturnType<typeof parseDataTest>>}
 */
export async function loadSceneCsv(variant) {
  if (!DATA_SCENES.includes(variant)) {
    return []
  }

  if (variant === 'co2' || variant === 'energy' || variant === 'saving') {
    return loadSolarDataset()
  }

  if (csvCache.has(variant)) {
    return csvCache.get(variant)
  }

  const csvUrl = publicUrl(`/data/${variant}.csv`)
  const response = await fetch(csvUrl)

  if (!response.ok) {
    console.warn(`[data] Missing or unreadable CSV: ${csvUrl}`)
    csvCache.set(variant, [])
    return []
  }

  const text = await response.text()
  const rows = parseCsv(text)
  csvCache.set(variant, rows)
  return rows
}

/**
 * Returns all CSV rows for a given scene and timeline year.
 *
 * @param {string} variant
 * @param {number} year
 * @returns {Promise<Record<string, string>[]>}
 */
export async function loadSceneYearRows(variant, year) {
  const rows = await loadSceneCsv(variant)
  return rows.filter((row) => Number(row.year) === year)
}
