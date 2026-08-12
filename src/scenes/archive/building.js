/**
 * ARCHIVED — standalone OrbitControls + lil-gui playground (not wired into the app).
 * Moved out of the live scene registry; keep for troubleshooting reference.
 *
 * DK'S Note:
 * This is the final building look. It has the color of the energy, co2, and money.
 * I can remove the GUI controls but they are there rn for troubleshooting.
 */

import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import GUI from 'lil-gui'

/**
 * Debug
 */
const gui = new GUI()

/**
 * Base
 */
const canvas = document.querySelector('canvas.webgl')
const scene = new THREE.Scene()

/**
 * Textures
 */
const textureLoader = new THREE.TextureLoader()
 const matcapRingTexture = textureLoader.load('./textures/matcaps/EnergyRIng.png')
// const matcapRingTexture = textureLoader.load('./textures/matcaps/Co2Ring.png')
// const matcapRingTexture = textureLoader.load('./textures/matcaps/MoneyRing.png')

/**
 * Matcap texture (procedural + animated)
 * Drawn on an offscreen canvas every frame with small sinusoidal
 * position drift on each blob, so the glow inside the sphere animates.
 */
const MATCAP_SIZE = 512

const matcapCanvas = document.createElement('canvas')
matcapCanvas.width = MATCAP_SIZE
matcapCanvas.height = MATCAP_SIZE
const matcapCtx = matcapCanvas.getContext('2d')

const matcapTexture = new THREE.CanvasTexture(matcapCanvas)
matcapTexture.colorSpace = THREE.SRGBColorSpace

const params = {
    /**EnergyColors */
    baseColor: '#f4e9dc70',
    shadowColor: '#966432',
    coreColor: '#d68c28',
    highlightColor: '#fffaf0',
    rimColor: '#ffa43c',
    animate: true,
    speed: 1.5,

    /**Co2Colors */
    // baseColor: '#dcebff70',
    // shadowColor: '#006aff',
    // coreColor: '#4693ff',
    // highlightColor: '#dcebff',
    // rimColor: '#4693ff',
    // animate: true,
    // speed: 1.5,

    /**MoneyColors */
    // baseColor: '#dbffdb70',
    // shadowColor: '#006c00',
    // coreColor: '#00ff00',
    // highlightColor: '#dbffdb',
    // rimColor: '#00ff00',
    // animate: true,
    // speed: 1.5,

    // Ring pulse animation
    animateRings: true,
    ringDuration: 3,
    ringStagger: 1
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

function updateMatcapTexture(time = 0)
{
    const size = MATCAP_SIZE
    const cx = size / 2
    const cy = size / 2
    const r = size / 2
    const ctx = matcapCtx

    ctx.clearRect(0, 0, size, size)
    ctx.fillStyle = params.baseColor
    ctx.fillRect(0, 0, size, size)

    const t = time * params.speed
    const driftA = { x: Math.sin(t) * size * 0.03, y: Math.cos(t * 0.8) * size * 0.2 }
    const driftB = { x: Math.cos(t * 0.9) * size * 0.025, y: Math.sin(t * 1.1) * size * 0.2 }
    const driftC = { x: Math.sin(t * 0.6) * size * 0.02, y: Math.cos(t * 0.7) * size * 0.1 }

    // Large soft warm shadow, lower-center
    drawBlob(
        ctx,
        cx - size * 0.05 + driftA.x, cy + size * 0.06 + driftA.y, size * 0.46,
        hexToRgba(params.shadowColor, 0.55), hexToRgba(params.shadowColor, 0)
    )

    // Secondary warmer core, slightly left of center
    drawBlob(
        ctx,
        cx - size * 0.16 + driftB.x, cy + size * 0.02 + driftB.y, size * 0.30,
        hexToRgba(params.coreColor, 0.65), hexToRgba(params.coreColor, 0)
    )

    // Bright highlight, upper area (main light source)
    drawBlob(
        ctx,
        cx + size * 0.02 + driftC.x, cy - size * 0.22 + driftC.y, size * 0.42,
        hexToRgba(params.highlightColor, 0.9), hexToRgba(params.highlightColor, 0)
    )

    // Small tight specular highlight, upper-left
    drawBlob(
        ctx,
        cx - size * 0.08 + driftC.x * 0.6, cy - size * 0.28 + driftC.y * 0.6, size * 0.14,
        hexToRgba(params.highlightColor, 0.95), hexToRgba(params.highlightColor, 0)
    )

    // Soft fade near bottom-right edge, drifts opposite to the shadow blob
    drawBlob(
        ctx,
        cx + size * 0.30 - driftA.x, cy + size * 0.28 - driftA.y, size * 0.30,
        'rgba(255, 255, 255, 0.35)', 'rgba(255, 255, 255, 0)'
    )

    // rim edge
    const rimWidth = size * 0.02
    const rimGradient = ctx.createRadialGradient(cx, cy, r - rimWidth * 2.2, cx, cy, r)
    rimGradient.addColorStop(0, hexToRgba(params.rimColor, 0))
    rimGradient.addColorStop(0.65, hexToRgba(params.rimColor, 0.55))
    rimGradient.addColorStop(0.85, 'rgba(255, 255, 255, 0.95)')
    rimGradient.addColorStop(1, hexToRgba(params.rimColor, 0.15))
    ctx.fillStyle = rimGradient
    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, Math.PI * 2)
    ctx.fill()

    matcapTexture.needsUpdate = true
}

updateMatcapTexture(0)

/**
 * Material & object
 */
const sphereMaterial = new THREE.MeshMatcapMaterial()
sphereMaterial.matcap = matcapTexture

// Each ring gets its own material instance so opacity can be animated
// independently per ring (a shared material would fade both at once).
const ring1Material = new THREE.MeshMatcapMaterial()
ring1Material.matcap = matcapRingTexture
ring1Material.transparent = true
ring1Material.depthWrite = false

const ring2Material = ring1Material.clone()

const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(0.5, 64, 64),
    sphereMaterial
)

const ring1 = new THREE.Mesh(
    new THREE.TorusGeometry(0.8, 0.02, 64, 128),
    ring1Material
)
ring1.rotation.y = Math.PI / 2

const ring2 = new THREE.Mesh(
    new THREE.TorusGeometry(1, 0.005, 64, 128),
    ring2Material
)
ring2.rotation.y = Math.PI / 2

scene.add(ring1, ring2, sphere)

/**
 * Ring pulse animation
 * Each ring scales 0 -> 1 (ease-out) over its own cycle while its
 * opacity follows sin(pi * t): 0 at the start, peak at the midpoint,
 * back to 0 at the end. Because opacity has already faded to ~0 by
 * the time scale reaches 1, the loop reset back to scale 0 is invisible.
 */
const rings = [
    { mesh: ring1, material: ring1Material, offset: 0 },
    { mesh: ring2, material: ring2Material, offset: params.ringStagger }
]

function updateRings(time)
{
    const cycle = Math.max(params.ringDuration, 0.001)

    rings.forEach((ring) =>
    {
        const localTime = (time + ring.offset) % cycle
        const t = localTime / cycle // 0 -> 1 across the cycle

        // Ease-out growth: quick start, gentle settle into full size
        const scaleT = 1 - Math.pow(1 - t, 3)
        ring.mesh.scale.setScalar(scaleT)

        // Fade in then out, invisible at both ends of the cycle
        ring.material.opacity = Math.sin(Math.PI * t)
    })
}

/**
 * Debug GUI
 */
const colorsFolder = gui.addFolder('Matcap colors')
colorsFolder.addColor(params, 'baseColor').name('base').onChange(() => updateMatcapTexture(clock.getElapsedTime()))
colorsFolder.addColor(params, 'shadowColor').name('shadow').onChange(() => updateMatcapTexture(clock.getElapsedTime()))
colorsFolder.addColor(params, 'coreColor').name('core').onChange(() => updateMatcapTexture(clock.getElapsedTime()))
colorsFolder.addColor(params, 'highlightColor').name('highlight').onChange(() => updateMatcapTexture(clock.getElapsedTime()))
colorsFolder.addColor(params, 'rimColor').name('rim').onChange(() => updateMatcapTexture(clock.getElapsedTime()))

const animationFolder = gui.addFolder('Animation')
animationFolder.add(params, 'animate').name('animate blobs')
animationFolder.add(params, 'speed', 0, 4, 0.01).name('speed')

const ringsFolder = gui.addFolder('Rings')
ringsFolder.add(params, 'animateRings').name('animate rings')
ringsFolder.add(params, 'ringDuration', 0.5, 6, 0.05).name('duration (s)')
ringsFolder.add(params, 'ringStagger', 0, 6, 0.05).name('stagger (s)')

/**
 * Sizes
 */
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
}

window.addEventListener('resize', () =>
{
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight

    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()

    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
})

/**
 * Camera
 */
const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 100)
camera.position.x = 1.5
scene.add(camera)

// Controls
const controls = new OrbitControls(camera, canvas)
controls.enableDamping = true

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
    canvas: canvas
})
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

/**
 * Animate
 */
const clock = new THREE.Clock()

const tick = () =>
{
    const elapsedTime = clock.getElapsedTime()

    if (params.animate)
    {
        updateMatcapTexture(elapsedTime)
    }

    if (params.animateRings)
    {
        updateRings(elapsedTime)
    }

    controls.update()

    renderer.render(scene, camera)

    window.requestAnimationFrame(tick)
}

tick()