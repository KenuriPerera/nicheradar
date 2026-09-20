import {
  cors, fetchReddit, fetchYouTube,
  scoreNiche, NICHE_MAP
} from './_data.js'

export default async function handler(req, res) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { niche = 'skincare' } = req.body ?? {}
  const cfg = NICHE_MAP[niche]
  if (!cfg) return res.status(400).json({ error: `Unknown niche: ${niche}` })

  const [redditData, ytTikTok, ytIG] = await Promise.all([
    fetchReddit(cfg.subreddits, 20),
    fetchYouTube([`${niche} tiktok viral 2025`],    8),
    fetchYouTube([`${niche} instagram reel 2025`],  8),
  ])

  const tkScores = scoreNiche(redditData, ytTikTok)
  const igScores = scoreNiche(redditData, ytIG)

  // Platform bias — TikTok skews younger/faster, IG skews aesthetic/longer
  const PLATFORM_BIAS = {
    skincare: { tiktok: +5,  instagram: +8  },
    movies:   { tiktok: +8,  instagram: -3  },
    quotes:   { tiktok: -2,  instagram: +10 },
    books:    { tiktok: +6,  instagram: +5  },
    reviews:  { tiktok: +10, instagram: +2  },
  }
  const bias = PLATFORM_BIAS[niche] ?? { tiktok: 0, instagram: 0 }

  const tkViral = Math.min(100, tkScores.viralScore + bias.tiktok)
  const igViral = Math.min(100, igScores.viralScore + bias.instagram)

  const better    = tkViral >= igViral ? 'TikTok' : 'Instagram'
  const betterDelta = Math.abs(tkViral - igViral)

  const NO_FACE_STRATEGY = {
    skincare: 'Film product close-ups, ingredient labels, and skin texture shots. Voiceover-only routines perform equally well as face-cam.',
    movies:   'Use film stills, text overlays, and a distinctive written voice. Aesthetic edits with no-face cinematography outperform face-cam reviews on both platforms.',
    quotes:   'Handwritten or minimal-typography formats are the dominant no-face format. Your aesthetic IS your identity here.',
    books:    'Cosy reading flat-lays, page-flip close-ups, and shelf aesthetics. BookTok/BookStagram are the most no-face-friendly niches that exist.',
    reviews:  'B-roll of the product in use + honest voiceover. Viewers trust voice-only reviews — no face needed for credibility.',
  }

  const INSIGHTS = {
    tiktok: {
      skincare: 'TikTok skincare is driven by ingredient education and before/after reveals. Fast-cut voiceover routines under 60s dominate.',
      movies:   'Hot takes and controversial opinions drive TikTok movie content. Shorter, punchy reviews under 45s outperform longer analysis.',
      quotes:   'Quotes with ambient audio and motion text perform best. Handwritten aesthetic is trending over digital typography.',
      books:    'BookTok thrives on emotional reactions and "books that broke me" formats. Cosy aesthetic is essential.',
      reviews:  'Honest, unfiltered reviews with a strong opening hook drive TikTok engagement. Dupe comparisons are the highest-performing format.',
    },
    instagram: {
      skincare: 'Instagram skincare favours carousel routines and aesthetic flat-lays. Save rates are the key metric — educational content wins.',
      movies:   'Static rating graphics and aesthetic film stills perform well. Story shares drive reach on Instagram for this niche.',
      quotes:   'Minimal typography carousels are the dominant Instagram quote format. Share-to-story is the primary viral mechanism.',
      books:    'BookStagram is aesthetic-first. Shelf photos, cover art, and reading-nook setups drive follows and saves.',
      reviews:  'Clean product photography with text overlay performs best. IG audience values polish over rawness for reviews.',
    },
  }

  res.status(200).json({
    tiktok: {
      viralScore: tkViral,
      reach:      Math.min(100, tkScores.reach      + bias.tiktok),
      engagement: Math.min(100, tkScores.engagement + bias.tiktok),
      longevity:  Math.min(100, tkScores.longevity),
      insight:    INSIGHTS.tiktok[niche] ?? 'TikTok favours fast, authentic, trend-reactive content.',
    },
    instagram: {
      viralScore: igViral,
      reach:      Math.min(100, igScores.reach      + bias.instagram),
      engagement: Math.min(100, igScores.engagement + bias.instagram),
      longevity:  Math.min(100, igScores.longevity  + 5),
      insight:    INSIGHTS.instagram[niche] ?? 'Instagram rewards polished, save-worthy, aesthetic content.',
    },
    recommendation: `${better} leads by ${betterDelta} points for ${niche} content right now. ${betterDelta > 15 ? 'Focus your primary effort here.' : 'Both platforms are viable — cross-post with platform-specific formatting.'}`,
    noFaceStrategy: NO_FACE_STRATEGY[niche] ?? 'Both platforms support no-face content. Focus on strong audio, text overlays, and aesthetic B-roll.',
    fetchedAt: new Date().toISOString(),
  })
}
