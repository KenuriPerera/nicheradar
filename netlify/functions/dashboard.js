import {
  fetchReddit, fetchYouTube,
  scoreNiche, extractHashtags, predictViralHashtags,
  NICHE_MAP, NICHE_KEYS
} from './_data.js'

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Content-Type': 'application/json',
}

export const handler = async (event) => {
  if (event?.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  try {
    const nicheResults = await Promise.all(
      NICHE_KEYS.map(async (niche) => {
        const cfg = NICHE_MAP[niche]
        try {
          const [redditData, ytVideos] = await Promise.all([
            fetchReddit(cfg.subreddits.slice(0, 2), 15),
            fetchYouTube(cfg.ytQueries.slice(0, 1), 6),
          ])
          const titledPosts = []
          for (const { posts } of redditData) {
            for (const p of posts) titledPosts.push({ text: p.title, ts: p.created_utc * 1000 })
          }
          for (const v of ytVideos) {
            titledPosts.push({ text: v.title, ts: new Date(v.published).getTime() })
          }
          const scores    = scoreNiche(redditData, ytVideos)
          const rawTags   = extractHashtags(titledPosts, niche)
          const predicted = predictViralHashtags(rawTags, niche)
          const emerging  = predicted.filter(h => h.trend === 'emerging')
          const leading   = scores.viralScore > 55 ? 'tiktok' : scores.longevity > 55 ? 'instagram' : 'both'

          return {
            niche,
            label:           cfg.label,
            icon:            cfg.icon,
            viralScore:      scores.viralScore,
            summary:         `${scores.totalPosts} active posts · ${emerging.length} emerging hashtags`,
            topHashtags:     predicted.slice(0, 4).map(h => h.tag),
            leadingPlatform: leading,
          }
        } catch {
          return {
            niche,
            label:           cfg.label,
            icon:            cfg.icon,
            viralScore:      0,
            summary:         'Data unavailable',
            topHashtags:     cfg.seeds.slice(0, 4),
            leadingPlatform: 'both',
          }
        }
      })
    )

    const validScores = nicheResults.filter(n => n.viralScore > 0)
    const avgScore    = validScores.length
      ? Math.round(validScores.reduce((s, n) => s + n.viralScore, 0) / validScores.length)
      : 0
    const trending    = validScores.filter(n => n.viralScore >= 50).length

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        summary: {
          trendingNiches:  `${trending} of ${NICHE_KEYS.length}`,
          avgViralScore:   avgScore,
          bestPostingHour: '7 PM',
        },
        niches:    nicheResults,
        fetchedAt: new Date().toISOString(),
      }),
    }
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) }
  }
}
