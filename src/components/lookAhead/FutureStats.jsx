import { formatCo2Lbs, formatDollars, formatEnergyKwh } from '../../utils/formatMetrics'

function AddPlusIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 27 27" fill="none" aria-hidden="true">
      <path
        d="M13.1247 0C14.2694 0 15.197 0.940157 15.197 2.0999V11.1998H24.1777C25.3222 11.1998 26.25 12.14 26.25 13.2997C26.25 14.4596 25.3222 15.3996 24.1777 15.3996H15.197V24.5001C15.197 25.6598 14.2694 26.6 13.1247 26.6C11.9803 26.6 11.0525 25.6598 11.0525 24.5001V15.3996H2.07227C0.927786 15.3996 0 14.4596 0 13.2997C0 12.14 0.927786 11.1998 2.07227 11.1998H11.0525V2.0999C11.0525 0.940157 11.9803 0 13.1247 0Z"
        fill="currentColor"
      />
    </svg>
  )
}

const METRIC_COPY = {
  energy: {
    label: 'ENERGY GENERATED',
    formatTotal: formatEnergyKwh,
    formatDeltaAmount: (value) => {
      const amount = Math.round(Number(value) || 0)
      return `${Math.abs(amount).toLocaleString()} kWh`
    },
    valueClass: 'future-metric-value--energy',
  },
  co2: {
    label: 'C02 EMISSION REDUCED',
    formatTotal: formatCo2Lbs,
    formatDeltaAmount: (value) => {
      const amount = Math.round(Number(value) || 0)
      return `${Math.abs(amount).toLocaleString()} lbs`
    },
    valueClass: 'future-metric-value--co2',
  },
  money: {
    label: 'MONEY SAVED',
    formatTotal: formatDollars,
    formatDeltaAmount: (value) => {
      const amount = Math.round(Number(value) || 0)
      return `$${Math.abs(amount).toLocaleString()}`
    },
    valueClass: 'future-metric-value--money',
  },
}

export default function FutureStats({
  activeMetric = 'energy',
  baselineTotals = null,
  addedTotals = null,
  selectedBuilding = null,
  hasUserBuildings = false,
}) {
  const copy = METRIC_COPY[activeMetric] ?? METRIC_COPY.energy

  const baselineValue =
    activeMetric === 'co2'
      ? (baselineTotals?.annualCo2Lbs ?? 0)
      : activeMetric === 'money'
        ? (baselineTotals?.annualSavings ?? 0)
        : (baselineTotals?.annualKwh ?? 0)

  const addedValue =
    activeMetric === 'co2'
      ? (addedTotals?.annualCo2Lbs ?? 0)
      : activeMetric === 'money'
        ? (addedTotals?.annualSavings ?? 0)
        : (addedTotals?.annualKwh ?? 0)

  const totalValue = baselineValue + addedValue

  const selectedStat =
    activeMetric === 'co2'
      ? selectedBuilding?.co2Label
      : activeMetric === 'money'
        ? selectedBuilding?.moneyLabel
        : selectedBuilding?.energyLabel

  const buildingLabelClass =
    activeMetric === 'co2'
      ? 'co2-building-label'
      : activeMetric === 'money'
        ? 'saving-building-label'
        : 'energy-building-label'

  return (
    <aside className="future-stats">
      <div className="future-metric">
        <p className="future-metric-label">{copy.label}</p>
        <p className={`future-metric-value ${copy.valueClass}`}>{copy.formatTotal(totalValue)}</p>
        {hasUserBuildings ? (
          <p className="future-metric-sub future-metric-sub--delta">
            <span className="future-metric-sub-icon">
              <AddPlusIcon />
            </span>
            <span>{copy.formatDeltaAmount(addedValue)}</span>
          </p>
        ) : (
          <p className="future-metric-sub">Baseline 2026</p>
        )}
      </div>

      {selectedBuilding && (
        <div className={`future-building-info ${buildingLabelClass}`} aria-live="polite">
          <span className={`${buildingLabelClass}__name`}>{selectedBuilding.name}</span>
          <span className={`${buildingLabelClass}__stat`}>{selectedStat}</span>
        </div>
      )}
    </aside>
  )
}
