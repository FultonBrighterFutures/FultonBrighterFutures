import * as THREE from 'three'
import {
  beginBuildingCommitForYear,
  clearTransition,
  finishBuildingCommitForYear,
  getTransition,
  registerTransition,
} from './sceneAnimation.js'

export function createRenderer() {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  // Prevent browser pan/scroll from claiming touch gestures on Surface Hub / Edge
  const canvas = renderer.domElement
  canvas.style.touchAction = 'none'
  canvas.style.userSelect = 'none'
  canvas.style.webkitUserSelect = 'none'
  return renderer
}

export function createCamera() {
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100)
  camera.position.set(0, 0.5, 5)
  return camera
}

export function fitTopDownCamera(camera, bounds, margin = 1.22) {
  const width = bounds.xMax - bounds.xMin
  const depth = bounds.zMax - bounds.zMin
  const span = Math.max(width, depth) * margin
  const fovRad = (camera.fov * Math.PI) / 180
  const height = (span / 2) / Math.tan(fovRad / 2)

  camera.position.set(0, height, 0)
  camera.up.set(0, 0, -1)
  camera.lookAt(0, 0, 0)
  camera.updateProjectionMatrix()
}

export function addLights(scene, color = 0xffffff) {
  scene.add(new THREE.AmbientLight(color, 0.45))
  const key = new THREE.DirectionalLight(color, 1.1)
  key.position.set(3, 4, 5)
  scene.add(key)
}

export function lerpColor(colorA, colorB, alpha) {
  return new THREE.Color(colorA).lerp(new THREE.Color(colorB), alpha)
}

/** Whether a building has solar data for the selected timeline year. */
export function isBuildingActive(stats) {
  return Boolean(stats?.active)
}

/**
 * Min/max of a numeric metric across active buildings.
 * @param {Array<{ active?: boolean }>} buildings
 * @param {(building: object) => number} getValue
 */
export function activeMetricRange(buildings, getValue) {
  const values = (buildings ?? [])
    .filter(isBuildingActive)
    .map(getValue)
    .filter((value) => Number.isFinite(value) && value > 0)

  if (values.length === 0) {
    return { min: 0, max: 1 }
  }

  return { min: Math.min(...values), max: Math.max(...values) }
}

/**
 * Scale a building from its data metric. The smallest producer uses baseScale;
 * the largest uses maxScale.
 */
export function scaleBuildingByMetric(value, minValue, maxValue, baseScale, maxScale = 0.5) {
  if (!Number.isFinite(value) || value <= 0) {
    return baseScale
  }

  if (maxValue <= minValue) {
    return baseScale
  }

  const t = Math.min(1, Math.max(0, (value - minValue) / (maxValue - minValue)))
  return baseScale + t * (maxScale - baseScale)
}

/**
 * Update building visibility/scale for a timeline year.
 * Enter/exit timing is shared across scene panels via sceneAnimation.js.
 */
export function commitSceneBuildings(
  buildingEntries,
  statsById,
  year,
  { animationTime, buildingsList, getMetricValue, getScale },
) {
  const { min, max } = activeMetricRange(buildingsList, getMetricValue)
  const previousActiveIds = beginBuildingCommitForYear(year)
  const nextActiveIds = new Set()
  let enterStagger = 0

  buildingEntries.forEach((entry, id) => {
    const stats = statsById.get(id)
    const wasActive = previousActiveIds.has(id)
    const isActive = isBuildingActive(stats)

    if (!isActive) {
      const transition = getTransition(id)
      const isExiting =
        entry.building.isTransitioning() && entry.building.transitionMode === 'exit'
      const isEntering =
        entry.building.isTransitioning() && entry.building.transitionMode === 'enter'
      const globalExit = transition?.type === 'exit'

      // Never restart a fade-out — continue from the shared transition clock.
      if (isExiting || globalExit) {
        if (transition) {
          entry.building.syncToTransition(transition, animationTime, { continueExit: true })
          if (!entry.building.shouldRender()) {
            clearTransition(id)
          }
        } else {
          entry.building.applyTransitionState(animationTime)
        }
        return
      }

      if (wasActive || isEntering) {
        const exitTransition = registerTransition(id, 'exit', animationTime, 0, true)
        entry.building.syncToTransition(exitTransition, animationTime)
        return
      }

      entry.building.hideImmediate()
      clearTransition(id)
      return
    }

    nextActiveIds.add(id)
    entry.building.setScale(getScale(stats, min, max))
    entry.building.setPulseFromMetric(getMetricValue(stats), min, max, id)

    if (!wasActive) {
      const transition = registerTransition(id, 'enter', animationTime, enterStagger, true)
      enterStagger += 1
      entry.building.syncToTransition(transition, animationTime)
      return
    }

    const transition = getTransition(id)
    if (transition?.type === 'enter' && entry.building.isTransitioning()) {
      entry.building.syncToTransition(transition, animationTime)
      return
    }

    if (entry.building.isTransitioning() && entry.building.transitionMode === 'exit') {
      const enterTransition = registerTransition(id, 'enter', animationTime, 0, true)
      entry.building.syncToTransition(enterTransition, animationTime)
      return
    }

    entry.building.settledVisible()
    clearTransition(id)
  })

  finishBuildingCommitForYear(nextActiveIds)
  return nextActiveIds
}

/**
 * @typedef {object} YearUpdate
 * @property {number} year
 * @property {Record<string, unknown>} data - Mapped CSV values from mapYearData.js
 * @property {number} progress - 0 (first timeline year) → 1 (last timeline year)
 */
