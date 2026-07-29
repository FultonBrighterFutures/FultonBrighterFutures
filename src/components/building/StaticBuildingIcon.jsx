import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { Building, updateBuildingThemeMatcap } from './Building.js'
import './StaticBuildingIcon.css'

const RING_TINT = 0x9a9a9a

/**
 * Animated building visual for UI chrome (timeline building count, etc.).
 * @param {boolean} [tintRings=true] gray ring tint (timeline); false uses theme matcaps
 */
export default function StaticBuildingIcon({ className = '', theme = 'neutral', tintRings = true }) {
  const containerRef = useRef(null)
  const buildingRef = useRef(null)
  const themeRef = useRef(theme)
  const tintRingsRef = useRef(tintRings)

  themeRef.current = theme
  tintRingsRef.current = tintRings

  useEffect(() => {
    const building = buildingRef.current
    if (!building) return

    building.setTheme(theme)
    const ringTint = tintRings ? RING_TINT : 0xffffff
    building.ring1Material.color.setHex(ringTint)
    building.ring2Material.color.setHex(ringTint)
  }, [theme, tintRings])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const scene = new THREE.Scene()
    const clock = new THREE.Clock()

    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100)
    const fitTopDownIconCamera = () => {
      const span = 2.1
      const fovRad = (camera.fov * Math.PI) / 180
      const height = (span / 2) / Math.tan(fovRad / 2)

      camera.position.set(0, height, 0)
      camera.up.set(0, 0, -1)
      camera.lookAt(0, 0, 0)
      camera.updateProjectionMatrix()
    }

    fitTopDownIconCamera()

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    container.appendChild(renderer.domElement)

    const building = new Building({
      theme: themeRef.current,
      scale: 0.9,
      animateRings: true,
    })
    const ringTint = tintRingsRef.current ? RING_TINT : 0xffffff
    building.ring1Material.color.setHex(ringTint)
    building.ring2Material.color.setHex(ringTint)
    building.settledVisible()
    buildingRef.current = building
    scene.add(building.group)

    let frameId = 0

    const resize = () => {
      const width = container.clientWidth
      const height = container.clientHeight
      if (width === 0 || height === 0) return false

      camera.aspect = width / height
      camera.updateProjectionMatrix()
      renderer.setSize(width, height, false)
      return true
    }

    const animate = () => {
      frameId = requestAnimationFrame(animate)

      if (!resize()) return

      const time = clock.getElapsedTime()
      updateBuildingThemeMatcap(themeRef.current, time, 1.5)
      building.update(time)
      renderer.render(scene, camera)
    }

    resize()
    animate()

    const resizeObserver = new ResizeObserver(() => {
      resize()
    })
    resizeObserver.observe(container)

    return () => {
      cancelAnimationFrame(frameId)
      resizeObserver.disconnect()
      building.dispose()
      buildingRef.current = null
      renderer.dispose()
      renderer.forceContextLoss()
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement)
      }
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className={`static-building-icon${className ? ` ${className}` : ''}`}
      aria-hidden="true"
    />
  )
}
