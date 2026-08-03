import { getBuildingDisplayName } from './buildingRegistry'
import { publicUrl } from '../utils/publicUrl'

const MASK_URL = publicUrl('/assets/map-placement-mask.png')
const WORLD_WIDTH = 5.5
const MIN_ALPHA = 24
const WHITE_CHANNEL_MIN = 238

/** Building footprint at max scale — sphere diameter + gap so small orbs stay clickable. */
const BUILDING_SPHERE_RADIUS = 0.5
const BUILDING_MAX_SCALE = 0.5
const BUILDING_SEPARATION_PADDING = 0.94
const MIN_BUILDING_SEPARATION =
  BUILDING_SPHERE_RADIUS * BUILDING_MAX_SCALE * 2 + BUILDING_SEPARATION_PADDING

/** How far a marker may drift from its mapped location while resolving overlap. */
const MAX_DRIFT_X = 0.84
const MAX_DRIFT_Z = 0.64
const SEPARATION_RADIUS_X = MIN_BUILDING_SEPARATION * 1.45
const SEPARATION_RADIUS_Z = MIN_BUILDING_SEPARATION * 1.2
const HORIZONTAL_PUSH_SCALE = 1.4
const VERTICAL_PUSH_SCALE = 1.15
const SEPARATION_STRENGTH = 0.7
const SEPARATION_ITERATIONS = 72

let maskState = null

function isValidPlacementPixel(data, px, py, width) {
  const index = (py * width + px) * 4
  const r = data[index]
  const g = data[index + 1]
  const b = data[index + 2]
  const a = data[index + 3]

  if (a < MIN_ALPHA) return false
  if (r >= WHITE_CHANNEL_MIN && g >= WHITE_CHANNEL_MIN && b >= WHITE_CHANNEL_MIN) return false

  return true
}

function computeContentBounds(data, width, height) {
  let pxMin = width
  let pxMax = 0
  let pyMin = height
  let pyMax = 0
  let found = false

  for (let py = 0; py < height; py += 1) {
    for (let px = 0; px < width; px += 1) {
      if (!isValidPlacementPixel(data, px, py, width)) continue
      found = true
      pxMin = Math.min(pxMin, px)
      pxMax = Math.max(pxMax, px)
      pyMin = Math.min(pyMin, py)
      pyMax = Math.max(pyMax, py)
    }
  }

  if (!found) {
    return { pxMin: 0, pxMax: width - 1, pyMin: 0, pyMax: height - 1 }
  }

  return { pxMin, pxMax, pyMin, pyMax }
}

function deriveSceneBounds(contentBounds) {
  const contentWidth = Math.max(1, contentBounds.pxMax - contentBounds.pxMin)
  const contentHeight = Math.max(1, contentBounds.pyMax - contentBounds.pyMin)
  const aspect = contentHeight / contentWidth
  const worldDepth = WORLD_WIDTH * aspect

  return {
    xMin: -WORLD_WIDTH / 2,
    xMax: WORLD_WIDTH / 2,
    zMin: -worldDepth / 2,
    zMax: worldDepth / 2,
  }
}

function pixelToScene(px, py, mask) {
  const { pxMin, pxMax, pyMin, pyMax } = mask.contentBounds
  const u = (px - pxMin) / Math.max(1, pxMax - pxMin)
  const v = (py - pyMin) / Math.max(1, pyMax - pyMin)
  const { xMin, xMax, zMin, zMax } = mask.sceneBounds

  // North (small v / top of mask) → −Z so it sits at the top of the screen
  // with the top-down camera (up = −Z), matching map-reference.png.
  // Mirror X so west (small u) is on the left of the screen.
  return {
    x: xMax - u * (xMax - xMin),
    z: zMin + v * (zMax - zMin),
  }
}

function sceneToPixel(x, z, mask) {
  const { xMin, xMax, zMin, zMax } = mask.sceneBounds
  const u = (xMax - x) / (xMax - xMin)
  const v = (z - zMin) / (zMax - zMin)
  const { pxMin, pxMax, pyMin, pyMax } = mask.contentBounds

  return {
    px: Math.round(pxMin + u * (pxMax - pxMin)),
    py: Math.round(pyMin + v * (pyMax - pyMin)),
  }
}

function findNearestValidPixel(px, py, mask, maxRadius = 160) {
  const { width, height, data } = mask

  if (
    px >= 0 &&
    py >= 0 &&
    px < width &&
    py < height &&
    isValidPlacementPixel(data, px, py, width)
  ) {
    return { px, py }
  }

  for (let radius = 1; radius <= maxRadius; radius += 1) {
    for (let dx = -radius; dx <= radius; dx += 1) {
      for (let dy = -radius; dy <= radius; dy += 1) {
        if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) continue

        const sampleX = px + dx
        const sampleY = py + dy
        if (sampleX < 0 || sampleY < 0 || sampleX >= width || sampleY >= height) continue

        if (isValidPlacementPixel(data, sampleX, sampleY, width)) {
          return { px: sampleX, py: sampleY }
        }
      }
    }
  }

  return { px, py }
}

/**
 * Map normalized position (0–1 within county map) to scene coordinates.
 * @param {number} u - 0 west → 1 east
 * @param {number} v - 0 north → 1 south
 */
export function uvToScene(u, v, mask) {
  if (!mask) return { x: 0, z: 0 }

  const { pxMin, pxMax, pyMin, pyMax } = mask.contentBounds
  const px = Math.round(pxMin + u * (pxMax - pxMin))
  const py = Math.round(pyMin + v * (pyMax - pyMin))
  const snapped = findNearestValidPixel(px, py, mask)
  return pixelToScene(snapped.px, snapped.py, mask)
}

/**
 * Load the colored county map for placement validation.
 */
export async function loadMapMask() {
  if (maskState) {
    return maskState
  }

  const image = new Image()
  image.src = MASK_URL

  await new Promise((resolve, reject) => {
    image.onload = resolve
    image.onerror = reject
  })

  const canvas = document.createElement('canvas')
  canvas.width = image.width
  canvas.height = image.height
  const context = canvas.getContext('2d', { willReadFrequently: true })
  context.drawImage(image, 0, 0)

  const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
  const contentBounds = computeContentBounds(imageData.data, canvas.width, canvas.height)
  const sceneBounds = deriveSceneBounds(contentBounds)

  maskState = {
    width: canvas.width,
    height: canvas.height,
    data: imageData.data,
    contentBounds,
    sceneBounds,
    aspect: (sceneBounds.zMax - sceneBounds.zMin) / (sceneBounds.xMax - sceneBounds.xMin),
  }

  return maskState
}

/**
 * Clamp a scene position to the nearest valid colored pixel on the map.
 */
export function clampToMask(x, z, mask) {
  if (!mask) return { x, z }

  const { px, py } = sceneToPixel(x, z, mask)
  const snapped = findNearestValidPixel(px, py, mask)
  return pixelToScene(snapped.px, snapped.py, mask)
}

/**
 * Nudge overlapping buildings apart while staying near their mapped locations.
 * Positions are clamped to valid map pixels and limited drift from origin.
 */
function constrainDrift(point) {
  const dx = point.x - point.originX
  const dz = point.z - point.originZ
  const norm = (dx / MAX_DRIFT_X) ** 2 + (dz / MAX_DRIFT_Z) ** 2

  if (norm > 1) {
    const scale = 1 / Math.sqrt(norm)
    point.x = point.originX + dx * scale
    point.z = point.originZ + dz * scale
  }
}

function separateBuildingPositions(
  buildings,
  mask,
  iterations = SEPARATION_ITERATIONS,
) {
  const points = buildings.map((building) => ({
    x: building.x,
    z: building.z,
    originX: building.x,
    originZ: building.z,
  }))

  for (let iter = 0; iter < iterations; iter += 1) {
    let moved = false

    for (let i = 0; i < points.length; i += 1) {
      for (let j = i + 1; j < points.length; j += 1) {
        let dx = points[j].x - points[i].x
        let dz = points[j].z - points[i].z

        if (dx === 0 && dz === 0) {
          dx = 1e-4
          dz = 2e-5
        }

        const normDistSq = (dx / SEPARATION_RADIUS_X) ** 2 + (dz / SEPARATION_RADIUS_Z) ** 2
        if (normDistSq >= 1) continue

        const dist = Math.hypot(dx, dz)
        const push = (1 - Math.sqrt(normDistSq)) * 0.5 * SEPARATION_STRENGTH * MIN_BUILDING_SEPARATION
        const nx = dx / dist
        const nz = dz / dist

        points[i].x -= nx * push * HORIZONTAL_PUSH_SCALE
        points[i].z -= nz * push * VERTICAL_PUSH_SCALE
        points[j].x += nx * push * HORIZONTAL_PUSH_SCALE
        points[j].z += nz * push * VERTICAL_PUSH_SCALE
        moved = true
      }
    }

    for (let i = 0; i < points.length; i += 1) {
      constrainDrift(points[i])
      const clamped = clampToMask(points[i].x, points[i].z, mask)
      points[i].x = clamped.x
      points[i].z = clamped.z
      constrainDrift(points[i])
    }

    if (!moved) break
  }

  return buildings.map((building, index) => ({
    ...building,
    x: points[index].x,
    z: points[index].z,
  }))
}

/**
 * @param {string} [positionsUrl]
 * @returns {Promise<{ bounds: object, aspect: number, buildings: Array }>}
 */
export async function loadBuildingPositions(
  positionsUrl = publicUrl('/data/runtime/building-positions.json'),
) {
  const response = await fetch(positionsUrl)
  if (!response.ok) {
    throw new Error(`Failed to load building positions: ${positionsUrl}`)
  }

  const payload = await response.json()
  const mask = await loadMapMask()

  const buildings = separateBuildingPositions(
    payload.buildings.map((building) => {
      const namedBuilding = {
        ...building,
        name: getBuildingDisplayName(building.id),
        displayName: getBuildingDisplayName(building.id),
      }

      if (typeof building.u === 'number' && typeof building.v === 'number') {
        const scene = uvToScene(building.u, building.v, mask)
        return { ...namedBuilding, x: scene.x, z: scene.z }
      }

      const clamped = clampToMask(building.x, building.z, mask)
      return { ...namedBuilding, x: clamped.x, z: clamped.z }
    }),
    mask,
  )

  return {
    bounds: mask.sceneBounds,
    aspect: mask.aspect,
    buildings,
  }
}
