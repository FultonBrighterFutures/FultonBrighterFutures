import { FUTURE_BUILDING_TYPES } from '../../data/futureBuildingTypes'
import BuildingTypeIcon from './BuildingTypeIcon'

export default function BuildingTypeGrid({ selectedType = null, onSelect }) {
  return (
    <div className="building-type-grid" role="group" aria-label="Building types">
      {FUTURE_BUILDING_TYPES.map((type) => {
        const isSelected = selectedType === type.id
        return (
          <button
            key={type.id}
            type="button"
            className={`building-type-btn${isSelected ? ' is-selected' : ''}`}
            aria-pressed={isSelected}
            onClick={() => onSelect?.(type.id)}
          >
            <span className="building-type-btn-face">
              <span className="building-type-btn-icon">
                <BuildingTypeIcon type={type.id} lit={isSelected} />
              </span>
              <span className="building-type-btn-label">{type.label}</span>
            </span>
          </button>
        )
      })}
    </div>
  )
}
