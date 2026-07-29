import SelectedBuildingOrb from './SelectedBuildingOrb'

export default function BuildingPreview({ typeId = null, stickerId = null, metric = 'energy' }) {
  const hasType = Boolean(typeId)

  return (
    <div
      className={`building-preview${hasType ? ' building-preview--filled' : ''}`}
      aria-live="polite"
    >
      <span className="building-preview-bracket building-preview-bracket--tl" aria-hidden="true" />
      <span className="building-preview-bracket building-preview-bracket--tr" aria-hidden="true" />
      <span className="building-preview-bracket building-preview-bracket--bl" aria-hidden="true" />
      <span className="building-preview-bracket building-preview-bracket--br" aria-hidden="true" />

      <div className="building-preview-content">
        <SelectedBuildingOrb
          typeId={typeId}
          stickerId={stickerId}
          metric={metric}
          active={hasType}
        />
      </div>

      {!hasType && <p className="building-preview-empty">Choose Building Type</p>}
    </div>
  )
}
