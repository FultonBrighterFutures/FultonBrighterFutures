import * as THREE from 'three'

const CO2_CAMERA_STORAGE_KEY = 'solar-dinosaur.co2-camera'
const CO2_CAMERA_URL = '/data/runtime/co2-camera.json'
const EDIT_STORAGE_KEY = 'solar-dinosaur.triptych-camera-edit'
const EDIT_QUERY_PARAM = 'triptychCamera'

const PAN_STEP = 0.12
const ZOOM_STEP = 0.08

/**
 * @typedef {{ position: number[], target: number[], up: number[] }} Co2CameraState
 */

/** @type {Co2CameraState | null} */
let liveState = null
const subscribers = new Set()

/**
 * URL `?triptychCamera=1|0` overrides and persists to localStorage.
 * Otherwise uses the last toggled preference (default: off).
 */
export function isTriptychCameraEditEnabled() {
  try {
    const fromUrl = new URLSearchParams(window.location.search).get(EDIT_QUERY_PARAM)
    if (fromUrl === '1' || fromUrl === 'true') {
      localStorage.setItem(EDIT_STORAGE_KEY, '1')
      return true
    }
    if (fromUrl === '0' || fromUrl === 'false') {
      localStorage.setItem(EDIT_STORAGE_KEY, '0')
      return false
    }
  } catch {
    // ignore
  }

  try {
    return localStorage.getItem(EDIT_STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

/**
 * @param {boolean} enabled
 */
export function setTriptychCameraEditEnabled(enabled) {
  try {
    localStorage.setItem(EDIT_STORAGE_KEY, enabled ? '1' : '0')
  } catch {
    // ignore
  }
}

/**
 * @returns {Promise<Co2CameraState | null>}
 */
export async function loadCo2Camera() {
  // localStorage wins so S-key tweaks survive refresh before you paste into the repo JSON
  try {
    const raw = localStorage.getItem(CO2_CAMERA_STORAGE_KEY)
    if (raw) {
      const data = JSON.parse(raw)
      if (data?.position && data?.target) {
        return data
      }
    }
  } catch {
    // fall through to committed file
  }

  try {
    const response = await fetch(CO2_CAMERA_URL)
    if (response.ok) {
      const data = await response.json()
      if (data?.position && data?.target) {
        return data
      }
    }
  } catch {
    return null
  }

  return null
}

/**
 * @param {Co2CameraState} state
 */
export function saveCo2Camera(state) {
  const payload = JSON.stringify(state, null, 2)
  localStorage.setItem(CO2_CAMERA_STORAGE_KEY, payload)
  console.info(
    '[triptych camera] Saved. Paste into public/data/runtime/co2-camera.json to persist in the repo:\n',
    payload,
  )
  return payload
}

/**
 * @param {import('three').PerspectiveCamera} camera
 * @param {Co2CameraState} state
 */
export function applyCo2Camera(camera, state) {
  const target = new THREE.Vector3().fromArray(state.target)
  camera.position.fromArray(state.position)
  if (state.up?.length === 3) {
    camera.up.fromArray(state.up)
  }
  camera.lookAt(target)
  camera.updateProjectionMatrix()
}

/**
 * @param {import('three').PerspectiveCamera} camera
 * @param {THREE.Vector3} target
 * @returns {Co2CameraState}
 */
export function serializeCo2Camera(camera, target) {
  return {
    position: camera.position.toArray(),
    target: target.toArray(),
    up: camera.up.toArray(),
  }
}

/**
 * @param {(state: Co2CameraState) => void} listener
 * @returns {() => void}
 */
export function subscribeTriptychCamera(listener) {
  subscribers.add(listener)
  if (liveState) listener(liveState)
  return () => subscribers.delete(listener)
}

/**
 * @param {Co2CameraState} state
 */
export function publishTriptychCamera(state) {
  liveState = state
  subscribers.forEach((listener) => listener(state))
}

export function getLiveTriptychCamera() {
  return liveState
}

function formatHud(state) {
  if (!state) return 'No camera state'
  const p = state.position.map((n) => n.toFixed(3))
  const t = state.target.map((n) => n.toFixed(3))
  return [
    'Triptych camera (edit on)',
    `pos  [${p.join(', ')}]`,
    `tgt  [${t.join(', ')}]`,
    '',
    'Arrows · pan X/Z',
    'Q/E · up/down Y',
    '+/- · zoom',
    'S · save',
    'R · reset top-down',
    'Shift+C · toggle off',
  ].join('\n')
}

/**
 * Keyboard pan/zoom/save for the shared triptych camera.
 * Edit mode is off by default — toggle with Shift+C or `?triptychCamera=1`.
 * Call once (e.g. from the energy panel). All subscribed cameras stay in sync.
 *
 * @param {object} options
 * @param {() => import('three').PerspectiveCamera | null} options.getCamera
 * @param {() => THREE.Vector3} options.getLookTarget
 * @param {(target: THREE.Vector3) => void} options.setLookTarget
 * @param {() => object | null} [options.getMapBounds]
 * @param {(camera: import('three').PerspectiveCamera, bounds: object) => void} [options.fitTopDown]
 * @param {HTMLElement} [options.hudParent]
 */
export function setupTriptychCameraControls({
  getCamera,
  getLookTarget,
  setLookTarget,
  getMapBounds,
  fitTopDown,
  hudParent,
}) {
  let editEnabled = isTriptychCameraEditEnabled()
  let hudEl = null

  const ensureHud = () => {
    if (!hudParent || hudEl) return
    hudEl = document.createElement('pre')
    hudEl.className = 'triptych-camera-hud'
    hudEl.setAttribute('data-no-timeline-scroll', '')
    hudParent.appendChild(hudEl)
  }

  const setHudVisible = (visible) => {
    if (visible) {
      ensureHud()
      if (hudEl) hudEl.hidden = false
    } else if (hudEl) {
      hudEl.hidden = true
    }
  }

  const refreshHud = () => {
    if (!hudEl || !editEnabled) return
    hudEl.textContent = formatHud(liveState ?? serializeFromLive())
  }

  const serializeFromLive = () => {
    const camera = getCamera()
    if (!camera) return null
    return serializeCo2Camera(camera, getLookTarget())
  }

  const commit = () => {
    const camera = getCamera()
    if (!camera) return
    camera.lookAt(getLookTarget())
    camera.updateProjectionMatrix()
    publishTriptychCamera(serializeCo2Camera(camera, getLookTarget()))
    refreshHud()
  }

  const pan = (dx, dy, dz) => {
    const camera = getCamera()
    if (!camera) return
    const delta = new THREE.Vector3(dx, dy, dz)
    camera.position.add(delta)
    const target = getLookTarget()
    target.add(delta)
    setLookTarget(target)
    commit()
  }

  const zoom = (factor) => {
    const camera = getCamera()
    if (!camera) return
    const target = getLookTarget()
    const offset = camera.position.clone().sub(target)
    offset.multiplyScalar(factor)
    camera.position.copy(target).add(offset)
    commit()
  }

  const setEditEnabled = (enabled) => {
    editEnabled = enabled
    setTriptychCameraEditEnabled(enabled)
    setHudVisible(enabled)
    if (enabled) {
      refreshHud()
      console.info(
        '[triptych camera] Edit mode ON — Arrows pan · Q/E raise/lower · +/- zoom · S save · R reset · Shift+C off',
      )
    } else {
      console.info('[triptych camera] Edit mode OFF — Shift+C or ?triptychCamera=1 to enable')
    }
  }

  const onKeyDown = (event) => {
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
      return
    }

    // Toggle is always available so collaborators can discover the tool
    if (event.shiftKey && (event.key === 'C' || event.key === 'c')) {
      event.preventDefault()
      setEditEnabled(!editEnabled)
      return
    }

    if (!editEnabled) return

    const step = event.shiftKey ? PAN_STEP * 3 : PAN_STEP
    let handled = true

    switch (event.key) {
      case 'ArrowLeft':
        pan(-step, 0, 0)
        break
      case 'ArrowRight':
        pan(step, 0, 0)
        break
      case 'ArrowUp':
        pan(0, 0, -step)
        break
      case 'ArrowDown':
        pan(0, 0, step)
        break
      case 'q':
      case 'Q':
        pan(0, step, 0)
        break
      case 'e':
      case 'E':
        pan(0, -step, 0)
        break
      case '=':
      case '+':
        zoom(1 - ZOOM_STEP)
        break
      case '-':
      case '_':
        zoom(1 + ZOOM_STEP)
        break
      case 's':
      case 'S': {
        const state = serializeFromLive()
        if (state) saveCo2Camera(state)
        break
      }
      case 'r':
      case 'R': {
        const camera = getCamera()
        const bounds = getMapBounds?.()
        if (camera && bounds && fitTopDown) {
          fitTopDown(camera, bounds)
          setLookTarget(new THREE.Vector3(0, 0, 0))
          commit()
        }
        break
      }
      default:
        handled = false
    }

    if (handled) event.preventDefault()
  }

  window.addEventListener('keydown', onKeyDown)

  const unsubHud = subscribeTriptychCamera(() => {
    refreshHud()
  })

  setHudVisible(editEnabled)
  refreshHud()
  console.info(
    editEnabled
      ? '[triptych camera] Edit mode ON — Arrows pan · Q/E raise/lower · +/- zoom · S save · R reset · Shift+C off'
      : '[triptych camera] Edit mode OFF — press Shift+C or open with ?triptychCamera=1',
  )

  return () => {
    window.removeEventListener('keydown', onKeyDown)
    unsubHud()
    hudEl?.remove()
  }
}

export {
  CO2_CAMERA_STORAGE_KEY,
  EDIT_QUERY_PARAM,
  EDIT_STORAGE_KEY,
  formatHud,
}
