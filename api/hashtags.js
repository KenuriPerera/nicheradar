// POST /api/hashtags — live hashtag extraction + viral prediction
// 100% free: Reddit + YouTube + pure-math scoring

import {
  cors, fetchReddit, fetchYouTube,
  extractHashtags, predictViralHashtags,
  scoreNiche, NICHE_MAP
} from './_data.js'

export default async function handler(req, res) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { niche = 'skincare' } = req.body ?? {}
  const cfg = NICHE_MAP[niche]
  if (!cfg) return res.status(400).json({ error: `Unknown niche: ${niche}` })

  const [redditData, ytVideos] = await Promise.all([
    fetchReddit(cfg.subreddits, 30),
    fetchYouTube(cfg.ytQueries,  12),
  ])

  // Build timestamped title corpus
  const titledPosts = []
  for (const { posts } of redditData) {
    for (const p of posts) {
      titledPosts.push({ text: p.title, ts: p.created_utc * 1000 })
    }
  }
  for (const v of ytVideos) {
    titledPosts.push({ text: v.title, ts: new Date(v.published).getTime() })
  }

  const raw       = extractHashtags(titledPosts, niche)
  const predicted = predictViralHashtags(raw, niche)
  const scores    = scoreNiche(redditData, ytVideos)

  res.status(200).json({
    niche,
    fetchedAt:  new Date().toISOString(),
    totalSources: titledPosts.length,
    viralScore: scores.viralScore,
    hashtags:   predicted,
    topEmerging: predicted.filter(h => h.trend === 'emerging').slice(0, 5),
    topPeak:     predicted.filter(h => h.trend === 'peak').slice(0, 5),
    topRising:   predicted.filter(h => h.trend === 'rising').slice(0, 5),
  })
}
