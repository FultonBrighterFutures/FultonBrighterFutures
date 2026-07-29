import { useEffect, useRef, useState } from 'react'
import { TIMELINE_ITEMS } from '../constants/timeline'
import ChromeCtaArrow from './ChromeCtaArrow'
import BuildingsCount from './BuildingsCount'
import TimelineYearStrip from './TimelineYearStrip'
import './Timeline.css'

const WHEEL_THRESHOLD = 90
const WHEEL_COOLDOWN_MS = 420
const SWIPE_THRESHOLD = 48
const COMET_TRAIL_MS = 275

function useTimelineScrollCarousel({ activeItemId, onItemChange, onActivity, enabled }) {
  const activeItemIdRef = useRef(activeItemId)
  const onItemChangeRef = useRef(onItemChange)

  activeItemIdRef.current = activeItemId
  onItemChangeRef.current = onItemChange

  useEffect(() => {
    if (!enabled) return

    let accumulated = 0
    let cooldown = false
    let cooldownId = null
    let touchStartY = 0

    const stepTimeline = (direction) => {
      const currentIndex = TIMELINE_ITEMS.findIndex(
        (item) => item.id === activeItemIdRef.current,
      )
      const nextIndex = currentIndex + direction
      if (nextIndex < 0 || nextIndex >= TIMELINE_ITEMS.length) return false

      onItemChangeRef.current(TIMELINE_ITEMS[nextIndex].id)
      accumulated = 0
      cooldown = true
      cooldownId = window.setTimeout(() => {
        cooldown = false
      }, WHEEL_COOLDOWN_MS)
      return true
    }

    const shouldIgnoreEvent = (target) =>
      target instanceof Element &&
      Boolean(
        target.closest(
          '.site-menu-panel, .content-page, .future-overlay, input, textarea, select, [data-no-timeline-scroll]',
        ),
      )

    const onWheel = (event) => {
      if (shouldIgnoreEvent(event.target)) return

      onActivity?.()
      event.preventDefault()
      if (cooldown) return

      accumulated += event.deltaY
      if (Math.abs(accumulated) < WHEEL_THRESHOLD) return

      stepTimeline(accumulated > 0 ? 1 : -1)
    }

    const onTouchStart = (event) => {
      if (shouldIgnoreEvent(event.target)) return
      onActivity?.()
      touchStartY = event.touches[0]?.clientY ?? 0
    }

    const onTouchEnd = (event) => {
      if (shouldIgnoreEvent(event.target)) return
      if (cooldown) return

      const touchEndY = event.changedTouches[0]?.clientY ?? touchStartY
      const deltaY = touchStartY - touchEndY
      if (Math.abs(deltaY) < SWIPE_THRESHOLD) return

      stepTimeline(deltaY > 0 ? 1 : -1)
    }

    window.addEventListener('wheel', onWheel, { passive: false })
    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchend', onTouchEnd, { passive: true })

    return () => {
      window.removeEventListener('wheel', onWheel)
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchend', onTouchEnd)
      if (cooldownId) window.clearTimeout(cooldownId)
    }
  }, [enabled, onActivity])
}

export default function Timeline({
  year,
  activeItemId,
  onItemChange,
  lookAheadActive = false,
  onLookAhead,
  scrollEnabled = false,
  onActivity,
  suppressEventText = false,
}) {
  const previousItemRef = useRef(activeItemId)
  const [cometTrail, setCometTrail] = useState(null)

  useTimelineScrollCarousel({
    activeItemId,
    onItemChange,
    onActivity,
    enabled: scrollEnabled && !lookAheadActive,
  })

  useEffect(() => {
    if (lookAheadActive) {
      previousItemRef.current = activeItemId
      setCometTrail(null)
      return
    }

    const fromItemId = previousItemRef.current
    const fromIndex = TIMELINE_ITEMS.findIndex((item) => item.id === fromItemId)
    const toIndex = TIMELINE_ITEMS.findIndex((item) => item.id === activeItemId)
    previousItemRef.current = activeItemId

    if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return

    const trailId = `${fromIndex}-${toIndex}-${Date.now()}`
    setCometTrail({ fromIndex, toIndex, id: trailId })

    const timeoutId = window.setTimeout(() => {
      setCometTrail((current) => (current?.id === trailId ? null : current))
    }, COMET_TRAIL_MS)

    return () => window.clearTimeout(timeoutId)
  }, [activeItemId, lookAheadActive])

  return (
    <section
      className="timeline"
      aria-label="Year timeline"
      onPointerDownCapture={onActivity}
    >
      <BuildingsCount year={year} />

      <div className="timeline-nav">
        <TimelineYearStrip
          activeItemId={activeItemId}
          lookAheadActive={lookAheadActive}
          cometTrail={cometTrail}
          onItemChange={onItemChange}
          suppressEventText={suppressEventText}
        />

        <div className="timeline-look-ahead">
          <button
            type="button"
            className={`chrome-cta timeline-cta${lookAheadActive ? ' is-active' : ''}`}
            onClick={onLookAhead}
            aria-pressed={lookAheadActive}
          >
            <span className="chrome-cta-label">Look Ahead</span>
            <ChromeCtaArrow direction="right" />
          </button>
        </div>
      </div>
    </section>
  )
}
