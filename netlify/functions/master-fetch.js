import {
  fetchReddit, fetchYouTube, fetchNewsAPI, fetchHackerNews,
  scoreNiche, extractHashtags, predictViralHashtags,
  NICHE_MAP, NICHE_KEYS
} from './_data.js'
import { saveSnapshot, dbAvailable, getTopHashtagsHistory } from './_db.js'
import {
  saveMasterScan, saveNicheTiers, saveDailySummary, saveImprovData,
  mongoAvailable
} from './_mongodb.js'

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Content-Type': 'application/json',
}

function buildImprovCache(nicheResults, tiers) {
  const date = new Date().toISOString().split('T')[0]

  // Extract hooks from top performing titles
  const hooks = {}
  for (const n of nicheResults) {
    const titles = [
      ...(n.reddit ?? []).flatMap(r => r.posts ?? []).map(p => p.title),
      ...(n.youtube ?? []).map(v => v.title),
      ...(n.news ?? []).map(a => a.title),
    ].filter(t => t && t.length > 10)

    hooks[n.niche] = extractHooks(titles, n.niche)
  }

  // Extract audio trends from YouTube titles
  const audioTrends = {}
  for (const n of nicheResults) {
    const ytTitles = (n.youtube ?? []).map(v => v.title)
    audioTrends[n.niche] = extractAudioSignals(ytTitles)
  }

  // Build seasonality signals from recency patterns
  const seasonality = buildSeasonality(nicheResults)

  // Extract inspo channels from YouTube data
  const inspoChannels = {}
  for (const n of nicheResults) {
    inspoChannels[n.niche] = [
      ...(n.youtube ?? [])
        .filter(v => v.channel)
        .map(v => ({ channel: v.channel, title: v.title, videoId: v.videoId }))
        .slice(0, 5)
    ]
  }

  // Brand deal benchmarks per niche
  const brandBenchmarks = buildBrandBenchmarks(nicheResults)

  return {
    date,
    hooks,
    audioTrends,
    seasonality,
    inspoChannels,
    brandBenchmarks,
    nicheRankings: nicheResults.map(n => ({
      niche:      n.niche,
      label:      n.label,
      icon:       n.icon,
      viralScore: n.viralScore,
      tier:       n.tier,
      topTag:     n.topTag,
      emerging:   n.emerging?.length ?? 0,
    })),
    updatedAt: new Date().toISOString(),
  }
}

function extractHooks(titles, niche) {
  const HOOK_PATTERNS = [
    { type: 'curiosity',     regex: /why|what|how|secret|nobody|truth|real|actually/i       },
    { type: 'fomo',          regex: /everyone|viral|trending|you need|must|before|stop/i     },
    { type: 'controversy',   regex: /unpopular|wrong|disagree|hot take|overrated|honest/i    },
    { type: 'relatability',  regex: /pov|when you|me when|that feeling|anyone else|we all/i  },
    { type: 'transformation',regex: /days|weeks|months|changed|result|glow|journey|went/i    },
    { type: 'value',         regex: /tips|tricks|hacks|guide|ways|things|ideas|mistakes/i    },
  ]

  const hooks = []
  for (const title of titles) {
    for (const { type, regex } of HOOK_PATTERNS) {
      if (regex.test(title)) {
        hooks.push({
          hook:  title.slice(0, 100),
          type,
          score: title.length > 20 && title.length < 80 ? 'high' : 'medium',
        })
        break
      }
    }
  }

  // Generate template hooks from patterns
  const templates = [
    { type: 'curiosity',     template: `The ${niche} secret nobody tells you about`              },
    { type: 'fomo',          template: `Everyone is talking about this ${niche} trend`           },
    { type: 'controversy',   template: `Unpopular opinion: most ${niche} content is wrong`       },
    { type: 'relatability',  template: `POV: you just discovered ${niche} and now you're obsessed` },
    { type: 'transformation',template: `I tried this ${niche} routine for 30 days — results`    },
    { type: 'value',         template: `5 ${niche} mistakes you're probably making right now`    },
  ]

  return {
    fromTitles: hooks.slice(0, 10),
    templates,
  }
}

function extractAudioSignals(titles) {
  const AUDIO_KEYWORDS = [
    'bgm','ost','soundtrack','lofi','beats','music','audio',
    'sound','instrumental','ambient','theme','score',
  ]
  return titles
    .filter(t => AUDIO_KEYWORDS.some(k => t.toLowerCase().includes(k)))
    .slice(0, 6)
    .map(t => ({ title: t, tiktokSearch: `https://www.tiktok.com/search?q=${encodeURIComponent(t)}` }))
}

function buildSeasonality(nicheResults) {
  const months = [
    'January','February','March','April','May','June',
    'July','August','September','October','November','December',
  ]
  const currentMonth = new Date().getMonth()

  // Map niches to seasonal peaks based on content signals
  const peaks = {}
  for (const n of nicheResults) {
    const allText = [
      ...(n.reddit ?? []).flatMap(r => r.posts ?? []).map(p => p.title),
      ...(n.youtube ?? []).map(v => v.title),
    ].join(' ').toLowerCase()

    peaks[n.niche] = {
      currentMonthScore: n.viralScore,
      peakMonths:        detectPeakMonths(n.niche, allText),
      currentMonth:      months[currentMonth],
      isCurrentlyPeak:   n.viralScore > 50,
    }
  }
  return peaks
}

function detectPeakMonths(niche, text) {
  // Signal-based peak detection per niche
  const SEASONAL_SIGNALS = {
    skincare: ['summer','spf','winter','dry','cold','humid'],
    fitness:  ['new year','resolution','summer body','beach'],
    food:     ['christmas','thanksgiving','holiday','summer','bbq'],
    travel:   ['summer','holiday','vacation','break','season'],
    fashion:  ['spring','fall','winter','summer','season','trend'],
    gifts:    ['christmas','birthday','valentine','mother','father'],
  }
  const signals = SEASONAL_SIGNALS[niche] ?? []
  const matched = signals.filter(s => text.includes(s))
  return matched.length > 0 ? matched : ['year-round']
}

function buildBrandBenchmarks(nicheResults) {
  // Formula-based benchmarks — no API needed
  const benchmarks = {}
  for (const n of nicheResults) {
    const viralScore = n.viralScore ?? 0
    const multiplier = viralScore > 60 ? 1.5 : viralScore > 40 ? 1.2 : 1.0

    benchmarks[n.niche] = {
      micro:  { // 1k-10k followers
        igPost:   Math.round(15  * multiplier),
        igStory:  Math.round(8   * multiplier),
        igReel:   Math.round(25  * multiplier),
        ytVideo:  Math.round(50  * multiplier),
        tiktok:   Math.round(20  * multiplier),
        currency: 'USD',
        lkrMultiplier: 330,
      },
      mid: { // 10k-100k followers
        igPost:   Math.round(150  * multiplier),
        igStory:  Math.round(75   * multiplier),
        igReel:   Math.round(250  * multiplier),
        ytVideo:  Math.round(500  * multiplier),
        tiktok:   Math.round(200  * multiplier),
        currency: 'USD',
        lkrMultiplier: 330,
      },
      macro: { // 100k+ followers
        igPost:   Math.round(1500  * multiplier),
        igStory:  Math.round(750   * multiplier),
        igReel:   Math.round(2500  * multiplier),
        ytVideo:  Math.round(5000  * multiplier),
        tiktok:   Math.round(2000  * multiplier),
        currency: 'USD',
        lkrMultiplier: 330,
      },
    }
  }
  return benchmarks
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

  console.log('=== MASTER FETCH HANDLER CALLED ===')
  console.log('MONGODB_URI:', process.env.MONGODB_URI ? 'SET ✅' : 'NOT SET ❌')
  console.log('YOUTUBE_API_KEY:', process.env.YOUTUBE_API_KEY ? 'SET ✅' : 'NOT SET ❌')
  console.log('NEWS_API_KEY:', process.env.NEWS_API_KEY ? 'SET ✅' : 'NOT SET ❌')

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

    // Tier 1 — deep fetch, parallel
    const tier1Results = await Promise.all(
      tiers.tier1.map(niche => fetchNicheByTier(niche, 1))
    )
    for (const data of tier1Results.filter(Boolean)) {
      results.push(data)
      await saveMasterScan(data.niche, data)
      if (data.hashtags?.length) {
        saveSnapshot(data.niche, data.hashtags).catch(() => {})
      }
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
      youtube_units_used: tiers.tier1.length * 8 * 20,
    }

    await saveDailySummary(summary.date, summary)

    // Build Improv cache from collected niche data
    const improvData = buildImprovCache(results, tiers)
    await saveImprovData(improvData)
    console.log('Improv cache saved to MongoDB')

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
