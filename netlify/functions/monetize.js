import { fetchYouTube, fetchNewsAPI, NICHE_MAP } from './_data.js'
import { getCachedScan } from './_mongodb.js'

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Content-Type': 'application/json',
}

// Platforms — Fiverr + social platforms replace Ko-fi/Gumroad/Payhip
const PLATFORMS = [
  {
    key:         'fiverr',
    name:        'Fiverr',
    icon:        '💼',
    type:        'freelance marketplace',
    bestFor:     'Selling content creation services, reviews, voice-overs, video editing',
    fee:         '20% Fiverr commission on each order',
    audience:    'Global buyers actively searching for content creators',
    digitalOk:   true,
    physicalOk:  false,
    difficulty:  'medium',
    link:        'https://www.fiverr.com',
  },
  {
    key:         'tiktok-shop',
    name:        'TikTok Shop',
    icon:        '🎵',
    type:        'social commerce',
    bestFor:     'Product affiliate links embedded in TikTok videos and live streams',
    fee:         '1-8% commission depending on category',
    audience:    '1B+ TikTok users — highest reach for viral product sales',
    digitalOk:   true,
    physicalOk:  true,
    difficulty:  'easy',
    link:        'https://shop.tiktok.com',
  },
  {
    key:         'instagram-collab',
    name:        'Instagram Collabs',
    icon:        '📸',
    type:        'social brand deals',
    bestFor:     'Sponsored posts, product tags, Instagram Shopping affiliate',
    fee:         'No platform fee — negotiate directly with brands',
    audience:    '2B+ Instagram users — highest CPM for visual niches',
    digitalOk:   true,
    physicalOk:  true,
    difficulty:  'medium',
    link:        'https://instagram.com',
  },
  {
    key:         'youtube-partner',
    name:        'YouTube Partner',
    icon:        '▶️',
    type:        'ad revenue + memberships',
    bestFor:     'Ad revenue, channel memberships, Super Thanks, merchandise shelf',
    fee:         'YouTube keeps 45% of ad revenue',
    audience:    '2.5B+ monthly users — best for long-form and tutorial content',
    digitalOk:   true,
    physicalOk:  false,
    difficulty:  'hard',
    link:        'https://youtube.com/creators',
  },
  {
    key:         'pinterest-creator',
    name:        'Pinterest Creator',
    icon:        '📌',
    type:        'affiliate + idea pins',
    bestFor:     'Idea pins with affiliate links, product pins, Pinterest Creator Fund',
    fee:         'Varies by affiliate program — typically 3-15%',
    audience:    '480M+ monthly users — highest purchase intent of any platform',
    digitalOk:   true,
    physicalOk:  true,
    difficulty:  'easy',
    link:        'https://creators.pinterest.com',
  },
]

// Derive platform strategy from live niche data
function buildPlatformStrategy(niche, cfg, nicheData, liveSignals) {
  const viralScore   = nicheData?.viralScore  ?? 0
  const emerging     = nicheData?.emerging    ?? []
  const topTag       = nicheData?.topTag      ?? niche
  const topTitles    = liveSignals.slice(0, 5).map(s => s.title)

  return PLATFORMS.map(p => {
    // Score each platform for this niche
    const platformScore = scorePlatformForNiche(niche, p.key, viralScore)

    // Derive products from live signals
    const derivedProducts = deriveProducts(niche, p.key, topTitles, cfg)

    // Derive content strategy from signals
    const strategy = deriveStrategy(niche, p.key, topTitles, emerging, topTag)

    return {
      ...p,
      platformScore,
      products:    derivedProducts,
      strategy,
      topTag,
      viralScore,
      bestTip:     deriveBestTip(niche, p.key, topTitles),
    }
  }).sort((a, b) => b.platformScore - a.platformScore)
}

function scorePlatformForNiche(niche, platform, viralScore) {
  const NICHE_PLATFORM_FIT = {
    skincare:   { 'instagram-collab': 90, 'tiktok-shop': 85, 'fiverr': 70, 'youtube-partner': 75, 'pinterest-creator': 80 },
    movies:     { 'youtube-partner': 90, 'tiktok-shop': 75, 'instagram-collab': 70, 'fiverr': 65, 'pinterest-creator': 50 },
    books:      { 'tiktok-shop': 85, 'instagram-collab': 80, 'pinterest-creator': 85, 'youtube-partner': 75, 'fiverr': 60 },
    stationery: { 'pinterest-creator': 95, 'instagram-collab': 85, 'tiktok-shop': 80, 'fiverr': 75, 'youtube-partner': 70 },
    fashion:    { 'instagram-collab': 95, 'tiktok-shop': 90, 'pinterest-creator': 85, 'youtube-partner': 70, 'fiverr': 60 },
    fitness:    { 'instagram-collab': 85, 'youtube-partner': 90, 'tiktok-shop': 80, 'fiverr': 75, 'pinterest-creator': 70 },
    food:       { 'tiktok-shop': 85, 'instagram-collab': 80, 'youtube-partner': 85, 'pinterest-creator': 90, 'fiverr': 65 },
    travel:     { 'instagram-collab': 90, 'youtube-partner': 85, 'pinterest-creator': 80, 'tiktok-shop': 75, 'fiverr': 70 },
    tech:       { 'youtube-partner': 95, 'fiverr': 90, 'tiktok-shop': 75, 'instagram-collab': 70, 'pinterest-creator': 60 },
    wellness:   { 'instagram-collab': 85, 'pinterest-creator': 85, 'tiktok-shop': 75, 'youtube-partner': 80, 'fiverr': 70 },
    finance:    { 'youtube-partner': 90, 'fiverr': 85, 'instagram-collab': 70, 'tiktok-shop': 65, 'pinterest-creator': 60 },
    art:        { 'instagram-collab': 90, 'fiverr': 95, 'pinterest-creator': 85, 'tiktok-shop': 75, 'youtube-partner': 75 },
    gaming:     { 'youtube-partner': 95, 'tiktok-shop': 80, 'fiverr': 75, 'instagram-collab': 70, 'pinterest-creator': 50 },
    pets:       { 'tiktok-shop': 85, 'instagram-collab': 85, 'youtube-partner': 75, 'pinterest-creator': 80, 'fiverr': 60 },
    quotes:     { 'instagram-collab': 85, 'pinterest-creator': 90, 'tiktok-shop': 80, 'youtube-partner': 65, 'fiverr': 60 },
    reviews:    { 'youtube-partner': 85, 'fiverr': 80, 'tiktok-shop': 80, 'instagram-collab': 75, 'pinterest-creator': 65 },
  }
  const base = NICHE_PLATFORM_FIT[niche]?.[platform] ?? 65
  // Boost score by viral score
  return Math.min(100, Math.round(base * (1 + (viralScore - 50) / 500)))
}

function deriveProducts(niche, platform, titles, cfg) {
  // Extract product/service ideas from live titles
  const ideas = []
  const PRODUCT_PATTERNS = [
    /(\w+\s?\w+)\s+(kit|set|bundle|pack|collection|guide|template|preset)/gi,
    /(\w+)\s+(review|tutorial|haul|routine|unboxing)/gi,
  ]
  for (const title of titles) {
    for (const pattern of PRODUCT_PATTERNS) {
      const matches = title.matchAll(pattern)
      for (const match of matches) {
        if (match[1] && match[1].length > 3) ideas.push(match[0])
      }
    }
  }

  // Supplement with niche-specific defaults if live extraction is thin
  const defaults = {
    skincare:   { fiverr: 'UGC skincare video creation service', 'tiktok-shop': 'Skincare routine affiliate bundles', 'instagram-collab': 'Skincare brand ambassador deals', 'youtube-partner': 'Skincare ingredient deep-dive series', 'pinterest-creator': 'Skincare routine idea pins' },
    movies:     { fiverr: 'Movie review video editing service', 'tiktok-shop': 'Movie merch affiliate', 'instagram-collab': 'Streaming platform sponsored posts', 'youtube-partner': 'Movie review channel monetization', 'pinterest-creator': 'Movie recommendation pins' },
    stationery: { fiverr: 'Digital planner design service', 'tiktok-shop': 'Stationery haul affiliate links', 'instagram-collab': 'Stationery brand partnerships', 'youtube-partner': 'Journaling tutorial channel', 'pinterest-creator': 'Stationery setup idea pins' },
    books:      { fiverr: 'BookTok video creation service', 'tiktok-shop': 'Book affiliate links', 'instagram-collab': 'Publisher sponsored reviews', 'youtube-partner': 'Bookshelf tour and review channel', 'pinterest-creator': 'Reading list and book aesthetic pins' },
  }
  return ideas.length > 0
    ? [...new Set(ideas)].slice(0, 3)
    : [defaults[niche]?.[platform] ?? `${niche} content service on ${platform}`]
}

function deriveStrategy(niche, platform, titles, emerging, topTag) {
  const topEmergingTags = emerging.slice(0, 3).map(h => `#${h.tag ?? h}`).join(' ')
  const strategies = {
    'fiverr':            `Create a gig offering ${niche} content creation. Use title keywords from trending: "${titles[0]?.slice(0,40) ?? niche}". Price starter at $5-15, premium at $50+. Use ${topEmergingTags || '#' + niche} in gig description.`,
    'tiktok-shop':       `Add affiliate links to trending ${niche} products in your TikTok bio and videos. Feature products seen in titles like "${titles[0]?.slice(0,40) ?? niche}". Use ${topEmergingTags || '#' + niche} for discovery.`,
    'instagram-collab':  `Pitch ${niche} brands using your engagement rate. Reference trending angle: "${titles[0]?.slice(0,40) ?? niche}". Tag brands in your posts and use ${topEmergingTags || '#' + niche} for brand visibility.`,
    'youtube-partner':   `Create a ${niche} channel around trending topics like "${titles[0]?.slice(0,50) ?? niche}". Enable monetization at 1,000 subs + 4,000 watch hours. Use ${topTag ? '#' + topTag : '#' + niche} in descriptions.`,
    'pinterest-creator': `Create idea pins around "${titles[0]?.slice(0,40) ?? niche}". Apply to Pinterest Creator Fund. Add affiliate links to product pins. Use ${topEmergingTags || '#' + niche} in pin descriptions.`,
  }
  return strategies[platform] ?? `Build your ${niche} presence on this platform using trending content signals.`
}

function deriveBestTip(niche, platform, titles) {
  const latestSignal = titles[0]?.slice(0, 60) ?? `trending ${niche} content`
  const tips = {
    'fiverr':            `Your most bookable gig right now: base it on "${latestSignal}" — buyers are searching for this type of content.`,
    'tiktok-shop':       `Products linked to "${latestSignal}" are getting high click-through right now. Add these to your shop showcase.`,
    'instagram-collab':  `Brands want creators covering "${latestSignal}" — pitch this angle in your media kit.`,
    'youtube-partner':   `"${latestSignal}" style videos are getting longer watch time right now — prioritize this format.`,
    'pinterest-creator': `Pins about "${latestSignal}" are getting saved heavily this week — create a board around this topic.`,
  }
  return tips[platform] ?? `Focus on "${latestSignal}" to maximise your reach right now.`
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' }

  const niche = event.queryStringParameters?.niche ?? 'skincare'
  const cfg   = NICHE_MAP[niche]
  if (!cfg) return { statusCode: 400, headers, body: JSON.stringify({ error: `Unknown niche: ${niche}` }) }

  // Get live rate
  let lkrRate = 330
  try {
    const rateRes = await fetch('https://api.frankfurter.app/latest?from=USD&to=LKR')
    const rateData = await rateRes.json()
    lkrRate = rateData.rates?.LKR ?? 330
  } catch {}

  // Try MongoDB cache first
  let nicheData = await getCachedScan(niche).catch(() => null)

  // Fetch live signals if no cache
  let liveSignals = []
  if (!nicheData) {
    const [ytVideos, newsArticles] = await Promise.all([
      fetchYouTube(cfg.ytQueries.slice(0, 1), 6).catch(() => []),
      fetchNewsAPI(cfg.label, 6).catch(() => []),
    ])
    liveSignals = [
      ...ytVideos.map(v  => ({ title: v.title, source: 'youtube' })),
      ...newsArticles.map(a => ({ title: a.title, source: 'news' })),
    ]
  } else {
    liveSignals = [
      ...(nicheData.youtube ?? []).map(v  => ({ title: v.title, source: 'youtube' })),
      ...(nicheData.news    ?? []).map(a  => ({ title: a.title, source: 'news'    })),
    ]
  }

  const platforms = buildPlatformStrategy(niche, cfg, nicheData, liveSignals)

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      niche,
      label:      cfg.label,
      icon:       cfg.icon,
      lkrRate:    Math.round(lkrRate),
      fromCache:  !!nicheData,
      platforms,
      signals:    liveSignals.slice(0, 5),
      fetchedAt:  new Date().toISOString(),
    }),
  }
}
