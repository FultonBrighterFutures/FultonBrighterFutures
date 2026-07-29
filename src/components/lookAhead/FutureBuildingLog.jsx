import { getFutureBuildingType } from '../../data/futureBuildingTypes'
import { getFutureSticker } from '../../data/futureStickers'
import buildingListIcon from '../../assets/buildinglist-icon.svg'
import BuildingTypeIcon from './BuildingTypeIcon'

export default function FutureBuildingLog({ buildings = [] }) {
  return (
    <ul className="future-building-log" aria-label="Added buildings">
      {buildings.map((building) => {
        const type = getFutureBuildingType(building.type)
        const sticker = getFutureSticker(building.stickerId)
        const title = `${type?.displayName ?? 'Solar'} Building Added`

        return (
          <li key={building.id} className="future-building-card">
            <span className="future-building-card-icon" aria-hidden="true">
              <img className="future-building-card-bg" src={buildingListIcon} alt="" />
              <span className="future-building-card-type">
                <BuildingTypeIcon type={building.type} lit />
              </span>
              {sticker && (
                <span className="future-building-card-sticker">
                  <img src={sticker.src} alt="" />
                </span>
              )}
            </span>
            <div className="future-building-card-text">
              <p className="future-building-card-title">{title}</p>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
