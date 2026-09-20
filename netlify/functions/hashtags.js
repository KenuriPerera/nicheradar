import {
  fetchReddit, fetchYouTube,
  extractHashtags, predictViralHashtags,
  scoreNiche, NICHE_MAP
} from './_data.js'
import { saveSnapshot, dbAvailable } from './_db.js'

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Content-Type': 'application/json',
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  const { niche = 'skincare' } = JSON.parse(event.body ?? '{}')
  const cfg = NICHE_MAP[niche]
  if (!cfg) return { statusCode: 400, headers, body: JSON.stringify({ error: `Unknown niche: ${niche}` }) }

  try {
    const [redditData, ytVideos] = await Promise.all([
      fetchReddit(cfg.subreddits, 30),
      fetchYouTube(cfg.ytQueries,  12),
    ])

    const titledPosts = []
    for (const { posts } of redditData) {
      for (const p of posts) titledPosts.push({ text: p.title, ts: p.created_utc * 1000 })
    }
    for (const v of ytVideos) {
      titledPosts.push({ text: v.title, ts: new Date(v.published).getTime() })
    }

    const raw       = extractHashtags(titledPosts, niche)
    const predicted = predictViralHashtags(raw, niche)
    const scores    = scoreNiche(redditData, ytVideos)

    const hasDB = await dbAvailable()
    if (hasDB) saveSnapshot(niche, predicted).catch(() => {})

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        niche,
        fetchedAt:    new Date().toISOString(),
        totalSources: titledPosts.length,
        viralScore:   scores.viralScore,
        hashtags:     predicted,
        topEmerging:  predicted.filter(h => h.trend === 'emerging').slice(0, 5),
        topPeak:      predicted.filter(h => h.trend === 'peak').slice(0, 5),
        topRising:    predicted.filter(h => h.trend === 'rising').slice(0, 5),
        savedToDB:    hasDB,
      }),
    }
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) }
  }
}
