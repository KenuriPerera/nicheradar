import {
  fetchReddit, fetchYouTube,
  scoreNiche, extractHashtags, predictViralHashtags,
  NICHE_MAP, NICHE_KEYS
} from './_data.js'
import { getCachedScan } from './_mongodb.js'

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Content-Type': 'application/json',
}

// Fetch one niche with a hard 8-second timeout
async function fetchNiche(niche) {
  const cfg = NICHE_MAP[niche]

  const cached = await getCachedScan(niche).catch(() => null)
  if (cached) {
    const emerging = (cached.hashtags ?? []).filter(h => h.trend === 'emerging')
    const leading  = cached.viralScore > 55 ? 'tiktok' : cached.longevity > 55 ? 'instagram' : 'both'
    return {
      niche,
      label: cfg.label,
      icon: cfg.icon,
      viralScore: cached.viralScore,
      summary: `${cached.totalPosts ?? 0} posts · ${emerging.length} emerging`,
      topHashtags: (cached.hashtags ?? []).slice(0, 4).map(h => typeof h === 'string' ? h : h.tag),
      leadingPlatform: leading,
    }
  }

  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('timeout')), 8000)
  )

  try {
    const [redditData, ytVideos] = await Promise.race([
      Promise.all([
        fetchReddit(cfg.subreddits.slice(0, 1), 10),  // 1 subreddit, 10 posts
        fetchYouTube(cfg.ytQueries.slice(0, 1), 4),   // 1 query, 4 videos
      ]),
      timeout.then(() => { throw new Error('timeout') })
    ])

    const titledPosts = []
    for (const { posts } of redditData) {
      for (const p of posts) {
        titledPosts.push({ text: p.title, ts: p.created_utc * 1000 })
      }
    }
    for (const v of ytVideos) {
      titledPosts.push({ text: v.title, ts: new Date(v.published).getTime() })
    }

    const scores = scoreNiche(redditData, ytVideos)
    const rawTags = extractHashtags(titledPosts, niche)
    const predicted = predictViralHashtags(rawTags, niche)
    const emerging = predicted.filter(h => h.trend === 'emerging')
    const leading = scores.viralScore > 55 ? 'tiktok'
      : scores.longevity > 55 ? 'instagram'
        : 'both'

    return {
      niche,
      label: cfg.label,
      icon: cfg.icon,
      viralScore: scores.viralScore,
      summary: `${scores.totalPosts} posts · ${emerging.length} emerging`,
      topHashtags: predicted.slice(0, 4).map(h => h.tag),
      leadingPlatform: leading,
    }
  } catch (e) {
    // Return fallback — never block the whole dashboard
    return {
      niche,
      label: cfg.label,
      icon: cfg.icon,
      viralScore: 0,
      summary: 'Live data unavailable — check connection',
      topHashtags: cfg.seeds.slice(0, 4),
      leadingPlatform: 'both',
      error: e.message,
    }
  }
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  try {
    // Fetch in batches of 3 — prevents overwhelming the function
    const results = []
    const BATCH = 3

    for (let i = 0; i < NICHE_KEYS.length; i += BATCH) {
      const batch = NICHE_KEYS.slice(i, i + BATCH)
      const done = await Promise.all(batch.map(fetchNiche))
      results.push(...done)
    }

    const valid = results.filter(n => n.viralScore > 0)
    const avgScore = valid.length
      ? Math.round(valid.reduce((s, n) => s + n.viralScore, 0) / valid.length)
      : 0
    const trending = valid.filter(n => n.viralScore >= 10).length

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        summary: {
          trendingNiches: `${trending} of ${NICHE_KEYS.length}`,
          avgViralScore: avgScore,
          bestPostingHour: '7 PM',
        },
        niches: results,
        fetchedAt: new Date().toISOString(),
      }),
    }
  } catch (e) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: `Dashboard error: ${e.message}` })
    }
  }
}
