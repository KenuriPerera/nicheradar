import { fetchReddit, fetchYouTube, NICHE_MAP } from './_data.js'

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Content-Type': 'application/json',
}

// Extract audio/sound signals from YouTube titles
function extractAudioSignals(videos) {
  const AUDIO_KEYWORDS = [
    'official audio', 'official video', 'music video', 'lyrics',
    'soundtrack', 'theme', 'bgm', 'lofi', 'beats', 'instrumental',
    'ambient', 'mix', 'remix', 'cover', 'live', 'acoustic', 'piano',
  ]

  const found = []
  const seenTitles = new Set()

  for (const v of videos) {
    const title  = v.title.toLowerCase()
    const isAudio = AUDIO_KEYWORDS.some(kw => title.includes(kw))
    const looksLikeMusic = /–|-|feat\.|ft\.|prod\.|by\s+[A-Z]/.test(v.title)

    if ((isAudio || looksLikeMusic) && !seenTitles.has(v.title)) {
      seenTitles.add(v.title)
      found.push({
        name:      v.title.slice(0, 80),
        channel:   v.channel,
        videoId:   v.videoId,
        youtubeUrl:`https://www.youtube.com/watch?v=${v.videoId}`,
        type:      isAudio ? 'soundtrack' : 'music',
      })
    }
  }
  return found.slice(0, 8)
}

// Score Reddit posts by engagement
function scorePost(p) {
  if (!p?.created_utc) return p?.score ?? 0
  const ageHours = (Date.now() - p.created_utc * 1000) / 36e5
  const decay    = Math.max(0.1, 1 - ageHours / 168)
  return Math.round(((p.score ?? 0) * (p.upvote_ratio ?? 1) + (p.num_comments ?? 0) * 3) * decay)
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' }
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'POST only' }) }

  const { niche = 'skincare' } = JSON.parse(event.body ?? '{}')
  const cfg = NICHE_MAP[niche]
  if (!cfg) return { statusCode: 400, headers, body: JSON.stringify({ error: `Unknown niche: ${niche}` }) }

  // Add abort timeout for Reddit
  const redditPromise = Promise.race([
    fetchReddit(cfg.subreddits.slice(0, 2), 20),
    new Promise(r => setTimeout(() => r([]), 7000))
  ])

  // YouTube only if key exists
  const ytPromise = process.env.YOUTUBE_API_KEY
    ? fetchYouTube(cfg.ytQueries.slice(0, 1), 10)
    : Promise.resolve([])

  const [redditData, ytVideos] = await Promise.all([
    redditPromise,
    ytPromise,
  ])

  console.log('Reddit data:', JSON.stringify(redditData.map(r => ({ sub: r.subreddit, posts: r.posts?.length ?? 0 }))))
  console.log('YT videos:', ytVideos?.length ?? 0)

  // ── Top Reddit Posts ──────────────────────────────────────────────────────
  const allPosts = []
  for (const item of redditData ?? []) {
    const posts = item?.posts ?? []
    const subreddit = item?.subreddit ?? 'unknown'
    for (const p of posts) {
      if (!p?.title) continue
      allPosts.push({
        title:       p.title,
        subreddit:   `r/${subreddit}`,
        score:       p.score ?? 0,
        comments:    p.num_comments ?? 0,
        upvoteRatio: Math.round((p.upvote_ratio ?? 1) * 100),
        engScore:    scorePost(p),
        url:         p.permalink
          ? `https://www.reddit.com${p.permalink}`
          : `https://www.reddit.com/r/${subreddit}`,
        feed:        p.feed ?? 'hot',
        ageHours:    p.created_utc
          ? Math.round((Date.now() - p.created_utc * 1000) / 36e5)
          : 0,
        flair:       p.link_flair_text ?? null,
      })
    }
  }
  console.log('Total posts built:', allPosts.length)
  console.log('Top 3:', allPosts.slice(0,3).map(p => p.title))

  const topReddit = allPosts
    .sort((a, b) => b.engScore - a.engScore)
    .slice(0, 12)

  // ── Top YouTube Videos ────────────────────────────────────────────────────
  const topYouTube = ytVideos
    .filter(v => v.videoId)
    .slice(0, 10)
    .map(v => ({
      title:      v.title,
      channel:    v.channel,
      published:  v.published,
      videoId:    v.videoId,
      url:        `https://www.youtube.com/watch?v=${v.videoId}`,
      thumbnail:  `https://img.youtube.com/vi/${v.videoId}/mqdefault.jpg`,
      ageLabel:   formatAge(v.published),
    }))

  // ── Trending Audio ────────────────────────────────────────────────────────
  // Pull from broader music-related YouTube search
  const musicVideos = process.env.YOUTUBE_API_KEY
    ? await fetchYouTube([`${niche} trending audio sound music`], 6).catch(() => [])
    : []
  const trendingAudio = extractAudioSignals([...ytVideos, ...musicVideos])

  // ── Summary ───────────────────────────────────────────────────────────────
  const topPost  = topReddit[0]
  const topVideo = topYouTube[0]

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      niche,
      fetchedAt:    new Date().toISOString(),
      totalSources: allPosts.length + ytVideos.length,
      summary: {
        topPostTitle:   topPost?.title?.slice(0, 60) + '...' ?? '—',
        topPostScore:   topPost?.score ?? 0,
        topVideoTitle:  topVideo?.title?.slice(0, 60) + '...' ?? '—',
        audioCount:     trendingAudio.length,
      },
      topRedditPosts:  topReddit,
      topYouTubeVideos: topYouTube,
      trendingAudio,
    }),
  }
}

function formatAge(published) {
  if (!published) return 'recently'
  const hours = (Date.now() - new Date(published).getTime()) / 36e5
  if (hours < 24)  return `${Math.round(hours)}h ago`
  if (hours < 168) return `${Math.round(hours / 24)}d ago`
  return `${Math.round(hours / 168)}w ago`
}
