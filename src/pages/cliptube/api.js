const BASE = '/api'

const handle = async (res) => {
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    throw new Error(errorData.error || `Request failed with status ${res.status}`)
  }
  return res.json()
}

// ── Quota Logging ────────────────────────────────────────────────────────
export async function logQuota(api, amount = 1) {
  try {
    await fetch(`${BASE}/quota-status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api, amount }),
    })
  } catch (err) {
    console.warn('Quota logging failed silently:', err.message)
  }
}

// ── Scan Pipeline ────────────────────────────────────────────────────────
export async function runCollectStep(options) {
  const data = await fetch(`${BASE}/cliptube-scan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'collect', options }),
  }).then(handle)

  // Immediately log quota for actual units consumed in Step 1
  if (data.unitsUsed) {
    logQuota('youtube', data.unitsUsed)
  }

  return data
}

export async function runAnalyzeStep(scanId, options) {
  return fetch(`${BASE}/cliptube-scan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'analyze', scanId, options }),
  }).then(handle)
}

export async function runSaveStep(scanId) {
  return fetch(`${BASE}/cliptube-scan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'save', scanId }),
  }).then(handle)
}

export async function retryAiOnly(scanId) {
  return fetch(`${BASE}/cliptube-scan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'retry-ai', scanId }),
  }).then(handle)
}

export async function reprocessScan(scanId) {
  return fetch(`${BASE}/cliptube-scan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'reprocess', scanId }),
  }).then(handle)
}

// ── Data & CRUD ──────────────────────────────────────────────────────────
export async function getLatestScan() {
  const data = await fetch(`${BASE}/cliptube-data?type=latest`).then(handle)
  return data.scan
}

export async function getScanById(id) {
  const data = await fetch(`${BASE}/cliptube-data?type=scan&id=${encodeURIComponent(id)}`).then(handle)
  return data.scan
}

export async function getScansList() {
  const data = await fetch(`${BASE}/cliptube-data?type=scans`).then(handle)
  return data.scans || []
}

export async function getSeeds() {
  const data = await fetch(`${BASE}/cliptube-data?type=seeds`).then(handle)
  return data.seeds || []
}

export async function saveSeed(seed) {
  return fetch(`${BASE}/cliptube-data?type=seeds`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(seed),
  }).then(handle)
}

export async function deleteSeed(id) {
  return fetch(`${BASE}/cliptube-data?type=seeds&id=${encodeURIComponent(id)}`, {
    method: 'DELETE',
  }).then(handle)
}
