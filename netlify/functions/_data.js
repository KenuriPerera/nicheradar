// ── Fully free data layer — zero paid APIs ───────────────────────────────────
// Sources: Reddit (no key), YouTube (free key), Google Trends (no key)

export function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
}

// ── Reddit ────────────────────────────────────────────────────────────────────
export async function fetchReddit(subreddits, limit = 25) {
  const results = []
  for (const sub of subreddits) {
    try {
      const [hot, rising] = await Promise.all([
        fetch(`https://www.reddit.com/r/${sub}/hot.json?limit=${limit}`,
          { headers: { 'User-Agent': 'NicheRadar/1.0' } }).then(r => r.ok ? r.json() : null),
        fetch(`https://www.reddit.com/r/${sub}/rising.json?limit=${limit}`,
          { headers: { 'User-Agent': 'NicheRadar/1.0' } }).then(r => r.ok ? r.json() : null),
      ])
      const hotPosts    = hot?.data?.children?.map(c => ({ ...c.data, feed: 'hot'    })) ?? []
      const risingPosts = rising?.data?.children?.map(c => ({ ...c.data, feed: 'rising' })) ?? []
      results.push({ subreddit: sub, posts: [...hotPosts, ...risingPosts] })
    } catch { continue }
  }
  return results
}

// ── YouTube (free key — 10k units/day) ───────────────────────────────────────
export async function fetchYouTube(queries, maxResults = 10) {
  const key = process.env.YOUTUBE_API_KEY
  if (!key) return []
  const all = []
  for (const q of queries) {
    try {
      const after = new Date(Date.now() - 7 * 864e5).toISOString()
      const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(q)}&type=video&order=viewCount&publishedAfter=${after}&maxResults=${maxResults}&key=${key}`
      const res = await fetch(url)
      if (!res.ok) continue
      const data = await res.json()
      all.push(...(data.items ?? []).map(v => ({
        title:     v.snippet.title,
        channel:   v.snippet.channelTitle,
        published: v.snippet.publishedAt,
        videoId:   v.id.videoId,
      })))
    } catch { continue }
  }
  return all
}

// ── Google Trends (unofficial endpoint, no key) ────────────────────────────────
export async function fetchGoogleTrends(keywords, geo = 'US') {
  try {
    const req = JSON.stringify({
      comparisonItem: keywords.map(k => ({ keyword: k, geo, time: 'now 7-d' })),
      category: 0, property: ''
    })
    const url = `https://trends.google.com/trends/api/explore?hl=en-US&tz=0&req=${encodeURIComponent(req)}`
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } })
    if (!res.ok) return null
    const text = await res.text()
    return JSON.parse(text.replace(/^\)\]\}',\n/, ''))
  } catch { return null }
}

// ── Pure-math scoring engine (no AI needed) ──────────────────────────────────

export function scoreNiche(redditData, ytVideos) {
  let totalScore = 0, totalPosts = 0, risingCount = 0
  const allTitles = []

  for (const { posts } of redditData) {
    for (const p of posts) {
      totalPosts++
      if (p.feed === 'rising') risingCount++
      // engagement velocity: upvote ratio weighted by recency
      const ageHours = (Date.now() - p.created_utc * 1000) / 36e5
      const decay    = Math.max(0.1, 1 - ageHours / 168) // 7-day decay
      const score    = (p.score * p.upvote_ratio + p.num_comments * 3) * decay
      totalScore += score
      allTitles.push(p.title)
    }
  }

  for (const v of ytVideos) {
    allTitles.push(v.title)
  }

  const raw = totalPosts > 0 ? totalScore / totalPosts : 0
  const viralScore  = Math.min(100, Math.round(Math.log1p(raw) * 8))
  const risingRatio = totalPosts > 0 ? risingCount / totalPosts : 0

  return {
    viralScore,
    engagement:  Math.min(100, Math.round(viralScore * 1.1)),
    reach:       Math.min(100, Math.round(viralScore * 0.9 + ytVideos.length * 3)),
    longevity:   Math.min(100, Math.round(50 + risingRatio * 50)),
    competition: Math.min(100, Math.round(30 + totalPosts * 0.8)),
    allTitles,
    totalPosts,
    risingCount,
  }
}

// ── Hashtag extraction + prediction ──────────────────────────────────────────

const STOP = new Set([
  'the','a','an','and','or','but','in','on','at','to','for','of','with',
  'is','was','are','were','be','been','this','that','it','i','my','your',
  'how','why','what','when','where','which','who','do','did','does','have',
  'has','get','got','use','used','using','vs','vs.','after','before',
  'new','amp','im','its','more','like','just','so','from','about','all',
])

export function extractHashtags(titles, niche) {
  const freq = {}
  const recency = {}
  const now = Date.now()

  titles.forEach(({ text, ts }) => {
    const ageScore = Math.max(0.2, 1 - (now - ts) / (7 * 864e5))
    const words = text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2 && !STOP.has(w))

    // single words
    words.forEach(w => {
      freq[w]    = (freq[w]    || 0) + 1
      recency[w] = (recency[w] || 0) + ageScore
    })

    // bigrams (two-word combos — great hashtag candidates)
    for (let i = 0; i < words.length - 1; i++) {
      const bg = `${words[i]}${words[i+1]}`
      freq[bg]    = (freq[bg]    || 0) + 1.5
      recency[bg] = (recency[bg] || 0) + ageScore * 1.2
    }
  })

  // Boost niche-specific seeds
  const seeds = NICHE_SEEDS[niche] ?? []
  seeds.forEach(s => {
    if (!freq[s]) { freq[s] = 0.5; recency[s] = 0.5 }
  })

  // Composite score: frequency × recency bonus
  const scored = Object.entries(freq)
    .map(([tag, f]) => ({
      tag,
      score:     f * (1 + (recency[tag] || 0) / Math.max(f, 1)),
      frequency: f,
      recency:   recency[tag] || 0,
    }))
    .filter(t => t.frequency >= 1 && t.tag.length >= 3)
    .sort((a, b) => b.score - a.score)

  return scored.slice(0, 30)
}

export function predictViralHashtags(hashtags, niche) {
  if (!hashtags.length) return []

  const maxScore = hashtags[0].score
  const avgScore = hashtags.reduce((s, h) => s + h.score, 0) / hashtags.length

  return hashtags.map(h => {
    const normalised = h.score / maxScore
    const aboveAvg   = h.score > avgScore

    // Rising: moderate freq but high recency = newer trend
    const risingSignal = h.recency / Math.max(h.frequency, 1)

    let trend, prediction, viralProb
    if (risingSignal > 1.4 && normalised < 0.6) {
      trend      = 'emerging'
      viralProb  = Math.round(60 + normalised * 30)
      prediction = 'Early signal — low competition, high recency. Post now.'
    } else if (normalised > 0.7 && aboveAvg) {
      trend      = 'peak'
      viralProb  = Math.round(55 + normalised * 20)
      prediction = 'At peak virality. Saturating soon — act this week.'
    } else if (normalised > 0.4) {
      trend      = 'rising'
      viralProb  = Math.round(40 + normalised * 35)
      prediction = 'Growing steadily. Good window to post in next 3 days.'
    } else {
      trend      = 'stable'
      viralProb  = Math.round(20 + normalised * 25)
      prediction = 'Consistent niche tag. Use for long-tail reach.'
    }

    return {
      tag:        h.tag,
      viralProb,
      trend,
      prediction,
      score:      Math.round(h.score * 10) / 10,
      frequency:  Math.round(h.frequency),
    }
  }).sort((a, b) => b.viralProb - a.viralProb).slice(0, 20)
}

// ── Niche config ──────────────────────────────────────────────────────────────
export const NICHE_MAP = {
  skincare: {
    label:      'Skincare',
    icon:       '✨',
    subreddits: ['SkincareAddiction', 'AsianBeauty', 'tretinoin', 'DrSquatch'],
    ytQueries:  ['skincare routine tiktok 2025', 'skincare viral instagram reel 2025'],
    seeds:      ['skincare','spf','retinol','moisturizer','serums','acne','glow','routine','sunscreen','toner'],
  },
  movies: {
    label:      'Movies',
    icon:       '🎬',
    subreddits: ['movies', 'MovieSuggestions', 'horror', 'netflixbestof'],
    ytQueries:  ['movie review tiktok viral 2025', 'film recommendation reel 2025'],
    seeds:      ['movies','film','cinema','review','thriller','horror','rating','watchlist','streaming','underrated'],
  },
  quotes: {
    label:      'Quotes',
    icon:       '💬',
    subreddits: ['quotes', 'getmotivated', 'MotivationalQuotes', 'Showerthoughts'],
    ytQueries:  ['quote video tiktok viral 2025', 'motivation quotes instagram 2025'],
    seeds:      ['quotes','motivation','mindset','inspiration','life','growth','success','wisdom','dailyquote','affirmation'],
  },
  books: {
    label:      'Books',
    icon:       '📚',
    subreddits: ['books', 'BookRecommendations', 'Fantasy', '52books'],
    ytQueries:  ['booktok tiktok 2025 viral', 'book recommendation bookstagram 2025'],
    seeds:      ['booktok','books','reading','novel','fiction','thriller','fantasy','bookclub','currentlyreading','mustread'],
  },
  reviews: {
    label:      'Reviews',
    icon:       '⭐',
    subreddits: ['BuyItForLife', 'ProductReviews', 'malegrooming', 'HonestReviews'],
    ytQueries:  ['honest review tiktok viral 2025', 'product review instagram reel 2025'],
    seeds:      ['review','honest','tested','worth','rating','unboxing','haul','dupes','recommended','verdict'],
  },
  fashion: {
    label:      'Fashion',
    icon:       '👗',
    subreddits: ['femalefashionadvice', 'malefashionadvice', 'streetwear', 'thrifted'],
    ytQueries:  ['fashion tiktok viral 2025', 'outfit ideas instagram reel 2025'],
    seeds:      ['fashion','ootd','style','outfit','aesthetic','vintage','thrift','streetwear','fits','lookbook'],
  },
  fitness: {
    label:      'Fitness',
    icon:       '💪',
    subreddits: ['fitness', 'xxfitness', 'bodyweightfitness', 'gym'],
    ytQueries:  ['fitness tiktok viral 2025', 'workout reel instagram 2025'],
    seeds:      ['fitness','gym','workout','gains','training','cardio','abs','lifting','progress','transformation'],
  },
  food: {
    label:      'Food',
    icon:       '🍜',
    subreddits: ['food', 'recipes', 'Cooking', 'FoodPorn'],
    ytQueries:  ['food tiktok viral recipe 2025', 'food instagram reel 2025'],
    seeds:      ['recipe','foodie','cooking','homemade','easyrecipe','foodtok','delicious','mealprep','baking','tasty'],
  },
  travel: {
    label:      'Travel',
    icon:       '✈️',
    subreddits: ['travel', 'solotravel', 'backpacking', 'digitalnomad'],
    ytQueries:  ['travel tiktok viral 2025', 'travel reel instagram 2025'],
    seeds:      ['travel','wanderlust','explore','adventure','traveltok','bucketlist','hidden','solo','budget','roadtrip'],
  },
  tech: {
    label:      'Tech',
    icon:       '💻',
    subreddits: ['technology', 'gadgets', 'Artificial', 'ChatGPT'],
    ytQueries:  ['tech tiktok viral 2025', 'tech review instagram reel 2025'],
    seeds:      ['tech','gadgets','ai','viral','review','unboxing','setup','productivity','tools','innovation'],
  },
}

// Auto-derived — never edit these manually
export const NICHE_KEYS  = Object.keys(NICHE_MAP)
export const NICHE_SEEDS = Object.fromEntries(
  Object.entries(NICHE_MAP).map(([k, v]) => [k, v.seeds])
)
