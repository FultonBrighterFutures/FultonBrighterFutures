import { useEffect, useRef, useState } from 'react'
import SelectedBuildingOrb from './SelectedBuildingOrb'

function isInsideDropZoneX(clientX, dropZoneBounds) {
  // While placing, require measured tab bounds before accepting a drop.
  if (!dropZoneBounds) return false
  return clientX >= dropZoneBounds.clientLeft && clientX <= dropZoneBounds.clientRight
}

/**
 * Placement panel with pointer-capture drag ghost onto the map stage.
 */
export default function BuildingPlacementPanel({
  open = false,
  typeId = null,
  stickerId = null,
  metric = 'energy',
  dropZoneBounds = null,
  onClose,
  onDrop,
  screenToGround,
}) {
  const [ghost, setGhost] = useState(null)
  const dragRef = useRef(null)

  useEffect(() => {
    if (!open) {
      dragRef.current = null
      setGhost(null)
    }
  }, [open])

  const clearDrag = () => {
    dragRef.current = null
    setGhost(null)
  }

  const handlePointerDown = (event) => {
    if (!typeId || event.button !== 0) return
    event.preventDefault()
    event.currentTarget.setPointerCapture?.(event.pointerId)
    dragRef.current = {
      pointerId: event.pointerId,
      settled: false,
    }
    setGhost({
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
    })
  }

  const handlePointerMove = (event) => {
    const drag = dragRef.current
    if (!drag || drag.settled || drag.pointerId !== event.pointerId) return
    setGhost({
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
    })
  }

  const handlePointerEnd = (event) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return

    // pointerup + pointercancel can both fire for one gesture; commit once.
    if (drag.settled) return
    drag.settled = true

    const inDropColumn = isInsideDropZoneX(event.clientX, dropZoneBounds)
    const point = inDropColumn ? screenToGround?.(event.clientX, event.clientY) : null
    clearDrag()

    if (point) {
      onDrop?.(point)
    }

    try {
      event.currentTarget.releasePointerCapture?.(event.pointerId)
    } catch {
      // Capture may already be released by the browser.
    }
  }

  return (
    <>
      <div
        className={`building-placement${open ? ' is-open' : ''}`}
        aria-hidden={!open}
        aria-label="Drag and drop your building onto the map"
      >
        <div className="building-placement-panel">
          <button
            type="button"
            className="look-ahead-panel-close look-ahead-panel-close--menu-style"
            onClick={onClose}
            aria-label="Cancel placement"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 6L18 18M18 6L6 18" />
            </svg>
          </button>

          <p className="building-placement-title">DRAG AND DROP YOUR BUILDING ONTO THE MAP</p>

          <button
            type="button"
            className="building-placement-drag"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerEnd}
            onPointerCancel={handlePointerEnd}
            aria-label="Drag building onto map"
          >
            {typeId && (
              <SelectedBuildingOrb
                typeId={typeId}
                stickerId={stickerId}
                metric={metric}
                className="selected-building-orb--placement"
              />
            )}
          </button>
        </div>
      </div>

      {ghost && typeId && (
        <div
          className="building-placement-ghost"
          style={{ left: ghost.x, top: ghost.y }}
          aria-hidden="true"
        >
          <SelectedBuildingOrb
            typeId={typeId}
            stickerId={stickerId}
            metric={metric}
            className="selected-building-orb--ghost"
          />
        </div>
      )}
    </>
  )
}
