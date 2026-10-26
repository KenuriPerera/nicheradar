import { MongoClient, ObjectId } from 'mongodb'
import dns from 'dns'

try { dns.setDefaultResultOrder('ipv4first') } catch {}

let cachedClient = null

export const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
}

export async function getClipTubeClient() {
  let uri = process.env.MONGODB_URI
  if (!uri) return null
  uri = uri.replace(/^["']|["']$/g, '').trim()
  if (cachedClient) return cachedClient
  try {
    const client = new MongoClient(uri, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
    })
    await client.connect()
    cachedClient = client
    return client
  } catch (e) {
    console.error('ClipTube MongoDB connection failed:', e.message)
    return null
  }
}

export async function getClipTubeDB() {
  const client = await getClipTubeClient()
  if (!client) return null
  return client.db('nicheradar')
}

export async function getScansCollection() {
  const db = await getClipTubeDB()
  return db ? db.collection('cliptube_scans') : null
}

export async function getIdeasCollection() {
  const db = await getClipTubeDB()
  return db ? db.collection('cliptube_ideas') : null
}

export async function getSeriesCollection() {
  const db = await getClipTubeDB()
  return db ? db.collection('cliptube_series') : null
}

export async function getSeedsCollection() {
  const db = await getClipTubeDB()
  return db ? db.collection('cliptube_seeds') : null
}

export { ObjectId }

// ── Blocked Keywords (Religious & Political Denylist) ────────────────────
// Videos containing any of these in title, channel, tags, or description are dropped everywhere.
export const BLOCKED_KEYWORDS = [
  // Religious — English
  'islamic', 'muslim', 'quran', 'koran', 'allah', 'hindu', 'hinduism', 'bhagwan',
  'krishna', 'shiva', 'rama', 'hanuman', 'jesus', 'christ', 'christian', 'christianity',
  'bible', 'church', 'buddhist', 'buddhism', 'temple', 'mosque', 'ramadan', 'eid',
  'prayer', 'devotional', 'bhakti', 'gospel', 'prophet', 'pastor', 'pandit', 'puja',
  'pooja', 'namaz', 'surah', 'ayat', 'mantra', 'chalisa', 'stotra', 'shloka',

  // Political — English
  'election', 'elections', 'vote', 'voting', 'voter', 'political', 'politician',
  'politics', 'minister', 'prime minister', 'president', 'parliament', 'congress',
  'senate', 'government', 'propaganda', 'protest', 'protests', 'democracy',
  'republican', 'democrat', 'communist', 'dictator', 'trump', 'biden', 'modi',
  'putin', 'zelensky', 'netanyahu', 'kamala harris', 'obama',

  // Hindi / Devanagari Religious & Political
  'भगवान', 'कृष्णा', 'कृष्ण', 'राम', 'हनुमान', 'शिव', 'मंदिर', 'पूजा', 'भक्ति',
  'इस्लाम', 'मुस्लिम', 'अल्लाह', 'क़ुरान', 'ईसा', 'मसीह', 'बाइबल', 'चर्च',
  'बौद्ध', 'नमाज़', 'दुआ', 'चुनाव', 'राजनीति', 'नेता', 'मंत्री', 'सरकार', 'वोट',

  // Tamil Religious & Political
  'இந்து', 'கடவுள்', 'கிருஷ்ணர்', 'ராமர்', 'சிவன்', 'முருகன்', 'கோவில்',
  'பக்தி', 'பூஜை', 'இஸ்லாம்', 'அல்லாஹ்', 'குரான்', 'இயேசு', 'கிறிஸ்து',
  'பைபிள்', 'சர்ச்', 'பிரார்த்தனை', 'தேர்தல்', 'அரசியல்', 'அமைச்சர்', 'அரசாங்கம்', 'வாக்கு',

  // Urdu / Arabic Religious & Political
  'اسلام', 'مسلم', 'قرآن', 'اللہ', 'نماز', 'دعا', 'رمضان', 'عید', 'مسجد',
  'نبی', 'رسول', 'انتخابات', 'سیاست', 'حکومت', 'وزیر'
]

// ── Non-English Language Markers & Romanized Hindi/Urdu Words ─────────────
export const LANGUAGE_NAME_MARKERS = [
  'hindi', 'tamil', 'telugu', 'malayalam', 'urdu', 'bhojpuri', 'bengali',
  'punjabi', 'marathi', 'gujarati', 'kannada', 'sinhala', 'hinglish', 'desi'
]

export const ROMANIZED_HINDI_URDU_WORDS = [
  'ka', 'ki', 'ke', 'hai', 'hain', 'kya', 'nahi', 'nahin', 'mera', 'meri', 'mere',
  'pyar', 'bhai', 'ghar', 'kahani', 'kahaniya', 'kahaniyan', 'bhoot', 'chudail',
  'churail', 'dost', 'baat', 'karo', 'deko', 'dekho', 'kare', 'wala', 'wali', 'wale',
  'bachon', 'bacha', 'ladki', 'ladka', 'aadhi', 'ek', 'aur', 'yeh', 'woh', 'apne',
  'apna', 'apni', 'saas', 'bahu', 'maa', 'baap', 'dadi', 'nani', 'chacha', 'mama',
  'zindagi', 'maut', 'sach', 'jhooth', 'dard', 'dil', 'shadi', 'paisa', 'paise',
  'sabse', 'hota', 'hoti', 'hote'
]

// ── English Stopwords for Language Detection & Topic Clustering ──────────
export const ENGLISH_STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of',
  'with', 'by', 'from', 'as', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'this', 'that', 'these', 'those',
  'it', 'its', 'he', 'she', 'they', 'we', 'you', 'i', 'me', 'my', 'what', 'who',
  'how', 'why', 'when', 'where', 'which', 'can', 'will', 'just', 'all', 'no',
  'not', 'so', 'very', 'up', 'out', 'like', 'about', 'more', 'into', 'your',
  'their', 'one', 'two', 'three', 'first', 'last', 'him', 'her', 'his', 'them',
  'us', 'our', 'if', 'then', 'there', 'than', 'could', 'would', 'should',
  'before', 'after', 'some', 'other', 'over', 'down', 'only', 'own', 'same'
])

// ── Platform & Generic Words (Dropped from topics and hashtags) ───────────
export const GENERIC_PLATFORM_WORDS = new Set([
  'viral', 'shorts', 'trending', 'fyp', 'ai', 'aistory', 'aivideo', 'aishorts',
  'reels', 'viralreels', 'youtubeshorts', 'subscribe', 'story', 'stories', 'video',
  'videos', 'part', 'episode', 'ep', 'new', 'best', 'full', 'hd', 'animation',
  'animated', 'short', 'film', 'youtube', 'foryou', 'viralvideo', 'watch'
])

// ── Helper: Median Calculation ───────────────────────────────────────────
export function getMedian(numbers) {
  if (!numbers || numbers.length === 0) return 0
  const sorted = [...numbers].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : Math.round((sorted[mid - 1] + sorted[mid]) / 2)
}

// ── Unicode-aware Tokenizer ──────────────────────────────────────────────
export function tokenize(text) {
  if (!text) return []
  const matches = text.toLowerCase().match(/[\p{L}\p{M}\p{N}]+/gu)
  return matches || []
}

// ── YouTube ISO 8601 Duration Parser ─────────────────────────────────────
export function parseDuration(pt) {
  if (!pt) return 0
  const match = pt.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (!match) return 0
  const hours = parseInt(match[1] || '0', 10)
  const minutes = parseInt(match[2] || '0', 10)
  const seconds = parseInt(match[3] || '0', 10)
  return hours * 3600 + minutes * 60 + seconds
}

// ── Clean Title for NLP Analysis (Strip hashtags, emoji, URLs) ────────────
export function cleanTitleForAnalysis(title) {
  if (!title) return ''
  return title
    // Strip URLs
    .replace(/https?:\/\/\S+/gi, ' ')
    // Strip hashtags (never glue words)
    .replace(/#[\p{L}\p{M}\p{N}_]+/gu, ' ')
    // Strip emoji & pictographs
    .replace(/[\p{Extended_Pictographic}\u200d\ufe0f]/gu, ' ')
    // Normalize spaces
    .replace(/\s+/g, ' ')
    .trim()
}

// ── Word Boundary Matcher (Unicode-safe) ──────────────────────────────────
function containsWordBoundary(text, word) {
  if (!text || !word) return false
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  // For non-ASCII words, use lookaround with letter boundary
  const regex = new RegExp(`(?:^|[^\\p{L}\\p{N}])${escaped}(?:[^\\p{L}\\p{N}]|$)`, 'iu')
  return regex.test(text)
}

// ── Video Classifier: 'english' | 'global' | 'blocked' ───────────────────
export function classifyVideo(video) {
  const title = video.title || ''
  const channelTitle = video.channelTitle || ''
  const tagsStr = (video.tags || []).join(' ')
  const desc = (video.description || '').slice(0, 300)
  const fullText = `${title} ${channelTitle} ${tagsStr} ${desc}`

  // 1. BLOCKED CHECK (Religious or Political)
  for (const kw of BLOCKED_KEYWORDS) {
    if (containsWordBoundary(fullText, kw)) {
      return 'blocked'
    }
  }

  // 2. ENGLISH CHECK
  // (a) defaultAudioLanguage check
  if (video.defaultAudioLanguage) {
    const primarySubtag = video.defaultAudioLanguage.toLowerCase().split(/[-_]/)[0]
    if (primarySubtag !== 'en') {
      return 'global'
    }
  }

  // (b) Under 20% of letters in title+channel are non-Latin script
  const titleAndChannel = `${title} ${channelTitle}`
  const allLetters = titleAndChannel.match(/\p{L}/gu) || []
  if (allLetters.length > 0) {
    const latinLetters = titleAndChannel.match(/\p{Script=Latin}/gu) || []
    const nonLatinRatio = (allLetters.length - latinLetters.length) / allLetters.length
    if (nonLatinRatio >= 0.20) {
      return 'global'
    }
  }

  // (c) After stripping hashtags, URLs, and emoji, check English stopword hits
  const cleanTitle = cleanTitleForAnalysis(title)
  const titleWords = tokenize(cleanTitle)
  const stopwordHits = titleWords.filter(w => ENGLISH_STOPWORDS.has(w)).length

  if (titleWords.length >= 5) {
    const ratio = stopwordHits / titleWords.length
    if (stopwordHits < 2 && ratio < 0.25) {
      return 'global'
    }
  }

  // (d) No language-name markers and no Romanized Hindi/Urdu words
  const checkFields = `${title} ${channelTitle} ${tagsStr}`
  for (const marker of LANGUAGE_NAME_MARKERS) {
    if (containsWordBoundary(checkFields, marker)) {
      return 'global'
    }
  }

  for (const romanWord of ROMANIZED_HINDI_URDU_WORDS) {
    if (containsWordBoundary(checkFields, romanWord)) {
      return 'global'
    }
  }

  // Passed all criteria -> English!
  return 'english'
}

// ── Script Detector for Global Inspiration ───────────────────────────────
export function detectScript(text) {
  if (!text) return 'Unknown'
  if (/[\u0900-\u097F]/.test(text)) return 'Devanagari (Hindi)'
  if (/[\u0B80-\u0BFF]/.test(text)) return 'Tamil'
  if (/[\u0C00-\u0C7F]/.test(text)) return 'Telugu'
  if (/[\u0600-\u06FF]/.test(text)) return 'Urdu / Arabic'
  if (/[\u0980-\u09FF]/.test(text)) return 'Bengali'
  if (/[\u0D80-\u0DFF]/.test(text)) return 'Sinhala'
  if (/[\u0A80-\u0AFF]/.test(text)) return 'Gujarati'
  if (/[\u0D00-\u0D7F]/.test(text)) return 'Malayalam'
  if (/[\u0C80-\u0CFF]/.test(text)) return 'Kannada'
  if (/[\u4E00-\u9FFF]/.test(text)) return 'CJK / Chinese'
  if (/[\u3040-\u30FF]/.test(text)) return 'Japanese'
  if (/[\uAC00-\uD7AF]/.test(text)) return 'Korean'
  if (/[\u0400-\u04FF]/.test(text)) return 'Cyrillic'
  return 'Regional / Mixed Latin'
}

// ── Extract Clean Series Stem & Part Detection ────────────────────────────
export function extractSeriesStem(title) {
  if (!title) return { stem: '', partNumber: null }

  let partNumber = null

  // Check for explicit Part or Episode numbers
  const partMatch = title.match(/\b(?:part|pt\.?|episode|ep\.?|chapter|ch\.?|season|vol\.?|volume)\s*#?(\d+)\b/i) ||
                    title.match(/#(\d+)\b/)
  if (partMatch) {
    partNumber = parseInt(partMatch[1], 10)
  }

  // Clean title into pure stem
  let stem = cleanTitleForAnalysis(title)
    // Strip bracketed text: [Part 1], (Ep 3)
    .replace(/[\(\[\{][^\)\]\}]*[\)\]\}]/g, ' ')
    // Strip part indicators
    .replace(/\b(?:part|pt\.?|episode|ep\.?|chapter|ch\.?|season|vol\.?|volume)\s*#?\d+\b/gi, ' ')
    .replace(/#\d+\b/g, ' ')
    // Strip pipes, dashes, and trailing channel markers
    .replace(/[-–—|:][\s\w@]+$/g, ' ')
    .replace(/[-–—|:]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  stem = stem.replace(/[-–—|:;,.]+$/, '').trim()
  return { stem, partNumber }
}

// ── Topic Clustering (Bigrams, Trigrams & Significant Keywords) ───────────
// English-only videos. Requirements:
// - Cluster must have >= 3 videos AND >= 2 distinct channels
// - Rank by MEDIAN velocity
export function clusterTopics(englishVideos) {
  const clusterMap = new Map()

  for (const v of englishVideos) {
    const cleanTitle = cleanTitleForAnalysis(v.title)
    const rawTokens = tokenize(cleanTitle)
    // Filter out stopwords and generic platform words
    const tokens = rawTokens.filter(t =>
      !ENGLISH_STOPWORDS.has(t) &&
      !GENERIC_PLATFORM_WORDS.has(t) &&
      t.length > 2
    )

    // Trigrams
    for (let i = 0; i < tokens.length - 2; i++) {
      const phrase = `${tokens[i]} ${tokens[i + 1]} ${tokens[i + 2]}`
      addToCluster(clusterMap, phrase, v)
    }

    // Bigrams
    for (let i = 0; i < tokens.length - 1; i++) {
      const phrase = `${tokens[i]} ${tokens[i + 1]}`
      addToCluster(clusterMap, phrase, v)
    }

    // Single keywords (length >= 4)
    for (const token of tokens) {
      if (token.length >= 4) {
        addToCluster(clusterMap, token, v)
      }
    }
  }

  // Filter: >= 3 videos AND >= 2 distinct channels
  const validClusters = []
  for (const item of clusterMap.values()) {
    const channelCount = item.channels.size
    if (item.velocities.length >= 3 && channelCount >= 2) {
      validClusters.push({
        topic: item.topic,
        count: item.velocities.length,
        channelCount,
        medianVelocity: getMedian(item.velocities),
        totalViews: item.totalViews,
        sampleTitles: item.sampleTitles,
      })
    }
  }

  // Rank by MEDIAN velocity descending
  validClusters.sort((a, b) => b.medianVelocity - a.medianVelocity)

  // Deduplicate overlapping subphrases if a longer trigram already exists
  const finalClusters = []
  for (const c of validClusters) {
    const isSubset = finalClusters.some(existing =>
      existing.topic.includes(c.topic) && existing.count >= c.count
    )
    if (!isSubset) {
      finalClusters.push(c)
    }
    if (finalClusters.length >= 10) break
  }

  return finalClusters
}

function addToCluster(map, phrase, video) {
  if (!map.has(phrase)) {
    map.set(phrase, {
      topic: phrase,
      velocities: [],
      channels: new Set(),
      totalViews: 0,
      sampleTitles: [],
    })
  }
  const entry = map.get(phrase)
  entry.velocities.push(video.velocity || 0)
  if (video.channelId) entry.channels.add(video.channelId)
  entry.totalViews += (video.views || video.viewCount || 0)
  if (entry.sampleTitles.length < 3 && !entry.sampleTitles.includes(video.title)) {
    entry.sampleTitles.push(video.title)
  }
}

// ── Series Extraction (English only) ──────────────────────────────────────
// Rule: Count a series only if >= 2 episodes were found OR a Part/Episode number >= 2 is present.
export function extractSeries(englishVideos, channelMap) {
  const seriesMap = new Map()

  for (const v of englishVideos) {
    const { stem, partNumber } = extractSeriesStem(v.title)
    if (!stem || stem.length < 4) continue

    const key = `${v.channelId}:::${stem.toLowerCase()}`
    if (!seriesMap.has(key)) {
      seriesMap.set(key, {
        stem,
        channelId: v.channelId,
        channelTitle: channelMap[v.channelId]?.title || v.channelTitle || 'Unknown',
        videos: [],
        velocities: [],
        totalViews: 0,
        maxPartSeen: partNumber || 1,
      })
    }
    const group = seriesMap.get(key)
    group.videos.push(v)
    group.velocities.push(v.velocity || 0)
    group.totalViews += (v.views || v.viewCount || 0)
    if (partNumber && partNumber > group.maxPartSeen) {
      group.maxPartSeen = partNumber
    }
  }

  return Array.from(seriesMap.values())
    // Keep series with >= 2 episodes OR partNumber >= 2
    .filter(s => s.videos.length >= 2 || s.maxPartSeen >= 2)
    .map(s => {
      const episodeCount = s.videos.length
      const badgeText = episodeCount >= 2
        ? `${episodeCount} Episode${episodeCount > 1 ? 's' : ''}`
        : `Part ${s.maxPartSeen} seen`

      return {
        stem: s.stem,
        channelId: s.channelId,
        channelTitle: s.channelTitle,
        videoCount: episodeCount,
        badgeText,
        totalViews: s.totalViews,
        medianVelocity: getMedian(s.velocities),
        avgVelocity: Math.round(s.velocities.reduce((a, b) => a + b, 0) / s.velocities.length),
        sampleVideos: s.videos.slice(0, 4).map(v => ({
          id: v.id,
          title: v.title,
          views: v.views || v.viewCount,
          velocity: v.velocity,
          publishedAt: v.publishedAt,
          thumbnail: v.thumbnail,
        })),
      }
    })
    .sort((a, b) => b.medianVelocity - a.medianVelocity)
    .slice(0, 10)
}

// ── Hashtags Extraction (Content tags only, drop platform tags) ───────────
export function extractHashtags(englishVideos) {
  const tagMap = new Map()

  for (const v of englishVideos) {
    const tagsFound = new Set()

    // Title and description hashtags
    const titleTags = (v.title || '').match(/#([\p{L}\p{M}\p{N}_]+)/gu) || []
    const descTags = (v.description || '').match(/#([\p{L}\p{M}\p{N}_]+)/gu) || []
    for (const t of [...titleTags, ...descTags]) {
      const clean = t.replace('#', '').toLowerCase().trim()
      if (clean.length >= 2 && !GENERIC_PLATFORM_WORDS.has(clean)) {
        tagsFound.add(clean)
      }
    }

    // Video tags from snippet.tags
    for (const t of (v.tags || [])) {
      const clean = t.replace(/^#/, '').toLowerCase().trim()
      if (clean.length >= 2 && !GENERIC_PLATFORM_WORDS.has(clean)) {
        tagsFound.add(clean)
      }
    }

    for (const tag of tagsFound) {
      if (!tagMap.has(tag)) {
        tagMap.set(tag, { tag, velocities: [], totalViews: 0, sampleTitles: [] })
      }
      const item = tagMap.get(tag)
      item.velocities.push(v.velocity || 0)
      item.totalViews += (v.views || v.viewCount || 0)
      if (item.sampleTitles.length < 2 && !item.sampleTitles.includes(v.title)) {
        item.sampleTitles.push(v.title)
      }
    }
  }

  return Array.from(tagMap.values())
    .map(t => ({
      tag: t.tag,
      count: t.velocities.length,
      totalViews: t.totalViews,
      medianVelocity: getMedian(t.velocities),
      avgVelocity: Math.round(t.velocities.reduce((a, b) => a + b, 0) / t.velocities.length),
      sampleTitles: t.sampleTitles,
    }))
    .sort((a, b) => b.medianVelocity - a.medianVelocity)
    .slice(0, 20)
}

// ── Breakout Channels Extraction (English only) ──────────────────────────
export function extractBreakoutChannels(englishVideos, channelMap) {
  const channelsUsed = new Map()

  for (const v of englishVideos) {
    const chId = v.channelId
    if (!chId) continue

    if (!channelsUsed.has(chId)) {
      channelsUsed.set(chId, {
        channelId: chId,
        channelTitle: channelMap[chId]?.title || v.channelTitle || 'Unknown',
        subscriberCount: channelMap[chId]?.subscriberCount || v.subscriberCount || 0,
        thumbnail: channelMap[chId]?.thumbnail || '',
        videos: [],
        velocities: [],
        totalViews: 0,
      })
    }
    const ch = channelsUsed.get(chId)
    ch.videos.push(v)
    ch.velocities.push(v.velocity || 0)
    ch.totalViews += (v.views || v.viewCount || 0)
  }

  return Array.from(channelsUsed.values())
    .map(ch => {
      const subs = Math.max(1, ch.subscriberCount)
      const medianVelocity = getMedian(ch.velocities)
      const topVideo = [...ch.videos].sort((a, b) => b.velocity - a.velocity)[0]
      const breakoutRatio = Number(((topVideo.views || topVideo.viewCount) / subs).toFixed(2))

      return {
        channelId: ch.channelId,
        channelTitle: ch.channelTitle,
        subscriberCount: ch.subscriberCount,
        thumbnail: ch.thumbnail,
        videoCount: ch.videos.length,
        totalViews: ch.totalViews,
        medianVelocity,
        avgVelocity: Math.round(ch.velocities.reduce((a, b) => a + b, 0) / ch.videos.length),
        breakoutRatio,
        topVideo: {
          id: topVideo.id,
          title: topVideo.title,
          views: topVideo.views || topVideo.viewCount,
          velocity: topVideo.velocity,
          thumbnail: topVideo.thumbnail,
          publishedAt: topVideo.publishedAt,
        },
      }
    })
    .sort((a, b) => b.breakoutRatio - a.breakoutRatio)
    .slice(0, 10)
}

// ── Global Inspiration Bucket (Top ~15 non-blocked global videos) ─────────
export function buildGlobalInspiration(globalVideos) {
  return [...globalVideos]
    .sort((a, b) => b.velocity - a.velocity)
    .slice(0, 15)
    .map(v => ({
      id: v.id,
      title: v.title,
      channelTitle: v.channelTitle,
      velocity: v.velocity,
      views: v.views || v.viewCount,
      durationSec: v.durationSec || v.durationSeconds,
      detectedScript: detectScript(v.title),
    }))
}

// ── Seed Queries per Language (Search budget: 4 English + 2 Global) ───────
export function getSeedQueryConfig(genre = '') {
  const g = genre.toLowerCase().trim()

  let englishQueries = [
    'AI horror story',
    'AI creepypasta scary story',
    'AI mystery short story',
    'AI sci fi story'
  ]

  if (g === 'horror') {
    englishQueries = [
      'AI horror story narrated in English',
      'AI creepypasta scary story',
      'AI dark tale thriller short film',
      'AI analog horror story'
    ]
  } else if (g === 'scifi') {
    englishQueries = [
      'AI sci fi story narrated in English',
      'AI futuristic cyberpunk story',
      'AI space story short film',
      'AI dystopian story animated'
    ]
  } else if (g === 'mythology') {
    englishQueries = [
      'AI mythology folklore story English',
      'AI ancient legends story narrated',
      'AI epic myth short film',
      'AI gods and monsters story'
    ]
  } else if (g === 'drama') {
    englishQueries = [
      'AI drama story narrated in English',
      'AI emotional animated story',
      'AI life story short film',
      'AI cinematic narrative story'
    ]
  } else if (g === 'fantasy') {
    englishQueries = [
      'AI fantasy bedtime story English',
      'AI fairy tale animated story',
      'AI magical realm story',
      'AI relaxing fantasy story'
    ]
  }

  // 2 Global inspiration queries (no language restriction, viewCount order)
  const globalQueries = [
    'AI animated story',
    'AI viral story animation'
  ]

  return { englishQueries, globalQueries }
}

// ── Scan Pruning (Keep last 10, never delete in-progress scans) ───────────
export async function pruneScans() {
  const scansCol = await getScansCollection()
  if (!scansCol) return

  const completedScans = await scansCol
    .find({ status: { $in: ['ready', 'ai_failed', 'facts_ready'] } })
    .sort({ createdAt: -1 })
    .skip(10)
    .toArray()

  if (completedScans.length > 0) {
    const idsToDelete = completedScans.map(s => s._id)
    await scansCol.deleteMany({ _id: { $in: idsToDelete } })
  }
}
