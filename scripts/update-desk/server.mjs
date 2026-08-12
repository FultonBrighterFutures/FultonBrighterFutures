import { spawnSync } from 'node:child_process'
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import http from 'node:http'
import { dirname, extname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { runImport } from '../import-solar-data.mjs'
import { runProjectPositions } from '../project-building-positions.mjs'
import { classifyWorkbookFile, previewAddresses } from './classifyWorkbook.mjs'
import { geocodeAddress, sleep } from './geocodeAddress.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '../..')
const publicUiDir = join(__dirname, 'public')
const dataDir = join(root, 'public/data')
const sourcesDir = join(dataDir, 'sources')
const runtimeDir = join(dataDir, 'runtime')
const archiveSourcesDir = join(dataDir, 'archive/sources')
const stagingDir = join(dataDir, '.update-desk-staging')
const envPath = join(root, '.env.update-desk')
const srcDisplayNamesPath = join(root, 'src/data/building-display-names.json')
const PORT = Number(process.env.UPDATE_DESK_PORT) || 4178
const HOST = '127.0.0.1'

function loadEnvFile(path) {
  if (!existsSync(path)) return {}
  const env = {}
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    env[key] = value
  }
  return env
}

function ensurePassword() {
  const fromProcess = process.env.UPDATE_DESK_PASSWORD
  if (fromProcess) return fromProcess
  const fileEnv = loadEnvFile(envPath)
  if (fileEnv.UPDATE_DESK_PASSWORD) return fileEnv.UPDATE_DESK_PASSWORD
  const generated = `desk-${Math.random().toString(36).slice(2, 10)}`
  writeFileSync(
    envPath,
    `# Local Update Desk password (do not commit)\nUPDATE_DESK_PASSWORD=${generated}\n`,
    'utf8',
  )
  console.log(`\nCreated ${envPath}`)
  console.log(`Your Update Desk password is: ${generated}\n`)
  return generated
}

const PASSWORD = ensurePassword()
const sessions = new Set()

function json(res, status, body) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  })
  res.end(JSON.stringify(body))
}

function readBody(req) {
  return new Promise((resolveBody, reject) => {
    const chunks = []
    req.on('data', (chunk) => chunks.push(chunk))
    req.on('end', () => resolveBody(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

async function readJson(req) {
  const raw = await readBody(req)
  if (!raw.length) return {}
  return JSON.parse(raw.toString('utf8'))
}

function requireAuth(req, res) {
  const token = req.headers['x-update-desk-token']
  if (typeof token !== 'string' || !sessions.has(token)) {
    json(res, 401, {
      ok: false,
      step: 'auth',
      message: 'Please unlock the Update Desk with the shared password.',
    })
    return false
  }
  return true
}

function listSourceFiles(dir) {
  if (!existsSync(dir)) return []
  return readdirSync(dir)
    .filter((name) => !name.startsWith('~$') && !name.startsWith('.'))
    .sort()
    .map((name) => {
      const full = join(dir, name)
      const stats = statSync(full)
      return { name, size: stats.size, updatedAt: stats.mtime.toISOString() }
    })
}

function ensureDir(dir) {
  mkdirSync(dir, { recursive: true })
}

function emptyDir(dir) {
  if (existsSync(dir)) rmSync(dir, { recursive: true, force: true })
  ensureDir(dir)
}

function copyDirContents(fromDir, toDir) {
  ensureDir(toDir)
  if (!existsSync(fromDir)) return
  for (const name of readdirSync(fromDir)) {
    if (name.startsWith('~$')) continue
    const from = join(fromDir, name)
    const to = join(toDir, name)
    if (statSync(from).isDirectory()) copyDirContents(from, to)
    else copyFileSync(from, to)
  }
}

function archiveLiveSources() {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 16)
  const target = join(archiveSourcesDir, stamp)
  ensureDir(target)
  copyDirContents(sourcesDir, target)
  return target
}

function promoteStagingToLive() {
  emptyDir(sourcesDir)
  copyDirContents(stagingDir, sourcesDir)
}

function writeDisplayNames(dir, overrides) {
  const cleaned = {}
  for (const [id, name] of Object.entries(overrides ?? {})) {
    const trimmed = String(name ?? '').trim()
    if (!id || !trimmed) continue
    cleaned[id] = trimmed
  }
  const text = `${JSON.stringify(cleaned, null, 2)}\n`
  writeFileSync(join(dir, 'building-display-names.json'), text, 'utf8')
  writeFileSync(srcDisplayNamesPath, text, 'utf8')
  return cleaned
}

function writeRateOverrides(dir, keyRates, fallbackRates) {
  const elecRate = Number(keyRates?.elecRate ?? fallbackRates?.elecRate)
  const csRate = Number(keyRates?.csRate ?? fallbackRates?.csRate)
  if (!Number.isFinite(elecRate) || !Number.isFinite(csRate)) {
    return null
  }
  const payload = {
    elecRate,
    csRate,
    year: keyRates?.year ?? fallbackRates?.year ?? null,
    month: keyRates?.month ?? fallbackRates?.month ?? null,
    updatedAt: new Date().toISOString(),
  }
  writeFileSync(join(dir, 'savings-rate-overrides.json'), `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
  return payload
}

function runCommand(command, args, label) {
  // On Windows, `npm` is a .cmd and needs a shell. `git` must not use a shell:
  // with shell:true, `git commit -m "Update solar …"` gets re-split on spaces and
  // git treats those words as pathspecs.
  const useShell = process.platform === 'win32' && command !== 'git'
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: 'utf8',
    shell: useShell,
    env: process.env,
    windowsHide: true,
  })
  const details = [result.stdout ?? '', result.stderr ?? ''].filter(Boolean).join('\n').trim()
  if (result.error) {
    return { ok: false, step: label, message: result.error.message, details }
  }
  if (result.status !== 0) {
    return { ok: false, step: label, message: `${label} failed (exit ${result.status}).`, details }
  }
  return { ok: true, step: label, message: `${label} completed.`, details }
}

function monthSpan(monthly) {
  if (!monthly?.length) return null
  const sorted = [...monthly].sort(
    (a, b) => a.year - b.year || a.month - b.month,
  )
  const first = sorted[0]
  const last = sorted[sorted.length - 1]
  return {
    from: `${first.year}-${String(first.month).padStart(2, '0')}`,
    to: `${last.year}-${String(last.month).padStart(2, '0')}`,
  }
}

/** Drop coordinate / position rows that are not in the current building catalog. */
function pruneOrphanMapBuildings(catalogIds) {
  const keep = new Set(catalogIds)
  const removed = []

  function pruneCoordsFile(path) {
    if (!existsSync(path)) return
    const coords = JSON.parse(readFileSync(path, 'utf8'))
    if (!Array.isArray(coords.buildings)) return
    const next = []
    for (const building of coords.buildings) {
      if (keep.has(building.id)) next.push(building)
      else removed.push(building.id)
    }
    if (next.length === coords.buildings.length) return
    coords.buildings = next
    writeFileSync(path, `${JSON.stringify(coords, null, 2)}\n`, 'utf8')
  }

  pruneCoordsFile(join(sourcesDir, 'building-coordinates.json'))
  pruneCoordsFile(join(stagingDir, 'building-coordinates.json'))

  const uniqueRemoved = [...new Set(removed)]
  if (!uniqueRemoved.length) return uniqueRemoved

  runProjectPositions({
    coordsPath: join(sourcesDir, 'building-coordinates.json'),
    runtimeDir,
    rootDir: root,
  })
  return uniqueRemoved
}

function coverageGaps(dataset) {
  const catalogIds = [...dataset.buildings.map((building) => building.id)].sort()
  const energyYearsDesc = [...(dataset.years ?? [])].sort((a, b) => b - a)
  const costYearsDesc = [...(dataset.costYears ?? [])].sort((a, b) => b - a)

  function missingEnergy(year) {
    const ids = new Set(
      dataset.monthly
        .filter((entry) => entry.year === year && entry.kWh > 0)
        .map((entry) => entry.buildingId),
    )
    return catalogIds.filter((id) => !ids.has(id))
  }

  function missingSavings(year) {
    const ids = new Set(
      dataset.monthlyCost
        .filter((entry) => entry.year === year && entry.dollars !== 0)
        .map((entry) => entry.buildingId),
    )
    return catalogIds.filter((id) => !ids.has(id))
  }

  let energyCoverageYear = null
  for (const year of energyYearsDesc) {
    if (missingEnergy(year).length === 0) {
      energyCoverageYear = year
      break
    }
  }

  let savingsCoverageYear = null
  for (const year of costYearsDesc) {
    if (missingSavings(year).length === 0) {
      savingsCoverageYear = year
      break
    }
  }

  return {
    energyCoverageYear,
    savingsCoverageYear,
    energyGaps: energyYearsDesc.slice(0, 3).map((year) => ({
      year,
      missing: missingEnergy(year),
    })),
    savingsGaps: costYearsDesc.slice(0, 3).map((year) => ({
      year,
      missing: missingSavings(year),
    })),
    ok: energyCoverageYear != null && savingsCoverageYear != null,
  }
}

function buildReviewPayload(result, classifications, addressPreview) {
  const { dataset, energyMerge, unknownBuildings, positionCheck, logs } = result
  const coverage = coverageGaps(dataset)
  const flags = []
  if (unknownBuildings.length) {
    flags.push({
      level: 'bad',
      message: `${unknownBuildings.length} building name(s) are not in the known catalog: ${unknownBuildings.map((b) => b.id).join(', ')}.`,
    })
  }
  if (positionCheck?.unpositionedIds?.length) {
    flags.push({
      level: 'bad',
      message: `${positionCheck.unpositionedIds.length} building(s) need an address to place on the map: ${positionCheck.unpositionedIds.join(', ')}. Enter each address below and click Place on map.`,
    })
  }
  if (!coverage.energyCoverageYear) {
    const detail = coverage.energyGaps
      .map((gap) => `${gap.year}: ${gap.missing.join(', ') || '(none)'}`)
      .join(' · ')
    flags.push({
      level: 'bad',
      message: `No year has kWh for every building. Fix the Excel so one common year includes all buildings (including new ones). Gaps → ${detail}`,
    })
  }
  if (!coverage.savingsCoverageYear) {
    const detail = coverage.savingsGaps
      .map((gap) => `${gap.year}: ${gap.missing.join(', ') || '(none)'}`)
      .join(' · ')
    flags.push({
      level: 'bad',
      message: `No year has savings for every building. Gaps → ${detail}`,
    })
  }
  if (energyMerge.conflicts.length) {
    flags.push({
      level: 'warn',
      message: `${energyMerge.conflicts.length} energy row(s) differ between workbooks by more than 2% (energy workbook kept).`,
    })
  }

  const contributions = []
  const energyClass = classifications.find((item) => item.key === 'energy')
  if (energyClass || dataset.sourceFiles?.energy) {
    contributions.push({
      key: 'energy',
      label: 'Building energy (kWh)',
      file: energyClass?.savedAs || dataset.sourceFiles.energy,
      originalName: energyClass?.originalName || null,
      evidence: energyClass?.evidence || null,
      used: true,
      summary: {
        buildings: dataset.buildings.length,
        years: dataset.years,
        energyRows: dataset.monthly.length,
        totalKwh: dataset.totalKwhProduced,
        monthSpan: monthSpan(dataset.monthly),
        kwhByYear: dataset.kwhByYear,
      },
      contributes: energyClass?.contributes || [
        'Building kWh by year and month',
        'Building catalog names',
        'CO₂ from kWh',
      ],
    })
  }

  const savingsClass = classifications.find((item) => item.key === 'savings')
  if (savingsClass || dataset.savingsRates || dataset.monthlyCost?.length) {
    contributions.push({
      key: 'savings',
      label: 'Rates & savings',
      file: savingsClass?.savedAs || dataset.sourceFiles?.savings,
      originalName: savingsClass?.originalName || null,
      evidence: savingsClass?.evidence || null,
      used: Boolean(dataset.monthlyCost?.length || dataset.savingsRates),
      summary: {
        totalSavings: dataset.totalSavings,
        savingsByYear: dataset.savingsByYear,
        savingsRates: dataset.savingsRates,
        costYears: dataset.costYears,
        costRows: dataset.monthlyCost.length,
      },
      contributes: savingsClass?.contributes || [
        'Electric rates (Elec Rates)',
        'Community Solar rates (CS Rates)',
        'Monthly dollar savings',
      ],
    })
  }

  const addressClass = classifications.find((item) => item.key === 'addresses')
  if (addressClass || addressPreview) {
    contributions.push({
      key: 'addresses',
      label: 'Addresses',
      file: addressClass?.savedAs || 'solar-building-addresses.xlsx',
      originalName: addressClass?.originalName || null,
      evidence: addressClass?.evidence || null,
      used: true,
      summary: {
        rowCount: addressPreview?.rowCount ?? addressClass?.addressRowCount ?? 0,
        sample: addressPreview?.sample ?? addressClass?.addressSample ?? [],
      },
      contributes: addressClass?.contributes || [
        'Building addresses for map positions',
      ],
    })
  }

  return {
    classifications,
    contributions,
    flags,
    buildings: dataset.buildings.map((building) => ({
      id: building.id,
      name: building.name,
      displayName: building.displayName,
      rawName: building.rawName,
      known: !unknownBuildings.some((entry) => entry.id === building.id),
    })),
    keyRates: dataset.savingsRates
      ? {
          elecRate: dataset.savingsRates.elecRate,
          csRate: dataset.savingsRates.csRate,
          savingsPerKwh: dataset.savingsRates.savingsPerKwh,
          year: dataset.savingsRates.year,
          month: dataset.savingsRates.month,
        }
      : null,
    totals: {
      buildings: dataset.buildings.length,
      energyRows: dataset.monthly.length,
      costRows: dataset.monthlyCost.length,
      totalKwhProduced: dataset.totalKwhProduced,
      totalSavings: dataset.totalSavings,
      totalCo2SavedLbs: dataset.totalCo2SavedLbs,
      years: dataset.years,
    },
    unknownBuildings,
    unpositionedIds: positionCheck?.unpositionedIds ?? [],
    coverage,
    canApply:
      coverage.ok &&
      !(positionCheck?.unpositionedIds?.length) &&
      unknownBuildings.length === 0,
    logs,
  }
}

function contentTypeFor(filePath) {
  switch (extname(filePath).toLowerCase()) {
    case '.html':
      return 'text/html; charset=utf-8'
    case '.css':
      return 'text/css; charset=utf-8'
    case '.js':
      return 'text/javascript; charset=utf-8'
    default:
      return 'application/octet-stream'
  }
}

function serveStatic(req, res, urlPath) {
  const relative = urlPath === '/' ? '/index.html' : urlPath
  const filePath = join(publicUiDir, relative)
  if (!filePath.startsWith(publicUiDir) || !existsSync(filePath) || statSync(filePath).isDirectory()) {
    json(res, 404, { ok: false, message: 'Not found.' })
    return
  }
  res.writeHead(200, { 'Content-Type': contentTypeFor(filePath), 'Cache-Control': 'no-store' })
  res.end(readFileSync(filePath))
}

async function handleApi(req, res, url) {
  if (req.method === 'GET' && url.pathname === '/api/health') {
    return json(res, 200, { ok: true, step: 'health', message: 'Update Desk is running.' })
  }

  if (req.method === 'POST' && url.pathname === '/api/unlock') {
    const body = await readJson(req)
    if (String(body.password ?? '') !== PASSWORD) {
      return json(res, 401, {
        ok: false,
        step: 'unlock',
        message: 'Incorrect password. Check .env.update-desk in the project folder.',
      })
    }
    const token = `tok-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
    sessions.add(token)
    return json(res, 200, { ok: true, step: 'unlock', message: 'Unlocked.', token })
  }

  if (!requireAuth(req, res)) return

  if (req.method === 'GET' && url.pathname === '/api/status') {
    return json(res, 200, {
      ok: true,
      step: 'status',
      message: 'Current live sources.',
      liveFiles: listSourceFiles(sourcesDir),
      stagingFiles: listSourceFiles(stagingDir),
    })
  }

  if (req.method === 'POST' && url.pathname === '/api/process') {
    try {
      const body = await readJson(req)
      const files = Array.isArray(body.files) ? body.files : []
      if (!files.length) {
        return json(res, 400, {
          ok: false,
          step: 'process',
          message: 'Choose at least one Excel workbook to process.',
        })
      }

      prepareStagingBase()
      const classifications = []
      let addressPreview = null

      for (const file of files) {
        const name = String(file.name ?? '').replace(/^.*[\\/]/, '')
        if (!name || name.startsWith('~$')) continue
        if (!/\.xlsx$/i.test(name)) {
          return json(res, 400, {
            ok: false,
            step: 'process',
            message: `Unsupported file type: ${name}. Upload .xlsx workbooks only.`,
          })
        }
        const buffer = Buffer.from(String(file.base64 ?? ''), 'base64')
        if (!buffer.length) {
          return json(res, 400, {
            ok: false,
            step: 'process',
            message: `File ${name} was empty.`,
          })
        }

        const classification = classifyWorkbookFile(name, buffer)
        if (classification.key === 'unknown') {
          return json(res, 400, {
            ok: false,
            step: 'process',
            message: `Could not tell what "${name}" contains. Upload energy (year sheets), rates (Elec Rates / CS Rates), or addresses workbooks.`,
            details: classification.evidence,
            classification,
          })
        }

        if (classification.key === 'savings') {
          for (const existing of readdirSync(stagingDir)) {
            if (
              /^Solar Monthly Savings.*\.xlsx$/i.test(existing) &&
              existing !== classification.savedAs
            ) {
              rmSync(join(stagingDir, existing), { force: true })
            }
          }
        }

        writeFileSync(join(stagingDir, classification.savedAs), buffer)
        classifications.push(classification)

        if (classification.key === 'addresses') {
          addressPreview = previewAddresses(buffer)
        }
      }

      // Ensure display names exist in staging for import.
      const liveNamesPath = join(sourcesDir, 'building-display-names.json')
      if (!existsSync(join(stagingDir, 'building-display-names.json')) && existsSync(liveNamesPath)) {
        copyFileSync(liveNamesPath, join(stagingDir, 'building-display-names.json'))
      }
      const liveRatesPath = join(sourcesDir, 'savings-rate-overrides.json')
      if (!existsSync(join(stagingDir, 'savings-rate-overrides.json')) && existsSync(liveRatesPath)) {
        copyFileSync(liveRatesPath, join(stagingDir, 'savings-rate-overrides.json'))
      }

      if (!existsSync(join(stagingDir, 'solar-data.xlsx'))) {
        return json(res, 400, {
          ok: false,
          step: 'process',
          message:
            'No building-energy workbook detected. Upload a file with year sheets (like solar-data) so kWh can be imported.',
          classifications,
        })
      }

      const result = runImport({
        sourcesDir: stagingDir,
        runtimeDir,
        write: false,
        validatePositions: 'report',
      })
      const review = buildReviewPayload(result, classifications, addressPreview)

      return json(res, 200, {
        ok: true,
        step: 'process',
        message: review.flags.length
          ? 'Processed with warnings. Review contributions below.'
          : 'Processed. Review contributions, display names, and key rates.',
        review,
      })
    } catch (error) {
      return json(res, 400, {
        ok: false,
        step: 'process',
        message: error.message || 'Process failed.',
        details: String(error.stack || error),
      })
    }
  }

  if (req.method === 'POST' && url.pathname === '/api/map-buildings') {
    try {
      const body = await readJson(req)
      const entries = Array.isArray(body.buildings) ? body.buildings : []
      if (!entries.length) {
        return json(res, 400, {
          ok: false,
          step: 'map-buildings',
          message: 'Add at least one building address to place on the map.',
        })
      }

      const coordsPath = join(sourcesDir, 'building-coordinates.json')
      if (!existsSync(coordsPath)) {
        return json(res, 400, {
          ok: false,
          step: 'map-buildings',
          message: 'Missing building-coordinates.json in sources.',
        })
      }

      const coords = JSON.parse(readFileSync(coordsPath, 'utf8'))
      if (!Array.isArray(coords.buildings)) coords.buildings = []

      const placed = []
      const errors = []

      for (let index = 0; index < entries.length; index += 1) {
        const entry = entries[index]
        const id = String(entry.id ?? '').trim()
        const address = String(entry.address ?? '').trim()
        const name =
          String(entry.name ?? '').trim() ||
          id
            .split('-')
            .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
            .join(' ')

        if (!id || !address) {
          errors.push({ id: id || '(missing id)', message: 'ID and address are required.' })
          continue
        }

        try {
          if (index > 0) await sleep(1100)
          const geo = await geocodeAddress(address)
          const next = {
            id,
            name,
            systemName: entry.systemName || name,
            address,
            lat: geo.lat,
            lng: geo.lng,
            geocodeLabel: geo.geocodeLabel,
          }
          const existingIndex = coords.buildings.findIndex((building) => building.id === id)
          if (existingIndex >= 0) coords.buildings[existingIndex] = next
          else coords.buildings.push(next)
          placed.push({ id, name, address, lat: geo.lat, lng: geo.lng })
        } catch (error) {
          errors.push({ id, message: error.message || 'Geocode failed.' })
        }
      }

      if (!placed.length) {
        return json(res, 400, {
          ok: false,
          step: 'map-buildings',
          message: 'Could not place any buildings. Check the addresses and try again.',
          errors,
        })
      }

      coords.geocodedAt = new Date().toISOString()
      coords.geocoder = coords.geocoder || 'nominatim.openstreetmap.org'
      const coordsText = `${JSON.stringify(coords, null, 2)}\n`
      writeFileSync(coordsPath, coordsText, 'utf8')
      if (existsSync(stagingDir)) {
        writeFileSync(join(stagingDir, 'building-coordinates.json'), coordsText, 'utf8')
      }

      const projection = runProjectPositions({
        coordsPath,
        runtimeDir,
        rootDir: root,
      })

      // Refresh review from current staging if process has already staged files.
      let review = null
      if (existsSync(stagingDir) && existsSync(join(stagingDir, 'solar-data.xlsx'))) {
        const result = runImport({
          sourcesDir: stagingDir,
          runtimeDir,
          write: false,
          validatePositions: 'report',
        })
        review = buildReviewPayload(result, [], null)
      }

      return json(res, 200, {
        ok: true,
        step: 'map-buildings',
        message:
          errors.length > 0
            ? `Placed ${placed.length} building(s); ${errors.length} failed.`
            : `Placed ${placed.length} building(s) on the map.`,
        placed,
        errors,
        projectedCount: projection.count,
        review,
      })
    } catch (error) {
      return json(res, 400, {
        ok: false,
        step: 'map-buildings',
        message: error.message || 'Could not place buildings on the map.',
        details: String(error.stack || error),
      })
    }
  }

  if (req.method === 'POST' && url.pathname === '/api/apply') {
    try {
      if (!existsSync(stagingDir) || !listSourceFiles(stagingDir).some((f) => /\.xlsx$/i.test(f.name))) {
        return json(res, 400, {
          ok: false,
          step: 'apply',
          message: 'Nothing to apply. Upload and process workbooks first.',
        })
      }

      const body = await readJson(req)
      writeDisplayNames(stagingDir, body.displayNames ?? {})
      writeRateOverrides(stagingDir, body.keyRates, body.keyRates)

      // Import from staging into runtime first (live Excel sources unchanged until validate passes).
      const stagedImport = runImport({
        sourcesDir: stagingDir,
        runtimeDir,
        write: true,
        validatePositions: 'report',
      })

      const missingPositions = stagedImport.positionCheck?.unpositionedIds ?? []
      if (missingPositions.length) {
        runImport({ sourcesDir, runtimeDir, write: true, validatePositions: 'report' })
        return json(res, 400, {
          ok: false,
          step: 'apply',
          message: `Cannot apply yet: ${missingPositions.length} building(s) still need map positions (${missingPositions.join(', ')}). Enter their addresses in Review and click Place on map.`,
          details: stagedImport.logs.join('\n'),
          unpositionedIds: missingPositions,
        })
      }

      const coverage = coverageGaps(stagedImport.dataset)
      if (!coverage.ok) {
        runImport({ sourcesDir, runtimeDir, write: true, validatePositions: 'report' })
        const energyDetail = coverage.energyGaps
          .map((gap) => `${gap.year}: ${gap.missing.join(', ') || '(none)'}`)
          .join(' · ')
        return json(res, 400, {
          ok: false,
          step: 'apply',
          message: `Cannot apply: no year has complete data for every building. Fix Excel coverage first. Energy gaps → ${energyDetail}`,
          details: stagedImport.logs.join('\n'),
          coverage,
        })
      }

      // Leftover Place-on-map rows (e.g. abandoned test IDs) break validate-data.
      const orphanPositions = stagedImport.positionCheck?.unknownPositionIds ?? []
      const prunedOrphans = orphanPositions.length
        ? pruneOrphanMapBuildings(stagedImport.dataset.buildings.map((building) => building.id))
        : []

      const validate = runCommand('npm', ['run', 'validate-data'], 'validate-data')
      if (!validate.ok) {
        // Restore runtime JSON from current live sources.
        runImport({ sourcesDir, runtimeDir, write: true, validatePositions: 'report' })
        const plain =
          validate.details.match(/AssertionError \[ERR_ASSERTION\]: (.+)/)?.[1] ||
          'Validation failed after import.'
        return json(res, 400, {
          ok: false,
          step: 'apply',
          message: plain,
          details: [stagedImport.logs.join('\n'), validate.details].filter(Boolean).join('\n\n'),
        })
      }

      const archivePath = archiveLiveSources()
      promoteStagingToLive()
      writeDisplayNames(sourcesDir, body.displayNames ?? {})
      writeRateOverrides(sourcesDir, body.keyRates, stagedImport.dataset.savingsRates)

      const result = runImport({
        sourcesDir,
        runtimeDir,
        write: true,
        validatePositions: true,
      })

      const pruneNote = prunedOrphans.length
        ? ` Removed leftover map positions: ${prunedOrphans.join(', ')}.`
        : ''
      return json(res, 200, {
        ok: true,
        step: 'apply',
        message: `Applied update. Previous sources archived.${pruneNote}`,
        archivePath,
        prunedOrphans,
        details: [result.logs.join('\n'), validate.details].filter(Boolean).join('\n\n'),
      })
    } catch (error) {
      try {
        runImport({ sourcesDir, runtimeDir, write: true, validatePositions: 'report' })
      } catch {
        // best-effort restore
      }
      return json(res, 400, {
        ok: false,
        step: 'apply',
        message: error.message || 'Apply failed.',
        details: String(error.stack || error),
      })
    }
  }

  if (req.method === 'POST' && url.pathname === '/api/publish') {
    const steps = []
    const add = runCommand(
      'git',
      [
        'add',
        'public/data/sources',
        'public/data/runtime/solar-data.json',
        'public/data/runtime/building-positions.json',
        'public/data/runtime/building-positions-main.json',
        'public/data/archive/sources',
        'src/data/building-display-names.json',
      ],
      'git add',
    )
    steps.push(add)
    if (!add.ok) {
      return json(res, 400, { ok: false, step: 'publish', message: add.message, steps, details: add.details })
    }

    const status = runCommand('git', ['status', '--porcelain'], 'git status')
    steps.push(status)
    if (!status.ok) {
      return json(res, 400, {
        ok: false,
        step: 'publish',
        message: status.message,
        steps,
        details: status.details,
      })
    }

    if (status.details.trim()) {
      const stamp = new Date().toISOString().slice(0, 10)
      const commit = runCommand(
        'git',
        ['commit', '-m', `Update solar building data (${stamp})`],
        'git commit',
      )
      steps.push(commit)
      if (!commit.ok) {
        return json(res, 400, {
          ok: false,
          step: 'publish',
          message: commit.message,
          steps,
          details: commit.details,
        })
      }

      const push = runCommand('git', ['push'], 'git push')
      steps.push(push)
      if (!push.ok) {
        return json(res, 400, {
          ok: false,
          step: 'publish',
          message: 'git push failed. Sign in to GitHub, then try Publish again.',
          steps,
          details: push.details,
        })
      }
    }

    const build = runCommand('npm', ['run', 'build'], 'build')
    steps.push(build)
    if (!build.ok) {
      return json(res, 400, {
        ok: false,
        step: 'publish',
        message: build.message,
        steps,
        details: build.details,
      })
    }

    const deploy = runCommand('npm', ['run', 'deploy'], 'deploy')
    steps.push(deploy)
    if (!deploy.ok) {
      return json(res, 400, {
        ok: false,
        step: 'publish',
        message: deploy.message,
        steps,
        details: deploy.details,
      })
    }

    return json(res, 200, {
      ok: true,
      step: 'publish',
      message: 'Published. The live GitHub Pages site should update shortly.',
      steps,
      details: steps.map((step) => `## ${step.step}\n${step.details || step.message}`).join('\n\n'),
    })
  }

  return json(res, 404, { ok: false, message: 'Unknown API route.' })
}

function prepareStagingBase() {
  emptyDir(stagingDir)
  // Start from live sources so optional files (cost, coords) remain unless replaced.
  copyDirContents(sourcesDir, stagingDir)
}

function openBrowser(url) {
  try {
    if (process.platform === 'win32') {
      spawnSync('cmd', ['/c', 'start', '', url], { cwd: root, stdio: 'ignore' })
      return
    }
    if (process.platform === 'darwin') {
      spawnSync('open', [url], { cwd: root, stdio: 'ignore' })
      return
    }
    spawnSync('xdg-open', [url], { cwd: root, stdio: 'ignore' })
  } catch {
    console.log('Open this URL in your browser:', url)
  }
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? '/', `http://${HOST}:${PORT}`)
    if (url.pathname.startsWith('/api/')) {
      await handleApi(req, res, url)
      return
    }
    serveStatic(req, res, url.pathname)
  } catch (error) {
    json(res, 500, {
      ok: false,
      step: 'server',
      message: error.message || 'Unexpected server error.',
      details: String(error.stack || error),
    })
  }
})

server.listen(PORT, HOST, () => {
  const url = `http://${HOST}:${PORT}/`
  console.log(`Update Desk running at ${url}`)
  console.log('Bound to localhost only. Close this window to stop the desk.')
  openBrowser(url)
})
