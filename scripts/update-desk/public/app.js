const state = {
  token: sessionStorage.getItem('updateDeskToken') || '',
  pendingFiles: [],
  review: null,
  step: 'unlock',
}

const els = {
  unlockForm: document.getElementById('unlock-form'),
  password: document.getElementById('password'),
  liveFiles: document.getElementById('live-files'),
  pendingFiles: document.getElementById('pending-files'),
  fileInput: document.getElementById('file-input'),
  dropzone: document.getElementById('dropzone'),
  processBtn: document.getElementById('process-btn'),
  applyBtn: document.getElementById('apply-btn'),
  publishBtn: document.getElementById('publish-btn'),
  flags: document.getElementById('flags'),
  contributions: document.getElementById('contributions'),
  positionsPanel: document.getElementById('positions-panel'),
  positionForms: document.getElementById('position-forms'),
  mapBuildingsBtn: document.getElementById('map-buildings-btn'),
  ratesPanel: document.getElementById('rates-panel'),
  elecRate: document.getElementById('elec-rate'),
  csRate: document.getElementById('cs-rate'),
  savingsPerKwh: document.getElementById('savings-per-kwh'),
  reviewRows: document.getElementById('review-rows'),
  statusMessage: document.getElementById('status-message'),
  statusLog: document.getElementById('status-log'),
  stepIndicator: document.getElementById('step-indicator'),
}

const PANELS = ['unlock', 'upload', 'review', 'apply', 'publish']

function setStatus(message, kind = 'ok', details = '') {
  els.statusMessage.textContent = message
  els.statusMessage.className =
    kind === 'bad' ? 'status-bad' : kind === 'warn' ? 'status-warn' : 'status-ok'
  if (details) els.statusLog.textContent = details
}

function setStep(step) {
  state.step = step
  const index = PANELS.indexOf(step)
  for (const name of PANELS) {
    const panel = document.getElementById(`panel-${name}`)
    if (!panel) continue
    if (name === 'unlock') {
      panel.classList.toggle('hidden', Boolean(state.token))
      continue
    }
    panel.classList.toggle('hidden', !state.token)
  }
  for (const li of els.stepIndicator.querySelectorAll('li')) {
    const name = li.dataset.step
    const liIndex = PANELS.indexOf(name)
    li.classList.toggle('active', name === step)
    li.classList.toggle('done', liIndex < index)
  }
  els.applyBtn.disabled = Boolean(!state.review || state.review.canApply === false)
  els.publishBtn.disabled = !['apply', 'publish'].includes(step)
}

async function api(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  }
  if (state.token) headers['X-Update-Desk-Token'] = state.token
  const response = await fetch(path, {
    ...options,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  })
  const data = await response.json()
  if (!response.ok || data.ok === false) {
    const error = new Error(data.message || 'Request failed')
    error.payload = data
    throw error
  }
  return data
}

function formatBytes(size) {
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

/** Guess simple role tags from a filename (live sources + pending uploads). */
function guessFileTags(name) {
  const lower = String(name || '').toLowerCase()
  if (lower === 'solar-data.xlsx' || /energy|solar-data/.test(lower)) {
    return ['Energy (kWh)']
  }
  if (/solar monthly savings|savings|rates/.test(lower)) {
    return ['Rates & savings']
  }
  if (/address/.test(lower)) {
    return ['Addresses']
  }
  if (lower === 'solar-cost.xlsx') {
    return ['Legacy cost']
  }
  if (lower === 'building-display-names.json') {
    return ['Display names']
  }
  if (lower === 'building-coordinates.json') {
    return ['Map coordinates']
  }
  if (lower === 'building-position-projection.json') {
    return ['Map projection']
  }
  if (lower === 'savings-rate-overrides.json') {
    return ['Rate overrides']
  }
  if (lower.endsWith('.json')) {
    return ['Config']
  }
  if (lower.endsWith('.xlsx')) {
    return ['Detect on process']
  }
  return []
}

function renderFileTags(tags) {
  if (!tags?.length) return ''
  return `<span class="file-tags">${tags
    .map((tag) => `<span class="badge role">${tag}</span>`)
    .join('')}</span>`
}

function renderFileRow(file) {
  const tags = file.tags?.length ? file.tags : guessFileTags(file.name)
  return `<li>
    <div class="file-main">
      <span class="file-name">${file.name}</span>
      ${renderFileTags(tags)}
    </div>
    <span class="file-size">${formatBytes(file.size)}</span>
  </li>`
}

function formatNumber(value) {
  return Math.round(Number(value) || 0).toLocaleString()
}

function escapeAttr(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = String(reader.result || '')
      resolve(result.includes(',') ? result.split(',')[1] : result)
    }
    reader.onerror = () => reject(reader.error || new Error('Could not read file'))
    reader.readAsDataURL(file)
  })
}

function renderLiveFiles(files) {
  if (!files?.length) {
    els.liveFiles.innerHTML = '<p class="muted">No live source files yet.</p>'
    return
  }
  els.liveFiles.innerHTML = `<p class="muted"><strong>Currently live</strong></p><ul class="file-list">${files
    .map((file) => renderFileRow(file))
    .join('')}</ul>`
}

function renderPendingFiles() {
  els.processBtn.disabled = state.pendingFiles.length === 0
  if (!state.pendingFiles.length) {
    els.pendingFiles.innerHTML = ''
    return
  }
  els.pendingFiles.innerHTML = `<p class="muted"><strong>Selected for process</strong></p><ul class="file-list">${state.pendingFiles
    .map((file) =>
      renderFileRow({
        name: file.name,
        size: file.size,
        tags: guessFileTags(file.name),
      }),
    )
    .join('')}</ul>`
}

function addFiles(fileList) {
  for (const file of fileList) {
    if (!/\.xlsx$/i.test(file.name)) continue
    state.pendingFiles = state.pendingFiles.filter((entry) => entry.name !== file.name)
    state.pendingFiles.push(file)
  }
  renderPendingFiles()
}

function updateSavingsPerKwh() {
  const elec = Number(els.elecRate.value)
  const cs = Number(els.csRate.value)
  if (!Number.isFinite(elec) || !Number.isFinite(cs)) {
    els.savingsPerKwh.textContent = '—'
    return
  }
  els.savingsPerKwh.textContent = `$${(elec - cs).toFixed(4)}`
}

function collectDisplayNames() {
  const map = {}
  for (const input of els.reviewRows.querySelectorAll('input[data-id]')) {
    map[input.dataset.id] = input.value.trim()
  }
  return map
}

function collectKeyRates() {
  if (els.ratesPanel.hidden) return null
  const elecRate = Number(els.elecRate.value)
  const csRate = Number(els.csRate.value)
  if (!Number.isFinite(elecRate) || !Number.isFinite(csRate)) return null
  return {
    elecRate,
    csRate,
    year: state.review?.keyRates?.year ?? null,
    month: state.review?.keyRates?.month ?? null,
  }
}

function renderReview(review) {
  state.review = review

  els.flags.innerHTML = (review.flags || [])
    .map((flag) => `<div class="flag ${flag.level}">${flag.message}</div>`)
    .join('')

  els.contributions.innerHTML = (review.contributions || [])
    .map((card) => {
      const summary = card.summary || {}
      let stats = ''
      let extra = ''
      if (card.key === 'energy') {
        stats = `
          <div class="stat-grid">
            <div><span>Buildings</span><strong>${summary.buildings ?? '—'}</strong></div>
            <div><span>Energy rows</span><strong>${formatNumber(summary.energyRows)}</strong></div>
            <div><span>Total kWh</span><strong>${formatNumber(summary.totalKwh)}</strong></div>
            <div><span>Years</span><strong>${(summary.years || []).join(', ') || '—'}</strong></div>
            <div><span>Month span</span><strong>${summary.monthSpan ? `${summary.monthSpan.from} → ${summary.monthSpan.to}` : '—'}</strong></div>
          </div>`
      } else if (card.key === 'savings') {
        stats = `
          <div class="stat-grid">
            <div><span>Cost rows</span><strong>${formatNumber(summary.costRows)}</strong></div>
            <div><span>Total savings</span><strong>$${formatNumber(summary.totalSavings)}</strong></div>
            <div><span>Cost years</span><strong>${(summary.costYears || []).join(', ') || '—'}</strong></div>
          </div>`
      } else if (card.key === 'addresses') {
        stats = `
          <div class="stat-grid">
            <div><span>Address rows</span><strong>${formatNumber(summary.rowCount)}</strong></div>
          </div>`
        if (summary.sample?.length) {
          extra = `<ul class="sample-list">${summary.sample
            .map((row) => `<li>${row.name || '—'} — ${row.address || '—'}</li>`)
            .join('')}</ul>`
        }
      }

      const from =
        card.originalName && card.originalName !== card.file
          ? `<p class="card-meta">Uploaded as <code>${card.originalName}</code> → saved as <code>${card.file}</code></p>`
          : `<p class="card-meta">Source file: <code>${card.file || '—'}</code></p>`

      return `<article class="card">
        <div class="card-header">
          <strong>${card.label}</strong>
          <span class="badge role">${card.key}</span>
          <span class="badge ${card.used ? 'ok' : 'warn'}">${card.used ? 'Used' : 'Not used'}</span>
        </div>
        ${from}
        ${card.evidence ? `<p class="card-meta">Detected from: ${card.evidence}</p>` : ''}
        ${stats}
        <ul class="update-list">${(card.contributes || []).map((item) => `<li>${item}</li>`).join('')}</ul>
        ${extra}
      </article>`
    })
    .join('')

  if (review.keyRates) {
    els.ratesPanel.hidden = false
    els.elecRate.value = Number(review.keyRates.elecRate).toFixed(4)
    els.csRate.value = Number(review.keyRates.csRate).toFixed(4)
    updateSavingsPerKwh()
  } else {
    els.ratesPanel.hidden = true
  }

  const missing = review.unpositionedIds || []
  if (missing.length) {
    els.positionsPanel.hidden = false
    const byId = new Map((review.buildings || []).map((building) => [building.id, building]))
    els.positionForms.innerHTML = missing
      .map((id) => {
        const building = byId.get(id)
        const label = building?.displayName || building?.rawName || id
        return `<div class="position-row" data-id="${escapeAttr(id)}">
          <div class="position-meta">
            <strong>${escapeAttr(label)}</strong>
            <code>${escapeAttr(id)}</code>
          </div>
          <label>
            Street address
            <input
              type="text"
              data-address-for="${escapeAttr(id)}"
              data-name-for="${escapeAttr(label)}"
              placeholder="e.g. 141 Pryor St SW, Atlanta, GA 30303"
              required
            />
          </label>
        </div>`
      })
      .join('')
  } else {
    els.positionsPanel.hidden = true
    els.positionForms.innerHTML = ''
  }

  els.reviewRows.innerHTML = (review.buildings || [])
    .map((building) => {
      let status = '<span class="badge ok">OK</span>'
      if (!building.known) status = '<span class="badge bad">Unknown</span>'
      else if ((review.unpositionedIds || []).includes(building.id)) {
        status = '<span class="badge warn">Needs address</span>'
      }
      return `<tr>
        <td><code>${building.id}</code></td>
        <td>${building.rawName || '—'}</td>
        <td><input data-id="${building.id}" type="text" value="${escapeAttr(building.displayName || '')}" /></td>
        <td>${status}</td>
      </tr>`
    })
    .join('')

  els.applyBtn.disabled = Boolean(!state.review || state.review.canApply === false)
  if (state.review && state.review.canApply === false) {
    els.applyBtn.title = 'Fix the red flags in Review before Apply'
  } else {
    els.applyBtn.title = ''
  }
  document.getElementById('panel-review')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

async function refreshStatus() {
  const data = await api('/api/status')
  renderLiveFiles(data.liveFiles)
}

els.unlockForm.addEventListener('submit', async (event) => {
  event.preventDefault()
  try {
    const data = await api('/api/unlock', {
      method: 'POST',
      body: { password: els.password.value },
    })
    state.token = data.token
    sessionStorage.setItem('updateDeskToken', state.token)
    setStatus('Unlocked. Upload Excel workbooks, then Process.', 'ok')
    setStep('upload')
    await refreshStatus()
  } catch (error) {
    setStatus(error.message, 'bad', error.payload?.details || '')
  }
})

els.fileInput.addEventListener('change', () => {
  addFiles(els.fileInput.files || [])
  els.fileInput.value = ''
})

;['dragenter', 'dragover'].forEach((type) => {
  els.dropzone.addEventListener(type, (event) => {
    event.preventDefault()
    els.dropzone.classList.add('dragover')
  })
})

;['dragleave', 'drop'].forEach((type) => {
  els.dropzone.addEventListener(type, (event) => {
    event.preventDefault()
    els.dropzone.classList.remove('dragover')
  })
})

els.dropzone.addEventListener('drop', (event) => {
  addFiles(event.dataTransfer?.files || [])
})

els.elecRate.addEventListener('input', updateSavingsPerKwh)
els.csRate.addEventListener('input', updateSavingsPerKwh)

els.mapBuildingsBtn.addEventListener('click', async () => {
  try {
    const buildings = []
    for (const input of els.positionForms.querySelectorAll('input[data-address-for]')) {
      const address = input.value.trim()
      if (!address) {
        setStatus(`Enter an address for ${input.dataset.addressFor}.`, 'warn')
        input.focus()
        return
      }
      buildings.push({
        id: input.dataset.addressFor,
        name: input.dataset.nameFor,
        address,
      })
    }
    if (!buildings.length) {
      setStatus('No buildings need map positions.', 'ok')
      return
    }

    els.mapBuildingsBtn.disabled = true
    setStatus('Geocoding addresses and projecting map positions…', 'ok')
    const data = await api('/api/map-buildings', { method: 'POST', body: { buildings } })
    if (data.review) {
      renderReview(data.review)
    }
    const detail = [
      ...(data.placed || []).map(
        (item) => `Placed ${item.id}: ${item.address} → ${item.lat.toFixed(5)}, ${item.lng.toFixed(5)}`,
      ),
      ...(data.errors || []).map((item) => `Failed ${item.id}: ${item.message}`),
    ].join('\n')
    setStatus(data.message, data.errors?.length ? 'warn' : 'ok', detail)
    setStep('review')
  } catch (error) {
    setStatus(error.message, 'bad', error.payload?.details || '')
  } finally {
    els.mapBuildingsBtn.disabled = false
  }
})

els.processBtn.addEventListener('click', async () => {
  try {
    setStatus('Classifying and processing workbooks…', 'ok')
    const files = []
    for (const file of state.pendingFiles) {
      files.push({ name: file.name, base64: await fileToBase64(file) })
    }
    const data = await api('/api/process', { method: 'POST', body: { files } })
    renderReview(data.review)
    const usageLog = (data.review?.contributions || [])
      .map((card) => {
        return `${card.label} ← ${card.originalName || card.file}\n${(card.contributes || [])
          .map((item) => `  - ${item}`)
          .join('\n')}`
      })
      .join('\n\n')
    setStatus(
      data.message,
      data.review?.flags?.length ? 'warn' : 'ok',
      [usageLog, data.review?.logs?.join('\n')].filter(Boolean).join('\n\n'),
    )
    setStep('review')
  } catch (error) {
    setStatus(error.message, 'bad', error.payload?.details || '')
  }
})

els.applyBtn.addEventListener('click', async () => {
  try {
    if (!state.review) {
      setStatus('Process uploads before Apply.', 'warn')
      return
    }
    setStatus('Applying update and archiving previous sources…', 'ok')
    const data = await api('/api/apply', {
      method: 'POST',
      body: {
        displayNames: collectDisplayNames(),
        keyRates: collectKeyRates(),
      },
    })
    setStatus(data.message, 'ok', data.details || '')
    setStep('apply')
    els.publishBtn.disabled = false
    await refreshStatus()
  } catch (error) {
    setStatus(error.message, 'bad', error.payload?.details || '')
  }
})

els.publishBtn.addEventListener('click', async () => {
  try {
    setStatus('Publishing (commit, push, build, deploy)…', 'ok')
    const data = await api('/api/publish', { method: 'POST', body: {} })
    setStatus(data.message, 'ok', data.details || '')
    setStep('publish')
  } catch (error) {
    setStatus(
      error.message,
      'bad',
      error.payload?.details ||
        (error.payload?.steps
          ? error.payload.steps.map((step) => `## ${step.step}\n${step.details || step.message}`).join('\n\n')
          : ''),
    )
  }
})

async function boot() {
  if (!state.token) {
    setStep('unlock')
    return
  }
  try {
    await refreshStatus()
    setStep('upload')
    setStatus('Welcome back. Upload workbooks and click Process.', 'ok')
  } catch {
    state.token = ''
    sessionStorage.removeItem('updateDeskToken')
    setStep('unlock')
    setStatus('Session expired. Unlock again.', 'warn')
  }
}

boot()
