import { useEffect, useRef, useState } from 'react'
import { yearProgress } from '../constants/timeline'
import { loadSceneCsv, mapSceneYearData } from '../data'
import { sceneFactories } from '../scenes'
import { formatCo2Equivalency, formatEnergyEquivalency } from '../utils/epaEquivalencies'
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

function getYearTotalValue(variant, data) {
  if (variant === 'energy') {
    return data.totalAnnualKwh ?? sumBuildingMetric(data.buildings, 'annualKwh')
  }

  if (variant === 'co2') {
    return data.totalAnnualCo2Lbs ?? sumBuildingMetric(data.buildings, 'annualCo2Lbs')
  }

  if (variant === 'saving') {
    return data.totalAnnualSavings ?? sumBuildingMetric(data.buildings, 'annualSavings')
  }

  return null
}

function formatYearTotal(variant, data) {
  const total = getYearTotalValue(variant, data)
  if (total == null) return null

  if (variant === 'energy') return formatEnergyKwh(total)
  if (variant === 'co2') return formatCo2Lbs(total)
  if (variant === 'saving') return formatDollars(total)

  return null
}

function getYearEquivalency(variant, data) {
  if (variant === 'energy') {
    return formatEnergyEquivalency(getYearTotalValue(variant, data))
  }

  if (variant === 'co2') {
    return formatCo2Equivalency(getYearTotalValue(variant, data))
  }

  return null
}

function EquivalencyIcon({ type }) {
  if (type === 'home') {
    return (
      <svg
        className="scene-year-total__equiv-icon"
        viewBox="0 0 24 24"
        width="22"
        height="22"
        aria-hidden="true"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3 10.5 12 3l9 7.5" />
        <path d="M5.5 9.5V21h13V9.5" />
        <path d="M10 21v-6h4v6" />
      </svg>
    )
  }

  if (type === 'car') {
    return (
      <svg
        className="scene-year-total__equiv-icon"
        width="20"
        height="16"
        viewBox="0 0 20 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path
          d="M18.5 12.75V7.5C18.5 6.6716 17.8284 6 17 6H2.5C1.67157 6 1 6.6716 1 7.5V12.75M18.5 12.75H17M18.5 12.75V14.5C18.5 14.9142 18.1642 15.25 17.75 15.25C17.3358 15.25 17 14.9142 17 14.5V12.75M1 12.75H2.5M1 12.75V14.5C1 14.9142 1.33579 15.25 1.75 15.25C2.16421 15.25 2.5 14.9142 2.5 14.5V12.75M17 12.75H13.75M13.75 12.75H5.75M13.75 12.75V10.5C13.75 9.6716 13.0784 9 12.25 9H7.25C6.42157 9 5.75 9.6716 5.75 10.5V12.75M5.75 12.75H2.5M2.34961 6L2.91145 4.5L4.04491 1.47386C4.2643 0.88812 4.82413 0.5 5.44961 0.5H14.0516C14.677 0.5 15.2369 0.88812 15.4563 1.47386L16.5898 4.5L17.1516 6M16.5898 4.5H19M2.91145 4.5H0.5"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    )
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
  onInteraction,
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
  const [yearEquivalency, setYearEquivalency] = useState(null)

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
      setYearEquivalency(getYearEquivalency(variant, data))
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
    <div
      className={`three-panel three-panel--${variant}`}
      ref={containerRef}
      role="img"
      aria-label={label}
      onPointerDown={onInteraction}
    >
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
          {year === 2026 && (
            <span className="scene-year-total__subtitle">(Jan–Jun 2026)</span>
          )}
          {yearEquivalency && (
            <div className="scene-year-total__equiv">
              <span className="scene-year-total__equiv-text">{yearEquivalency.text}</span>
              <EquivalencyIcon type={yearEquivalency.icon} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
