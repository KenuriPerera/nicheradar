import { fetchReddit, fetchYouTube, scoreNiche, NICHE_MAP } from './_data.js'

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Content-Type': 'application/json',
}

const PLATFORM_BIAS = {
  skincare: { tiktok: +5,  instagram: +8  },
  movies:   { tiktok: +8,  instagram: -3  },
  quotes:   { tiktok: -2,  instagram: +10 },
  books:    { tiktok: +6,  instagram: +5  },
  reviews:  { tiktok: +10, instagram: +2  },
  fashion:  { tiktok: +8,  instagram: +9  },
  fitness:  { tiktok: +7,  instagram: +6  },
  food:     { tiktok: +9,  instagram: +8  },
  travel:   { tiktok: +5,  instagram: +10 },
  tech:     { tiktok: +8,  instagram: +4  },
}

const INSIGHTS = {
  tiktok: {
    skincare: 'TikTok skincare is driven by ingredient education and before/after reveals.',
    movies:   'Hot takes and controversial opinions drive TikTok movie content.',
    quotes:   'Quotes with ambient audio and motion text perform best on TikTok.',
    books:    'BookTok thrives on emotional reactions and cosy aesthetic.',
    reviews:  'Honest unfiltered reviews with a strong hook drive TikTok engagement.',
    fashion:  'Outfit transitions with trending audio dominate TikTok fashion.',
    fitness:  'Short workout clips and transformation content drive TikTok fitness.',
    food:     'Fast-cut recipe videos under 60s are the dominant TikTok food format.',
    travel:   'Hidden gem reveals and budget travel tips drive TikTok travel.',
    tech:     'Quick demos and hidden feature reveals perform best on TikTok.',
  },
  instagram: {
    skincare: 'Instagram skincare favours carousel routines and aesthetic flat-lays.',
    movies:   'Static rating graphics and aesthetic film stills perform well on IG.',
    quotes:   'Minimal typography carousels are the dominant Instagram quote format.',
    books:    'BookStagram is aesthetic-first — shelf photos and cover art drive follows.',
    reviews:  'Clean product photography with text overlay performs best on IG.',
    fashion:  'OOTD carousels and aesthetic flat-lays drive saves on Instagram.',
    fitness:  'Progress photo carousels and aesthetic gym shots drive IG engagement.',
    food:     'Aesthetic plating and recipe carousels drive saves on Instagram.',
    travel:   'Stunning location aesthetics and travel carousels dominate IG.',
    tech:     'Clean setup photos and spec carousels drive saves on Instagram.',
  },
}

const NO_FACE = {
  skincare: 'Film product close-ups and texture shots. Voiceover-only routines work equally well.',
  movies:   'Use film stills, text overlays, and a distinctive written voice.',
  quotes:   'Handwritten or minimal-typography formats — your aesthetic IS your identity.',
  books:    'Cosy reading flat-lays and page-flip close-ups. The most no-face-friendly niche.',
  reviews:  'B-roll of the product + honest voiceover. No face needed for credibility.',
  fashion:  'Flat-lay outfits and hands-only try-on shots work well without showing face.',
  fitness:  'Focus on form clips from neck down — body transformation content needs no face.',
  food:     'Hands-only cooking process shots are the dominant food content format.',
  travel:   'Scenery and location B-roll — travel content is naturally no-face friendly.',
  tech:     'Product-only B-roll and screen recordings. Tech is fully no-face compatible.',
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  const { niche = 'skincare', noFace = false } = JSON.parse(event.body ?? '{}')
  const cfg = NICHE_MAP[niche]
  if (!cfg) return { statusCode: 400, headers, body: JSON.stringify({ error: `Unknown niche: ${niche}` }) }

  try {
    const [redditData, ytTikTok, ytIG] = await Promise.all([
      fetchReddit(cfg.subreddits, 20),
      fetchYouTube([`${niche} tiktok viral 2025`],   8),
      fetchYouTube([`${niche} instagram reel 2025`], 8),
    ])

    const tkScores = scoreNiche(redditData, ytTikTok)
    const igScores = scoreNiche(redditData, ytIG)
    const bias     = PLATFORM_BIAS[niche] ?? { tiktok: 0, instagram: 0 }

    const tkViral = Math.min(100, tkScores.viralScore + bias.tiktok)
    const igViral = Math.min(100, igScores.viralScore + bias.instagram)
    const better  = tkViral >= igViral ? 'TikTok' : 'Instagram'
    const delta   = Math.abs(tkViral - igViral)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
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
        recommendation: `${better} leads by ${delta} points for ${cfg.label} content. ${delta > 15 ? 'Focus your primary effort here.' : 'Both platforms are viable — cross-post with platform-specific formatting.'}`,
        noFaceStrategy: noFace ? (NO_FACE[niche] ?? 'Both platforms support no-face content well.') : null,
        fetchedAt: new Date().toISOString(),
      }),
    }
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) }
  }
}
