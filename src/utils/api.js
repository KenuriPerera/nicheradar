const BASE = '/api'

export async function analyzeTrend(niche, platform = 'both', noFace = false) {
  const res = await fetch(`${BASE}/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ niche, platform, noFace })
  })
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Analysis failed')
  return res.json()
}

export async function comparePlatforms(niche, noFace = false) {
  const res = await fetch(`${BASE}/compare`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ niche, noFace })
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

const handle = async (res) => {
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Request failed')
  return res.json()
}

export const getHistory = (niche, days = 14) =>
  fetch(`/api/history?niche=${niche}&days=${days}`).then(handle)

export const getNiches = () =>
  fetch('/api/niches').then(handle)

export const getMonetize = (niche) =>
  fetch(`/api/monetize?niche=${encodeURIComponent(niche)}`).then(handle)

export const getQuotaStatus = () =>
  fetch('/api/quota-status').then(handle)

export const incrementQuota = (api, amount = 1) =>
  fetch('/api/quota-status', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ api, amount }),
  }).then(handle)

export const getPostingTimes = (platform) =>
  fetch(`/api/posting-times${platform ? `?platform=${platform}` : ''}`).then(handle)

export const getCurrency = (base = 'USD') =>
  fetch(`/api/currency?base=${base}&predict=true`).then(handle)

export const getIntelligence = () =>
  fetch('/api/intelligence').then(handle)

export const analyzeContent = (payload) =>
  fetch('/api/analyze-content', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(payload),
  }).then(handle)

export const getTrendingPosts = (niche) =>
  fetch('/api/trending-posts', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ niche }),
  }).then(handle)

export const runMasterFetch = () =>
  fetch('/api/master-fetch', { method: 'POST' }).then(handle)

export const getDailySummaries = () =>
  fetch('/api/daily-summaries').then(handle)

export const runHealthCheck = () =>
  fetch('/api/health-check').then(handle)

export const discoverNiches = () =>
  fetch('/api/discover-niches').then(handle)

export const getStationeryIntel = () =>
  fetch('/api/stationery-intel').then(handle)

export const getSerpInsights = (query, type = 'all') =>
  fetch(`/api/serp-insights?query=${encodeURIComponent(query)}&type=${type}`)
    .then(handle)

export const getSerpQuota = () =>
  fetch('/api/serp-insights?type=quota').then(handle)

// Improv features — all from cache
export const getImprovCache = () =>
  fetch('/api/improv?feature=hooks').then(handle)

export const getCalendar = (start, end) =>
  fetch(`/api/improv?feature=calendar&start=${start}&end=${end}`).then(handle)

export const saveCalendarEntry = (entry) =>
  fetch('/api/improv?feature=calendar', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(entry),
  }).then(handle)

export const updateCalendarEntry = (id, updates) =>
  fetch('/api/improv?feature=calendar', {
    method:  'PUT',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ id, updates }),
  }).then(handle)

export const getGrowthData = () =>
  fetch('/api/improv?feature=growth').then(handle)

export const saveGrowthEntry = (entry) =>
  fetch('/api/improv?feature=growth', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(entry),
  }).then(handle)

export const analyzeThumbnail = (imageData, cloudinaryUrl, niche) =>
  fetch('/api/improv?feature=thumbnail', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ imageData, cloudinaryUrl, niche }),
  }).then(handle)

export const analyzeInspoChannel = (channelId) =>
  fetch('/api/improv?feature=inspo-channel', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ channelId }),
  }).then(handle)

export const generateReviewTemplate = (product, category) =>
  fetch('/api/improv?feature=review-template', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ product, category }),
  }).then(handle)

// Cloudinary direct upload (client-side)
export async function uploadToCloudinary(file, type = 'thumbnail') {
  const cloudName   = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET
  if (!cloudName || !uploadPreset) {
    throw new Error('VITE_CLOUDINARY_CLOUD_NAME or VITE_CLOUDINARY_UPLOAD_PRESET not configured')
  }
  const formData    = new FormData()
  formData.append('file', file)
  formData.append('upload_preset', uploadPreset)
  formData.append('folder', `nicheradar/${type}`)
  const res  = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: 'POST',
    body:   formData,
  })
  if (!res.ok) throw new Error('Cloudinary upload failed')
  const data = await res.json()
  return { url: data.secure_url, publicId: data.public_id }
}

export const getPalette = (action = 'generate', params = {}) => {
  const q = new URLSearchParams({ action, ...params }).toString()
  return fetch(`/api/color-palette?${q}`).then(handle)
}

export const getPrediction = () =>
  fetch('/api/currency?base=USD&prediction=true').then(handle)


