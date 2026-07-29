import { useEffect, useRef, useState } from 'react'
import { yearProgress } from '../constants/timeline'
import { loadSceneCsv, mapSceneYearData } from '../data'
import { sceneFactories } from '../scenes'
import { formatCo2Lbs, formatDollars, formatEnergyKwh } from '../utils/formatMetrics'

/**
 * Mounts a Three.js scene and wires the timeline + CSV data pipeline.
 *
 * On year change:
 * 1. loadSceneCsv(variant)  → public/data/{variant}.csv
 * 2. mapSceneYearData()     → src/data/mapYearData.js
 * 3. applyYear({ year, data, progress }) → src/scenes/{variant}Scene.js
 */

function disposeObject(object) {
  object.traverse((child) => {
    if (child.geometry) {
      child.geometry.dispose()
    }
    if (child.material) {
      if (Array.isArray(child.material)) {
        child.material.forEach((material) => material.dispose())
      } else {
        child.material.dispose()
      }
    }
  })
}

function sumBuildingMetric(buildings, key) {
  return (buildings ?? []).reduce((sum, building) => sum + (Number(building?.[key]) || 0), 0)
}

function formatYearTotal(variant, data) {
  if (variant === 'energy') {
    const total = data.totalAnnualKwh ?? sumBuildingMetric(data.buildings, 'annualKwh')
    return formatEnergyKwh(total)
  }

  if (variant === 'co2') {
    const total = data.totalAnnualCo2Lbs ?? sumBuildingMetric(data.buildings, 'annualCo2Lbs')
    return formatCo2Lbs(total)
  }

  if (variant === 'saving') {
    const total = data.totalAnnualSavings ?? sumBuildingMetric(data.buildings, 'annualSavings')
    return formatDollars(total)
  }

  return null
}

export default function ThreePanel({
  variant,
  label,
  year,
  particleTheme,
  onBuildingSelect,
  userBuildings,
  placementMode = false,
  onBaselineTotals,
  onFutureApi,
}) {
  const containerRef = useRef(null)
  const applyYearRef = useRef(null)
  const setParticleThemeRef = useRef(null)
  const setBuildingSelectHandlerRef = useRef(null)
  const setBaselineTotalsHandlerRef = useRef(null)
  const syncUserBuildingsRef = useRef(null)
  const setPlacementModeRef = useRef(null)
  const screenToGroundRef = useRef(null)
  const launchBuildingFromHoldRef = useRef(null)
  const selectBuildingByIdRef = useRef(null)
  const onBuildingSelectRef = useRef(onBuildingSelect)
  const onBaselineTotalsRef = useRef(onBaselineTotals)
  const onFutureApiRef = useRef(onFutureApi)
  onBuildingSelectRef.current = onBuildingSelect
  onBaselineTotalsRef.current = onBaselineTotals
  onFutureApiRef.current = onFutureApi
  const [yearTotalLabel, setYearTotalLabel] = useState(null)

  useEffect(() => {
    const container = containerRef.current
    const createScene = sceneFactories[variant]
    if (!container || !createScene) return

    const sceneApi = variant === 'future' ? createScene() : createScene(year)
    const {
      scene,
      camera,
      renderer,
      animate,
      applyYear,
      objects,
      setupInteraction,
      disposeInteraction,
      setParticleTheme,
      setBuildingSelectHandler,
      setBaselineTotalsHandler,
      syncUserBuildings,
      screenToGround,
      setPlacementMode,
      launchBuildingFromHold,
      selectBuildingById,
    } = sceneApi

    applyYearRef.current = applyYear
    setParticleThemeRef.current = setParticleTheme ?? null
    setBuildingSelectHandlerRef.current = setBuildingSelectHandler ?? null
    setBaselineTotalsHandlerRef.current = setBaselineTotalsHandler ?? null
    syncUserBuildingsRef.current = syncUserBuildings ?? null
    setPlacementModeRef.current = setPlacementMode ?? null
    screenToGroundRef.current = screenToGround ?? null
    launchBuildingFromHoldRef.current = launchBuildingFromHold ?? null
    selectBuildingByIdRef.current = selectBuildingById ?? null

    setBuildingSelectHandlerRef.current?.((building) => {
      onBuildingSelectRef.current?.(building)
    })
    setBaselineTotalsHandlerRef.current?.((totals) => {
      onBaselineTotalsRef.current?.(totals)
    })

    if (variant === 'future') {
      onFutureApiRef.current?.({
        screenToGround: (clientX, clientY) => screenToGroundRef.current?.(clientX, clientY) ?? null,
        setPlacementMode: (enabled) => setPlacementModeRef.current?.(enabled),
        launchBuildingFromHold: (buildingId, holdSeconds) =>
          launchBuildingFromHoldRef.current?.(buildingId, holdSeconds) ?? false,
        selectBuildingById: (buildingId) =>
          selectBuildingByIdRef.current?.(buildingId) ?? false,
      })
    }

    renderer.domElement.setAttribute('aria-label', label)
    container.appendChild(renderer.domElement)
    setupInteraction?.(renderer.domElement)

    const resize = () => {
      const width = container.clientWidth
      const height = container.clientHeight
      if (width === 0 || height === 0) return

      camera.aspect = width / height
      camera.updateProjectionMatrix()
      renderer.setSize(width, height, false)
    }

    resize()
    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(container)

    let frameId = 0
    const renderLoop = () => {
      frameId = requestAnimationFrame(renderLoop)
      animate()
      renderer.render(scene, camera)
    }
    renderLoop()

    return () => {
      cancelAnimationFrame(frameId)
      resizeObserver.disconnect()
      disposeInteraction?.()
      container.removeChild(renderer.domElement)
      objects.forEach(disposeObject)
      renderer.dispose()
      applyYearRef.current = null
      setParticleThemeRef.current = null
      setBuildingSelectHandlerRef.current = null
      setBaselineTotalsHandlerRef.current = null
      syncUserBuildingsRef.current = null
      setPlacementModeRef.current = null
      screenToGroundRef.current = null
      launchBuildingFromHoldRef.current = null
      selectBuildingByIdRef.current = null
      if (variant === 'future') {
        onFutureApiRef.current?.(null)
      }
    }
    // year intentionally omitted — scene updates via applyYear effect, not remount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variant, label])

  // Timeline + CSV → scene: loads data for the year, then calls applyYear()
  useEffect(() => {
    if (year === undefined) return

    let cancelled = false

    const updateFromYear = async () => {
      const progress = yearProgress(year)
      let data = { year }

      if (variant !== 'future') {
        try {
          const rows = await loadSceneCsv(variant)
          if (cancelled) return
          data = mapSceneYearData(variant, rows, year)
        } catch (error) {
          console.warn(`[data] Failed to load CSV for "${variant}" year ${year}`, error)
        }
      }

      if (cancelled) return
      applyYearRef.current?.({ year, data, progress })
      setYearTotalLabel(formatYearTotal(variant, data))
    }

    updateFromYear()

    return () => {
      cancelled = true
    }
  }, [year, variant])

  useEffect(() => {
    if (variant !== 'future' || !particleTheme) return
    setParticleThemeRef.current?.(particleTheme)
  }, [variant, particleTheme])

  useEffect(() => {
    if (variant !== 'future') return
    syncUserBuildingsRef.current?.(userBuildings ?? [])
  }, [variant, userBuildings])

  useEffect(() => {
    if (variant !== 'future') return
    setPlacementModeRef.current?.(placementMode)
  }, [variant, placementMode])

  useEffect(() => {
    if (variant !== 'future') return
    setBaselineTotalsHandlerRef.current?.((totals) => {
      onBaselineTotalsRef.current?.(totals)
    })
  }, [variant, onBaselineTotals])

  return (
    <div className={`three-panel three-panel--${variant}`} ref={containerRef} role="img" aria-label={label}>
      {yearTotalLabel && variant !== 'future' && (
        <div className={`scene-year-total scene-year-total--${variant}`} aria-live="polite">
          <span className="scene-year-total__label">
            {variant === 'energy'
              ? 'ENERGY GENERATED'
              : variant === 'co2'
                ? 'C02 EMISSION REDUCED'
                : 'TAX PAYER MONEY SAVED'}
          </span>
          <span className="scene-year-total__value">{yearTotalLabel}</span>
          {variant === 'saving' && year === 2026 && (
            <span className="scene-year-total__subtitle">(Jan–Jun 2026)</span>
          )}
        </div>
      )}
    </div>
  )
}
