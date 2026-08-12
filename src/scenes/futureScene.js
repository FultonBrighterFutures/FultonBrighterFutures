import * as THREE from 'three'
import { yearProgress } from '../constants/timeline'
import {
  loadBuildingPositions,
  loadSolarDataset,
  loadMapMask,
  clampToMask,
  mapCo2YearData,
  mapEnergyYearData,
  mapSavingYearData,
  latestDataYear,
} from '../data'
import { getFutureSticker } from '../data/futureStickers.js'
import { createBuildingTypeSprite } from './createBuildingTypeSprite.js'
import { applyCo2Camera, subscribeTriptychCamera } from './co2Camera'
import { getGlobalElapsedTime } from './sceneAnimation'
import {
  addLights,
  createCamera,
  createRenderer,
  isBuildingActive,
  scaleBuildingByMetric,
  activeMetricRange,
  commitSceneBuildings,
  resolveBuildingPick,
} from './shared'
import { Building, updateBuildingThemeMatcap } from '../components/building/index.js'
import { createBuildingParticles, PARTICLE_METRIC } from './createBuildingParticles.js'
import { formatCo2Lbs, formatDollars, formatEnergyKwh } from '../utils/formatMetrics'
import {
  MAX_DRAG_DISTANCE,
  COLLISION_RADIUS,
  applyDragReleaseLaunch,
  applyHoldDurationLaunch,
  stepMapBuildingPhysics,
} from './buildingPhysics.js'
import {
  SCREEN_DRAG_THRESHOLD_PX,
  releasePointerCaptureSafe,
  screenDragDistance,
  addScenePointerListeners,
  removeScenePointerListeners,
} from './pointerInteraction.js'

const BUILDING_SCALE = 0.18
const USER_BUILDING_SCALE = 0.28
const MAP_BASE_ROTATION = 0
const LOOK_AHEAD_CAMERA = {
  position: [-0.12, -7.633570423560478, 0.12],
  target: [-0.12, 0, 0.12],
  up: [0, 0, -1],
}

function metricToBuildingTheme(metric) {
  if (metric === 'co2') return 'co2'
  if (metric === 'money') return 'savings'
  return 'energy'
}

const stickerTextureCache = new Map()
const stickerTextureLoader = new THREE.TextureLoader()

function getStickerTexture(src) {
  if (!src) return null
  if (stickerTextureCache.has(src)) return stickerTextureCache.get(src)

  const texture = stickerTextureLoader.load(src)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.needsUpdate = true
  stickerTextureCache.set(src, texture)
  return texture
}

function createStickerSprite(stickerId) {
  const sticker = getFutureSticker(stickerId)
  if (!sticker?.src) return null

  const texture = getStickerTexture(sticker.src)
  if (!texture) return null

  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  })
  const sprite = new THREE.Sprite(material)
  // Anchor bottom-center so the sticker sits on top of the sphere (r=0.5)
  // and always faces the camera (Sprite billboards automatically).
  sprite.center.set(0.5, 0)
  sprite.scale.setScalar(0.7)
  sprite.position.set(0, 0.55, 0)
  sprite.renderOrder = 10
  sprite.userData.isStickerSprite = true
  return sprite
}

/**
 * Future / Look Ahead scene — same building map as the latest data year,
 * with grey (neutral) buildings, tab-colored particle clouds, and user adds.
 */
export function createFutureScene() {
  const scene = new THREE.Scene()
  const camera = createCamera()
  const renderer = createRenderer()
  const state = {
    year: null,
    dataYears: [],
    data: { buildings: [] },
    baselineBuildings: [],
    metricsById: new Map(),
    particleTheme: 'energy',
    ready: false,
    mapBounds: null,
    mapMask: null,
    baselineTotals: {
      annualKwh: 0,
      annualCo2Lbs: 0,
      annualSavings: 0,
    },
    userBuildings: [],
    placementMode: false,
  }

  const resolveLookAheadYear = () => state.year ?? latestDataYear(state.dataYears)
  const lookAheadProgress = () => yearProgress(resolveLookAheadYear(), state.dataYears)

  addLights(scene, 0xfff4e0)
  const rim = new THREE.DirectionalLight(0xb0b0b0, 0.35)
  rim.position.set(-2, 4, 3)
  scene.add(rim)

  const mapGroup = new THREE.Group()
  mapGroup.visible = false
  scene.add(mapGroup)

  const buildingEntries = new Map()
  const buildingObjects = []
  let domElement = null
  let selectedId = null
  let buildingSelectHandler = null
  let baselineTotalsHandler = null
  let dragState = null
  let suppressNextClick = false
  let lastPhysicsTime = null

  const unsubscribeCamera = subscribeTriptychCamera((next) => {
    applyCo2Camera(camera, next)
  })

  const getFocusedBuildingId = () => selectedId

  const getSelectedBuildingPayload = () => {
    const focusedId = getFocusedBuildingId()
    if (!focusedId) return null

    const entry = buildingEntries.get(focusedId)
    const metrics = state.metricsById.get(focusedId) ?? {}
    const stats = (state.data.buildings ?? []).find((building) => building.id === focusedId)

    if (!isBuildingActive(stats) && !entry?.isUserBuilding) return null

    return {
      id: focusedId,
      name: entry?.name ?? stats?.name ?? '',
      annualKwh: metrics.annualKwh ?? stats?.annualKwh ?? 0,
      annualCo2Lbs: metrics.annualCo2Lbs ?? 0,
      annualSavings: metrics.annualSavings ?? 0,
      energyLabel: formatEnergyKwh(metrics.annualKwh ?? stats?.annualKwh ?? 0),
      co2Label: formatCo2Lbs(metrics.annualCo2Lbs ?? 0),
      moneyLabel: formatDollars(metrics.annualSavings ?? 0),
      isUserBuilding: Boolean(entry?.isUserBuilding),
    }
  }

  const notifyBuildingSelect = () => {
    buildingSelectHandler?.(getSelectedBuildingPayload())
  }

  const notifyBaselineTotals = () => {
    baselineTotalsHandler?.({ ...state.baselineTotals })
  }

  const clearBuildingSelection = () => {
    selectedId = null
    notifyBuildingSelect()
  }

  const applyCameraSetup = () => {
    applyCo2Camera(camera, LOOK_AHEAD_CAMERA)
  }

  const syncParticlesForEntry = (entry) => {
    const metrics = state.metricsById.get(entry.id) ?? {}
    const theme = PARTICLE_METRIC[state.particleTheme] ?? PARTICLE_METRIC.energy
    entry.particles.setColor(theme.color)
    entry.particles.setCountFromMetric(metrics[theme.field] ?? 0, theme.perParticle)
  }

  const syncAllParticles = () => {
    buildingEntries.forEach((entry) => {
      if (!entry.building.shouldRender()) {
        entry.particles.setCount(0)
        return
      }
      syncParticlesForEntry(entry)
    })
  }

  /** Update scales/pulse from current totals without year enter/exit transitions. */
  const refreshBuildingPresentation = () => {
    const buildingsList = state.data.buildings ?? []
    const statsById = new Map(buildingsList.map((building) => [building.id, building]))
    const { min, max } = activeMetricRange(buildingsList, (building) => building.annualKwh)

    buildingEntries.forEach((entry, id) => {
      const stats = statsById.get(id)
      if (!stats) return
      if (!isBuildingActive(stats) && !entry.isUserBuilding) return

      entry.building.setScale(
        scaleBuildingByMetric(
          stats.annualKwh,
          min,
          max,
          entry.isUserBuilding ? USER_BUILDING_SCALE : BUILDING_SCALE,
        ),
      )
      entry.building.setPulseFromMetric(stats.annualKwh, min, max, id)

      if (entry.isUserBuilding && !entry.building.shouldRender()) {
        entry.building.settledVisible()
      }
    })

    syncAllParticles()
  }

  const mergeSceneData = () => {
    const userStats = state.userBuildings.map((building) => ({
      id: building.id,
      name: building.name,
      annualKwh: building.annualKwh,
      annualCo2Lbs: building.annualCo2Lbs,
      annualSavings: building.annualSavings,
      active: true,
    }))

    state.data = {
      ...state.data,
      buildings: [...state.baselineBuildings, ...userStats],
      totalAnnualKwh:
        (state.baselineTotals.annualKwh ?? 0) +
        userStats.reduce((sum, b) => sum + (b.annualKwh ?? 0), 0),
      totalAnnualCo2Lbs:
        (state.baselineTotals.annualCo2Lbs ?? 0) +
        userStats.reduce((sum, b) => sum + (b.annualCo2Lbs ?? 0), 0),
      totalAnnualSavings:
        (state.baselineTotals.annualSavings ?? 0) +
        userStats.reduce((sum, b) => sum + (b.annualSavings ?? 0), 0),
    }
  }

  const disposeSprite = (entry, key) => {
    const sprite = entry[key]
    if (!sprite) return
    entry.building.group.remove(sprite)
    sprite.material.map = null
    sprite.material.dispose()
    entry[key] = null
  }

  const disposeUserEntry = (entry) => {
    disposeSprite(entry, 'typeIconSprite')
    disposeSprite(entry, 'stickerSprite')
    entry.particles.dispose()
    mapGroup.remove(entry.building.group)
    const groupIndex = buildingObjects.indexOf(entry.building.group)
    if (groupIndex >= 0) buildingObjects.splice(groupIndex, 1)
    const pickIndex = buildingObjects.indexOf(entry.pickTarget)
    if (pickIndex >= 0) buildingObjects.splice(pickIndex, 1)
  }

  const attachTypeIcon = (entry, typeId) => {
    disposeSprite(entry, 'typeIconSprite')
    const sprite = createBuildingTypeSprite(typeId)
    if (!sprite) return
    entry.typeIconSprite = sprite
    entry.typeId = typeId
    entry.building.group.add(sprite)
  }

  const attachSticker = (entry, stickerId) => {
    disposeSprite(entry, 'stickerSprite')
    const sprite = createStickerSprite(stickerId)
    if (!sprite) return
    entry.stickerSprite = sprite
    entry.stickerId = stickerId
    entry.building.group.add(sprite)
  }

  const createUserEntry = (building) => {
    const buildingTheme = metricToBuildingTheme(state.particleTheme)
    const mesh = new Building({
      theme: buildingTheme,
      position: { x: building.x, y: 0, z: building.z },
      scale: USER_BUILDING_SCALE,
    })

    mesh.ring1Material.color.setHex(0xffffff)
    mesh.ring2Material.color.setHex(0xffffff)
    mesh.settledVisible()
    mapGroup.add(mesh.group)

    const particles = createBuildingParticles({
      color: PARTICLE_METRIC.energy.color,
    })
    mesh.group.add(particles.points)

    for (const part of [mesh.sphere, mesh.ring1, mesh.ring2]) {
      part.userData.futureBuildingId = building.id
      part.userData.isUserBuilding = true
    }

    const pickTarget = new THREE.Mesh(
      new THREE.SphereGeometry(1.15, 10, 10),
      new THREE.MeshBasicMaterial({ visible: false, depthWrite: false }),
    )
    pickTarget.userData.futureBuildingId = building.id
    pickTarget.userData.isUserBuilding = true
    mesh.group.add(pickTarget)

    const entry = {
      id: building.id,
      name: building.name,
      building: mesh,
      particles,
      pickTarget,
      homeX: building.x,
      homeZ: building.z,
      physX: building.x,
      physZ: building.z,
      velX: 0,
      velZ: 0,
      isUserBuilding: true,
      typeId: building.type ?? null,
      typeIconSprite: null,
      stickerId: building.stickerId ?? null,
      stickerSprite: null,
    }

    if (building.type) {
      attachTypeIcon(entry, building.type)
    }
    if (building.stickerId) {
      attachSticker(entry, building.stickerId)
    }

    buildingEntries.set(building.id, entry)
    buildingObjects.push(mesh.group, pickTarget)

    state.metricsById.set(building.id, {
      annualKwh: building.annualKwh ?? 0,
      annualCo2Lbs: building.annualCo2Lbs ?? 0,
      annualSavings: building.annualSavings ?? 0,
    })

    return entry
  }

  const syncUserBuildings = (list = []) => {
    state.userBuildings = Array.isArray(list) ? list : []
    const nextIds = new Set(state.userBuildings.map((building) => building.id))

    buildingEntries.forEach((entry, id) => {
      if (!entry.isUserBuilding) return
      if (nextIds.has(id)) return
      disposeUserEntry(entry)
      buildingEntries.delete(id)
      state.metricsById.delete(id)
      if (selectedId === id) clearBuildingSelection()
    })

    state.userBuildings.forEach((building) => {
      const existing = buildingEntries.get(building.id)
      if (!existing) {
        createUserEntry(building)
        return
      }

      existing.name = building.name
      existing.homeX = building.x
      existing.homeZ = building.z
      existing.physX = building.x
      existing.physZ = building.z
      existing.building.targetX = building.x
      existing.building.targetZ = building.z
      existing.building.setPosition(building.x, existing.building.group.position.y, building.z)

      state.metricsById.set(building.id, {
        annualKwh: building.annualKwh ?? 0,
        annualCo2Lbs: building.annualCo2Lbs ?? 0,
        annualSavings: building.annualSavings ?? 0,
      })

      if (existing.typeId !== building.type) {
        attachTypeIcon(existing, building.type)
      }
      if (existing.stickerId !== building.stickerId) {
        attachSticker(existing, building.stickerId)
      }
    })

    mergeSceneData()
    if (state.ready) {
      // Incremental update only — avoid commitYear (full scene re-transition).
      refreshBuildingPresentation()
    }
  }

  const commitYear = ({ year, data = {}, progress = yearProgress(year) }) => {
    const statsById = new Map((data.buildings ?? []).map((building) => [building.id, building]))
    const transitionTime = getGlobalElapsedTime()

    commitSceneBuildings(buildingEntries, statsById, year, {
      animationTime: transitionTime,
      buildingsList: data.buildings ?? [],
      getMetricValue: (building) => building.annualKwh,
      getScale: (stats, min, max) =>
        scaleBuildingByMetric(
          stats.annualKwh,
          min,
          max,
          stats?.id?.startsWith?.('user-') ? USER_BUILDING_SCALE : BUILDING_SCALE,
        ),
    })

    // Keep user buildings firmly visible after year commits.
    buildingEntries.forEach((entry) => {
      if (!entry.isUserBuilding) return
      if (!entry.building.shouldRender()) {
        entry.building.settledVisible()
      }
    })

    mapGroup.rotation.y = MAP_BASE_ROTATION + progress * 0.015 - 0.0075
    syncAllParticles()

    const focusedId = getFocusedBuildingId()
    if (!focusedId) {
      notifyBuildingSelect()
      return
    }
    const stats = statsById.get(focusedId)
    if (!isBuildingActive(stats) && !buildingEntries.get(focusedId)?.isUserBuilding) {
      clearBuildingSelection()
      return
    }
    notifyBuildingSelect()
  }

  const applyYear = () => {
    if (!state.ready) return
    const year = resolveLookAheadYear()
    commitYear({
      year,
      data: state.data,
      progress: lookAheadProgress(),
    })
  }

  const applyMetricAppearance = () => {
    const buildingTheme = metricToBuildingTheme(state.particleTheme)

    buildingEntries.forEach((entry) => {
      if (entry.isUserBuilding) {
        // User buildings: metric-colored sphere + rings
        entry.building.setTheme(buildingTheme)
        entry.building.ring1Material.color.setHex(0xffffff)
        entry.building.ring2Material.color.setHex(0xffffff)
        return
      }

      // Baseline buildings: gray sphere, metric-colored rings only
      entry.building.setRingTheme(buildingTheme)
    })
  }

  const setParticleTheme = (theme) => {
    if (!PARTICLE_METRIC[theme]) return
    state.particleTheme = theme
    syncAllParticles()
    applyMetricAppearance()
  }

  const setBuildingSelectHandler = (handler) => {
    buildingSelectHandler = typeof handler === 'function' ? handler : null
    notifyBuildingSelect()
  }

  const setBaselineTotalsHandler = (handler) => {
    baselineTotalsHandler = typeof handler === 'function' ? handler : null
    if (state.ready) notifyBaselineTotals()
  }

  const launchBuildingFromHold = (buildingId, holdSeconds) => {
    const entry = buildingEntries.get(buildingId)
    if (!entry?.isUserBuilding) return false
    applyHoldDurationLaunch(entry, holdSeconds)
    return true
  }

  const selectBuildingById = (buildingId) => {
    const entry = buildingEntries.get(buildingId)
    if (!entry) return false

    const stats = (state.data.buildings ?? []).find((building) => building.id === buildingId)
    if (!entry.isUserBuilding && !isBuildingActive(stats)) return false

    selectedId = buildingId
    notifyBuildingSelect()
    return true
  }

  const setPlacementMode = (enabled) => {
    state.placementMode = Boolean(enabled)
    if (state.placementMode && dragState) {
      dragState = null
    }
  }

  const screenToGround = (clientX, clientY) => {
    if (!domElement) return null
    const rect = domElement.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return null

    pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1
    pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1
    raycaster.setFromCamera(pointer, camera)

    const hit = raycaster.ray.intersectPlane(dragPlane, dragPlaneHit)
    if (!hit) return null

    mapGroup.updateMatrixWorld()
    const local = mapGroup.worldToLocal(dragPlaneHit.clone())

    if (state.mapBounds) {
      const { xMin, xMax, zMin, zMax } = state.mapBounds
      const pad = 0.15
      if (
        local.x < xMin - pad ||
        local.x > xMax + pad ||
        local.z < zMin - pad ||
        local.z > zMax + pad
      ) {
        return null
      }
    }

    if (state.mapMask) {
      const clamped = clampToMask(local.x, local.z, state.mapMask)
      return { x: clamped.x, z: clamped.z }
    }

    return { x: local.x, z: local.z }
  }

  const initBuildings = async () => {
    try {
      const [{ buildings, bounds }, dataset, mask] = await Promise.all([
        loadBuildingPositions(),
        loadSolarDataset(),
        loadMapMask(),
      ])
      state.mapBounds = bounds
      state.mapMask = mask

      state.dataYears = [...(dataset.years ?? [])]
      const lookAheadYear = latestDataYear(dataset)
      state.year = lookAheadYear

      const energyData = mapEnergyYearData(dataset, lookAheadYear)
      const co2Data = mapCo2YearData(dataset, lookAheadYear)
      const savingData = mapSavingYearData(dataset, lookAheadYear)

      const co2ById = new Map((co2Data.buildings ?? []).map((b) => [b.id, b]))
      const savingById = new Map((savingData.buildings ?? []).map((b) => [b.id, b]))

      state.baselineBuildings = energyData.buildings ?? []
      state.baselineTotals = {
        annualKwh: energyData.totalAnnualKwh ?? 0,
        annualCo2Lbs: co2Data.totalAnnualCo2Lbs ?? 0,
        annualSavings: savingData.totalAnnualSavings ?? 0,
      }

      state.metricsById = new Map(
        (energyData.buildings ?? []).map((building) => {
          const co2 = co2ById.get(building.id)
          const saving = savingById.get(building.id)
          return [
            building.id,
            {
              annualKwh: building.annualKwh ?? 0,
              annualCo2Lbs: co2?.annualCo2Lbs ?? 0,
              annualSavings: saving?.annualSavings ?? 0,
            },
          ]
        }),
      )

      mergeSceneData()

      buildings.forEach((position) => {
        const building = new Building({
          theme: 'neutral',
          position: { x: position.x, y: 0, z: position.z },
          scale: BUILDING_SCALE,
        })

        building.group.visible = false
        mapGroup.add(building.group)

        const particles = createBuildingParticles({
          color: PARTICLE_METRIC.energy.color,
        })
        building.group.add(particles.points)

        for (const mesh of [building.sphere, building.ring1, building.ring2]) {
          mesh.userData.futureBuildingId = position.id
        }

        const pickTarget = new THREE.Mesh(
          new THREE.SphereGeometry(1.15, 10, 10),
          new THREE.MeshBasicMaterial({ visible: false, depthWrite: false }),
        )
        pickTarget.userData.futureBuildingId = position.id
        building.group.add(pickTarget)

        buildingEntries.set(position.id, {
          id: position.id,
          name: position.name,
          building,
          particles,
          pickTarget,
          homeX: position.x,
          homeZ: position.z,
          physX: position.x,
          physZ: position.z,
          velX: 0,
          velZ: 0,
          isUserBuilding: false,
        })
        buildingObjects.push(building.group, pickTarget)
      })

      applyMetricAppearance()

      await applyCameraSetup()

      state.ready = true
      commitYear({
        year: lookAheadYear,
        data: state.data,
        progress: lookAheadProgress(),
      })
      mapGroup.visible = true
      notifyBaselineTotals()
    } catch (error) {
      console.warn('[futureScene] Failed to load Look Ahead buildings', error)
    }
  }

  initBuildings()

  const pointer = new THREE.Vector2()
  const raycaster = new THREE.Raycaster()
  const dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
  const dragPlaneHit = new THREE.Vector3()

  const getPickables = () => {
    const meshes = []
    buildingEntries.forEach((entry) => {
      if (!entry.building.group.visible || !entry.pickTarget) return
      meshes.push(entry.pickTarget)
    })
    return meshes
  }

  const setPointerFromEvent = (event) => {
    if (!domElement) return false
    const rect = domElement.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return false
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
    return true
  }

  const pickBuildingAt = (event) => {
    if (!setPointerFromEvent(event)) return null
    raycaster.setFromCamera(pointer, camera)
    const hits = raycaster.intersectObjects(getPickables(), false)
    return resolveBuildingPick(hits, 'futureBuildingId')
  }

  const getLocalPointOnGround = (event) => {
    if (!setPointerFromEvent(event)) return null
    raycaster.setFromCamera(pointer, camera)
    const hit = raycaster.ray.intersectPlane(dragPlane, dragPlaneHit)
    if (!hit) return null
    mapGroup.updateMatrixWorld()
    return mapGroup.worldToLocal(dragPlaneHit.clone())
  }

  const clampDragDelta = (dx, dz) => {
    const distance = Math.hypot(dx, dz)
    if (distance <= MAX_DRAG_DISTANCE) return new THREE.Vector3(dx, 0, dz)
    const ratio = MAX_DRAG_DISTANCE / distance
    return new THREE.Vector3(dx * ratio, 0, dz * ratio)
  }

  const getCollisionRadius = (entry) => {
    const scale = entry.building.group.scale.x || 1
    return COLLISION_RADIUS * Math.abs(scale)
  }

  const stepBuildingPhysics = (dt) => {
    const entries = Array.from(buildingEntries.values()).filter((entry) =>
      entry.building.shouldRender(),
    )

    stepMapBuildingPhysics({
      entries,
      draggedId: dragState?.buildingId ?? null,
      dt,
      getCollisionRadius,
    })
  }

  const onPointerDown = (event) => {
    if (state.placementMode) return

    const hitId = pickBuildingAt(event)
    if (!hitId || !domElement) return
    const entry = buildingEntries.get(hitId)
    if (!entry) return

    selectedId = selectedId === hitId ? null : hitId
    notifyBuildingSelect()

    const startLocalPoint = getLocalPointOnGround(event)
    if (!startLocalPoint) return

    dragState = {
      buildingId: hitId,
      pointerId: event.pointerId,
      startLocalPoint,
      startClientX: event.clientX,
      startClientY: event.clientY,
      originPosition: entry.building.group.position.clone(),
      moved: false,
    }
    suppressNextClick = false
    event.preventDefault()
    domElement.setPointerCapture?.(event.pointerId)
  }

  const onPointerMove = (event) => {
    if (state.placementMode) return
    if (!dragState || event.pointerId !== dragState.pointerId) return
    event.preventDefault()

    const currentLocalPoint = getLocalPointOnGround(event)
    if (!currentLocalPoint) return

    const dx = currentLocalPoint.x - dragState.startLocalPoint.x
    const dz = currentLocalPoint.z - dragState.startLocalPoint.z
    const dragDelta = clampDragDelta(dx, dz)
    if (screenDragDistance(dragState, event) > SCREEN_DRAG_THRESHOLD_PX) {
      dragState.moved = true
    }

    const entry = buildingEntries.get(dragState.buildingId)
    if (!entry) return
    const nextX = dragState.originPosition.x + dragDelta.x
    const nextZ = dragState.originPosition.z + dragDelta.z
    entry.building.targetX = nextX
    entry.building.targetZ = nextZ
    entry.building.setPosition(nextX, entry.building.group.position.y, nextZ)
  }

  const endDrag = (event, { launch }) => {
    if (!dragState || event.pointerId !== dragState.pointerId) return
    if (launch && dragState.moved) {
      suppressNextClick = true
      applyDragReleaseLaunch(buildingEntries.get(dragState.buildingId))
    } else if (dragState.moved) {
      suppressNextClick = true
    }
    releasePointerCaptureSafe(domElement, event.pointerId)
    dragState = null
  }

  const onPointerUp = (event) => {
    endDrag(event, { launch: true })
  }

  const onPointerCancel = (event) => {
    endDrag(event, { launch: false })
  }

  const onLostPointerCapture = (event) => {
    if (!dragState || event.pointerId !== dragState.pointerId) return
    if (dragState.moved) suppressNextClick = true
    dragState = null
  }

  const onPointerLeave = () => {}

  const onPointerClick = (event) => {
    if (state.placementMode) return
    if (suppressNextClick) {
      suppressNextClick = false
      return
    }
    const hitId = pickBuildingAt(event)
    if (hitId) return
    if (!selectedId) return
    clearBuildingSelection()
  }

  const pointerHandlers = {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
    onLostPointerCapture,
    onPointerLeave,
    onClick: onPointerClick,
  }

  const setupInteraction = (element) => {
    domElement = element
    addScenePointerListeners(element, pointerHandlers)
  }

  const disposeInteraction = () => {
    unsubscribeCamera()

    if (domElement) {
      removeScenePointerListeners(domElement, pointerHandlers)
      domElement.style.cursor = ''
      domElement = null
    } else {
      removeScenePointerListeners(null, pointerHandlers)
    }

    selectedId = null
    dragState = null
    suppressNextClick = false
    buildingSelectHandler?.(null)
    baselineTotalsHandler = null

    buildingEntries.forEach((entry) => {
      entry.particles.dispose()
      if (entry.typeIconSprite) {
        entry.typeIconSprite.material.map = null
        entry.typeIconSprite.material.dispose()
      }
      if (entry.stickerSprite) {
        entry.stickerSprite.material.map = null
        entry.stickerSprite.material.dispose()
      }
    })
  }

  const animate = () => {
    const speed = 1 + lookAheadProgress() * 0.5
    const animationTime = getGlobalElapsedTime() * speed
    const transitionTime = getGlobalElapsedTime()

    const now = getGlobalElapsedTime()
    const dt = lastPhysicsTime === null ? 0 : Math.min(now - lastPhysicsTime, 0.05)
    lastPhysicsTime = now
    stepBuildingPhysics(dt)

    let visibleNeutral = 0
    let visibleMetric = 0
    const metricTheme = metricToBuildingTheme(state.particleTheme)
    buildingEntries.forEach((entry) => {
      if (!entry.building.shouldRender()) return
      if (entry.isUserBuilding) visibleMetric++
      else visibleNeutral++
      entry.building.update(animationTime, transitionTime)
      entry.particles.animate(speed)
    })

    if (visibleNeutral > 0) {
      updateBuildingThemeMatcap('neutral', animationTime, 1.5 * speed)
    }
    if (visibleMetric > 0 || visibleNeutral > 0) {
      // Metric theme matcap for user spheres; ring textures shared by all buildings
      updateBuildingThemeMatcap(metricTheme, animationTime, 1.5 * speed)
    }
  }

  return {
    scene,
    camera,
    renderer,
    animate,
    applyYear,
    setParticleTheme,
    setBuildingSelectHandler,
    setBaselineTotalsHandler,
    syncUserBuildings,
    screenToGround,
    setPlacementMode,
    launchBuildingFromHold,
    selectBuildingById,
    setupInteraction,
    disposeInteraction,
    objects: buildingObjects,
  }
}
