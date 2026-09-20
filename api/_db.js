import { createClient } from '@supabase/supabase-js'

function getClient() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

export async function dbAvailable() {
  try {
    const client = getClient()
    if (!client) return false
    const { error } = await client.from('hashtag_snapshots').select('id').limit(1)
    return !error
  } catch {
    return false
  }
}

export async function setupSchema() {
  const client = getClient()
  if (!client) throw new Error('Database not configured')
  const { error } = await client.rpc('setup_schema')
  if (error && !error.message.includes('already exists')) throw error
}

export async function saveSnapshot(niche, hashtags) {
  const client = getClient()
  if (!client || !hashtags?.length) return
  const rows = hashtags.slice(0, 20).map(h => ({
    niche,
    tag:       h.tag,
    viral_prob: h.viralProb,
    trend:     h.trend,
    frequency: h.frequency ?? 0,
    score:     h.score ?? 0,
  }))
  await client.from('hashtag_snapshots').insert(rows)
}

export async function getTopHashtagsHistory(niche, days = 14, limit = 15) {
  const client = getClient()
  if (!client) return []
  const since = new Date(Date.now() - days * 864e5).toISOString()
  const { data } = await client
    .from('hashtag_snapshots')
    .select('tag, viral_prob, trend')
    .eq('niche', niche)
    .gte('scanned_at', since)
    .order('viral_prob', { ascending: false })
    .limit(limit * 10)

  if (!data) return []

  const map = {}
  for (const row of data) {
    if (!map[row.tag]) map[row.tag] = { tag: row.tag, probs: [], trends: [] }
    map[row.tag].probs.push(row.viral_prob)
    map[row.tag].trends.push(row.trend)
  }

  return Object.values(map)
    .map(t => ({
      tag:              t.tag,
      avg_viral_prob:   Math.round(t.probs.reduce((a, b) => a + b, 0) / t.probs.length),
      peak_viral_prob:  Math.max(...t.probs),
      min_viral_prob:   Math.min(...t.probs),
      appearances:      t.probs.length,
      dominant_trend:   t.trends.sort((a, b) =>
        t.trends.filter(v => v === b).length - t.trends.filter(v => v === a).length)[0],
    }))
    .sort((a, b) => b.avg_viral_prob - a.avg_viral_prob)
    .slice(0, limit)
}

export async function getDailyTrends(niche, days = 14) {
  const client = getClient()
  if (!client) return []
  const since = new Date(Date.now() - days * 864e5).toISOString()
  const { data } = await client
    .from('hashtag_snapshots')
    .select('tag, viral_prob, scanned_at')
    .eq('niche', niche)
    .gte('scanned_at', since)
    .order('scanned_at', { ascending: true })

  if (!data) return []

  const byTagDay = {}
  for (const row of data) {
    const day = row.scanned_at.split('T')[0]
    const key = `${row.tag}__${day}`
    if (!byTagDay[key]) byTagDay[key] = { tag: row.tag, day, probs: [] }
    byTagDay[key].probs.push(row.viral_prob)
  }

  return Object.values(byTagDay).map(r => ({
    tag:      r.tag,
    day:      r.day,
    avg_prob: Math.round(r.probs.reduce((a, b) => a + b, 0) / r.probs.length),
  }))
}

export async function getEmergingTags(niche) {
  const client = getClient()
  if (!client) return []
  const since = new Date(Date.now() - 7 * 864e5).toISOString()
  const { data } = await client
    .from('hashtag_snapshots')
    .select('tag, viral_prob, scanned_at')
    .eq('niche', niche)
    .gte('scanned_at', since)
    .order('scanned_at', { ascending: true })

  if (!data) return []

  const map = {}
  for (const row of data) {
    if (!map[row.tag]) map[row.tag] = []
    map[row.tag].push(row.viral_prob)
  }

  return Object.entries(map)
    .filter(([, probs]) => probs.length >= 2)
    .map(([tag, probs]) => ({
      tag,
      appearances:    probs.length,
      earliest_prob:  probs[0],
      latest_prob:    probs[probs.length - 1],
      momentum:       probs[probs.length - 1] - probs[0],
      last_seen:      new Date().toISOString(),
    }))
    .filter(t => t.momentum > 0)
    .sort((a, b) => b.momentum - a.momentum)
    .slice(0, 10)
}
