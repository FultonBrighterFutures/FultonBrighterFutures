import { useRef } from 'react'
import { getFutureBuildingType } from '../../data/futureBuildingTypes'
import { getFutureSticker } from '../../data/futureStickers'
import buildingListIcon from '../../assets/buildinglist-icon.svg'
import BuildingTypeIcon from './BuildingTypeIcon'

export default function FutureBuildingLog({
  buildings = [],
  onLaunchFromHold,
  onSelectBuilding,
}) {
  const holdRef = useRef(null)

  const clearHold = () => {
    holdRef.current = null
  }

  const handlePointerDown = (event, buildingId) => {
    if (event.button !== 0) return
    onSelectBuilding?.(buildingId)
    event.currentTarget.setPointerCapture?.(event.pointerId)
    holdRef.current = {
      buildingId,
      pointerId: event.pointerId,
      startedAt: performance.now(),
    }
  }

  const handlePointerEnd = (event) => {
    const hold = holdRef.current
    if (!hold || hold.pointerId !== event.pointerId) return

    const holdSeconds = (performance.now() - hold.startedAt) / 1000
    const buildingId = hold.buildingId
    clearHold()

    try {
      event.currentTarget.releasePointerCapture?.(event.pointerId)
    } catch {
      // Capture may already be released.
    }

    onLaunchFromHold?.(buildingId, holdSeconds)
  }

  return (
    <ul className="future-building-log" aria-label="Added buildings">
      {buildings.map((building) => {
        const type = getFutureBuildingType(building.type)
        const sticker = getFutureSticker(building.stickerId)
        const title = `${type?.displayName ?? 'Solar'} Building Added`

        return (
          <li key={building.id} className="future-building-card">
            <button
              type="button"
              className="future-building-card-hit"
              aria-label={`Show ${title} details. Hold longer for a stronger map recoil.`}
              onPointerDown={(event) => handlePointerDown(event, building.id)}
              onPointerUp={handlePointerEnd}
              onPointerCancel={handlePointerEnd}
            >
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
              <span className="future-building-card-text">
                <span className="future-building-card-title">{title}</span>
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
