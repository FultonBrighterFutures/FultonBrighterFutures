/**
 * Normalize a building name to a stable slug id.
 * @param {string} name
 */
export function slugifyBuildingName(name) {
  return name
    .toLowerCase()
    .replace(/neighbor-hood/g, 'neighborhood')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

/** Canonical building names, independent of workbook aliases and UI renames. */
export const BUILDING_NAMES = {
  'alpharetta-library': 'Alpharetta Library',
  'wolf-creek-library': 'Wolf Creek Library',
  'milton-library': 'Milton Library',
  'e-roswell-library': 'E Roswell Library',
  'north-fulton-service-center': 'North Fulton Service Center',
  'sandy-springs-library': 'Sandy Springs Library',
  'qls-senior-center': 'QLS Senior Center',
  'bowden-senior-center': 'Bowden Senior Center',
  'benson-senior-center': 'Benson Senior Center',
  'metropolitan-library': 'Metropolitan Library',
  'northwest-library': 'Northwest Library',
  'board-of-health': 'Board of Health',
  'ponce-de-leon-jp-library': 'Ponce de Leon (JP) Library',
  'new-beginnings-senior-center': 'New Beginnings Senior Center',
  'medical-examiner': 'Medical Examiner',
  'maxwell-rd-driver-services': 'Maxwell Rd (Driver Services)',
  'auburn-ave-research-library': 'Auburn Ave Research Library',
  'buckhead-library': 'Buckhead Library',
  'hapeville-library': 'Hapeville Library',
  'ne-spruill-oaks-library': 'NE Spruill Oaks Library',
  'northside-library': 'Northside Library',
  'ocee-library': 'Ocee Library',
  'dogwood-library': 'Dogwood Library',
  'cascade-sw-library': 'Cascade (SW) Library',
  'adamsville-ac-library': 'Adamsville (AC) Library',
  'southeast-atlanta-library': 'Southeast Atlanta Library',
  'se-neighborhood-senior-center': 'SE Neighborhood Senior Center',
  'neighborhood-union-health': 'Neighbor-hood Union Health',
  'dogwood-senior-center': 'Dogwood Senior Center',
  'gladys-dennard-library': 'Gladys Dennard Library',
  'mills-senior-center': 'Mills Senior Center',
  'adams-park-library': 'Adams Park Library',
  'cleveland-ave-library': 'Cleveland Ave Library',
  'college-park-regional-health': 'College Park Regional Health',
  'college-park-library': 'College Park Library',
  'aviation-cultural-center': 'Aviation Cultural Center',
  'animal-services': 'Animal Services',
  'juvenile-justice-center': 'Juvenile Justice Center',
  'south-fulton-service-center': 'South Fulton Service Center',
  'union-city-jail': 'Union City Jail',
  'palmetto-library': 'Palmetto Library',
}

/** UI-only name overrides. Buildings without an override display their canonical name. */
export const BUILDING_DISPLAY_NAME_OVERRIDES = {
  'union-city-jail': 'South Fulton Municipal Regional Jail',
}

/**
 * Maps spreadsheet labels (any export format) → stable building ids.
 */
export const BUILDING_ALIASES = {
  'metropolitan-branch': 'metropolitan-library',
  'wolf-creek-branch': 'wolf-creek-library',
  'northwest-branch': 'northwest-library',
  'alpharetta-branch': 'alpharetta-library',
  'southeast-atlanta-branch': 'southeast-atlanta-library',
  'southeast-branch': 'southeast-atlanta-library',
  'dorothy-c-benson-senior-multipurpose-complex': 'benson-senior-center',
  'southwest-regional-branch': 'cascade-sw-library',
  'animal-services-facility': 'animal-services',
  'helene-s-mills-senior-multipurpose-facility': 'mills-senior-center',
  'mills-senior': 'mills-senior-center',
  'fulton-county-board-of-health': 'board-of-health',
  'powell-juvenile-justice-center-mechanicsville-lib': 'juvenile-justice-center',
  'powell-juvenile-justice-center': 'juvenile-justice-center',
  'east-roswell-branch': 'e-roswell-library',
  'neighborhood-union-health-center': 'neighborhood-union-health',
  'union-city-jail': 'union-city-jail',
  'gladys-s-dennard-library-at-south-fulton': 'gladys-dennard-library',
  'aviation-culture-center': 'aviation-cultural-center',
  'aviation-center': 'aviation-cultural-center',
  'south-fulton-service-center': 'south-fulton-service-center',
  'medical-examiners-facility': 'medical-examiner',
  'sandy-springs-branch': 'sandy-springs-library',
  'hjc-bowden-senior-multi-purpose-facility': 'bowden-senior-center',
  'milton-branch': 'milton-library',
  'ponce-de-leon-branch': 'ponce-de-leon-jp-library',
  'qls-center-for-senior-citizens': 'qls-senior-center',
  'north-fulton-service-center': 'north-fulton-service-center',
  'new-beginnings-neighborhood-senior-center': 'new-beginnings-senior-center',
  'dogwood-branch': 'dogwood-library',
  'cascade-library': 'cascade-sw-library',
  'adamsville-collier-heights-branch': 'adamsville-ac-library',
  'palmetto-branch': 'palmetto-library',
  'college-park-branch': 'college-park-library',
  'college-park-health-center': 'college-park-regional-health',
  'college-park-regional-health-center': 'college-park-regional-health',
  'dogwood-senior-center': 'dogwood-senior-center',
  'adams-park-branch': 'adams-park-library',
  'cleveland-avenue-branch': 'cleveland-ave-library',
  'southeast-neighborhood-senior-center': 'se-neighborhood-senior-center',
  'driver-services': 'maxwell-rd-driver-services',
  'water-op-center-tax-commissioner': 'maxwell-rd-driver-services',
  'auburn-avenue-research-branch': 'auburn-ave-research-library',
  'buckhead-branch': 'buckhead-library',
  'hapeville-branch': 'hapeville-library',
  'northeast-spruill-oaks-branch': 'ne-spruill-oaks-library',
  'northside-branch': 'northside-library',
  'ocee-branch': 'ocee-library',
  'alpharetta-library': 'alpharetta-library',
  'wolf-creek-library': 'wolf-creek-library',
  'metropolitan-library': 'metropolitan-library',
  'neighbor-hood-union-health': 'neighborhood-union-health',
}

const METER_SUFFIX_RE = /\s*-\s*SOL\d.*$/i

/** Strip meter id suffix from solar-cost.xlsx labels. */
export function stripMeterLabel(rawName) {
  return String(rawName ?? '').replace(METER_SUFFIX_RE, '').trim()
}

/**
 * @param {string} rawName - Building label from any spreadsheet
 * @returns {string} Stable id used by building-positions.json
 */
export function resolveBuildingId(rawName) {
  const cleaned = stripMeterLabel(rawName)
  const slug = slugifyBuildingName(cleaned)
  return BUILDING_ALIASES[slug] ?? slug
}

/** @param {string} id */
export function getBuildingName(id) {
  if (BUILDING_NAMES[id]) {
    return BUILDING_NAMES[id]
  }

  return id
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

/** @param {string} id */
export function getBuildingDisplayName(id) {
  return BUILDING_DISPLAY_NAME_OVERRIDES[id] ?? getBuildingName(id)
}

/**
 * @param {string} rawName
 * @returns {{ id: string, name: string, displayName: string, rawName: string }}
 */
export function resolveBuildingRecord(rawName) {
  const cleaned = stripMeterLabel(rawName)
  const id = resolveBuildingId(cleaned)
  return {
    id,
    name: getBuildingName(id),
    displayName: getBuildingDisplayName(id),
    rawName: cleaned,
  }
}
