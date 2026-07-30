/**
 * Shared pointer helpers for Surface Hub / touchscreen drag safety.
 * CSS touch-action: none owns the gesture; these harden capture and cancel.
 */

/** Screen-space movement before a press counts as a drag (not a tap). */
export const SCREEN_DRAG_THRESHOLD_PX = 8

const PASSIVE_FALSE = { passive: false }

/**
 * Release pointer capture only when still owned by this element.
 * Browser pan cancellation can already release capture.
 */
export function releasePointerCaptureSafe(element, pointerId) {
  if (!element || pointerId == null) return
  try {
    if (typeof element.hasPointerCapture === 'function') {
      if (!element.hasPointerCapture(pointerId)) return
    }
    element.releasePointerCapture?.(pointerId)
  } catch {
    // Capture may already have been released by the browser.
  }
}

export function screenDragDistance(dragState, event) {
  if (!dragState) return 0
  return Math.hypot(
    event.clientX - dragState.startClientX,
    event.clientY - dragState.startClientY,
  )
}

/**
 * Register scene drag listeners with non-passive options so preventDefault
 * works during active pointer movement on touch devices.
 */
export function addScenePointerListeners(element, handlers) {
  const {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
    onLostPointerCapture,
    onPointerLeave,
    onClick,
  } = handlers

  element.addEventListener('pointerdown', onPointerDown, PASSIVE_FALSE)
  element.addEventListener('pointermove', onPointerMove, PASSIVE_FALSE)
  element.addEventListener('pointerup', onPointerUp)
  element.addEventListener('pointercancel', onPointerCancel)
  element.addEventListener('lostpointercapture', onLostPointerCapture)
  if (onPointerLeave) {
    element.addEventListener('pointerleave', onPointerLeave)
  }
  element.addEventListener('click', onClick)
  window.addEventListener('pointerup', onPointerUp)
  window.addEventListener('pointercancel', onPointerCancel)
}

export function removeScenePointerListeners(element, handlers) {
  const {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
    onLostPointerCapture,
    onPointerLeave,
    onClick,
  } = handlers

  if (element) {
    element.removeEventListener('pointerdown', onPointerDown, PASSIVE_FALSE)
    element.removeEventListener('pointermove', onPointerMove, PASSIVE_FALSE)
    element.removeEventListener('pointerup', onPointerUp)
    element.removeEventListener('pointercancel', onPointerCancel)
    element.removeEventListener('lostpointercapture', onLostPointerCapture)
    if (onPointerLeave) {
      element.removeEventListener('pointerleave', onPointerLeave)
    }
    element.removeEventListener('click', onClick)
  }

  window.removeEventListener('pointerup', onPointerUp)
  window.removeEventListener('pointercancel', onPointerCancel)
}
