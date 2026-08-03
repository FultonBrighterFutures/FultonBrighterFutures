import { useEffect, useState } from 'react'
import { loadSolarDataset, mapEnergyYearData } from '../data'
import { StaticBuildingIcon } from './building'
import './BuildingsCount.css'

export default function BuildingsCount({ year, label = 'Buildings with Solar Panels' }) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    let cancelled = false

    const updateCount = async () => {
      try {
        const dataset = await loadSolarDataset()
        if (cancelled) return

        const mapped = mapEnergyYearData(dataset, year)
        const activeCount = (mapped.buildings ?? []).filter((building) => building.active).length
        setCount(activeCount)
      } catch (error) {
        console.warn('[BuildingsCount] Failed to load building count', error)
        if (!cancelled) setCount(0)
      }
    }

    updateCount()

    return () => {
      cancelled = true
    }
  }, [year])

  return (
    <div className="buildings-count" aria-label="Buildings with solar panels">
      <div className="buildings-count__top">
        <div className="buildings-count__value">{count}</div>
        <StaticBuildingIcon className="buildings-count__icon" />
      </div>
      <div className="buildings-count__label">{label}</div>
    </div>
  )
}
