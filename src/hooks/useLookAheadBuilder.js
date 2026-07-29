import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { loadSolarDataset } from '../data'
import {
  estimateBuildingMetrics,
  getFutureBuildingType,
} from '../data/futureBuildingTypes.js'
import { getFutureSticker } from '../data/futureStickers.js'

/** @typedef {'idle' | 'sticker' | 'placing'} LookAheadPhase */

const STORAGE_KEY = 'solar-dinosaur:look-ahead-buildings'
const STORAGE_VERSION = 1

let userBuildingSeq = 0

function createUserBuildingId() {
  userBuildingSeq += 1
  return `user-${Date.now().toString(36)}-${userBuildingSeq}`
}

function isValidPersistedBuilding(building) {
  if (!building || typeof building !== 'object') return false
  if (typeof building.id !== 'string' || !building.id) return false
  if (!getFutureBuildingType(building.type)) return false
  if (building.stickerId != null && !getFutureSticker(building.stickerId)) return false
  if (!Number.isFinite(building.x) || !Number.isFinite(building.z)) return false
  return true
}

function loadPersistedBuildings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    const list = Array.isArray(parsed?.buildings)
      ? parsed.buildings
      : Array.isArray(parsed)
        ? parsed
        : []
    const buildings = list.filter(isValidPersistedBuilding).map((building) => ({
      ...building,
      stickerId: building.stickerId ?? null,
      annualKwh: Number(building.annualKwh) || 0,
      annualCo2Lbs: Number(building.annualCo2Lbs) || 0,
      annualSavings: Number(building.annualSavings) || 0,
      active: true,
    }))
    userBuildingSeq = Math.max(userBuildingSeq, buildings.length)
    return buildings
  } catch (error) {
    console.warn('[useLookAheadBuilder] Failed to restore buildings', error)
    return []
  }
}

function persistBuildings(buildings) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: STORAGE_VERSION, buildings }),
    )
  } catch (error) {
    console.warn('[useLookAheadBuilder] Failed to persist buildings', error)
  }
}

/**
 * Composer + placed-building state for Look Ahead.
 * React is the source of truth; the scene syncs from `userBuildings`.
 * Placed buildings are restored from localStorage across refresh.
 */
export function useLookAheadBuilder() {
  const [selectedType, setSelectedType] = useState(null)
  const [selectedStickerId, setSelectedStickerId] = useState(null)
  const [pendingStickerId, setPendingStickerId] = useState(null)
  /** @type {[LookAheadPhase, function]} */
  const [phase, setPhase] = useState('idle')
  const [userBuildings, setUserBuildings] = useState(loadPersistedBuildings)
  const [savingsRates, setSavingsRates] = useState(null)

  const selectedTypeRef = useRef(selectedType)
  const selectedStickerIdRef = useRef(selectedStickerId)
  selectedTypeRef.current = selectedType
  selectedStickerIdRef.current = selectedStickerId

  useEffect(() => {
    persistBuildings(userBuildings)
  }, [userBuildings])

  useEffect(() => {
    let cancelled = false
    loadSolarDataset()
      .then((dataset) => {
        if (cancelled) return
        setSavingsRates(dataset?.savingsRates ?? null)
      })
      .catch((error) => {
        console.warn('[useLookAheadBuilder] Failed to load savings rates', error)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const hasType = Boolean(selectedType)
  const isReady = hasType
  const isPlacing = phase === 'placing'
  const isStickerOpen = phase === 'sticker'

  const addedTotals = useMemo(() => {
    return userBuildings.reduce(
      (totals, building) => ({
        annualKwh: totals.annualKwh + (building.annualKwh ?? 0),
        annualCo2Lbs: totals.annualCo2Lbs + (building.annualCo2Lbs ?? 0),
        annualSavings: totals.annualSavings + (building.annualSavings ?? 0),
      }),
      { annualKwh: 0, annualCo2Lbs: 0, annualSavings: 0 },
    )
  }, [userBuildings])

  const selectType = useCallback((typeId) => {
    setSelectedType((current) => (current === typeId ? null : typeId))
    setPhase((current) => (current === 'placing' || current === 'sticker' ? 'idle' : current))
  }, [])

  const openStickerPicker = useCallback(() => {
    if (!selectedTypeRef.current) return
    setPendingStickerId(selectedStickerIdRef.current)
    setPhase('sticker')
  }, [])

  const closeStickerPicker = useCallback(() => {
    setPendingStickerId(null)
    setPhase('idle')
  }, [])

  const confirmSticker = useCallback(() => {
    setSelectedStickerId(pendingStickerId)
    setPendingStickerId(null)
    setPhase('idle')
  }, [pendingStickerId])

  const beginPlacing = useCallback(() => {
    if (!selectedTypeRef.current) return
    setPhase('placing')
  }, [])

  const cancelPlacing = useCallback(() => {
    setPhase('idle')
  }, [])

  const placeBuilding = useCallback(
    ({ x, z }) => {
      const typeId = selectedTypeRef.current
      if (!typeId || !Number.isFinite(x) || !Number.isFinite(z)) return null

      // Claim the pending compose immediately so a double drop cannot place twice.
      selectedTypeRef.current = null
      const stickerId = selectedStickerIdRef.current
      selectedStickerIdRef.current = null

      const metrics = estimateBuildingMetrics(typeId, savingsRates)
      const type = getFutureBuildingType(typeId)
      if (!metrics || !type) {
        selectedTypeRef.current = typeId
        selectedStickerIdRef.current = stickerId
        return null
      }

      const building = {
        id: createUserBuildingId(),
        type: typeId,
        name: `${type.displayName} Building`,
        stickerId,
        x,
        z,
        annualKwh: metrics.annualKwh,
        annualCo2Lbs: metrics.annualCo2Lbs,
        annualSavings: metrics.annualSavings,
        systemKw: metrics.systemKw,
        panelCount: metrics.panelCount,
        createdAt: Date.now(),
        active: true,
      }

      setUserBuildings((prev) => [...prev, building])
      setSelectedType(null)
      setSelectedStickerId(null)
      setPendingStickerId(null)
      setPhase('idle')
      return building
    },
    [savingsRates],
  )

  /** Clears composer UI only — placed buildings persist across sessions. */
  const reset = useCallback(() => {
    selectedTypeRef.current = null
    selectedStickerIdRef.current = null
    setSelectedType(null)
    setSelectedStickerId(null)
    setPendingStickerId(null)
    setPhase('idle')
  }, [])

  const clearUserBuildings = useCallback(() => {
    setUserBuildings([])
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch (error) {
      console.warn('[useLookAheadBuilder] Failed to clear buildings storage', error)
    }
  }, [])

  return {
    selectedType,
    selectedStickerId,
    pendingStickerId,
    setPendingStickerId,
    phase,
    userBuildings,
    addedTotals,
    hasType,
    isReady,
    isPlacing,
    isStickerOpen,
    selectType,
    openStickerPicker,
    closeStickerPicker,
    confirmSticker,
    beginPlacing,
    cancelPlacing,
    placeBuilding,
    reset,
    clearUserBuildings,
  }
}
