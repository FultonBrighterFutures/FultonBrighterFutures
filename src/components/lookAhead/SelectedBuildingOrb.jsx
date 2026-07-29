import StaticBuildingIcon from '../building/StaticBuildingIcon'
import BuildingTypeIcon from './BuildingTypeIcon'
import { getFutureSticker } from '../../data/futureStickers'
import './SelectedBuildingOrb.css'

function metricToBuildingTheme(metric) {
  if (metric === 'co2') return 'co2'
  if (metric === 'money') return 'savings'
  return 'energy'
}

/**
 * Selected / ready building preview: Three.js Building sphere + rings
 * (same as the map) with type glyph + sticker overlaid.
 */
export default function SelectedBuildingOrb({
  typeId,
  stickerId = null,
  metric = 'energy',
  active = true,
  className = '',
}) {
  const sticker = getFutureSticker(stickerId)
  const theme = metricToBuildingTheme(metric)

  return (
    <div
      className={`selected-building-orb selected-building-orb--${theme}${
        active ? '' : ' selected-building-orb--inactive'
      }${className ? ` ${className}` : ''}`}
      aria-hidden="true"
    >
      <div className="selected-building-orb__scene">
        <StaticBuildingIcon theme={theme} tintRings={false} className="selected-building-orb__three" />
      </div>

      <span className="selected-building-orb__icon">
        <BuildingTypeIcon type={typeId} lit />
      </span>

      {sticker && (
        <span className="selected-building-orb__sticker">
          <img src={sticker.src} alt="" />
        </span>
      )}
    </div>
  )
}
