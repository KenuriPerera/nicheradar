const BASE         = () => process.env.SUPABASE_URL
const ANON_KEY     = () => process.env.SUPABASE_PUBLISHABLE_KEY
const SERVICE_KEY  = () => process.env.SUPABASE_SERVICE_KEY

function readHeaders() {
  return {
    'apikey':        ANON_KEY(),
    'Authorization': `Bearer ${ANON_KEY()}`,
    'Content-Type':  'application/json',
  }
}

function writeHeaders() {
  return {
    'apikey':        SERVICE_KEY(),
    'Authorization': `Bearer ${SERVICE_KEY()}`,
    'Content-Type':  'application/json',
    'Prefer':        'return=minimal',
  }
}

export async function dbAvailable() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_PUBLISHABLE_KEY

  console.log('=== DB CHECK ===')
  console.log('URL:', url ?? 'NOT SET')
  console.log('KEY:', key ? key.slice(0, 20) + '...' : 'NOT SET')

  if (!url || !key) return false

  try {
    const res = await fetch(
      `${url}/rest/v1/hashtag_snapshots?select=id&limit=1`,
      {
        headers: {
          'apikey':        key,
          'Authorization': `Bearer ${key}`,
        }
      }
    )
    const text = await res.text()
    console.log('Status:', res.status)
    console.log('Body:', text.slice(0, 200))
    return res.status === 200
  } catch (e) {
    console.log('FETCH ERROR:', e.message)
    return false
  }
}

export async function setupSchema() {
  // Table is created manually in Supabase SQL editor
  // This is a no-op since we can't run DDL via REST API
  return true
}

export async function saveSnapshot(niche, hashtags) {
  const url = BASE()
  const key = ANON_KEY()
  if (!url || !key || !hashtags?.length) return

  const rows = hashtags.slice(0, 20).map(h => ({
    niche,
    tag:        h.tag,
    viral_prob: h.viralProb,
    trend:      h.trend,
    frequency:  h.frequency ?? 0,
    score:      h.score ?? 0,
  }))

  try {
    const res = await fetch(`${url}/rest/v1/hashtag_snapshots`, {
      method:  'POST',
      headers: {
        'apikey':        key,
        'Authorization': `Bearer ${key}`,
        'Content-Type':  'application/json',
        'Prefer':        'return=minimal',
      },
      body: JSON.stringify(rows),
    })
    const text = await res.text()
    console.log('Save snapshot status:', res.status, text.slice(0, 100))
  } catch (e) {
    console.log('Save snapshot error:', e.message)
  }
}

export async function getTopHashtagsHistory(niche, days = 14, limit = 15) {
  const since = new Date(Date.now() - days * 864e5).toISOString()
  const res = await fetch(
    `${BASE()}/rest/v1/hashtag_snapshots?niche=eq.${niche}&scanned_at=gte.${since}&select=tag,viral_prob,trend&order=viral_prob.desc&limit=200`,
    { headers: readHeaders() }
  )
  if (!res.ok) return []
  const data = await res.json()

  const map = {}
  for (const row of data) {
    if (!map[row.tag]) map[row.tag] = { tag: row.tag, probs: [], trends: [] }
    map[row.tag].probs.push(row.viral_prob)
    map[row.tag].trends.push(row.trend)
  }

  return Object.values(map)
    .map(t => ({
      tag: t.tag,
      avg_viral_prob: Math.round(t.probs.reduce((a, b) => a + b, 0) / t.probs.length),
      peak_viral_prob: Math.max(...t.probs),
      min_viral_prob: Math.min(...t.probs),
      appearances: t.probs.length,
      dominant_trend: t.trends.sort((a, b) =>
        t.trends.filter(v => v === b).length - t.trends.filter(v => v === a).length)[0],
    }))
    .sort((a, b) => b.avg_viral_prob - a.avg_viral_prob)
    .slice(0, limit)
}

export async function getDailyTrends(niche, days = 14) {
  const since = new Date(Date.now() - days * 864e5).toISOString()
  const res = await fetch(
    `${BASE()}/rest/v1/hashtag_snapshots?niche=eq.${niche}&scanned_at=gte.${since}&select=tag,viral_prob,scanned_at&order=scanned_at.asc`,
    { headers: readHeaders() }
  )
  if (!res.ok) return []
  const data = await res.json()

  const byTagDay = {}
  for (const row of data) {
    const day = row.scanned_at.split('T')[0]
    const key = `${row.tag}__${day}`
    if (!byTagDay[key]) byTagDay[key] = { tag: row.tag, day, probs: [] }
    byTagDay[key].probs.push(row.viral_prob)
  }

  return Object.values(byTagDay).map(r => ({
    tag: r.tag,
    day: r.day,
    avg_prob: Math.round(r.probs.reduce((a, b) => a + b, 0) / r.probs.length),
  }))
}

export async function getEmergingTags(niche) {
  const since = new Date(Date.now() - 7 * 864e5).toISOString()
  const res = await fetch(
    `${BASE()}/rest/v1/hashtag_snapshots?niche=eq.${niche}&scanned_at=gte.${since}&select=tag,viral_prob,scanned_at&order=scanned_at.asc`,
    { headers: readHeaders() }
  )
  if (!res.ok) return []
  const data = await res.json()

  const map = {}
  for (const row of data) {
    if (!map[row.tag]) map[row.tag] = []
    map[row.tag].push(row.viral_prob)
  }

  return Object.entries(map)
    .filter(([, probs]) => probs.length >= 2)
    .map(([tag, probs]) => ({
      tag,
      appearances: probs.length,
      earliest_prob: probs[0],
      latest_prob: probs[probs.length - 1],
      momentum: probs[probs.length - 1] - probs[0],
      last_seen: new Date().toISOString(),
    }))
    .filter(t => t.momentum > 0)
    .sort((a, b) => b.momentum - a.momentum)
    .slice(0, 10)
}
