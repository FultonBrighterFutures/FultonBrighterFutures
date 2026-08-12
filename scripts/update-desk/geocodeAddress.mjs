/**
 * Geocode a street address with OpenStreetMap Nominatim (1 request/sec polite use).
 * @param {string} address
 * @param {{ userAgent?: string }} [options]
 * @returns {Promise<{ lat: number, lng: number, geocodeLabel: string }>}
 */
export async function geocodeAddress(address, options = {}) {
  const query = String(address ?? '').trim()
  if (!query) {
    throw new Error('Address is empty.')
  }

  const url = new URL('https://nominatim.openstreetmap.org/search')
  url.searchParams.set('q', query)
  url.searchParams.set('format', 'json')
  url.searchParams.set('limit', '1')
  url.searchParams.set('addressdetails', '0')

  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent':
        options.userAgent ||
        'solar-dinosaur-update-desk/1.0 (local Fulton County solar data tool)',
    },
  })

  if (!response.ok) {
    throw new Error(`Geocoder HTTP ${response.status}`)
  }

  const results = await response.json()
  if (!Array.isArray(results) || !results.length) {
    throw new Error(`No geocode result for: ${query}`)
  }

  const hit = results[0]
  const lat = Number(hit.lat)
  const lng = Number(hit.lon)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new Error(`Invalid geocode coordinates for: ${query}`)
  }

  return {
    lat,
    lng,
    geocodeLabel: String(hit.display_name || query),
  }
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
