const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Content-Type': 'application/json',
}

const BASE = () => process.env.SUPABASE_URL
const KEY  = () => process.env.SUPABASE_PUBLISHABLE_KEY

function dbHeaders() {
  return {
    'apikey':        KEY(),
    'Authorization': `Bearer ${KEY()}`,
    'Content-Type':  'application/json',
    'Prefer':        'return=representation',
  }
}

const QUOTAS = {
  youtube:    { label: 'YouTube API',      total: 10000, unit: 'units',    resetHours: 24, color: '#ef4444' },
  newsapi:    { label: 'NewsAPI',          total: 100,   unit: 'requests', resetHours: 24, color: '#f59e0b' },
  gemini:     { label: 'Gemini AI',        total: 15,    unit: 'requests', resetHours: 24, color: '#06b6d4' },
  hackernews: { label: 'Hacker News',      total: 99999, unit: 'requests', resetHours: 24, color: '#10b981' },
  supabase:   { label: 'Supabase',         total: 500,   unit: 'MB',       resetHours: 720,color: '#7c3aed' },
  frankfurter:{ label: 'Exchange Rates',   total: 99999, unit: 'requests', resetHours: 24, color: '#10b981' },
}

async function getOrCreateToday() {
  if (!BASE() || !KEY()) return null
  const today = new Date().toISOString().split('T')[0]

  try {
    // Try to get today's record
    const getRes = await fetch(
      `${BASE()}/rest/v1/api_usage?date=eq.${today}&select=*&limit=1`,
      { headers: dbHeaders() }
    )
    const existing = await getRes.json()
    if (existing?.length > 0) return existing[0]

    // Create today's record
    const createRes = await fetch(
      `${BASE()}/rest/v1/api_usage`,
      {
        method:  'POST',
        headers: { ...dbHeaders(), 'Prefer': 'return=representation' },
        body: JSON.stringify({
          date:        today,
          youtube:     0,
          newsapi:     0,
          gemini:      0,
          hackernews:  0,
          supabase_mb: 0,
          frankfurter: 0,
        }),
      }
    )
    const created = await createRes.json()
    return Array.isArray(created) ? created[0] : created
  } catch {
    return null
  }
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' }

  // POST — increment a specific API counter
  if (event.httpMethod === 'POST') {
    const { api, amount = 1 } = JSON.parse(event.body ?? '{}')
    if (!api || !QUOTAS[api]) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid api name' }) }
    }

    const today = new Date().toISOString().split('T')[0]
    const record = await getOrCreateToday()
    if (!record) {
      return { statusCode: 200, headers, body: JSON.stringify({ ok: false, reason: 'no db' }) }
    }

    const field    = api === 'supabase' ? 'supabase_mb' : api
    const newValue = (record[field] ?? 0) + amount

    await fetch(
      `${BASE()}/rest/v1/api_usage?date=eq.${today}`,
      {
        method:  'PATCH',
        headers: dbHeaders(),
        body:    JSON.stringify({ [field]: newValue }),
      }
    )

    return { statusCode: 200, headers, body: JSON.stringify({ ok: true, [field]: newValue }) }
  }

  // GET — return current quota status
  const record = await getOrCreateToday()
  const today  = new Date().toISOString().split('T')[0]

  const status = Object.entries(QUOTAS).map(([key, q]) => {
    const field = key === 'supabase' ? 'supabase_mb' : key
    const used  = record?.[field] ?? 0
    const left  = Math.max(0, q.total - used)
    const pct   = Math.min(100, Math.round((used / q.total) * 100))

    return {
      key,
      label:   q.label,
      total:   q.total,
      used,
      left,
      pct,
      unit:    q.unit,
      color:   q.color,
      status:  pct >= 90 ? 'critical' : pct >= 70 ? 'warning' : 'good',
      unlimited: q.total === 99999,
      resetIn: `${q.resetHours < 720 ? 'midnight PT' : 'monthly'}`,
    }
  })

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      date:   today,
      status,
      fetchedAt: new Date().toISOString(),
    }),
  }
}
