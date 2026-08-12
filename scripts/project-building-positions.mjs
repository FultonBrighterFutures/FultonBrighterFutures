/**
 * Project geocoded building coordinates onto placement-mask u/v and write
 * public/data/runtime/building-positions.json (+ -main.json).
 *
 * Layout matches public/assets/map-reference.png: north-up, west-left,
 * Palmetto at the southwest tip and Milton / north Fulton at the top.
 *
 * Usage: node scripts/project-building-positions.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const defaultCoordsPath = join(root, 'public/data/sources/building-coordinates.json')
const defaultRuntimeDir = join(root, 'public/data/runtime')

/** Padding around the building footprint so markers fill the map like map-reference.png. */
const BOUNDS_PADDING = 0.08

function computeBounds(buildings) {
  let west = Infinity
  let east = -Infinity
  let south = Infinity
  let north = -Infinity

  for (const building of buildings) {
    west = Math.min(west, building.lng)
    east = Math.max(east, building.lng)
    south = Math.min(south, building.lat)
    north = Math.max(north, building.lat)
  }

  const lngPad = (east - west) * BOUNDS_PADDING
  const latPad = (north - south) * BOUNDS_PADDING

  return {
    west: west - lngPad,
    east: east + lngPad,
    south: south - latPad,
    north: north + latPad,
  }
}

function lngLatToUv(lng, lat, bounds) {
  const u = (lng - bounds.west) / (bounds.east - bounds.west)
  const v = (bounds.north - lat) / (bounds.north - bounds.south)
  return {
    u: Math.round(Math.min(1, Math.max(0, u)) * 10000) / 10000,
    v: Math.round(Math.min(1, Math.max(0, v)) * 10000) / 10000,
  }
}

/**
 * @param {{
 *   coordsPath?: string,
 *   runtimeDir?: string,
 *   rootDir?: string,
 *   log?: (...args: unknown[]) => void,
 * }} [options]
 */
export function runProjectPositions(options = {}) {
  const rootDir = options.rootDir ?? root
  const coordsPath = options.coordsPath ?? defaultCoordsPath
  const runtimeDir = options.runtimeDir ?? defaultRuntimeDir
  const log = options.log ?? console.log

  const coords = JSON.parse(readFileSync(coordsPath, 'utf8'))
  if (!coords.buildings?.length) {
    throw new Error(`[project-positions] No buildings in ${coordsPath}`)
  }

  const bounds = computeBounds(coords.buildings)
  const buildings = coords.buildings
    .map((building) => {
      const { u, v } = lngLatToUv(building.lng, building.lat, bounds)
      return { id: building.id, name: building.name, u, v }
    })
    .sort((a, b) => a.name.localeCompare(b.name))

  const payload = { buildings }
  const json = `${JSON.stringify(payload, null, 2)}\n`

  writeFileSync(join(runtimeDir, 'building-positions.json'), json)
  writeFileSync(join(runtimeDir, 'building-positions-main.json'), json)
  writeFileSync(
    join(rootDir, 'public/data/sources/building-position-projection.json'),
    `${JSON.stringify(
      {
        source: 'building-coordinates.json',
        reference: 'public/assets/map-reference.png',
        projection: {
          type: 'equirectangular',
          orientation: 'north-up',
          bounds,
          padding: BOUNDS_PADDING,
        },
        buildings: coords.buildings.map((building) => {
          const { u, v } = lngLatToUv(building.lng, building.lat, bounds)
          return {
            id: building.id,
            name: building.name,
            lat: building.lat,
            lng: building.lng,
            u,
            v,
          }
        }),
      },
      null,
      2,
    )}\n`,
  )

  const byV = [...buildings].sort((a, b) => a.v - b.v)
  log(`Projected ${buildings.length} buildings (north-up, map-reference style)`)
  log(
    `  Top (north): ${byV
      .slice(0, 3)
      .map((b) => b.id)
      .join(', ')}`,
  )
  log(
    `  Bottom (south): ${byV
      .slice(-3)
      .map((b) => b.id)
      .join(', ')}`,
  )

  return { buildings, bounds, count: buildings.length }
}

const isCli =
  Boolean(process.argv[1]) &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href

if (isCli) {
  runProjectPositions()
}
