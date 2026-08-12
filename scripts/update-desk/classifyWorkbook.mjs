import XLSX from 'xlsx'

const YEAR_SHEET_RE = /^(20\d{2})$/
const YEAR_HEADER_RE =
  /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{4})\s*-\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{4})$/i

function sheetNames(workbook) {
  return workbook.SheetNames ?? []
}

function sheetHasHeaderMatch(workbook, sheetName, matcher) {
  const sheet = workbook.Sheets[sheetName]
  if (!sheet) return false
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })
  for (const row of rows.slice(0, 40)) {
    for (const cell of row) {
      const text = String(cell ?? '').trim()
      if (matcher(text)) return true
    }
  }
  return false
}

function looksLikeEnergyWorkbook(workbook) {
  const names = sheetNames(workbook)
  const yearSheets = names.filter((name) => YEAR_SHEET_RE.test(String(name).trim()))
  if (yearSheets.length >= 1) {
    return {
      matched: true,
      evidence: `Found year sheet(s): ${yearSheets.slice(0, 8).join(', ')}`,
    }
  }
  for (const name of names) {
    if (sheetHasHeaderMatch(workbook, name, (text) => YEAR_HEADER_RE.test(text))) {
      return {
        matched: true,
        evidence: `Found monthly energy header on sheet "${name}"`,
      }
    }
  }
  return { matched: false, evidence: '' }
}

function looksLikeSavingsWorkbook(workbook) {
  const names = sheetNames(workbook).map((name) => String(name).trim().toLowerCase())
  const hasKwh = names.includes('kwh')
  const hasElec = names.includes('elec rates')
  const hasCs = names.includes('cs rates')
  if (hasKwh && hasElec && hasCs) {
    return {
      matched: true,
      evidence: 'Found sheets: kWh, Elec Rates, CS Rates',
    }
  }
  if (hasElec && hasCs) {
    return {
      matched: true,
      evidence: 'Found sheets: Elec Rates, CS Rates',
    }
  }
  return { matched: false, evidence: '' }
}

function looksLikeAddressesWorkbook(workbook) {
  const names = sheetNames(workbook)
  for (const name of names) {
    const sheet = workbook.Sheets[name]
    if (!sheet) continue
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })
    const header = (rows[0] ?? []).map((cell) => String(cell ?? '').trim().toLowerCase())
    const hasAddress = header.some((cell) => /address/.test(cell))
    const hasBuilding = header.some((cell) =>
      /building|facility|site|name|system/.test(cell),
    )
    if (hasAddress && hasBuilding) {
      return {
        matched: true,
        evidence: `Found address columns on sheet "${name}"`,
        sample: rows.slice(1, 6).map((row) => ({
          name: String(row[header.findIndex((h) => /building|facility|site|name|system/.test(h))] ?? '').trim(),
          address: String(row[header.findIndex((h) => /address/.test(h))] ?? '').trim(),
        })).filter((entry) => entry.name || entry.address),
        rowCount: Math.max(0, rows.length - 1),
      }
    }
  }
  return { matched: false, evidence: '', sample: [], rowCount: 0 }
}

function classificationMeta(key, evidence, extra = {}) {
  switch (key) {
    case 'energy':
      return {
        key: 'energy',
        label: 'Building energy (kWh)',
        contributes: ['Building kWh by year and month', 'Building catalog names', 'CO₂ from kWh'],
        canonicalName: 'solar-data.xlsx',
        evidence,
        ...extra,
      }
    case 'savings':
      return {
        key: 'savings',
        label: 'Rates & savings',
        contributes: [
          'Electric rates (Elec Rates)',
          'Community Solar rates (CS Rates)',
          'Monthly dollar savings',
          'Emission rate when present',
          'Fills missing building kWh months',
        ],
        canonicalName: null,
        evidence,
        ...extra,
      }
    case 'addresses':
      return {
        key: 'addresses',
        label: 'Addresses',
        contributes: [
          'Building addresses for map positions',
          'Not read by the energy/savings import itself',
        ],
        canonicalName: 'solar-building-addresses.xlsx',
        evidence,
        ...extra,
      }
    default:
      return {
        key: 'unknown',
        label: 'Unrecognized',
        contributes: [],
        canonicalName: null,
        evidence: evidence || 'Could not match energy, rates/savings, or address layouts',
        ...extra,
      }
  }
}

/**
 * Classify an Excel workbook by contents (filename is ignored for type).
 * @param {string} originalName
 * @param {Buffer} buffer
 */
export function classifyWorkbookFile(originalName, buffer) {
  let workbook
  try {
    workbook = XLSX.read(buffer, { type: 'buffer' })
  } catch (error) {
    return {
      ...classificationMeta('unknown', `Could not read Excel file: ${error.message}`),
      originalName,
      savedAs: originalName,
    }
  }

  const savings = looksLikeSavingsWorkbook(workbook)
  const energy = looksLikeEnergyWorkbook(workbook)
  const addresses = looksLikeAddressesWorkbook(workbook)

  // Prefer savings over energy when both match (savings also has a kWh sheet).
  let key = 'unknown'
  let evidence = ''
  let extra = {}

  if (savings.matched) {
    key = 'savings'
    evidence = savings.evidence
  } else if (energy.matched) {
    key = 'energy'
    evidence = energy.evidence
  } else if (addresses.matched) {
    key = 'addresses'
    evidence = addresses.evidence
    extra = { addressSample: addresses.sample, addressRowCount: addresses.rowCount }
  }

  const result = classificationMeta(key, evidence, extra)

  let savedAs = originalName
  if (result.canonicalName) {
    savedAs = result.canonicalName
  } else if (key === 'savings') {
    if (/^Solar Monthly Savings.*\.xlsx$/i.test(originalName)) {
      savedAs = originalName
    } else {
      const now = new Date()
      savedAs = `Solar Monthly Savings ${now.getUTCFullYear()}-${now.getUTCMonth() + 1}-${now.getUTCDate()}.xlsx`
    }
  }

  return {
    ...result,
    originalName,
    savedAs,
  }
}

/**
 * Extract a short address preview without full import.
 * @param {Buffer} buffer
 */
export function previewAddresses(buffer) {
  try {
    const workbook = XLSX.read(buffer, { type: 'buffer' })
    const addresses = looksLikeAddressesWorkbook(workbook)
    if (!addresses.matched) return { rowCount: 0, sample: [] }
    return { rowCount: addresses.rowCount, sample: addresses.sample }
  } catch {
    return { rowCount: 0, sample: [] }
  }
}
