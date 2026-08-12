/**
 * Build Excel packs under test-uploads/ for Update Desk practice.
 *
 *   npm run generate-test-uploads
 *
 * Pack A (safe-update): same buildings, lightly bumped kWh/rates → Apply-ready.
 * Pack B (new-building): adds "Test Lab Annex" with energy + savings + address.
 *   After Process, use Place on map, then Apply.
 * Pack C (new-year-2027): same buildings + full 2027 energy/savings → Apply-ready.
 */
import { mkdirSync, readFileSync, readdirSync, writeFileSync, existsSync, rmSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import XLSX from 'xlsx'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const sourcesDir = join(root, 'public', 'data', 'sources')
const outRoot = join(root, 'test-uploads')

const NEW_BUILDING = {
  energyName: 'Test Lab Annex',
  savingsName: 'Test Lab Annex',
  systemName: '999-FUL Test Lab Annex',
  address: '55 Trinity Ave SW, Atlanta, GA 30303',
  /** Fake monthly kWh for 2026 energy sheet months that already have values. */
  energyKwhByMonthCol: {
    5: 4200, // Jan
    6: 5100, // Feb
    7: 6800, // Mar
    8: 0, // Apr (matches sparse live pattern)
    9: 7400, // May
  },
  savingsKwh: 5500,
  elecRate: 0.15,
  csRate: 0.08,
}

const NEW_YEAR = 2027

function loadWorkbook(name) {
  return XLSX.read(readFileSync(join(sourcesDir, name)), { cellDates: false })
}

function findNewestSavingsWorkbookName() {
  const matches = readdirSync(sourcesDir).filter(
    (name) => /^Solar Monthly Savings.*\.xlsx$/i.test(name) && !name.startsWith('~$'),
  )
  if (!matches.length) {
    throw new Error('No Solar Monthly Savings workbook found in public/data/sources/')
  }
  matches.sort((a, b) => {
    const parse = (name) => {
      const match = name.match(/(\d{4})-(\d{1,2})-(\d{1,2})\.xlsx$/i)
      if (!match) return 0
      return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
    }
    return parse(b) - parse(a)
  })
  return matches[0]
}

function excelSerial(year, month, day = 1) {
  return Math.round(Date.UTC(year, month - 1, day) / 86400000) + 25569
}

function writeWorkbook(workbook, destPath) {
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
  writeFileSync(destPath, buffer)
}

function sheetToMatrix(sheet) {
  return XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: true })
}

function matrixToSheet(rows) {
  return XLSX.utils.aoa_to_sheet(rows)
}

function cloneWorkbook(workbook) {
  return XLSX.read(XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }), {
    cellDates: false,
  })
}

function bumpEnergyWorkbook(workbook, factor = 1.02) {
  const next = cloneWorkbook(workbook)
  for (const name of next.SheetNames) {
    if (!/^20\d{2}$/.test(name)) continue
    const sheet = next.Sheets[name]
    const rows = sheetToMatrix(sheet)
    for (let r = 0; r < rows.length; r++) {
      const building = String(rows[r][2] ?? '').trim()
      if (!building || /total/i.test(building)) continue
      for (let c = 5; c <= 18; c++) {
        const value = rows[r][c]
        if (typeof value === 'number' && value > 0) {
          rows[r][c] = Math.round(value * factor * 1000) / 1000
        }
      }
      // Totals column often at 19
      if (typeof rows[r][19] === 'number' && rows[r][19] > 0) {
        rows[r][19] = Math.round(rows[r][19] * factor * 1000) / 1000
      }
    }
    next.Sheets[name] = matrixToSheet(rows)
  }
  return next
}

function bumpSavingsWorkbook(workbook, elecDelta = 0.005) {
  const next = cloneWorkbook(workbook)
  const sheet = next.Sheets['Elec Rates']
  if (!sheet) return next
  const rows = sheetToMatrix(sheet)
  for (let r = 2; r < rows.length; r++) {
    const serial = rows[r][0]
    if (typeof serial !== 'number') continue
    const parsed = XLSX.SSF.parse_date_code(serial)
    if (!parsed || parsed.y !== 2026) continue
    for (let c = 1; c < rows[r].length; c++) {
      const value = rows[r][c]
      if (typeof value === 'number' && value > 0) {
        rows[r][c] = Math.round((value + elecDelta) * 10000) / 10000
      }
    }
  }
  next.Sheets['Elec Rates'] = matrixToSheet(rows)
  return next
}

function insertBuildingColumn(rows, buildingName, { fillSerialYears = [2026], kwh = null, rate = null } = {}) {
  const header = rows[1] ?? []
  let insertAt = header.length
  for (let c = 1; c < header.length; c++) {
    const label = String(header[c] ?? '')
    if (/total|co2|average|grand/i.test(label)) {
      insertAt = c
      break
    }
  }

  for (let r = 0; r < rows.length; r++) {
    while (rows[r].length < insertAt) rows[r].push('')
    rows[r].splice(insertAt, 0, '')
  }

  rows[1][insertAt] = buildingName

  for (let r = 2; r < rows.length; r++) {
    const serial = rows[r][0]
    if (typeof serial !== 'number') continue
    const parsed = XLSX.SSF.parse_date_code(serial)
    if (!parsed || !fillSerialYears.includes(parsed.y)) continue
    if (kwh != null) rows[r][insertAt] = kwh
    if (rate != null) rows[r][insertAt] = rate
  }

  return insertAt
}

function addEnergyBuilding(workbook, buildingName, kwhByMonthCol) {
  const next = cloneWorkbook(workbook)
  const sheet = next.Sheets['2026']
  const rows = sheetToMatrix(sheet)

  // Insert after last known building row (before trailing blanks / totals).
  let insertAt = rows.length
  for (let r = rows.length - 1; r >= 0; r--) {
    const name = String(rows[r][2] ?? '').trim()
    if (name && !/total/i.test(name)) {
      insertAt = r + 1
      break
    }
  }

  const template = rows.find((row) => String(row[2] ?? '').trim() === 'Metropolitan Branch') ?? []
  const newRow = Array.from({ length: Math.max(template.length, 20) }, () => '')
  newRow[2] = buildingName
  let total = 0
  for (const [col, value] of Object.entries(kwhByMonthCol)) {
    const c = Number(col)
    newRow[c] = value
    if (typeof value === 'number' && value > 0) total += value
  }
  newRow[19] = total
  rows.splice(insertAt, 0, newRow)
  next.Sheets['2026'] = matrixToSheet(rows)
  return next
}

function addSavingsBuilding(workbook, buildingName, { kwh, elecRate, csRate }) {
  const next = cloneWorkbook(workbook)
  for (const [sheetName, value] of [
    ['kWh', { kwh }],
    ['Elec Rates', { rate: elecRate }],
    ['CS Rates', { rate: csRate }],
  ]) {
    const rows = sheetToMatrix(next.Sheets[sheetName])
    insertBuildingColumn(rows, buildingName, {
      fillSerialYears: [2026],
      kwh: value.kwh,
      rate: value.rate,
    })
    next.Sheets[sheetName] = matrixToSheet(rows)
  }
  return next
}

function addAddressRow(workbook, { systemName, address }) {
  const next = cloneWorkbook(workbook)
  const sheetName = next.SheetNames[0]
  const rows = sheetToMatrix(next.Sheets[sheetName])
  rows.push([systemName, address, '10 kWp', 12, 46000])
  next.Sheets[sheetName] = matrixToSheet(rows)
  return next
}

/** Clone the latest year sheet into `year` with positive kWh for every building. */
function addEnergyYear(workbook, year, { sourceYear = 2026, factor = 1.04 } = {}) {
  const next = cloneWorkbook(workbook)
  const sourceName = String(sourceYear)
  if (!next.Sheets[sourceName]) {
    throw new Error(`Energy workbook missing sheet ${sourceName}`)
  }
  if (next.Sheets[String(year)]) {
    return next
  }

  const rows = sheetToMatrix(next.Sheets[sourceName]).map((row) => [...row])
  for (let r = 0; r < rows.length; r++) {
    for (let c = 0; c < rows[r].length; c++) {
      const value = rows[r][c]
      if (typeof value === 'string' && value.includes(String(sourceYear))) {
        rows[r][c] = value.replaceAll(String(sourceYear), String(year))
      }
    }

    const building = String(rows[r][2] ?? '').trim()
    if (!building || /total/i.test(building)) continue

    let total = 0
    let hadPositive = false
    for (let c = 5; c <= 18; c++) {
      const value = rows[r][c]
      if (typeof value === 'number' && value > 0) {
        rows[r][c] = Math.round(value * factor * 1000) / 1000
        total += rows[r][c]
        hadPositive = true
      }
    }
    // Guarantee coverage even if a building only had zeros in the source year sheet.
    if (!hadPositive) {
      for (let c = 5; c <= 9; c++) {
        rows[r][c] = 1000 + (c - 5) * 100
        total += rows[r][c]
      }
    }
    rows[r][19] = Math.round(total * 1000) / 1000
  }

  const yearName = String(year)
  next.Sheets[yearName] = matrixToSheet(rows)
  const insertAt = next.SheetNames.indexOf(sourceName) + 1
  if (insertAt > 0) next.SheetNames.splice(insertAt, 0, yearName)
  else next.SheetNames.push(yearName)
  return next
}

function lastBuildingColumn(headerRow) {
  let last = 0
  for (let col = 1; col < headerRow.length; col++) {
    const label = String(headerRow[col] ?? '').toLowerCase()
    if (
      !label ||
      label.includes('average') ||
      label.includes('grand total') ||
      label.includes('total kwh') ||
      label.includes('co2')
    ) {
      break
    }
    last = col
  }
  return last
}

function findMetaRowIndex(rows) {
  for (let r = 2; r < rows.length; r++) {
    const label = String(rows[r][0] ?? '')
    if (/total|co2|egrid|average/i.test(label)) return r
  }
  return rows.length
}

function latestRateByColumn(rows, year) {
  const byCol = new Map()
  for (let r = 2; r < rows.length; r++) {
    const serial = rows[r][0]
    if (typeof serial !== 'number') continue
    const parsed = XLSX.SSF.parse_date_code(serial)
    if (!parsed || parsed.y > year) continue
    for (let c = 1; c < rows[r].length; c++) {
      const value = rows[r][c]
      if (typeof value === 'number' && Number.isFinite(value)) {
        byCol.set(c, value)
      }
    }
  }
  return byCol
}

function latestKwhByColumn(rows, year) {
  return latestRateByColumn(rows, year)
}

/** Append Jan–Dec `year` rows so every building has savings coverage. */
function addSavingsYear(workbook, year, { factor = 1.03, elecRate = 0.16, csRate = 0.09 } = {}) {
  const next = cloneWorkbook(workbook)
  const kWhRows = sheetToMatrix(next.Sheets.kWh)
  const elecRows = sheetToMatrix(next.Sheets['Elec Rates'])
  const csRows = sheetToMatrix(next.Sheets['CS Rates'])
  const lastCol = Math.min(
    lastBuildingColumn(kWhRows[1] ?? []),
    lastBuildingColumn(elecRows[1] ?? []),
    lastBuildingColumn(csRows[1] ?? []),
  )

  const kwhDefaults = latestKwhByColumn(kWhRows, year - 1)
  const elecDefaults = latestRateByColumn(elecRows, year - 1)
  const csDefaults = latestRateByColumn(csRows, year - 1)

  const kwhInsertAt = findMetaRowIndex(kWhRows)
  const elecInsertAt = findMetaRowIndex(elecRows)
  const csInsertAt = findMetaRowIndex(csRows)

  const newKwh = []
  const newElec = []
  const newCs = []
  for (let month = 1; month <= 12; month++) {
    const serial = excelSerial(year, month)
    const kwhRow = Array.from({ length: Math.max(kWhRows[1]?.length ?? 0, lastCol + 1) }, () => '')
    const elecRow = Array.from({ length: Math.max(elecRows[1]?.length ?? 0, lastCol + 1) }, () => '')
    const csRow = Array.from({ length: Math.max(csRows[1]?.length ?? 0, lastCol + 1) }, () => '')
    kwhRow[0] = serial
    elecRow[0] = serial
    csRow[0] = serial

    for (let c = 1; c <= lastCol; c++) {
      const baseKwh = kwhDefaults.get(c)
      kwhRow[c] =
        typeof baseKwh === 'number' && baseKwh > 0
          ? Math.round(baseKwh * factor)
          : 4000 + ((c * 37 + month * 13) % 2500)

      const baseElec = elecDefaults.get(c)
      elecRow[c] =
        typeof baseElec === 'number' && baseElec > 0
          ? Math.round((baseElec + 0.004) * 10000) / 10000
          : elecRate

      const baseCs = csDefaults.get(c)
      csRow[c] =
        typeof baseCs === 'number' && baseCs > 0
          ? Math.round(baseCs * 10000) / 10000
          : csRate
    }

    newKwh.push(kwhRow)
    newElec.push(elecRow)
    newCs.push(csRow)
  }

  kWhRows.splice(kwhInsertAt, 0, ...newKwh)
  elecRows.splice(elecInsertAt, 0, ...newElec)
  csRows.splice(csInsertAt, 0, ...newCs)

  next.Sheets.kWh = matrixToSheet(kWhRows)
  next.Sheets['Elec Rates'] = matrixToSheet(elecRows)
  next.Sheets['CS Rates'] = matrixToSheet(csRows)
  return next
}

function ensureDir(path) {
  if (existsSync(path)) rmSync(path, { recursive: true, force: true })
  mkdirSync(path, { recursive: true })
}

function writeReadme() {
  const text = `# Update Desk test uploads

Generated by \`npm run generate-test-uploads\` from the live workbooks in \`public/data/sources/\`.

## Pack A — \`safe-update/\` (Full Apply)

Same buildings. Energy kWh bumped ~2%; recent Elec Rates bumped +$0.005/kWh.

1. Start Update Desk (\`Start-Update-Desk.bat\` or \`npm run update-desk\`)
2. Unlock with the desk password
3. Upload all three files from \`safe-update/\` (any filenames are fine)
4. **Process** → Review should be green → **Apply** → optional **Publish**

## Pack B — \`new-building/\` (Full Apply after Place on map)

Adds **Test Lab Annex** (already registered in \`buildingRegistry.js\` for Apply).

1. Upload all three files from \`new-building/\`
2. **Process**
3. In Review, enter/confirm address \`55 Trinity Ave SW, Atlanta, GA 30303\` and click **Place on map**
4. When the map-position flag clears → **Apply**

If Apply fails with an “extra positions” error, restart the desk, Process again, Place on map, then Apply. Leftover test map IDs (for example an old \`new-building\` pin) are pruned automatically on Apply now.

## Pack C — \`new-year-2027/\` (Full Apply)

Same buildings, plus a full **2027** energy year sheet and Jan–Dec 2027 savings/rates rows. Coverage year becomes 2027.

1. Upload all three files from \`new-year-2027/\`
2. **Process** → Review should show 2027 and be Apply-ready → **Apply**

## Notes

- Do not commit Applied test data to \`main\` unless you intend to publish it.
- Re-run \`npm run generate-test-uploads\` after source Excel updates to refresh the packs.
- Pack B requires the \`test-lab-annex\` entry in \`src/data/buildingRegistry.js\` (included for Full Apply).
- Skip **Publish** if you only want a local test; Apply does not change the live website.
`

  writeFileSync(join(outRoot, 'README.md'), text)
}

function main() {
  const energyName = 'solar-data.xlsx'
  const savingsName = findNewestSavingsWorkbookName()
  const addressName = 'solar-building-addresses.xlsx'

  const energy = loadWorkbook(energyName)
  const savings = loadWorkbook(savingsName)
  const addresses = loadWorkbook(addressName)

  ensureDir(outRoot)

  const safeDir = join(outRoot, 'safe-update')
  mkdirSync(safeDir, { recursive: true })
  writeWorkbook(bumpEnergyWorkbook(energy), join(safeDir, 'team-energy-refresh.xlsx'))
  writeWorkbook(bumpSavingsWorkbook(savings), join(safeDir, 'team-savings-refresh.xlsx'))
  writeWorkbook(cloneWorkbook(addresses), join(safeDir, 'team-addresses.xlsx'))

  const newDir = join(outRoot, 'new-building')
  mkdirSync(newDir, { recursive: true })
  const energyWithNew = addEnergyBuilding(
    bumpEnergyWorkbook(energy, 1.01),
    NEW_BUILDING.energyName,
    NEW_BUILDING.energyKwhByMonthCol,
  )
  const savingsWithNew = addSavingsBuilding(bumpSavingsWorkbook(savings, 0.002), NEW_BUILDING.savingsName, {
    kwh: NEW_BUILDING.savingsKwh,
    elecRate: NEW_BUILDING.elecRate,
    csRate: NEW_BUILDING.csRate,
  })
  const addressesWithNew = addAddressRow(addresses, NEW_BUILDING)
  writeWorkbook(energyWithNew, join(newDir, 'energy-with-test-lab-annex.xlsx'))
  writeWorkbook(savingsWithNew, join(newDir, 'savings-with-test-lab-annex.xlsx'))
  writeWorkbook(addressesWithNew, join(newDir, 'addresses-with-test-lab-annex.xlsx'))

  const yearDir = join(outRoot, 'new-year-2027')
  mkdirSync(yearDir, { recursive: true })
  writeWorkbook(addEnergyYear(energy, NEW_YEAR), join(yearDir, 'energy-with-2027.xlsx'))
  writeWorkbook(addSavingsYear(savings, NEW_YEAR), join(yearDir, 'savings-with-2027.xlsx'))
  writeWorkbook(cloneWorkbook(addresses), join(yearDir, 'addresses-unchanged.xlsx'))

  writeReadme()
  console.log(`Wrote packs to ${outRoot}`)
  console.log(`  (savings source: ${savingsName})`)
  console.log('  safe-update/     → Full Apply')
  console.log('  new-building/    → Place on map, then Full Apply')
  console.log('  new-year-2027/   → Full Apply (adds year 2027)')
}

main()
