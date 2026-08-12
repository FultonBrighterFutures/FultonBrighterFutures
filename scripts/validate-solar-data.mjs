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
function positionMismatchMessage(label, catalog, positioned) {
  const catalogSet = new Set(catalog)
  const positionedSet = new Set(positioned)
  const missing = catalog.filter((id) => !positionedSet.has(id))
  const extra = positioned.filter((id) => !catalogSet.has(id))
  const parts = [`${label}: catalog and render positions must match exactly.`]
  if (missing.length) parts.push(`Missing positions: ${missing.join(', ')}.`)
  if (extra.length) parts.push(`Extra positions (not in catalog): ${extra.join(', ')}.`)
  return parts.join(' ')
}

assert.deepEqual(
  [...catalogIds].sort(),
  [...positionedIds].sort(),
  positionMismatchMessage('Look Ahead positions', catalogIds, positionedIds),
)
assert.deepEqual(
  [...catalogIds].sort(),
  [...mainPositionedIds].sort(),
  positionMismatchMessage('Main positions', catalogIds, mainPositionedIds),
)

const lookAheadById = new Map(
  positions.buildings.map((building) => [building.id, building]),
)
for (const building of mainPositions.buildings) {
  const lookAhead = lookAheadById.get(building.id)
  assert.ok(lookAhead, `Look Ahead position missing for ${building.id}`)
  assert.deepEqual(
    { u: building.u, v: building.v },
    { u: lookAhead.u, v: lookAhead.v },
    `Main and Look Ahead positions must match for ${building.id}`,
  )
}

const displayNameOverrides = JSON.parse(
  readFileSync(join(root, 'public/data/sources/building-display-names.json'), 'utf8'),
)
for (const building of dataset.buildings) {
  const expectedDisplayName = displayNameOverrides[building.id] ?? building.name
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

const maxwellEnergy = dataset.monthly.filter(
  (entry) => entry.buildingId === 'maxwell-rd-driver-services' && entry.kWh > 0,
)
assert.ok(
  maxwellEnergy.length > 0,
  'Maxwell Rd (Driver Services) must have energy observations',
)

const sortedCatalogIds = [...catalogIds].sort()
const energyYearsDesc = [...dataset.years].sort((a, b) => b - a)
const costYearsDesc = [...(dataset.costYears ?? [])].sort((a, b) => b - a)

function idsWithEnergy(year) {
  return new Set(
    dataset.monthly
      .filter((entry) => entry.year === year && entry.kWh > 0)
      .map((entry) => entry.buildingId),
  )
}

function idsWithSavings(year) {
  return new Set(
    dataset.monthlyCost
      .filter((entry) => entry.year === year && entry.dollars !== 0)
      .map((entry) => entry.buildingId),
  )
}

function missingFrom(idsSet) {
  return sortedCatalogIds.filter((id) => !idsSet.has(id))
}

let energyCoverageYear = null
for (const year of energyYearsDesc) {
  if (missingFrom(idsWithEnergy(year)).length === 0) {
    energyCoverageYear = year
    break
  }
}

if (energyCoverageYear == null) {
  const gaps = energyYearsDesc
    .slice(0, 3)
    .map((year) => `${year}: ${missingFrom(idsWithEnergy(year)).join(', ') || '(none)'}`)
    .join('; ')
  assert.fail(
    `No year contains energy for every building. Add kWh for missing buildings in one common year (or remove incomplete buildings). Gaps → ${gaps}`,
  )
}

let savingsCoverageYear = null
for (const year of costYearsDesc) {
  if (missingFrom(idsWithSavings(year)).length === 0) {
    savingsCoverageYear = year
    break
  }
}

if (savingsCoverageYear == null) {
  const gaps = costYearsDesc
    .slice(0, 3)
    .map((year) => `${year}: ${missingFrom(idsWithSavings(year)).join(', ') || '(none)'}`)
    .join('; ')
  assert.fail(
    `No year contains savings for every building. Add savings rows for missing buildings in one common year. Gaps → ${gaps}`,
  )
}

console.log(
  `Coverage years: energy=${energyCoverageYear}, savings=${savingsCoverageYear}`,
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
