import * as THREE from 'three'
import { yearProgress } from '../constants/timeline'
import { loadBuildingPositions } from '../data/mapLayout'
import { formatEnergyKwh } from '../utils/formatMetrics'
import { publicUrl } from '../utils/publicUrl'
import {
  applyCo2Camera,
  getLiveTriptychCamera,
  loadCo2Camera,
  publishTriptychCamera,
  serializeCo2Camera,
  setupTriptychCameraControls,
  subscribeTriptychCamera,
} from './co2Camera'
import { getGlobalElapsedTime } from './sceneAnimation'
import { addLights, createCamera, createRenderer, fitTopDownCamera, isBuildingActive, scaleBuildingByMetric, commitSceneBuildings } from './shared'
import { Building, updateBuildingThemeMatcap } from '../components/building/index.js'
import { createBuildingParticles, PARTICLE_METRIC } from './createBuildingParticles.js'
import {
  MAX_DRAG_DISTANCE,
  COLLISION_RADIUS,
  applyDragReleaseLaunch,
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
/** Rotate map so county spread runs bottom-left → top-right on screen */
const MAP_BASE_ROTATION = 0

/**
 * Energy scene — left triptych panel.
 * Building map driven by solar-data.xlsx via mapEnergyYearData().
 */
export function createEnergyScene(initialYear) {
  const scene = new THREE.Scene()
  const camera = createCamera()
  const renderer = createRenderer()
  const state = {
    year: initialYear,
    data: { buildings: [] },
    ready: false,
    mapBounds: null,
  }

  addLights(scene, 0xfff4e0)
  const rim = new THREE.DirectionalLight(0xff9900, 0.35)
  rim.position.set(-2, 4, 3)
  scene.add(rim)

  const mapGroup = new THREE.Group()
  mapGroup.visible = false
  scene.add(mapGroup)

  const buildingEntries = new Map()
  const buildingObjects = []
  let domElement = null
  let labelEl = null
  let selectedId = null
  let pendingYearPayload = null
  let activeBuildingIds = new Set()
  let dragState = null
  let suppressNextClick = false
  let lastPhysicsTime = null
  let disposeCameraControls = null
  const lookTarget = new THREE.Vector3(0, 0, 0)

  const unsubscribeCamera = subscribeTriptychCamera((next) => {
    applyCo2Camera(camera, next)
    lookTarget.fromArray(next.target)
  })

  const getFocusedBuildingId = () => selectedId

  const hideBuildingLabel = () => {
    if (!labelEl) return
    labelEl.replaceChildren()
    labelEl.hidden = true
  }

  const updateBuildingLabel = (statsOverride) => {
    const focusedId = getFocusedBuildingId()
    if (!labelEl || !focusedId) return

    const entry = buildingEntries.get(focusedId)
    const stats =
      statsOverride ?? (state.data.buildings ?? []).find((building) => building.id === focusedId)

    if (!isBuildingActive(stats)) {
      hideBuildingLabel()
      return
    }

    labelEl.replaceChildren()

    const nameEl = document.createElement('span')
    nameEl.className = 'energy-building-label__name'
    nameEl.textContent = entry?.name ?? ''
    labelEl.append(nameEl)

    // const yearEl = document.createElement('span')
    // yearEl.className = 'energy-building-label__year'
    // yearEl.textContent = String(state.year)
    // labelEl.append(yearEl)

    const statEl = document.createElement('span')
    statEl.className = 'energy-building-label__stat'
    statEl.textContent = formatEnergyKwh(stats?.annualKwh ?? 0)
    labelEl.append(statEl)

    labelEl.hidden = false
  }

  const refreshBuildingLabel = () => {
    if (!getFocusedBuildingId()) {
      hideBuildingLabel()
      return
    }

    updateBuildingLabel()
  }

  const applyCameraSetup = async () => {
    const live = getLiveTriptychCamera()
    if (live) {
      applyCo2Camera(camera, live)
      lookTarget.fromArray(live.target)
      return
    }

    if (state.mapBounds) {
      fitTopDownCamera(camera, state.mapBounds)
      lookTarget.set(0, 0, 0)
    }

    const saved = await loadCo2Camera()
    if (saved) {
      applyCo2Camera(camera, saved)
      lookTarget.fromArray(saved.target)
      publishTriptychCamera(saved)
      return
    }

    publishTriptychCamera(serializeCo2Camera(camera, lookTarget))
  }

  const syncFocusAfterYear = (statsById) => {
    const focusedId = getFocusedBuildingId()

    if (!focusedId) {
      hideBuildingLabel()
      return
    }

    const stats = statsById.get(focusedId)
    if (!isBuildingActive(stats)) {
      if (selectedId === focusedId) selectedId = null
      hideBuildingLabel()
      return
    }

    updateBuildingLabel(stats)
  }

  const commitYear = ({ year, data = {}, progress = yearProgress(year) }) => {
    const statsById = new Map((data.buildings ?? []).map((building) => [building.id, building]))
    const transitionTime = getGlobalElapsedTime()

    activeBuildingIds = commitSceneBuildings(
      buildingEntries,
      statsById,
      year,
      {
        animationTime: transitionTime,
        buildingsList: data.buildings ?? [],
        getMetricValue: (building) => building.annualKwh,
        getScale: (stats, min, max) =>
          scaleBuildingByMetric(stats.annualKwh, min, max, BUILDING_SCALE),
      },
    )

    buildingEntries.forEach((entry) => {
      if (!entry.building.shouldRender()) {
        entry.particles.setCount(0)
        return
      }
      const stats = statsById.get(entry.id)
      entry.particles.setCountFromMetric(
        stats?.annualKwh ?? 0,
        PARTICLE_METRIC.energy.perParticle,
      )
    })

    mapGroup.rotation.y = MAP_BASE_ROTATION + progress * 0.015 - 0.0075
    syncFocusAfterYear(statsById)
  }

  const applyYear = (payload) => {
    state.year = payload.year
    state.data = payload.data
    pendingYearPayload = payload

    if (!state.ready) {
      return
    }

    commitYear(payload)
  }

  const initBuildings = async () => {
    try {
      const { buildings, bounds } = await loadBuildingPositions(
        publicUrl('/data/runtime/building-positions-main.json'),
      )
      state.mapBounds = bounds

      buildings.forEach((position) => {
        const building = new Building({
          theme: 'energy',
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
          mesh.userData.energyBuildingId = position.id
        }

        const pickTarget = new THREE.Mesh(
          new THREE.SphereGeometry(1.15, 10, 10),
          new THREE.MeshBasicMaterial({ visible: false, depthWrite: false }),
        )
        pickTarget.userData.energyBuildingId = position.id
        building.group.add(pickTarget)

        buildingEntries.set(position.id, {
          id: position.id,
          name: position.name,
          building,
          particles,
          pickTarget,
          // Physics state: homeX/homeZ is the fixed map slot a building
          // springs back toward; physX/physZ + velX/velZ are the simulated
          // position/velocity used for collisions and the spring-back.
          homeX: position.x,
          homeZ: position.z,
          physX: position.x,
          physZ: position.z,
          velX: 0,
          velZ: 0,
        })
        buildingObjects.push(building.group, pickTarget)
      })

      await applyCameraSetup()

      state.ready = true
      commitYear(
        pendingYearPayload ?? {
          year: state.year,
          data: state.data,
          progress: yearProgress(state.year),
        },
      )
      mapGroup.visible = true
    } catch (error) {
      console.warn('[energyScene] Failed to load building positions', error)
    }
  }

  initBuildings()

  const pointer = new THREE.Vector2()
  const raycaster = new THREE.Raycaster()

  // Ground plane (y = 0, matching building position.y = 0) used to translate
  // screen-space pointer movement into world-space movement regardless of
  // camera framing. This is then converted into mapGroup's local space so
  // dragging stays correct with the north-up map layout.
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
    return hits[0]?.object?.userData?.energyBuildingId ?? null
  }

  /**
   * Casts the current pointer position onto the y=0 ground plane and returns
   * the hit point converted into mapGroup's local space. Using local space
   * (rather than raw screen deltas) keeps dragging aligned with the cursor
   * regardless of mapGroup's rotation.
   */
  const getLocalPointOnGround = (event) => {
    if (!setPointerFromEvent(event)) return null

    raycaster.setFromCamera(pointer, camera)
    const hit = raycaster.ray.intersectPlane(dragPlane, dragPlaneHit)
    if (!hit) return null

    // Ensure mapGroup's world matrix reflects any rotation applied this
    // frame (e.g. from commitYear) before converting into its local space.
    mapGroup.updateMatrixWorld()
    return mapGroup.worldToLocal(dragPlaneHit.clone())
  }

  const clampDragDelta = (dx, dz) => {
    const distance = Math.hypot(dx, dz)

    if (distance <= MAX_DRAG_DISTANCE) {
      return new THREE.Vector3(dx, 0, dz)
    }

    const ratio = MAX_DRAG_DISTANCE / distance
    return new THREE.Vector3(dx * ratio, 0, dz * ratio)
  }

  // Approximate collision footprint for a building, scaled with however big
  // it's currently rendered (buildings resize based on annualKwh). Adjust
  // COLLISION_RADIUS if this doesn't match the buildings' visual size.
  const getCollisionRadius = (entry) => {
    const scale = entry.building.group.scale.x || 1
    return COLLISION_RADIUS * Math.abs(scale)
  }

  /**
   * Advances the building layout by dt seconds.
   * Dragged building is kinematic; on release it launches with momentum
   * proportional to pull distance, then collides and springs home.
   */
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
    const hitId = pickBuildingAt(event)
    if (!hitId || !domElement) return

    const entry = buildingEntries.get(hitId)
    if (!entry) return

    // Select immediately on press so the info UI shows right away — the
    // same press then continues below to seed drag state, so one mousedown
    // both opens the label and lets the user drag without a second click.
    selectedId = selectedId === hitId ? null : hitId
    refreshBuildingLabel()

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
      // Browser cancelled the gesture (e.g. claimed as scroll) — do not launch.
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

  const onPointerLeave = () => {
    if (!dragState) return
  }

  const onPointerClick = (event) => {
    if (suppressNextClick) {
      suppressNextClick = false
      return
    }

    // Selection/label toggling for building hits is handled in onPointerDown
    // now, so the click handler only needs to clear selection when the
    // pointer comes up over empty space.
    const hitId = pickBuildingAt(event)
    if (hitId) return

    if (!selectedId) return
    selectedId = null
    refreshBuildingLabel()
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
    const panel = element.parentElement
    if (panel) {
      labelEl = document.createElement('div')
      labelEl.className = 'energy-building-label'
      labelEl.hidden = true
      panel.appendChild(labelEl)

      disposeCameraControls = setupTriptychCameraControls({
        getCamera: () => camera,
        getLookTarget: () => lookTarget,
        setLookTarget: (target) => {
          lookTarget.copy(target)
        },
        getMapBounds: () => state.mapBounds,
        fitTopDown: fitTopDownCamera,
        hudParent: panel,
      })
    }

    addScenePointerListeners(element, pointerHandlers)
  }

  const disposeInteraction = () => {
    disposeCameraControls?.()
    disposeCameraControls = null
    unsubscribeCamera()

    if (domElement) {
      removeScenePointerListeners(domElement, pointerHandlers)
      domElement.style.cursor = ''
      domElement = null
    } else {
      removeScenePointerListeners(null, pointerHandlers)
    }

    labelEl?.remove()
    labelEl = null
    selectedId = null
    dragState = null
    suppressNextClick = false

    buildingEntries.forEach((entry) => {
      entry.particles.dispose()
    })
  }

  const animate = () => {
    const speed = 1 + yearProgress(state.year) * 0.5
    const animationTime = getGlobalElapsedTime() * speed
    const transitionTime = getGlobalElapsedTime()

    const now = getGlobalElapsedTime()
    const dt = lastPhysicsTime === null ? 0 : Math.min(now - lastPhysicsTime, 0.05)
    lastPhysicsTime = now

    stepBuildingPhysics(dt)

    let visibleCount = 0

    buildingEntries.forEach((entry) => {
      if (!entry.building.shouldRender()) return
      visibleCount++
      entry.building.update(animationTime, transitionTime)
      entry.particles.animate(speed)
    })

    if (visibleCount > 0) {
      updateBuildingThemeMatcap('energy', animationTime, 1.5 * speed)
    }
  }

  applyYear({ year: initialYear, data: { buildings: [] }, progress: yearProgress(initialYear) })

  return {
    scene,
    camera,
    renderer,
    animate,
    applyYear,
    setupInteraction,
    disposeInteraction,
    objects: buildingObjects,
  }
}