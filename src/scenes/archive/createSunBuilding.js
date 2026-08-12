/**
 * ARCHIVED — older sun/orb building visual superseded by Building.js + particles.
 * Not imported by the live app; kept for design/history reference.
 */
import * as THREE from 'three'

const CO2_PER_PARTICLE = 7500
const MIN_PARTICLES = 4

/**
 * Reusable sun-like building visual (core + corona + ring + particles).
 * @param {object} options
 * @param {number} [options.scale]
 * @param {number} [options.maxParticles]
 * @param {number} [options.coreColor]
 * @param {number} [options.emissiveColor]
 * @param {number} [options.orbitColor]
 * @param {number} [options.particleSize]
 * @param {boolean} [options.ringFaceCamera] - lay ring flat facing the fixed CO2 camera (below map)
 */
export function createSunBuilding({
  scale = 0.12,
  maxParticles = 100,
  coreColor = 0xc084fc,
  emissiveColor = 0x7c3aed,
  particleColor = 0xd8b4fe,
  orbitColor = 0xe9d5ff,
  particleSize = 0.032,
  ringFaceCamera = false,
} = {}) {
  const group = new THREE.Group()

  const meshSide = ringFaceCamera ? THREE.DoubleSide : THREE.FrontSide
  const coreMaterial = new THREE.MeshStandardMaterial({
    color: coreColor,
    emissive: emissiveColor,
    emissiveIntensity: 0.55,
    roughness: 0.32,
    metalness: 0.2,
    side: meshSide,
  })
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.7, 1), coreMaterial)
  group.add(core)

  const coronaMaterial = new THREE.MeshBasicMaterial({
    color: coreColor,
    transparent: true,
    opacity: 0.12,
    side: meshSide,
  })
  const corona = new THREE.Mesh(new THREE.SphereGeometry(1.0, 12, 12), coronaMaterial)
  group.add(corona)

  const orbitMaterial = new THREE.MeshStandardMaterial({
    color: orbitColor,
    emissive: emissiveColor,
    emissiveIntensity: 0.22,
    transparent: true,
    opacity: 1,
    side: meshSide,
  })
  const orbit = new THREE.Mesh(new THREE.TorusGeometry(1.8, 0.03, 8, 48), orbitMaterial)
  if (ringFaceCamera) {
    orbit.rotation.x = Math.PI / 2
  } else {
    orbit.rotation.z = Math.PI / 2.5
  }
  group.add(orbit)

  const particlePositions = new Float32Array(maxParticles * 3)
  for (let i = 0; i < maxParticles; i++) {
    const r = 2.2 + Math.random() * 1.0
    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(2 * Math.random() - 1)
    particlePositions[i * 3] = r * Math.sin(phi) * Math.cos(theta)
    particlePositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
    particlePositions[i * 3 + 2] = r * Math.cos(phi)
  }

  const particleGeometry = new THREE.BufferGeometry()
  particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3))
  particleGeometry.setDrawRange(0, 0)

  const particles = new THREE.Points(
    particleGeometry,
    new THREE.PointsMaterial({
      color: particleColor,
      size: particleSize,
      transparent: true,
      opacity: 0.72,
      sizeAttenuation: true,
      depthWrite: false,
    }),
  )
  group.add(particles)

  let baseScale = scale
  let orbitBaseScale = 1
  let particleCount = 0
  let phase = Math.random() * Math.PI * 2

  const setScale = (nextScale) => {
    baseScale = nextScale
    group.scale.setScalar(baseScale)
  }

  const setParticleCount = (count) => {
    particleCount = Math.max(0, Math.min(maxParticles, count))
    particleGeometry.setDrawRange(0, particleCount)
  }

  const mapCo2ToParticles = (co2Lbs) => {
    if (co2Lbs <= 0) {
      setParticleCount(0)
      return
    }
    const count = Math.round(co2Lbs / CO2_PER_PARTICLE)
    setParticleCount(Math.max(MIN_PARTICLES, count))
  }

  setScale(scale)

  const animate = (t, speed = 1) => {
    core.rotation.y += 0.008 * speed
    core.rotation.x += 0.004 * speed
    corona.rotation.y -= 0.003 * speed

    if (!ringFaceCamera) {
      orbit.rotation.z += 0.006 * speed
    }

    const pulse = Math.sin(t * Math.PI + phase)
    const pulseScale = orbitBaseScale + pulse * 0.18
    orbit.scale.set(pulseScale, pulseScale, 1)
    orbitMaterial.opacity = 1 - pulse * 0.85

    particles.rotation.y += 0.0012 * speed
    particles.rotation.x += 0.0006 * speed
  }

  const setAnnualIntensity = (annualKwh, maxAnnualKwh = 50000) => {
    const intensity = 0.35 + Math.min(annualKwh / maxAnnualKwh, 1) * 0.45
    coreMaterial.emissiveIntensity = intensity
    orbitBaseScale = 0.85 + Math.min(annualKwh / maxAnnualKwh, 1) * 0.35
  }

  return {
    group,
    core,
    corona,
    orbit,
    particles,
    setScale,
    setParticleCount,
    mapCo2ToParticles,
    setAnnualIntensity,
    animate,
    disposeTargets: [core, corona, orbit, particles],
  }
}

export function co2LbsToParticleCount(co2Lbs, maxParticles = 100) {
  if (co2Lbs <= 0) return 0
  return Math.min(maxParticles, Math.max(MIN_PARTICLES, Math.round(co2Lbs / CO2_PER_PARTICLE)))
}
