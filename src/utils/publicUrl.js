/**
 * Resolve a path under `public/` for both local (`/`) and GitHub Pages (`/solar-dinosaur/`).
 * @param {string} path - Absolute-from-site-root path, e.g. `/data/runtime/solar-data.json`
 * @returns {string}
 */
export function publicUrl(path) {
  const base = import.meta.env.BASE_URL || '/'
  const normalized = String(path).replace(/^\/+/, '')
  return `${base}${normalized}`
}
