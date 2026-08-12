import { useEffect, useState } from 'react'
import fultonCountyOutline from '../../assets/fulton-county-outline.svg'
import './FultonCountyBackdrop.css'

const BACKDROP_STORAGE_KEY = 'solar-dinosaur.fulton-county-backdrop'
const EDIT_STORAGE_KEY = 'solar-dinosaur.fulton-county-backdrop-edit'
const EDIT_QUERY_PARAM = 'fultonBackdrop'

// Set to true to show the Fulton County outline again.
export const FULTON_COUNTY_OUTLINE_ENABLED = true

/**
 * Master kill switch for backdrop edit (Shift+M, ?fultonBackdrop=1).
 * Set to true to re-enable developer positioning without restoring deleted code.
 */
export const FULTON_BACKDROP_EDIT_AVAILABLE = false

const DEFAULT_BACKDROP = {
  "x": -40,
  "y": -8,
  "scale": 1.55,
  "opacity": 0.2
}

function loadBackdrop() {
  try {
    const saved = JSON.parse(localStorage.getItem(BACKDROP_STORAGE_KEY))
    if (
      Number.isFinite(saved?.x) &&
      Number.isFinite(saved?.y) &&
      Number.isFinite(saved?.scale) &&
      Number.isFinite(saved?.opacity)
    ) {
      return saved
    }
  } catch {
    // Use the committed defaults when storage is unavailable or invalid.
  }

  return DEFAULT_BACKDROP
}

function loadEditPreference() {
  if (!FULTON_BACKDROP_EDIT_AVAILABLE) return false

  try {
    const queryValue = new URLSearchParams(window.location.search).get(EDIT_QUERY_PARAM)
    if (queryValue === '1' || queryValue === 'true') {
      localStorage.setItem(EDIT_STORAGE_KEY, '1')
      return true
    }
    if (queryValue === '0' || queryValue === 'false') {
      localStorage.setItem(EDIT_STORAGE_KEY, '0')
      return false
    }
    return localStorage.getItem(EDIT_STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

function round(value) {
  return Math.round(value * 100) / 100
}

export default function FultonCountyBackdrop({ active = true }) {
  const [backdrop, setBackdrop] = useState(loadBackdrop)
  const [editEnabled, setEditEnabled] = useState(loadEditPreference)

  useEffect(() => {
    if (!active || !FULTON_COUNTY_OUTLINE_ENABLED || !FULTON_BACKDROP_EDIT_AVAILABLE) return

    const handleKeyDown = (event) => {
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLSelectElement
      ) {
        return
      }

      if (event.shiftKey && event.key.toLowerCase() === 'm') {
        event.preventDefault()
        setEditEnabled((enabled) => {
          const nextEnabled = !enabled
          try {
            localStorage.setItem(EDIT_STORAGE_KEY, nextEnabled ? '1' : '0')
          } catch {
            // The tool still works for this session.
          }
          console.info(
            nextEnabled
              ? '[Fulton backdrop] Edit mode ON — I/J/K/L move · U/O resize · [/] opacity · P save · 0 reset · Shift+M off'
              : '[Fulton backdrop] Edit mode OFF — Shift+M to enable',
          )
          return nextEnabled
        })
        return
      }

      if (!editEnabled) return

      const moveStep = event.shiftKey ? 30 : 8
      let handled = true

      switch (event.key.toLowerCase()) {
        case 'j':
          setBackdrop((value) => ({ ...value, x: value.x - moveStep }))
          break
        case 'l':
          setBackdrop((value) => ({ ...value, x: value.x + moveStep }))
          break
        case 'i':
          setBackdrop((value) => ({ ...value, y: value.y - moveStep }))
          break
        case 'k':
          setBackdrop((value) => ({ ...value, y: value.y + moveStep }))
          break
        case 'u':
          setBackdrop((value) => ({ ...value, scale: round(Math.max(0.1, value.scale - 0.05)) }))
          break
        case 'o':
          setBackdrop((value) => ({ ...value, scale: round(value.scale + 0.05) }))
          break
        case '[':
          setBackdrop((value) => ({
            ...value,
            opacity: round(Math.max(0, value.opacity - 0.05)),
          }))
          break
        case ']':
          setBackdrop((value) => ({
            ...value,
            opacity: round(Math.min(1, value.opacity + 0.05)),
          }))
          break
        case 'p': {
          const payload = JSON.stringify(backdrop, null, 2)
          try {
            localStorage.setItem(BACKDROP_STORAGE_KEY, payload)
          } catch {
            // Still print the values so they can be committed manually.
          }
          console.info(
            '[Fulton backdrop] Saved. Update DEFAULT_BACKDROP in FultonCountyBackdrop.jsx to persist in the repo:\n',
            payload,
          )
          break
        }
        case '0':
          setBackdrop(DEFAULT_BACKDROP)
          break
        default:
          handled = false
      }

      if (handled) event.preventDefault()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [active, backdrop, editEnabled])

  if (!FULTON_COUNTY_OUTLINE_ENABLED) return null

  return (
    <>
      <div className="fulton-county-backdrop" aria-hidden="true">
        <img
          className="fulton-county-backdrop__outline"
          src={fultonCountyOutline}
          alt=""
          draggable="false"
          style={{
            opacity: backdrop.opacity,
            transform: `translate3d(${backdrop.x}px, ${backdrop.y}px, 0) scale(${backdrop.scale})`,
          }}
        />
      </div>
      {active && editEnabled && (
        <output className="fulton-county-backdrop-hud">
          <strong>FULTON BACKDROP</strong>
          <span>
            x {backdrop.x} · y {backdrop.y} · scale {backdrop.scale.toFixed(2)} · opacity{' '}
            {backdrop.opacity.toFixed(2)}
          </span>
          <small>I/J/K/L move · U/O resize · [/] opacity · P save · 0 reset · Shift+M off</small>
        </output>
      )}
    </>
  )
}
