import {
  fetchReddit, fetchYouTube, fetchNewsAPI, fetchHackerNews,
  scoreNiche, extractHashtags, predictViralHashtags,
  NICHE_MAP, NICHE_KEYS
} from './_data.js'
import { saveSnapshot, dbAvailable, getTopHashtagsHistory } from './_db.js'
import {
  saveMasterScan, saveNicheTiers, saveDailySummary,
  mongoAvailable
} from './_mongodb.js'

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Content-Type': 'application/json',
}

// Determine niche tiers from historical Supabase data
async function rankNiches() {
  const hasDB = await dbAvailable()

  if (hasDB) {
    // Get historical performance per niche
    const rankings = await Promise.all(
      NICHE_KEYS.map(async niche => {
        try {
          const history = await getTopHashtagsHistory(niche, 7, 5)
          const avgProb = history.length
            ? history.reduce((s, h) => s + (h.avg_viral_prob ?? 0), 0) / history.length
            : 0
          return { niche, score: avgProb, hasHistory: history.length > 0 }
        } catch {
          return { niche, score: 0, hasHistory: false }
        }
      })
    )

    const sorted = rankings.sort((a, b) => b.score - a.score)

    return {
      tier1: sorted.slice(0, 5).map(n => n.niche),   // Top performing
      tier2: sorted.slice(5, 10).map(n => n.niche),  // Rising
      tier3: sorted.slice(10).map(n => n.niche),     // Light scan
    }
  }

  // No history yet — use default priority order
  return {
    tier1: ['skincare', 'movies', 'books', 'fitness', 'food'],
    tier2: ['fashion', 'tech', 'travel', 'wellness', 'finance'],
    tier3: ['quotes', 'reviews', 'pets', 'gaming', 'art'],
  }
}

// Fetch one niche with tier-appropriate depth
async function fetchNicheByTier(niche, tier) {
  const cfg = NICHE_MAP[niche]
  if (!cfg) return null

  const config = {
    1: { subreddits: 3, redditLimit: 20, ytVideos: 8 },
    2: { subreddits: 2, redditLimit: 12, ytVideos: 4 },
    3: { subreddits: 1, redditLimit:  6, ytVideos: 2 },
  }[tier] ?? { subreddits: 1, redditLimit: 6, ytVideos: 2 }

  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('timeout')), 10000)
  )

  try {
    const [redditData, ytVideos] = await Promise.race([
      Promise.all([
        fetchReddit(cfg.subreddits.slice(0, config.subreddits), config.redditLimit),
        fetchYouTube(cfg.ytQueries.slice(0, 1), config.ytVideos),
      ]),
      timeout
    ])

    // Add NewsAPI for Tier 1 niches
    let newsArticles = []
    if (tier === 1 && process.env.NEWS_API_KEY) {
      newsArticles = await fetchNewsAPI(cfg.label, 5).catch(() => [])
    }

    // Add Hacker News for tech niche
    let hnPosts = []
    if (niche === 'tech') {
      hnPosts = await fetchHackerNews(8).catch(() => [])
    }

    const titledPosts = []
    for (const { posts } of redditData) {
      for (const p of posts) {
        titledPosts.push({ text: p.title, ts: p.created_utc * 1000 })
      }
    }
    for (const v of ytVideos) {
      titledPosts.push({ text: v.title, ts: new Date(v.published).getTime() })
    }
    for (const a of newsArticles) {
      titledPosts.push({ text: a.title, ts: new Date(a.publishedAt ?? Date.now()).getTime() })
    }

    const scores    = scoreNiche(redditData, ytVideos)
    const rawTags   = extractHashtags(titledPosts, niche)
    const predicted = predictViralHashtags(rawTags, niche)

    return {
      niche,
      label:       cfg.label,
      icon:        cfg.icon,
      tier,
      viralScore:  scores.viralScore,
      engagement:  scores.engagement,
      reach:       scores.reach,
      longevity:   scores.longevity,
      competition: scores.competition,
      totalPosts:  scores.totalPosts,
      risingCount: scores.risingCount,
      hashtags:    predicted,
      emerging:    predicted.filter(h => h.trend === 'emerging'),
      topTag:      predicted[0]?.tag ?? null,
      reddit:      redditData,
      youtube:     ytVideos,
      news:        newsArticles,
      hn:          hnPosts,
      fetchedAt:   new Date().toISOString(),
    }
  } catch (e) {
    console.log(`Fetch failed for ${niche} tier ${tier}:`, e.message)
    return {
      niche, label: cfg.label, icon: cfg.icon, tier,
      viralScore: 0, engagement: 0, reach: 0,
      longevity: 0, competition: 0, totalPosts: 0,
      risingCount: 0, hashtags: [], emerging: [],
      topTag: null, reddit: [], youtube: [], news: [], hn: [],
      fetchedAt: new Date().toISOString(),
      error: e.message,
    }
  }
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' }

  const isScheduled = event.httpMethod === 'GET' &&
    event.headers?.['x-netlify-event'] === 'schedule'
  const isManual    = event.httpMethod === 'POST' || event.httpMethod === 'GET'

  if (!isScheduled && !isManual) {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Not allowed' }) }
  }

  const startTime = Date.now()
  console.log('=== Master Fetch Started ===', new Date().toISOString())

  try {
    // Step 1 — Rank niches by historical performance
    const tiers = await rankNiches()
    console.log('Tiers:', JSON.stringify(tiers))
    await saveNicheTiers(tiers)

    // Step 2 — Fetch niches in tier order (tier 1 first, highest priority)
    const results = []

    // Tier 1 — deep fetch, sequential to manage quota
    for (const niche of tiers.tier1) {
      const data = await fetchNicheByTier(niche, 1)
      if (data) {
        results.push(data)
        // Save to MongoDB cache
        await saveMasterScan(niche, data)
        // Save hashtags to Supabase history
        if (data.hashtags?.length) {
          saveSnapshot(niche, data.hashtags).catch(() => {})
        }
      }
    }

    // Tier 2 — medium fetch, parallel
    const tier2Results = await Promise.all(
      tiers.tier2.map(niche => fetchNicheByTier(niche, 2))
    )
    for (const data of tier2Results.filter(Boolean)) {
      results.push(data)
      await saveMasterScan(data.niche, data)
      if (data.hashtags?.length) {
        saveSnapshot(data.niche, data.hashtags).catch(() => {})
      }
    }

    // Tier 3 — light fetch, parallel
    const tier3Results = await Promise.all(
      tiers.tier3.map(niche => fetchNicheByTier(niche, 3))
    )
    for (const data of tier3Results.filter(Boolean)) {
      results.push(data)
      await saveMasterScan(data.niche, data)
    }

    // Step 3 — Build daily summary
    const valid      = results.filter(r => r.viralScore > 0)
    const avgViral   = valid.length
      ? Math.round(valid.reduce((s, r) => s + r.viralScore, 0) / valid.length)
      : 0
    const topNiche   = [...results].sort((a, b) => b.viralScore - a.viralScore)[0]
    const allTags    = results.flatMap(r => r.hashtags ?? [])
    const topTags    = allTags
      .sort((a, b) => b.viralProb - a.viralProb)
      .slice(0, 10)
      .map(t => t.tag)

    const summary = {
      date:          new Date().toISOString().split('T')[0],
      nichesScanned: results.length,
      avgViralScore: avgViral,
      topNiche:      topNiche?.niche ?? null,
      topNicheScore: topNiche?.viralScore ?? 0,
      topTags,
      tiers,
      elapsedMs:     Date.now() - startTime,
      youtube_units_used: tiers.tier1.length * 8 * 20 +
                          tiers.tier2.length * 4 * 20 +
                          tiers.tier3.length * 2 * 20,
    }

    await saveDailySummary(summary.date, summary)

    console.log('=== Master Fetch Complete ===', `${summary.elapsedMs}ms`)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok:      true,
        summary,
        niches:  results.map(r => ({
          niche:      r.niche,
          tier:       r.tier,
          viralScore: r.viralScore,
          topTag:     r.topTag,
          emerging:   r.emerging?.length ?? 0,
        })),
      }),
    }
  } catch (e) {
    console.log('Master fetch error:', e.message)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: e.message }),
    }
  }
}
