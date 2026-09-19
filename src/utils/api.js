const BASE = '/api'

export async function analyzeTrend(niche, platform = 'both') {
  const res = await fetch(`${BASE}/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ niche, platform })
  })
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Analysis failed')
  return res.json()
}

export async function comparePlatforms(niche) {
  const res = await fetch(`${BASE}/compare`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ niche })
  })
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Comparison failed')
  return res.json()
}

export async function getDashboard() {
  const res = await fetch(`${BASE}/dashboard`)
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Dashboard failed')
  return res.json()
}

export async function getHashtags(niche) {
  const res = await fetch(`${BASE}/hashtags`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ niche })
  })
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Hashtag fetch failed')
  return res.json()
}
