import { fetchYouTube, fetchNewsAPI, fetchHackerNews } from './_data.js'

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Content-Type': 'application/json',
}

const EXISTING = new Set([
  'skincare','movies','quotes','books','reviews',
  'fashion','fitness','food','travel','tech',
  'wellness','pets','gaming','art','finance',
])

const STOP_WORDS = new Set([
  'the','a','an','and','or','but','in','on','at','to','for',
  'of','with','by','from','is','are','was','were','be','been',
  'have','has','had','do','does','did','will','would','could',
  'should','may','might','this','that','these','those','i',
  'you','he','she','it','we','they','what','which','who',
  'how','when','where','why','new','best','top','most','more',
  'all','any','each','every','both','few','other','into',
  'through','during','before','after','above','below','between',
  'out','off','over','under','again','then','once','here','there',
  'no','not','only','own','same','so','than','too','very','just',
  'about','up','down','get','got','make','made','go','going',
  'can','also','like','video','watch','subscribe','official',
  'full','free','online','part','season','episode','vs','amp',
])

// Allowed source domains — only trusted platforms
const ALLOWED_DOMAINS = new Set([
  'youtube.com', 'youtu.be',
  'instagram.com',
  'tiktok.com',
  'pinterest.com', 'pinterest.co.uk', 'pinterest.com.au', 'pinterest.ca', 'pinterest.jp', 'pin.it',
  'reddit.com',
  // Trusted news sources
  'bbc.com', 'bbc.co.uk',
  'theguardian.com',
  'reuters.com',
  'apnews.com',
  'techcrunch.com',
  'wired.com',
  'cnn.com',
  'nytimes.com',
  'washingtonpost.com',
  'forbes.com',
  'businessinsider.com',
  'vice.com',
  'buzzfeed.com',
  'huffpost.com',
  'time.com',
  'theatlantic.com',
  'news.ycombinator.com',
  'theverge.com',
  'engadget.com',
  'mashable.com',
  'buzzfeednews.com',
  'abcnews.go.com',
  'cbsnews.com',
  'nbcnews.com',
  'usatoday.com',
  'independent.co.uk',
  'telegraph.co.uk',
  'dailymail.co.uk',
  'metro.co.uk',
  'smh.com.au',
  'abc.net.au',
  'news.com.au',
  'stuff.co.nz',
  'nzherald.co.nz',
  'japantimes.co.jp',
  'asahi.com',
  'koreaherald.com',
  'koreatimes.co.kr',
  'scmp.com',
  'straitstimes.com',
  'colombotelegraph.com',
  'dailymirror.lk',
  'dailynews.lk',
])

// Excluded content terms — expanded
const EXCLUDED_TERMS = new Set([
  // Religious
  'islam','islamic','muslim','quran','allah','prayer','mosque','halal','haram',
  'christian','christianity','church','bible','jesus','god','worship','holy',
  'hindu','hinduism','buddhist','buddhism','temple','religious','religion',
  'faith','sacred','divine','theology','catholic','protestant','evangelical',
  'baptist','synagogue','rabbi','sermon','scripture','pilgrimage',
  'ramadan','eid','diwali','shinto','confucian','taoist','sikh',

  // War / violence / political
  'war','warfare','military','weapon','bomb','attack','terror','conflict',
  'genocide','violence','killing','murder','shooting','soldier','army',
  'combat','battle','invasion','coup','protest','revolution','hostage',
  'missile','nuclear','explosive','ammunition','firearms','sniper',

  // Drugs / substances
  'drug','drugs','cocaine','heroin','meth','marijuana','cannabis','weed',
  'psychedelic','lsd','mdma','ecstasy','overdose','narcotic','opium',
  'dealer','trafficking','smuggling','cartel',

  // Mature / adult
  'adult','nsfw','explicit','nude','sex','sexual','porn','erotic',
  'hookup','escort','onlyfans','fetish','xxx','18+',

  // Horror / disturbing
  'horror','gore','disturbing','creepy','scary','haunted','paranormal',
  'demon','devil','occult','cult','satanic','witchcraft','ritual',

  // Relationships / dating (not your niche)
  'dating','tinder','bumble','hinge','relationship','breakup','cheating',
  'divorce','affair','romantic','crush','flirting','soulmate',

  // Unwanted regional content markers
  'arabic','urdu','hindi','bangla','tamil','malay','indonesian','turkish',
  'persian','farsi','swahili','amharic','hausa','yoruba','igbo',
  'kabarterbaru','terbaru','berita','trending india','bollywood',
  'tollywood','kollywood','nollywood','telugu','kannada','malayalam',

  // Spam / low quality
  'subscribe','notification','bell','like comment','share follow',
  'viral2024','viral2025','viral2026','clickbait',
])

// Target regions — content from these regions is preferred
const TARGET_REGION_SIGNALS = new Set([
  // Sri Lanka
  'sri lanka','srilankan','colombo','kandy','ceylon','sinhala',
  // North America
  'usa','us','america','american','canada','canadian','new york',
  'california','toronto','vancouver','nyc','los angeles',
  // Europe
  'uk','britain','british','england','london','european','europe',
  'france','french','germany','german','spain','spanish','italy',
  'italian','netherlands','dutch','sweden','swedish','norway',
  'denmark','finland','switzerland','austria','belgium','portugal',
  // Australia / NZ
  'australia','australian','sydney','melbourne','brisbane','new zealand',
  'auckland','wellington','kiwi',
  // Japan / Korea / China
  'japan','japanese','tokyo','osaka','korea','korean','seoul','busan',
  'china','chinese','beijing','shanghai','taiwan','taiwanese',
  // General english-speaking
  'english','global','international','worldwide',
])

// Check if URL is from an allowed domain
function isAllowedURL(url) {
  if (!url || !url.startsWith('http')) return false
  try {
    const domain = new URL(url).hostname.replace('www.', '')
    return [...ALLOWED_DOMAINS].some(d => domain === d || domain.endsWith('.' + d))
  } catch {
    return false
  }
}

// Check if content is excluded
function isExcluded(phrase, titles) {
  const p = phrase.toLowerCase()

  // Exclude if phrase contains excluded terms
  if ([...EXCLUDED_TERMS].some(term => p.includes(term))) return true

  // Exclude very short single words that are too generic
  if (phrase.split(' ').length === 1 && phrase.length < 5) return true

  // Check signal sources — if ALL sources contain excluded content, skip
  const cleanTitles = titles.filter(t => {
    const tl = t.toLowerCase()
    return ![...EXCLUDED_TERMS].some(term => tl.includes(term))
  })
  if (titles.length > 0 && cleanTitles.length === 0) return true

  return false
}

// Boost score for target region content
function regionBoost(titles) {
  const text = titles.join(' ').toLowerCase()
  const hasTarget = [...TARGET_REGION_SIGNALS].some(s => text.includes(s))
  return hasTarget ? 1.3 : 1.0
}

const SIGNAL_QUERIES = [
  'people are obsessed with in USA UK Australia',
  'fastest growing community North America Europe',
  'trending hobby Japan Korea UK',
  'viral trend Australia New Zealand',
  'new lifestyle movement USA Canada Europe',
  'underground trend going mainstream UK USA',
  'niche content creator going viral English',
  'rising interest United States Australia Japan',
  'trending aesthetic pinterest style',
  'passionate community content creators English',
]

// Extract n-grams from text
function extractNgrams(text) {
  const lower = text.toLowerCase().replace(/[^a-z\s]/g, ' ')
  const words = lower.split(/\s+/).filter(w =>
    w.length > 3 && !STOP_WORDS.has(w)
  )

  const ngrams = new Set()

  // Unigrams
  words.forEach(w => ngrams.add(w))

  // Bigrams
  for (let i = 0; i < words.length - 1; i++) {
    ngrams.add(`${words[i]} ${words[i+1]}`)
  }

  // Trigrams
  for (let i = 0; i < words.length - 2; i++) {
    ngrams.add(`${words[i]} ${words[i+1]} ${words[i+2]}`)
  }

  return [...ngrams]
}

// Measure signal strength — not just count but quality
function signalStrength(data) {
  const {
    frequency,       // how many times this phrase appears
    sourceCount,     // how many different source types (yt/news/hn)
    avgEngagement,   // average engagement of content containing this phrase
    wordCount,       // length of phrase
    recencyScore,    // how recent the content is
  } = data

  let score = 0

  // Frequency signal — base score
  score += frequency * 8

  // Cross-platform multiplier — same topic on YouTube AND news = strong signal
  if (sourceCount >= 3) score *= 3.0
  else if (sourceCount === 2) score *= 1.8
  else score *= 1.0

  // Multi-word phrases are more specific = stronger niche signal
  if (wordCount === 2) score *= 1.6
  if (wordCount === 3) score *= 2.2

  // Engagement weighted — higher engagement content = real interest
  score += (avgEngagement / 100) * 20

  // Recency boost — very recent = momentum building
  score += recencyScore * 15

  return Math.round(score)
}

// Predict trajectory based on signal pattern
function predictTrajectory(frequency, sourceCount, avgEngagement) {
  if (sourceCount >= 3 && avgEngagement > 70) return 'explosive'
  if (sourceCount >= 2 && frequency >= 4)     return 'rising fast'
  if (frequency >= 3 && avgEngagement > 50)   return 'gaining traction'
  if (sourceCount >= 2)                        return 'emerging'
  return 'early signal'
}

// Predict best platform based on content patterns
function predictPlatform(phrase, titles) {
  const text = titles.join(' ').toLowerCase()
  const signals = {
    tiktok:    ['tiktok','short video','viral','challenge','sound','duet','stitch','fyp'],
    instagram: ['instagram','aesthetic','photo','reel','visual','lifestyle','daily','routine','carousel'],
    youtube:   ['youtube','tutorial','explained','guide','deep dive','documentary','long form'],
    pinterest: ['pinterest','diy','craft','recipe','board','idea','inspiration','decor','mood board','aesthetic board','pin','pins'],
  }
  const scores = {}
  for (const [platform, keywords] of Object.entries(signals)) {
    scores[platform] = keywords.filter(k => text.includes(k)).length
  }
  // Pinterest boost for visual/aesthetic content
  if (/aesthetic|visual|mood|board|decor|craft|diy|recipe|style/.test(phrase)) {
    scores.pinterest = (scores.pinterest ?? 0) + 2
  }
  return Object.entries(scores).sort((a,b) => b[1]-a[1])[0][0] ?? 'tiktok'
}

// Predict opportunity window
function predictWindow(trajectory) {
  switch(trajectory) {
    case 'explosive':        return 'Post NOW — peak window is open'
    case 'rising fast':      return 'Post this week — momentum building fast'
    case 'gaining traction': return 'Post this month — early mover advantage'
    case 'emerging':         return 'Watch and prepare — signal just appeared'
    default:                 return 'Monitor — very early stage'
  }
}

// Generate evergreen content angles
function generateAngles(phrase) {
  return [
    `I tried ${phrase} for 30 days — here's what happened`,
    `Why ${phrase} is the next big thing for creators`,
    `${phrase} beginner guide — everything I wish I knew`,
    `The ${phrase} community nobody is talking about`,
    `How I grew my account with ${phrase} content`,
  ]
}

// Generate platform-specific hashtags
function generateHashtags(phrase, relatedPhrases) {
  const base    = phrase.replace(/\s+/g, '')
  const related = relatedPhrases
    .slice(0, 5)
    .map(p => p.replace(/\s+/g, ''))
  return [...new Set([
    base,
    `${base}creator`,
    `${base}community`,
    `${base}content`,
    `${base}lifestyle`,
    ...related,
  ])].slice(0, 8)
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' }

  console.log('=== Niche Discovery Started ===', new Date().toISOString())

  try {
    // Fetch broad signal data from all sources simultaneously
    const [ytBatches, newsBatches, hnPosts] = await Promise.all([
      Promise.all(
        SIGNAL_QUERIES.slice(0, 5).map(q =>
          fetchYouTube([q], 6).catch(() => [])
        )
      ),
      Promise.all(
        SIGNAL_QUERIES.slice(0, 5).map(q =>
          fetchNewsAPI(q, 6).catch(() => [])
        )
      ),
      fetchHackerNews(30).catch(() => []),
    ])

    // Build unified content pool with metadata
    const pool = []

    for (const videos of ytBatches) {
      for (const v of videos) {
        if (!v.videoId) continue
        const ageHours = v.published
          ? (Date.now() - new Date(v.published).getTime()) / 36e5
          : 48
        pool.push({
          text:       v.title,
          source:     'youtube',
          url:        `https://www.youtube.com/watch?v=${v.videoId}`,
          engagement: 75,
          recency:    Math.max(0, 1 - ageHours / 168), // 0-1, fresher = higher
        })
      }
    }

    for (const articles of newsBatches) {
      for (const a of articles) {
        if (!isAllowedURL(a.url)) continue
        const ageHours = a.publishedAt
          ? (Date.now() - new Date(a.publishedAt).getTime()) / 36e5
          : 48
        pool.push({
          text:       a.title,
          source:     'news',
          url:        a.url,
          engagement: 60,
          recency:    Math.max(0, 1 - ageHours / 168),
        })
      }
    }

    for (const post of hnPosts) {
      if (!isAllowedURL(post.url)) continue
      pool.push({
        text:       post.title,
        source:     'hn',
        url:        post.url ?? `https://news.ycombinator.com`,
        engagement: Math.min(100, (post.score ?? 0) / 5),
        recency:    0.5,
      })
    }

    console.log('Pool size:', pool.length)

    // Extract and score all phrases
    const phraseData = {}

    for (const item of pool) {
      const ngrams = extractNgrams(item.text)
      for (const phrase of ngrams) {
        // Skip existing niches
        if ([...EXISTING].some(n => phrase === n || phrase.startsWith(n + ' ') || phrase.endsWith(' ' + n))) continue
        // Skip very short phrases
        if (phrase.length < 5) continue

        if (!phraseData[phrase]) {
          phraseData[phrase] = {
            phrase,
            frequency:      0,
            sources:        new Set(),
            engagements:    [],
            recencyScores:  [],
            titles:         [],
            urls:           [],
          }
        }

        phraseData[phrase].frequency++
        phraseData[phrase].sources.add(item.source)
        phraseData[phrase].engagements.push(item.engagement)
        phraseData[phrase].recencyScores.push(item.recency)
        if (phraseData[phrase].titles.length < 5) {
          phraseData[phrase].titles.push(item.text)
        }
        if (phraseData[phrase].urls.length < 3 && isAllowedURL(item.url)) {
          phraseData[phrase].urls.push(item.url)
        }
      }
    }

    // Score each phrase and filter weak signals
    const scored = Object.values(phraseData)
      .filter(p => p.frequency >= 2 || p.sources.size >= 2)
      .filter(p => !isExcluded(p.phrase, p.titles))
      .filter(p => p.urls.some(isAllowedURL))
      .map(p => {
        const avgEngagement  = p.engagements.reduce((a,b) => a+b, 0) / p.engagements.length
        const avgRecency     = p.recencyScores.reduce((a,b) => a+b, 0) / p.recencyScores.length
        const wordCount      = p.phrase.split(' ').length
        const baseScore      = signalStrength({
          frequency:     p.frequency,
          sourceCount:   p.sources.size,
          avgEngagement,
          wordCount,
          recencyScore:  avgRecency,
        })
        const score          = Math.round(baseScore * regionBoost(p.titles))
        const trajectory = predictTrajectory(p.frequency, p.sources.size, avgEngagement)
        const platform   = predictPlatform(p.phrase, p.titles)
        const window     = predictWindow(trajectory)

        return {
          niche:          p.phrase,
          score,
          trajectory,
          platform,
          window,
          frequency:      p.frequency,
          sourceCount:    p.sources.size,
          sources:        [...p.sources],
          avgEngagement:  Math.round(avgEngagement),
          avgRecency:     Math.round(avgRecency * 100),
          wordCount,
          contentAngles:  generateAngles(p.phrase),
          hashtags:       generateHashtags(p.phrase, []),
          exampleTitles:  p.titles.slice(0, 3),
          urls:           p.urls.filter(isAllowedURL).slice(0, 2),
          opportunityScore: Math.min(100, Math.round(
            (score / 500) * 40 +
            (p.sources.size / 3) * 30 +
            (avgRecency * 20) +
            (wordCount > 1 ? 10 : 0)
          )),
        }
      })
      .sort((a, b) => b.opportunityScore - a.opportunityScore)
      .slice(0, 20) // top 20 discovered niches

    console.log('Discovered niches:', scored.length)

    // Build summary
    const summary = {
      totalSignals:      Object.keys(phraseData).length,
      discovered:        scored.length,
      explosive:         scored.filter(n => n.trajectory === 'explosive').length,
      rising:            scored.filter(n => n.trajectory === 'rising fast').length,
      topNiche:          scored[0]?.niche ?? null,
      topOpportunity:    scored[0]?.opportunityScore ?? 0,
      scannedAt:         new Date().toISOString(),
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ summary, niches: scored }),
    }

  } catch (e) {
    console.log('Discovery error:', e.message)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: e.message }),
    }
  }
}
