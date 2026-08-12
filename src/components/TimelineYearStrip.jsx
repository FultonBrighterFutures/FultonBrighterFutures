import { ORIGIN_YEAR, TIMELINE_EVENTS_BY_YEAR, TIMELINE_ITEMS } from '../constants/timeline'

const DOTS_BETWEEN_YEARS = 3

function getTrailDotStrength(gapIndex, dotIndex, trail) {
  if (!trail) return 0

  const { fromIndex, toIndex } = trail
  const lo = Math.min(fromIndex, toIndex)
  const hi = Math.max(fromIndex, toIndex)
  if (gapIndex < lo || gapIndex >= hi) return 0

  const forward = toIndex > fromIndex
  const span = hi - lo
  const progress = forward
    ? (gapIndex - lo + (dotIndex + 1) / (DOTS_BETWEEN_YEARS + 1)) / span
    : (hi - gapIndex - 1 + (DOTS_BETWEEN_YEARS - dotIndex) / (DOTS_BETWEEN_YEARS + 1)) / span

  return Math.max(1, Math.min(3, Math.ceil(progress * 3)))
}

/**
 * Year markers + dotted track, with the active year's project event below.
 */
export default function TimelineYearStrip({
  activeItemId,
  lookAheadActive,
  cometTrail = null,
  onItemChange,
  suppressEventText = false,
  items = TIMELINE_ITEMS,
}) {
  const trail = lookAheadActive ? null : cometTrail
  const activeItem = items.find((item) => item.id === activeItemId)
  const activeEvent = TIMELINE_EVENTS_BY_YEAR[activeItem?.year]
  const trailForward = trail ? trail.toIndex > trail.fromIndex : true

  return (
    <div className="timeline-years-group">
      <ul className="timeline-years">
        {items.map((item, index) => {
          const isActive = item.id === activeItemId && !lookAheadActive
          const trailStrengthSample = getTrailDotStrength(index, 1, trail)
          const isTrailingGap = trailStrengthSample > 0

          return (
            <li key={item.id} className="timeline-segment">
              <button
                type="button"
                className={`timeline-year${item.year === ORIGIN_YEAR ? ' timeline-year--origin' : ''}${
                  isActive ? ' is-active' : ''
                }`}
                onClick={() => onItemChange(item.id)}
                aria-pressed={isActive}
              >
                <span className="timeline-label">{item.label}</span>
                <span className="timeline-marker" aria-hidden="true" />
              </button>

              {index < items.length - 1 && (
                <div
                  className={`timeline-gap-dots${isTrailingGap ? ' is-trailing' : ''}${
                    isTrailingGap ? (trailForward ? ' is-trailing-forward' : ' is-trailing-backward') : ''
                  }`}
                  aria-hidden="true"
                >
                  {Array.from({ length: DOTS_BETWEEN_YEARS }, (_, dotIndex) => {
                    const strength = getTrailDotStrength(index, dotIndex, trail)

                    return (
                      <span
                        key={`${trail?.id ?? 'idle'}-${dotIndex}`}
                        className={`timeline-dot${strength ? ` is-trail is-trail-${strength}` : ''}`}
                      />
                    )
                  })}
                </div>
              )}
            </li>
          )
        })}
      </ul>

      <div className="timeline-story" aria-live="polite">
        {activeEvent && activeItem?.year !== ORIGIN_YEAR && !suppressEventText && (
          <>
            <span className="timeline-story__date">{activeEvent.dateLabel}</span>
            <span className="timeline-story__copy">{activeEvent.copy}</span>
          </>
        )}
      </div>
    </div>
  )
}
