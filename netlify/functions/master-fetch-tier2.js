import {
  fetchYouTube, fetchNewsAPI, fetchHackerNews,
  scoreNiche, extractHashtags, predictViralHashtags,
  NICHE_MAP
} from './_data.js'
import { saveSnapshot } from './_db.js'
import { saveMasterScan, getNicheTiers } from './_mongodb.js'

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
}

async function fetchNicheByTier(niche, tier) {
  const cfg = NICHE_MAP[niche]
  if (!cfg) return null

  const config = {
    2: { redditLimit: 12, ytVideos: 4 },
    3: { redditLimit:  6, ytVideos: 2 },
  }[tier] ?? { redditLimit: 6, ytVideos: 2 }

  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('timeout')), 8000)
  )

  try {
    const [newsArticles, ytVideos] = await Promise.race([
      Promise.all([
        fetchNewsAPI(cfg.label, config.redditLimit).catch(() => []),
        fetchYouTube(cfg.ytQueries.slice(0, 1), config.ytVideos).catch(() => []),
      ]),
      timeout
    ])

    const titledPosts = [
      ...newsArticles.map(a => ({ text: a.title, ts: new Date(a.publishedAt ?? Date.now()).getTime() })),
      ...ytVideos.map(v  => ({ text: v.title,   ts: new Date(v.published).getTime() })),
    ]

    const scores    = scoreNiche([], ytVideos)
    const rawTags   = extractHashtags(titledPosts, niche)
    const predicted = predictViralHashtags(rawTags, niche)

    return {
      niche, label: cfg.label, icon: cfg.icon, tier,
      viralScore:  scores.viralScore,
      hashtags:    predicted,
      emerging:    predicted.filter(h => h.trend === 'emerging'),
      topTag:      predicted[0]?.tag ?? null,
      youtube:     ytVideos,
      news:        newsArticles,
      fetchedAt:   new Date().toISOString(),
    }
  } catch (e) {
    return {
      niche, label: cfg.label, icon: cfg.icon, tier,
      viralScore: 0, hashtags: [], emerging: [],
      topTag: null, youtube: [], news: [],
      fetchedAt: new Date().toISOString(),
    }
  }
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' }

  console.log('=== Master Fetch Tier 2+3 Started ===')

  try {
    const tiers = await getNicheTiers()
    if (!tiers) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ ok: false, reason: 'No tiers found — run master-fetch first' })
      }
    }

    const results = []

    const tier2Results = await Promise.all(
      tiers.tier2.map(niche => fetchNicheByTier(niche, 2))
    )
    for (const data of tier2Results.filter(Boolean)) {
      results.push(data)
      await saveMasterScan(data.niche, data)
      if (data.hashtags?.length) saveSnapshot(data.niche, data.hashtags).catch(() => {})
    }

    const tier3Results = await Promise.all(
      tiers.tier3.map(niche => fetchNicheByTier(niche, 3))
    )
    for (const data of tier3Results.filter(Boolean)) {
      results.push(data)
      await saveMasterScan(data.niche, data)
    }

    console.log('=== Master Fetch Tier 2+3 Complete ===')

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok:      true,
        scanned: results.length,
        niches:  results.map(r => ({ niche: r.niche, tier: r.tier, viralScore: r.viralScore })),
      }),
    }
  } catch (e) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: e.message }),
    }
  }
}
