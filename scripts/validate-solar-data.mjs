import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadPlacementMask, MIN_VISIBLE_SEPARATION } from './lib/placementMask.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const runtimeDir = join(root, 'public/data/runtime')
const dataset = JSON.parse(readFileSync(join(runtimeDir, 'solar-data.json'), 'utf8'))
const positions = JSON.parse(
  readFileSync(join(runtimeDir, 'building-positions.json'), 'utf8'),
)
const mainPositions = JSON.parse(
  readFileSync(join(runtimeDir, 'building-positions-main.json'), 'utf8'),
)

function assertUnique(values, label) {
  const duplicates = values.filter((value, index) => values.indexOf(value) !== index)
  assert.deepEqual([...new Set(duplicates)], [], `${label} contains duplicates`)
}

const catalogIds = dataset.buildings.map((building) => building.id)
const positionedIds = positions.buildings.map((building) => building.id)
const mainPositionedIds = mainPositions.buildings.map((building) => building.id)

assertUnique(catalogIds, 'Building catalog')
assertUnique(positionedIds, 'Building positions')
assertUnique(mainPositionedIds, 'Main building positions')
assert.deepEqual(
  [...catalogIds].sort(),
  [...positionedIds].sort(),
  'Every canonical building must have exactly one render position',
)
assert.deepEqual(
  [...catalogIds].sort(),
  [...mainPositionedIds].sort(),
  'Every canonical building must have exactly one main-page render position',
)

const mainPositionById = new Map(
  mainPositions.buildings.map((building) => [building.id, building]),
)
for (const [id, expected] of Object.entries({
  'maxwell-rd-driver-services': { u: 0.74, v: 0.45 },
  'milton-library': { u: 0.42, v: 0.09 },
  'bowden-senior-center': { u: 0.38, v: 0.3 },
})) {
  const { u, v } = mainPositionById.get(id) ?? {}
  assert.deepEqual(
    { u, v },
    expected,
    `Main-page position changed for ${id}`,
  )
}

for (const building of dataset.buildings) {
  const expectedDisplayName =
    building.id === 'union-city-jail'
      ? 'South Fulton Municipal Regional Jail'
      : building.name
  assert.equal(
    building.displayName,
    expectedDisplayName,
    `Unexpected display name for ${building.id}`,
  )
}

const metricRows = [...dataset.monthly, ...dataset.monthlyCost]
const unknownMetricIds = metricRows
  .map((entry) => entry.buildingId)
  .filter((id) => !catalogIds.includes(id))
assert.deepEqual(
  [...new Set(unknownMetricIds)],
  [],
  'Every metric row must reference a canonical building',
)

const monthlyKeys = dataset.monthly.map(
  (entry) => `${entry.buildingId}:${entry.year}:${entry.month}`,
)
assertUnique(monthlyKeys, 'Monthly energy observations')

const canonicalPairs = {
  'water-op-center-tax-commissioner': 'maxwell-rd-driver-services',
  'auburn-avenue-research-branch': 'auburn-ave-research-library',
  'buckhead-branch': 'buckhead-library',
  'hapeville-branch': 'hapeville-library',
  'northeast-spruill-oaks-branch': 'ne-spruill-oaks-library',
  'northside-branch': 'northside-library',
  'ocee-branch': 'ocee-library',
}

for (const [legacyId, canonicalId] of Object.entries(canonicalPairs)) {
  assert(!catalogIds.includes(legacyId), `Legacy building ID remains: ${legacyId}`)
  assert(catalogIds.includes(canonicalId), `Canonical building ID is missing: ${canonicalId}`)
}

const maxwellEnergy = dataset.monthly
  .filter((entry) => entry.buildingId === 'maxwell-rd-driver-services')
  .map(({ year, month, kWh }) => ({ year, month, kWh }))
const expectedMaxwellEnergy = [
  { year: 2025, month: 5, kWh: 2652 },
  { year: 2025, month: 6, kWh: 37032 },
  { year: 2025, month: 7, kWh: 40651 },
  { year: 2025, month: 8, kWh: 31347 },
  { year: 2025, month: 9, kWh: 31998 },
  { year: 2025, month: 10, kWh: 25870 },
  { year: 2025, month: 11, kWh: 20491 },
  { year: 2025, month: 12, kWh: 17600 },
  { year: 2026, month: 1, kWh: 19022 },
  { year: 2026, month: 2, kWh: 23501 },
  { year: 2026, month: 3, kWh: 32264 },
  { year: 2026, month: 4, kWh: 37761 },
  { year: 2026, month: 5, kWh: 35147 },
  { year: 2026, month: 6, kWh: 35714 },
]
assert.deepEqual(
  maxwellEnergy,
  expectedMaxwellEnergy,
  'Maxwell energy must exactly match the savings workbook',
)

const energyIds2026 = new Set(
  dataset.monthly
    .filter((entry) => entry.year === 2026 && entry.kWh > 0)
    .map((entry) => entry.buildingId),
)
const savingsIds2026 = new Set(
  dataset.monthlyCost
    .filter((entry) => entry.year === 2026 && entry.dollars !== 0)
    .map((entry) => entry.buildingId),
)
assert.deepEqual(
  [...energyIds2026].sort(),
  [...catalogIds].sort(),
  'Every canonical building must have 2026 energy data for Energy, CO₂, and Look Ahead',
)
assert.deepEqual(
  [...savingsIds2026].sort(),
  [...catalogIds].sort(),
  'Every canonical building must have 2026 savings data',
)

// Markers snap onto the nearest on-county pixel, so compare the positions the
// scenes actually render rather than the stored u/v.
const mask = loadPlacementMask(join(root, 'public/assets/map-placement-mask.png'))
const scenePositions = positions.buildings.map((building) => ({
  id: building.id,
  ...mask.resolvePosition(building.u, building.v),
}))

const unplaceable = scenePositions.filter((entry) => !Number.isFinite(entry.snapDistance))
assert.deepEqual(
  unplaceable.map((entry) => entry.id),
  [],
  'Markers with no reachable position on the county map',
)

const swallowedPairs = []
for (let i = 0; i < scenePositions.length; i += 1) {
  for (let j = i + 1; j < scenePositions.length; j += 1) {
    const distance = Math.hypot(
      scenePositions[i].x - scenePositions[j].x,
      scenePositions[i].z - scenePositions[j].z,
    )
    if (distance < MIN_VISIBLE_SEPARATION) {
      swallowedPairs.push(
        `${scenePositions[i].id} <-> ${scenePositions[j].id} (${distance.toFixed(3)})`,
      )
    }
  }
}

console.log(
  `Solar data valid: ${catalogIds.length} canonical buildings, ${dataset.monthly.length} energy rows, ${dataset.monthlyCost.length} savings rows.`,
)

if (swallowedPairs.length) {
  console.warn(
    `\n[validate-data] ${swallowedPairs.length} marker pair(s) are closer than ${MIN_VISIBLE_SEPARATION.toFixed(
      2,
    )} and can hide each other when one building is a large producer:\n  ${swallowedPairs.join('\n  ')}`,
  )
}
