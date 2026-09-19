import {
  cors, fetchReddit, fetchYouTube,
  scoreNiche, extractHashtags, predictViralHashtags, NICHE_MAP
} from './_data.js'

const NICHES = ['skincare', 'movies', 'quotes', 'books', 'reviews']

export default async function handler(req, res) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  // Fetch all niches in parallel
  const nicheResults = await Promise.all(
    NICHES.map(async (niche) => {
      const cfg = NICHE_MAP[niche]
      try {
        const [redditData, ytVideos] = await Promise.all([
          fetchReddit(cfg.subreddits.slice(0, 2), 15),
          fetchYouTube(cfg.ytQueries.slice(0, 1),  6),
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
          viralScore:      scores.viralScore,
          summary:         `${scores.totalPosts} active posts · ${emerging.length} emerging hashtags · score ${scores.viralScore}/100`,
          topHashtags:     predicted.slice(0, 4).map(h => h.tag),
          leadingPlatform: leading,
        }
      } catch {
        return { niche, viralScore: 0, summary: 'Data unavailable', topHashtags: cfg.seeds.slice(0, 4), leadingPlatform: 'both' }
      }
    })
  )

  const validScores = nicheResults.filter(n => n.viralScore > 0)
  const avgScore    = validScores.length
    ? Math.round(validScores.reduce((s, n) => s + n.viralScore, 0) / validScores.length)
    : 0
  const trending    = validScores.filter(n => n.viralScore >= 50).length

  res.status(200).json({
    summary: {
      trendingNiches:  `${trending} of ${NICHES.length}`,
      avgViralScore:   avgScore,
      bestPostingHour: '7 PM',
    },
    niches:    nicheResults,
    fetchedAt: new Date().toISOString(),
  })
}
