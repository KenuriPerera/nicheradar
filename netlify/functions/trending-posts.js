import {
  fetchYouTube, fetchNewsAPI, fetchHackerNews,
  fetchTMDB, fetchOpenLibrary, fetchITunes,
  NICHE_MAP, NICHE_YT_CATEGORIES
} from './_data.js'
import { getCachedScan } from './_mongodb.js'

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Content-Type': 'application/json',
}

// YouTube trending by category — 1 unit per video, not 100
async function fetchYouTubeTrendingForNiche(niche, limit = 10) {
  const key        = process.env.YOUTUBE_API_KEY
  if (!key) return []
  const categoryId = NICHE_YT_CATEGORIES[niche] ?? '0'
  try {
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&chart=mostPopular&videoCategoryId=${categoryId}&maxResults=${limit}&regionCode=US&key=${key}`,
      { signal: AbortSignal.timeout(6000) }
    )
    if (!res.ok) return []
    const data = await res.json()
    if (data.error) {
      console.log('YouTube trending error:', data.error.message)
      return []
    }
    return (data.items ?? []).map(v => ({
      title:       v.snippet.title,
      channel:     v.snippet.channelTitle,
      published:   v.snippet.publishedAt,
      videoId:     v.id,
      url:         `https://www.youtube.com/watch?v=${v.id}`,
      thumbnail:   v.snippet.thumbnails?.medium?.url,
      viewCount:   parseInt(v.statistics?.viewCount ?? 0),
      likeCount:   parseInt(v.statistics?.likeCount ?? 0),
      commentCount:parseInt(v.statistics?.commentCount ?? 0),
      ageLabel:    formatAge(v.snippet.publishedAt),
      categoryId,
    }))
  } catch (e) {
    console.log('YouTube trending fetch error:', e.message)
    return []
  }
}

// Dev.to — tech articles, no key needed
async function fetchDevTo(limit = 10) {
  try {
    const res = await fetch(
      `https://dev.to/api/articles?per_page=${limit}&top=7`,
      { headers: { 'User-Agent': 'NicheRadar/1.0' }, signal: AbortSignal.timeout(5000) }
    )
    if (!res.ok) return []
    const data = await res.json()
    return data.map(a => ({
      title:       a.title,
      subreddit:   'dev.to',
      score:       a.positive_reactions_count ?? 0,
      comments:    a.comments_count ?? 0,
      upvoteRatio: 100,
      engScore:    (a.positive_reactions_count ?? 0) + (a.comments_count ?? 0) * 3,
      url:         a.url,
      feed:        'trending',
      ageHours:    Math.round((Date.now() - new Date(a.published_at).getTime()) / 36e5),
      flair:       a.tag_list?.[0] ?? 'dev',
    }))
  } catch {
    return []
  }
}

// 4chan board threads — no key, no signup
async function fetch4chan(board = 'v', limit = 8) {
  try {
    const res = await fetch(
      `https://a.4cdn.org/${board}/threads.json`,
      { headers: { 'User-Agent': 'NicheRadar/1.0' }, signal: AbortSignal.timeout(5000) }
    )
    if (!res.ok) return []
    const pages = await res.json()
    const threads = pages.flatMap(p => p.threads ?? []).slice(0, limit)

    // Fetch subject for each thread
    const withSubjects = await Promise.all(
      threads.slice(0, 5).map(async t => {
        try {
          const tr = await fetch(
            `https://a.4cdn.org/${board}/thread/${t.no}.json`,
            { signal: AbortSignal.timeout(3000) }
          )
          if (!tr.ok) return null
          const td = await tr.json()
          const op = td.posts?.[0]
          return {
            title:       op?.sub ?? op?.com?.replace(/<[^>]+>/g,'').slice(0, 80) ?? 'Thread',
            subreddit:   `4chan/${board}`,
            score:       t.replies ?? 0,
            comments:    t.replies ?? 0,
            upvoteRatio: 100,
            engScore:    (t.replies ?? 0) * 5,
            url:         `https://boards.4chan.org/${board}/thread/${t.no}`,
            feed:        'hot',
            ageHours:    Math.round((Date.now() - (op?.time ?? 0) * 1000) / 36e5),
            flair:       board.toUpperCase(),
          }
        } catch { return null }
      })
    )
    return withSubjects.filter(Boolean)
  } catch {
    return []
  }
}

// Extract audio signals from YouTube videos
function extractAudioSignals(videos) {
  const AUDIO_KEYWORDS = [
    'official audio','official video','music video','lyrics',
    'soundtrack','theme','bgm','lofi','beats','instrumental',
    'ambient','mix','remix','cover','live','acoustic','piano',
  ]
  const found      = []
  const seenTitles = new Set()
  for (const v of videos) {
    const title    = v.title.toLowerCase()
    const isAudio  = AUDIO_KEYWORDS.some(kw => title.includes(kw))
    const isMusic  = /–|-|feat\.|ft\.|prod\.|by\s+[A-Z]/.test(v.title)
    if ((isAudio || isMusic) && !seenTitles.has(v.title)) {
      seenTitles.add(v.title)
      found.push({
        name:       v.title.slice(0, 80),
        channel:    v.channel,
        videoId:    v.videoId,
        youtubeUrl: `https://www.youtube.com/watch?v=${v.videoId}`,
        type:       isAudio ? 'soundtrack' : 'music',
        tiktokSearch: `https://www.tiktok.com/search?q=${encodeURIComponent(v.title)}`,
      })
    }
  }
  return found.slice(0, 8)
}

// Get niche-specific extra posts
async function getNicheSpecificPosts(niche, cfg) {
  switch (niche) {
    case 'tech':
      return await fetchDevTo(10)
    case 'gaming':
      return await fetch4chan('v', 6)
    case 'art':
      return await fetch4chan('ic', 5)
    case 'stationery':
      return await fetch4chan('diy', 5)
    case 'movies': {
      const tmdb = await fetchTMDB(8).catch(() => [])
      return tmdb.map(m => ({
        title:       `${m.title} — Rating: ${m.rating}/10`,
        subreddit:   'TMDB Trending',
        score:       Math.round(m.popularity),
        comments:    0,
        upvoteRatio: Math.round(m.upvote_ratio * 100),
        engScore:    Math.round(m.popularity),
        url:         m.url,
        feed:        'trending',
        ageHours:    0,
        flair:       'Movie',
      }))
    }
    case 'books': {
      const books = await fetchOpenLibrary('fiction', 8).catch(() => [])
      return books.map(b => ({
        title:       b.title,
        subreddit:   'Open Library',
        score:       b.score,
        comments:    0,
        upvoteRatio: 100,
        engScore:    b.score,
        url:         b.url,
        feed:        'trending',
        ageHours:    0,
        flair:       'Book',
      }))
    }
    case 'wellness':
    case 'fitness': {
      const podcasts = await fetchITunes(cfg.label, 'podcast', 8).catch(() => [])
      return podcasts.map(p => ({
        title:       p.title,
        subreddit:   'iTunes Podcasts',
        score:       0,
        comments:    0,
        upvoteRatio: 100,
        engScore:    50,
        url:         p.url,
        feed:        'trending',
        ageHours:    0,
        flair:       p.genre ?? 'Podcast',
      }))
    }
    default:
      return []
  }
}

function formatAge(published) {
  if (!published) return 'recently'
  const hours = (Date.now() - new Date(published).getTime()) / 36e5
  if (hours < 24)  return `${Math.round(hours)}h ago`
  if (hours < 168) return `${Math.round(hours / 24)}d ago`
  return `${Math.round(hours / 168)}w ago`
}

function scorePost(p) {
  const ageHours = p.ageHours ?? 24
  const decay    = Math.max(0.1, 1 - ageHours / 168)
  return Math.round(((p.score ?? 0) + (p.comments ?? 0) * 3) * decay)
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' }
  if (event.httpMethod !== 'POST')   return { statusCode: 405, headers, body: JSON.stringify({ error: 'POST only' }) }

  const { niche = 'skincare' } = JSON.parse(event.body ?? '{}')
  const cfg = NICHE_MAP[niche]
  if (!cfg) return { statusCode: 400, headers, body: JSON.stringify({ error: `Unknown niche: ${niche}` }) }

  // Check MongoDB cache first — zero API cost
  const cached = await getCachedScan(niche).catch(() => null)

  // 1. YouTube — niche-specific category (1 unit/video not 100)
  const ytVideos = await fetchYouTubeTrendingForNiche(niche, 10)

  // If YouTube returned nothing and we have cache, use cache
  const ytSource = ytVideos.length > 0
    ? ytVideos
    : (cached?.youtube ?? []).map(v => ({
        title:     v.title,
        channel:   v.channel,
        published: v.published,
        videoId:   v.videoId,
        url:       `https://www.youtube.com/watch?v=${v.videoId}`,
        thumbnail: `https://img.youtube.com/vi/${v.videoId}/mqdefault.jpg`,
        ageLabel:  'cached',
      }))

  // 2. News — niche-specific query
  const newsArticles = await fetchNewsAPI(cfg.label, 10).catch(() => [])

  // 3. Niche-specific extra sources (TMDB, Dev.to, 4chan, Open Library, iTunes)
  const nichePosts = await getNicheSpecificPosts(niche, cfg)

  // 4. HN — for tech and finance only
  const hnPosts = ['tech', 'finance'].includes(niche)
    ? await fetchHackerNews(8).catch(() => [])
    : []

  // Build unified post list
  const newsFormatted = newsArticles.map(a => ({
    title:       a.title,
    subreddit:   a.source ?? 'News',
    score:       0,
    comments:    0,
    upvoteRatio: 100,
    engScore:    50,
    url:         a.url,
    feed:        'news',
    ageHours:    a.publishedAt
      ? Math.round((Date.now() - new Date(a.publishedAt).getTime()) / 36e5)
      : 24,
    flair:       a.source ?? null,
  }))

  const hnFormatted = hnPosts.map(p => ({
    title:       p.title,
    subreddit:   'Hacker News',
    score:       p.score ?? 0,
    comments:    p.num_comments ?? 0,
    upvoteRatio: 100,
    engScore:    (p.score ?? 0) + (p.num_comments ?? 0) * 3,
    url:         p.url ?? `https://news.ycombinator.com`,
    feed:        'hot',
    ageHours:    24,
    flair:       'HN',
  }))

  // Merge all posts and score
  const allPosts = [...newsFormatted, ...hnFormatted, ...nichePosts]
    .map(p => ({ ...p, engScore: scorePost(p) }))
    .sort((a, b) => b.engScore - a.engScore)
    .slice(0, 15)

  // Audio signals from YouTube
  const trendingAudio = extractAudioSignals(ytSource)

  // Summary
  const topPost  = allPosts[0]
  const topVideo = ytSource[0]

  // Source breakdown — tells user where data came from
  const sourceBreakdown = {
    youtube:   ytVideos.length > 0 ? `${ytVideos.length} niche-matched videos` : `${ytSource.length} from cache`,
    news:      `${newsFormatted.length} articles`,
    niche:     nichePosts.length > 0 ? `${nichePosts.length} from ${getNicheSourceName(niche)}` : null,
    hn:        hnFormatted.length > 0 ? `${hnFormatted.length} HN posts` : null,
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      niche,
      nicheLabel:   cfg.label,
      nicheIcon:    cfg.icon,
      fetchedAt:    new Date().toISOString(),
      fromCache:    ytVideos.length === 0,
      totalSources: allPosts.length + ytSource.length,
      sourceBreakdown,
      summary: {
        topPostTitle:  topPost?.title?.slice(0, 60) ?? '—',
        topPostScore:  topPost?.engScore ?? 0,
        topVideoTitle: topVideo?.title?.slice(0, 60) ?? '—',
        audioCount:    trendingAudio.length,
      },
      topPosts:        allPosts,
      topYouTubeVideos: ytSource.slice(0, 10),
      trendingAudio,
    }),
  }
}

function getNicheSourceName(niche) {
  const names = {
    tech:      'Dev.to',
    gaming:    '4chan /v/',
    art:       '4chan /ic/',
    stationery:'4chan /diy/',
    movies:    'TMDB',
    books:     'Open Library',
    wellness:  'iTunes Podcasts',
    fitness:   'iTunes Podcasts',
  }
  return names[niche] ?? 'NewsAPI'
}
