import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import ChromeCtaArrow from '../ChromeCtaArrow'
import BuildingComposer from './BuildingComposer'
import FutureBuildingLog from './FutureBuildingLog'
import FutureStats from './FutureStats'

const METRICS = [
  {
    id: 'energy',
    label: 'ENERGY PRODUCED',
    shortLabel: 'ENERGY',
    dotClass: 'future-bottom-nav-dot--energy',
  },
  {
    id: 'co2',
    label: 'C02 EMISSION REDUCED',
    shortLabel: 'CO2',
    dotClass: 'future-bottom-nav-dot--co2',
  },
  {
    id: 'money',
    label: 'MONEY SAVED',
    shortLabel: 'MONEY',
    dotClass: 'future-bottom-nav-dot--money',
  },
]

/**
 * Drop column aligned to metric-tab edges.
 * `client*` = viewport space for hit-testing; `local*` = overlay space for the guide.
 * @typedef {{
 *   clientLeft: number,
 *   clientRight: number,
 *   localLeft: number,
 *   localTop: number,
 *   width: number,
 *   height: number,
 * } | null} DropZoneBounds
 */

function readDropZoneBounds(overlay, nav) {
  if (!overlay || !nav) return null

  const overlayRect = overlay.getBoundingClientRect()
  const navRect = nav.getBoundingClientRect()
  if (overlayRect.width <= 0 || overlayRect.height <= 0 || navRect.width <= 0) {
    return null
  }

  return {
    clientLeft: navRect.left,
    clientRight: navRect.right,
    localLeft: navRect.left - overlayRect.left,
    localTop: 0,
    width: navRect.width,
    height: overlayRect.height,
  }
}

export default function FutureOverlay({
  onBack,
  activeMetric = 'energy',
  onMetricChange,
  selectedBuilding = null,
  baselineTotals = null,
  addedTotals = null,
  userBuildings = [],
  selectedType = null,
  selectedStickerId = null,
  pendingStickerId = null,
  isStickerOpen = false,
  isPlacing = false,
  isReady = false,
  onSelectType,
  onOpenSticker,
  onCloseSticker,
  onSelectPendingSticker,
  onConfirmSticker,
  onBeginPlacing,
  onCancelPlacing,
  onDrop,
  screenToGround,
  onLaunchBuildingFromHold,
  onSelectBuilding,
}) {
  const overlayRef = useRef(null)
  const metricNavRef = useRef(null)
  /** @type {[DropZoneBounds, function]} */
  const [dropZoneBounds, setDropZoneBounds] = useState(null)

  const measureDropZone = useCallback(() => {
    setDropZoneBounds(readDropZoneBounds(overlayRef.current, metricNavRef.current))
  }, [])

  useLayoutEffect(() => {
    if (!isPlacing) return
    measureDropZone()
  }, [isPlacing, measureDropZone])

  useEffect(() => {
    if (!isPlacing) return undefined

    const overlay = overlayRef.current
    const nav = metricNavRef.current
    const resizeObserver =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => {
            measureDropZone()
          })
        : null

    if (resizeObserver) {
      if (overlay) resizeObserver.observe(overlay)
      if (nav) resizeObserver.observe(nav)
    }

    window.addEventListener('resize', measureDropZone)
    // Mobile Look Ahead can scroll; keep the column aligned with the tabs.
    window.addEventListener('scroll', measureDropZone, true)

    return () => {
      resizeObserver?.disconnect()
      window.removeEventListener('resize', measureDropZone)
      window.removeEventListener('scroll', measureDropZone, true)
    }
  }, [isPlacing, measureDropZone])

  // Ignore stale measurements once placement ends (avoids setState-in-effect clear).
  const activeDropZoneBounds = isPlacing ? dropZoneBounds : null

  return (
    <div ref={overlayRef} className="future-overlay" aria-label="Look Ahead controls">
      {activeDropZoneBounds && (
        <div
          className="building-placement-drop-guide"
          style={{
            left: activeDropZoneBounds.localLeft,
            top: activeDropZoneBounds.localTop,
            width: activeDropZoneBounds.width,
            height: activeDropZoneBounds.height,
          }}
          aria-hidden="true"
        />
      )}

      <FutureStats
        activeMetric={activeMetric}
        baselineTotals={baselineTotals}
        addedTotals={addedTotals}
        selectedBuilding={selectedBuilding}
        hasUserBuildings={userBuildings.length > 0}
      />

      <aside className="future-sidebar">
        <div className="future-sidebar-scroll">
          <header className="future-sidebar-header">
            <h2 className="future-sidebar-title">BUILD YOUR SOLAR FUTURE</h2>
            <p className="future-sidebar-subtitle">
              Each building you add represents a possible future. Explore how your personal choices
              could help power Fulton County with solar.
            </p>
          </header>

          <FutureBuildingLog
            buildings={userBuildings}
            onLaunchFromHold={onLaunchBuildingFromHold}
            onSelectBuilding={onSelectBuilding}
          />

          <BuildingComposer
            selectedType={selectedType}
            selectedStickerId={selectedStickerId}
            pendingStickerId={pendingStickerId}
            isStickerOpen={isStickerOpen}
            isPlacing={isPlacing}
            isReady={isReady}
            activeMetric={activeMetric}
            dropZoneBounds={activeDropZoneBounds}
            onSelectType={onSelectType}
            onOpenSticker={onOpenSticker}
            onCloseSticker={onCloseSticker}
            onSelectPendingSticker={onSelectPendingSticker}
            onConfirmSticker={onConfirmSticker}
            onBeginPlacing={onBeginPlacing}
            onCancelPlacing={onCancelPlacing}
            onDrop={onDrop}
            screenToGround={screenToGround}
          />
        </div>
      </aside>

      <div className="future-chrome-bottom">
        <button type="button" className="chrome-cta future-overlay-back" onClick={onBack}>
          <ChromeCtaArrow direction="left" />
          <span className="chrome-cta-label">Back</span>
        </button>

        <nav ref={metricNavRef} className="future-bottom-nav" aria-label="Future metrics">
          {METRICS.map((metric) => (
            <button
              key={metric.id}
              type="button"
              className={[
                'future-bottom-nav-item',
                `future-bottom-nav-item--${metric.id}`,
                activeMetric === metric.id ? 'future-bottom-nav-item--active' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => onMetricChange?.(metric.id)}
            >
              <span className={`future-bottom-nav-dot ${metric.dotClass}`} aria-hidden="true" />
              <span className="future-bottom-nav-label future-bottom-nav-label--full">
                {metric.label}
              </span>
              <span className="future-bottom-nav-label future-bottom-nav-label--short">
                {metric.shortLabel}
              </span>
            </button>
          ))}
        </nav>
      </div>
    </div>
  )
}
