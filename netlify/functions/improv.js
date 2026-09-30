import { getImprovData, getCalendarEntries, saveCalendarEntry,
         updateCalendarEntry, getGrowthEntries, saveGrowthEntry,
         saveCloudinaryImage, getCloudinaryImages } from './_mongodb.js'
import { getCachedScan } from './_mongodb.js'

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,OPTIONS',
  'Content-Type': 'application/json',
}

const GEMINI_MODEL = 'gemini-3.8-flash'

// Analyze thumbnail via Cloudinary + Gemini
async function analyzeThumbnail(imageUrl) {
  const key = process.env.GEMINI_API_KEY
  if (!key) throw new Error('GEMINI_API_KEY not set')

  const prompt = `You are an expert social media visual analyst. Analyze this thumbnail/image and return ONLY valid JSON:
{
  "overallScore": 0-100,
  "clickThroughPrediction": "low|medium|high|very high",
  "textClarity": 0-100,
  "colorContrast": 0-100,
  "emotionalImpact": 0-100,
  "facePresence": true or false,
  "textPresent": true or false,
  "dominantColors": ["color1","color2","color3"],
  "mood": "one word describing the mood",
  "strengths": ["strength1","strength2"],
  "improvements": ["improvement1","improvement2","improvement3"],
  "platformFit": {
    "youtube": 0-100,
    "instagram": 0-100,
    "tiktok": 0-100,
    "pinterest": 0-100
  },
  "verdict": "one sentence overall verdict"
}`

  const body = {
    contents: [{
      parts: [
        { inline_data: { mime_type: 'image/jpeg', data: imageUrl.split(',')[1] ?? imageUrl } },
        { text: prompt }
      ]
    }],
    generationConfig: { temperature: 0.2, maxOutputTokens: 1000 }
  }

  const res  = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
  )
  if (!res.ok) throw new Error(`Gemini error: ${res.status}`)
  const data  = await res.json()
  const text  = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
  const clean = text.replace(/```json|```/g, '').trim()
  return JSON.parse(clean)
}

// Analyze competitor/inspo channel via YouTube
async function analyzeInspoChannel(channelId) {
  const key = process.env.YOUTUBE_API_KEY
  if (!key) throw new Error('YOUTUBE_API_KEY not set')

  const [channelRes, videosRes] = await Promise.all([
    fetch(`https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${channelId}&key=${key}`).then(r => r.json()),
    fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&order=viewCount&maxResults=6&type=video&key=${key}`).then(r => r.json()),
  ])

  const channel = channelRes.items?.[0]
  const videos  = videosRes.items ?? []

  if (!channel) throw new Error('Channel not found')

  return {
    name:        channel.snippet.title,
    description: channel.snippet.description?.slice(0, 200),
    subscribers: channel.statistics.subscriberCount,
    views:       channel.statistics.viewCount,
    videoCount:  channel.statistics.videoCount,
    thumbnail:   channel.snippet.thumbnails?.medium?.url,
    topVideos:   videos.map(v => ({
      title:     v.snippet.title,
      videoId:   v.id.videoId,
      url:       `https://www.youtube.com/watch?v=${v.id.videoId}`,
      thumbnail: v.snippet.thumbnails?.medium?.url,
      published: v.snippet.publishedAt,
    })),
    inspoAngles: [
      `Try their format but with ${channel.snippet.title}'s topic applied to your niche`,
      `Cover topics they haven't touched yet in their recent 10 videos`,
      `Match their posting frequency — they post every X days`,
    ],
  }
}

// Generate product review template via Gemini
async function generateReviewTemplate(product, category) {
  const key = process.env.GEMINI_API_KEY
  if (!key) throw new Error('GEMINI_API_KEY not set')

  const prompt = `Create a social media product review script template for "${product}" in the "${category}" category. Return ONLY valid JSON:
{
  "hook": "attention-grabbing opening line",
  "intro": "2-sentence introduction script",
  "sections": [
    { "title": "section name", "points": ["point1","point2","point3"], "duration": "estimated seconds" }
  ],
  "pros": ["pro1","pro2","pro3"],
  "cons": ["con1","con2"],
  "verdict": "one honest verdict sentence",
  "cta": "call to action line",
  "caption": "ready-to-use caption for the review post",
  "hashtags": ["tag1","tag2","tag3","tag4","tag5"],
  "platforms": {
    "tiktok": "specific tip for TikTok version",
    "instagram": "specific tip for Instagram version",
    "youtube": "specific tip for YouTube version"
  }
}`

  const res  = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`,
    {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.4, maxOutputTokens: 1500 }
      })
    }
  )
  if (!res.ok) throw new Error(`Gemini error: ${res.status}`)
  const data  = await res.json()
  const text  = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
  const clean = text.replace(/```json|```/g, '').trim()
  return JSON.parse(clean)
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' }

  const params  = event.queryStringParameters ?? {}
  const feature = params.feature // which Improv feature
  const body    = event.httpMethod === 'POST' || event.httpMethod === 'PUT'
    ? JSON.parse(event.body ?? '{}')
    : {}

  try {
    // ── Features that read from MongoDB cache ─────────────────────────────
    if (['hooks','captions','audio','seasonality','brands','inspo-cache','rankings'].includes(feature)) {
      const cache = await getImprovData()
      if (!cache) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            cached:  false,
            message: 'No cache yet — master scan runs daily at 8pm Sri Lanka time. Click Master Scan to run now.',
          }),
        }
      }

      const data = {
        hooks:      cache.hooks,
        audioTrends:cache.audioTrends,
        seasonality:cache.seasonality,
        brands:     cache.brandBenchmarks,
        inspo:      cache.inspoChannels,
        rankings:   cache.nicheRankings,
        updatedAt:  cache.updatedAt,
      }

      return { statusCode: 200, headers, body: JSON.stringify(data) }
    }

    // ── Content Calendar ──────────────────────────────────────────────────
    if (feature === 'calendar') {
      if (event.httpMethod === 'POST') {
        await saveCalendarEntry(body)
        return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) }
      }
      if (event.httpMethod === 'PUT') {
        await updateCalendarEntry(body.id, body.updates)
        return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) }
      }
      const entries = await getCalendarEntries(
        params.start ?? new Date().toISOString().split('T')[0],
        params.end   ?? new Date(Date.now() + 30 * 864e5).toISOString().split('T')[0]
      )
      return { statusCode: 200, headers, body: JSON.stringify({ entries }) }
    }

    // ── Growth Tracker ────────────────────────────────────────────────────
    if (feature === 'growth') {
      if (event.httpMethod === 'POST') {
        await saveGrowthEntry(body)
        return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) }
      }
      const entries = await getGrowthEntries(30)
      return { statusCode: 200, headers, body: JSON.stringify({ entries }) }
    }

    // ── Thumbnail Analyzer — Gemini + Cloudinary ──────────────────────────
    if (feature === 'thumbnail') {
      if (!body.imageData) throw new Error('imageData required')
      const analysis = await analyzeThumbnail(body.imageData)
      // Save Cloudinary reference if URL provided
      if (body.cloudinaryUrl) {
        await saveCloudinaryImage({
          type:      'thumbnail',
          url:       body.cloudinaryUrl,
          analysis,
          niche:     body.niche ?? 'general',
        })
      }
      return { statusCode: 200, headers, body: JSON.stringify(analysis) }
    }

    // ── Inspo Channel — YouTube API ───────────────────────────────────────
    if (feature === 'inspo-channel') {
      if (!body.channelId) throw new Error('channelId required')
      const data = await analyzeInspoChannel(body.channelId)
      return { statusCode: 200, headers, body: JSON.stringify(data) }
    }

    // ── Product Review Template — Gemini ──────────────────────────────────
    if (feature === 'review-template') {
      if (!body.product) throw new Error('product required')
      const data = await generateReviewTemplate(body.product, body.category ?? 'general')
      return { statusCode: 200, headers, body: JSON.stringify(data) }
    }

    // ── Stationery Images — Cloudinary ────────────────────────────────────
    if (feature === 'stationery-images') {
      if (event.httpMethod === 'POST') {
        await saveCloudinaryImage({ ...body, type: 'stationery' })
        return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) }
      }
      const images = await getCloudinaryImages('stationery')
      return { statusCode: 200, headers, body: JSON.stringify({ images }) }
    }

    return { statusCode: 400, headers, body: JSON.stringify({ error: `Unknown feature: ${feature}` }) }

  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) }
  }
}
