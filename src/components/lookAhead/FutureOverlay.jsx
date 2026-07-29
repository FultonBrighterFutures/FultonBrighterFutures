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
}) {
  return (
    <div className="future-overlay" aria-label="Look Ahead controls">
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

          <FutureBuildingLog buildings={userBuildings} />

          <BuildingComposer
            selectedType={selectedType}
            selectedStickerId={selectedStickerId}
            pendingStickerId={pendingStickerId}
            isStickerOpen={isStickerOpen}
            isPlacing={isPlacing}
            isReady={isReady}
            activeMetric={activeMetric}
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

        <nav className="future-bottom-nav" aria-label="Future metrics">
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
