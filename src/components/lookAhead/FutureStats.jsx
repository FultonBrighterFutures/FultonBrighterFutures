import { formatCo2Lbs, formatDollars, formatEnergyKwh } from '../../utils/formatMetrics'

const METRIC_COPY = {
  energy: {
    label: 'ENERGY GENERATED',
    formatTotal: formatEnergyKwh,
    formatDelta: (value) => {
      const amount = Math.round(Number(value) || 0)
      const sign = amount >= 0 ? '+' : '−'
      return `${sign} ${Math.abs(amount).toLocaleString()} kWh`
    },
    valueClass: 'future-metric-value--energy',
  },
  co2: {
    label: 'C02 EMISSION REDUCED',
    formatTotal: formatCo2Lbs,
    formatDelta: (value) => {
      const amount = Math.round(Number(value) || 0)
      const sign = amount >= 0 ? '+' : '−'
      return `${sign} ${Math.abs(amount).toLocaleString()} lbs`
    },
    valueClass: 'future-metric-value--co2',
  },
  money: {
    label: 'MONEY SAVED',
    formatTotal: formatDollars,
    formatDelta: (value) => {
      const amount = Math.round(Number(value) || 0)
      const sign = amount >= 0 ? '+' : '−'
      return `${sign} $${Math.abs(amount).toLocaleString()}`
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

  const subLabel = hasUserBuildings ? copy.formatDelta(addedValue) : 'Baseline 2026'

  return (
    <aside className="future-stats">
      <div className="future-metric">
        <p className="future-metric-label">{copy.label}</p>
        <p className={`future-metric-value ${copy.valueClass}`}>{copy.formatTotal(totalValue)}</p>
        <p className="future-metric-sub">{subLabel}</p>
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
