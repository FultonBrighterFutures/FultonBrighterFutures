import * as THREE from 'three'
import { BUILDING_THEMES } from './themes.js'

const MATCAP_SIZE = 256
const SPHERE_SEGMENTS = 24
const RING_TUBULAR = 16
const RING_RADIAL = 32

const ringTextureCache = new Map()
const sharedTextureLoader = new THREE.TextureLoader()

const sharedGeometries = {
    sphere: new THREE.SphereGeometry(0.5, SPHERE_SEGMENTS, SPHERE_SEGMENTS),
    ring1: new THREE.TorusGeometry(0.8, 0.02, RING_TUBULAR, RING_RADIAL),
    ring2: new THREE.TorusGeometry(1, 0.005, RING_TUBULAR, RING_RADIAL),
}

const ENTRANCE_DURATION = 1.25
const ENTRANCE_FLOAT_HEIGHT = 0.14
const ENTRANCE_STAGGER = 0.07

/** Slowest / fastest ring cycle lengths (seconds) from low → high metric. */
const PULSE_DURATION_SLOW = 5.4
const PULSE_DURATION_FAST = 1.7

/** One animated matcap canvas per theme — shared by all buildings in that theme. */
const themeMatcapState = new Map()

/** Stable 0…1 hash from an id string (same building → same phase every year). */
function hashUnit(seed) {
  const text = String(seed ?? '')
  let hash = 2166136261
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0) / 4294967296
}

function hexToRgba(hex, alpha)
{
    const n = parseInt(hex.replace('#', ''), 16)
    const r = (n >> 16) & 255
    const g = (n >> 8) & 255
    const b = n & 255
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function drawBlob(ctx, x, y, radius, colorInner, colorOuter)
{
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius)
    gradient.addColorStop(0, colorInner)
    gradient.addColorStop(1, colorOuter)
    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.arc(x, y, radius, 0, Math.PI * 2)
    ctx.fill()
}

function loadRingTexture(themeName)
{
    if (!ringTextureCache.has(themeName))
    {
        const path = BUILDING_THEMES[themeName].ringTexture
        const texture = sharedTextureLoader.load(path)
        texture.colorSpace = THREE.SRGBColorSpace
        ringTextureCache.set(themeName, texture)
    }

    return ringTextureCache.get(themeName)
}

function ensureThemeMatcap(themeName)
{
    if (!themeMatcapState.has(themeName))
    {
        const canvas = document.createElement('canvas')
        canvas.width = MATCAP_SIZE
        canvas.height = MATCAP_SIZE
        const ctx = canvas.getContext('2d')
        const texture = new THREE.CanvasTexture(canvas)
        texture.colorSpace = THREE.SRGBColorSpace

        themeMatcapState.set(themeName, {
            canvas,
            ctx,
            texture,
            colors: { ...BUILDING_THEMES[themeName] },
            speed: 1.5,
        })

        drawThemeMatcap(themeName, 0)
    }

    return themeMatcapState.get(themeName)
}

function drawThemeMatcap(themeName, time = 0)
{
    const state = themeMatcapState.get(themeName)
    if (!state) return

    const size = MATCAP_SIZE
    const cx = size / 2
    const cy = size / 2
    const r = size / 2
    const ctx = state.ctx
    const colors = state.colors
    const speed = state.speed

    ctx.clearRect(0, 0, size, size)
    ctx.fillStyle = colors.baseColor
    ctx.fillRect(0, 0, size, size)

    const t = time * speed
    const driftA = { x: Math.sin(t) * size * 0.03, y: Math.cos(t * 0.8) * size * 0.2 }
    const driftB = { x: Math.cos(t * 0.9) * size * 0.025, y: Math.sin(t * 1.1) * size * 0.2 }
    const driftC = { x: Math.sin(t * 0.6) * size * 0.02, y: Math.cos(t * 0.7) * size * 0.1 }

    drawBlob(
        ctx,
        cx - size * 0.05 + driftA.x, cy + size * 0.06 + driftA.y, size * 0.46,
        hexToRgba(colors.shadowColor, 0.55), hexToRgba(colors.shadowColor, 0)
    )

    drawBlob(
        ctx,
        cx - size * 0.16 + driftB.x, cy + size * 0.02 + driftB.y, size * 0.30,
        hexToRgba(colors.coreColor, 0.65), hexToRgba(colors.coreColor, 0)
    )

    drawBlob(
        ctx,
        cx + size * 0.02 + driftC.x, cy - size * 0.22 + driftC.y, size * 0.42,
        hexToRgba(colors.highlightColor, 0.9), hexToRgba(colors.highlightColor, 0)
    )

    drawBlob(
        ctx,
        cx - size * 0.08 + driftC.x * 0.6, cy - size * 0.28 + driftC.y * 0.6, size * 0.14,
        hexToRgba(colors.highlightColor, 0.95), hexToRgba(colors.highlightColor, 0)
    )

    drawBlob(
        ctx,
        cx + size * 0.30 - driftA.x, cy + size * 0.28 - driftA.y, size * 0.30,
        'rgba(255, 255, 255, 0.35)', 'rgba(255, 255, 255, 0)'
    )

    const rimWidth = size * 0.02
    const rimGradient = ctx.createRadialGradient(cx, cy, r - rimWidth * 2.2, cx, cy, r)
    rimGradient.addColorStop(0, hexToRgba(colors.rimColor, 0))
    rimGradient.addColorStop(0.65, hexToRgba(colors.rimColor, 0.55))
    rimGradient.addColorStop(0.85, 'rgba(255, 255, 255, 0.95)')
    rimGradient.addColorStop(1, hexToRgba(colors.rimColor, 0.15))
    ctx.fillStyle = rimGradient
    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, Math.PI * 2)
    ctx.fill()

    state.texture.needsUpdate = true
}

/**
 * Update the shared sphere matcap for a theme once per frame (not per building).
 * @param {string} themeName
 * @param {number} time
 * @param {number} [speed=1.5]
 */
export function updateBuildingThemeMatcap(themeName, time, speed = 1.5)
{
    const state = ensureThemeMatcap(themeName)
    state.speed = speed
    drawThemeMatcap(themeName, time)
}

/**
 * Animated sphere + pulsing rings for Energy / CO2 / Savings scenes.
 */
export class Building
{
    constructor(options = {})
    {
        const {
            theme = 'energy',
            position = { x: 0, y: 0, z: 0 },
            scale = 1,
            animateRings = true,
            ringDuration = 3,
            ringStagger = 1,
            data = null
        } = options

        this.themeName = theme
        this.animateRings = animateRings
        this.ringDuration = ringDuration
        this.ringStagger = ringStagger
        /** Seconds offset into the pulse cycle — set via setPulseFromMetric. */
        this.pulsePhase = 0
        this.data = data
        this.displayOpacity = 1
        this.exitStartOpacity = 1
        this.transitionMode = null
        this.transitionStartTime = 0
        this.transitionDuration = ENTRANCE_DURATION
        this.floatHeight = ENTRANCE_FLOAT_HEIGHT
        this.targetX = position.x
        this.targetZ = position.z

        this.group = new THREE.Group()
        this.group.position.set(position.x, position.y, position.z)
        this.group.scale.setScalar(scale)

        const themeMatcap = ensureThemeMatcap(theme)
        this._createMeshes(themeMatcap.texture)
        this._applyThemeTextures()
        this.update(0)
    }

    _createMeshes(sphereMatcapTexture)
    {
        this.sphereMaterial = new THREE.MeshMatcapMaterial({
            matcap: sphereMatcapTexture,
            transparent: true,
            opacity: 0,
        })

        this.ring1Material = new THREE.MeshMatcapMaterial()
        this.ring1Material.transparent = true
        this.ring1Material.depthWrite = false

        this.ring2Material = this.ring1Material.clone()

        this.sphere = new THREE.Mesh(sharedGeometries.sphere, this.sphereMaterial)

        this.ring1 = new THREE.Mesh(sharedGeometries.ring1, this.ring1Material)
        this.ring1.rotation.x = Math.PI / 2

        this.ring2 = new THREE.Mesh(sharedGeometries.ring2, this.ring2Material)
        this.ring2.rotation.x = Math.PI / 2

        this.rings = [
            { mesh: this.ring1, material: this.ring1Material, offset: 0 },
            { mesh: this.ring2, material: this.ring2Material, offset: this.ringStagger }
        ]

        this.group.add(this.ring1, this.ring2, this.sphere)
    }

    _applyThemeTextures()
    {
        const ringTexture = loadRingTexture(this.themeName)
        this.ring1Material.matcap = ringTexture
        this.ring2Material.matcap = ringTexture
    }

    setTheme(themeName)
    {
        if (!BUILDING_THEMES[themeName])
        {
            throw new Error(`Unknown building theme "${themeName}". Use: ${Object.keys(BUILDING_THEMES).join(', ')}`)
        }

        this.themeName = themeName
        const themeMatcap = ensureThemeMatcap(themeName)
        this.sphereMaterial.matcap = themeMatcap.texture
        this._applyThemeTextures()
    }

    /** Update ring matcaps only — leaves the sphere theme unchanged. */
    setRingTheme(themeName)
    {
        if (!BUILDING_THEMES[themeName])
        {
            throw new Error(`Unknown building theme "${themeName}". Use: ${Object.keys(BUILDING_THEMES).join(', ')}`)
        }

        const ringTexture = loadRingTexture(themeName)
        this.ring1Material.matcap = ringTexture
        this.ring2Material.matcap = ringTexture
        this.ring1Material.color.setHex(0xffffff)
        this.ring2Material.color.setHex(0xffffff)
    }

    setPosition(x, y, z)
    {
        this.group.position.set(x, y, z)
    }

    setScale(scale)
    {
        this.group.scale.setScalar(scale)
    }

    setDisplayOpacity(opacity)
    {
        this.displayOpacity = opacity
        this.sphereMaterial.opacity = opacity
    }

    isTransitioning()
    {
        return this.transitionMode !== null
    }

    hideImmediate()
    {
        this.transitionMode = null
        this.group.visible = false
        this.group.position.y = 0
        this.setDisplayOpacity(0)
    }

    settledVisible()
    {
        this.transitionMode = null
        this.group.visible = true
        this.group.position.y = 0
        this.setDisplayOpacity(1)
    }

    syncToTransition(transition, currentTime, options = {})
    {
        if (!transition) return

        this.transitionMode = transition.type
        this.transitionStartTime = transition.startTime
        this.targetX = this.group.position.x
        this.targetZ = this.group.position.z
        this.group.visible = true

        if (transition.type === 'exit' && !options.continueExit)
        {
            this.exitStartOpacity = this.displayOpacity > 0 ? this.displayOpacity : 1
        }

        this.applyTransitionState(currentTime)
    }

    applyTransitionState(time)
    {
        if (!this.transitionMode) return

        const elapsed = time - this.transitionStartTime

        if (elapsed < 0)
        {
            if (this.transitionMode === 'enter')
            {
                this.group.position.y = -this.floatHeight
                this.setDisplayOpacity(0)
            }
            else
            {
                this.group.position.y = 0
                this.setDisplayOpacity(0)
            }
            return
        }

        const t = Math.min(1, elapsed / this.transitionDuration)
        const eased = 1 - Math.pow(1 - t, 3)

        this.group.position.x = this.targetX
        this.group.position.z = this.targetZ

        if (this.transitionMode === 'enter')
        {
            this.group.position.y = -this.floatHeight * (1 - eased)
            this.setDisplayOpacity(eased)
        }
        else
        {
            this.group.position.y = -this.floatHeight * eased
            this.setDisplayOpacity(this.exitStartOpacity * (1 - eased))
        }

        if (t >= 1)
        {
            if (this.transitionMode === 'enter')
            {
                this.settledVisible()
            }
            else
            {
                this.hideImmediate()
            }
        }
    }

    /** @returns {boolean} whether this building should keep animating/rendering */
    shouldRender()
    {
        return this.group.visible || this.isTransitioning()
    }

    /**
     * Map a building's metric to pulse rhythm + a stable start phase.
     * Higher values → shorter, more frequent cycles; lower → slower pulses.
     * @param {number} value
     * @param {number} minValue
     * @param {number} maxValue
     * @param {string | number} [phaseSeed] building id (keeps phase stable across years)
     */
    setPulseFromMetric(value, minValue, maxValue, phaseSeed = '')
    {
        let t = 0
        if (Number.isFinite(value) && value > 0)
        {
            if (maxValue > minValue)
            {
                t = Math.min(1, Math.max(0, (value - minValue) / (maxValue - minValue)))
            }
            else
            {
                t = 0.5
            }
        }

        this.ringDuration = PULSE_DURATION_SLOW - t * (PULSE_DURATION_SLOW - PULSE_DURATION_FAST)
        this.ringStagger = this.ringDuration / 3
        this.pulsePhase = hashUnit(phaseSeed) * this.ringDuration

        if (this.rings?.[1])
        {
            this.rings[1].offset = this.ringStagger
        }
    }

    _updateRings(time)
    {
        const cycle = Math.max(this.ringDuration, 0.001)

        this.rings.forEach((ring) =>
        {
            let localTime = (time + this.pulsePhase + ring.offset) % cycle
            if (localTime < 0) localTime += cycle
            const t = localTime / cycle
            const scaleT = 1 - Math.pow(1 - t, 3)
            ring.mesh.scale.setScalar(scaleT)
            ring.material.opacity = Math.sin(Math.PI * t) * this.displayOpacity
        })
    }

    /** Per-building update — fade/float transitions + ring pulse. */
    update(time, transitionTime = time)
    {
        if (this.transitionMode)
        {
            this.applyTransitionState(transitionTime)
        }

        if (this.animateRings && this.group.visible)
        {
            this._updateRings(time)
        }
    }

    dispose()
    {
        this.group.remove(this.ring1, this.ring2, this.sphere)
        this.sphereMaterial.dispose()
        this.ring1Material.dispose()
        this.ring2Material.dispose()
    }
}

export function createBuildingArray(records, theme, mapOptions = () => ({}))
{
    return records.map((record, index) =>
    {
        const { position, scale, ...data } = record

        return new Building({
            theme,
            position,
            scale,
            data,
            ...mapOptions(record, index)
        })
    })
}
