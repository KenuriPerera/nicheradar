import {
  fetchReddit, fetchYouTube,
  scoreNiche, extractHashtags, predictViralHashtags,
  NICHE_MAP
} from './_data.js'

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Content-Type': 'application/json',
}

const POSTING_TIMES = {
  tiktok: [
    { day: 'Tuesday',  time: '09:00', reason: 'Morning commute scroll peak' },
    { day: 'Thursday', time: '12:00', reason: 'Lunch break peak' },
    { day: 'Saturday', time: '11:00', reason: 'Weekend browsing starts' },
  ],
  instagram: [
    { day: 'Monday',    time: '11:00', reason: 'Start-of-week discovery' },
    { day: 'Wednesday', time: '17:00', reason: 'Post-work wind-down' },
    { day: 'Sunday',    time: '19:00', reason: 'Sunday evening peak' },
  ],
}

const FORMAT_MAP = {
  skincare: [
    { format: 'Ingredient close-up + voiceover',    why: 'No face needed — product is the star',          platform: 'tiktok'    },
    { format: 'Before/after skin texture carousel', why: 'Carousel saves perform 2x better on IG',        platform: 'instagram' },
    { format: 'Routine flat-lay with text overlay', why: 'Aesthetic + educational = strong saves',         platform: 'both'      },
  ],
  movies: [
    { format: 'Hot take text-on-screen review',  why: 'Controversy drives comments on TikTok',         platform: 'tiktok'    },
    { format: 'Aesthetic still + rating graphic', why: 'Shareable and save-worthy on IG',               platform: 'instagram' },
    { format: 'Hidden gem listicle video',        why: 'Top 5 format drives shares on both',            platform: 'both'      },
  ],
  quotes: [
    { format: 'Handwritten quote + ambient music', why: 'Authenticity drives saves on TikTok',          platform: 'tiktok'    },
    { format: 'Minimal typography carousel',       why: 'Share-to-story is biggest quote driver on IG', platform: 'instagram' },
    { format: 'Quote + personal 1-line context',   why: 'Adds value beyond text = more follows',        platform: 'both'      },
  ],
  books: [
    { format: 'Reading vlog — hands + pages only', why: 'Cosy aesthetic, no face needed for BookTok',  platform: 'tiktok'    },
    { format: 'Shelf aesthetic + title reveal',    why: 'BookStagram thrives on aesthetics + saves',    platform: 'instagram' },
    { format: '"Books that broke me" list',        why: 'Emotional hooks = highest share rate',         platform: 'both'      },
  ],
  reviews: [
    { format: 'Product B-roll + honest voiceover', why: 'No face, high trust on TikTok',               platform: 'tiktok'    },
    { format: 'Flat-lay + pros/cons text overlay', why: 'Clean saves-driver for IG',                    platform: 'instagram' },
    { format: 'Dupe comparison side-by-side',      why: 'High share rate on both platforms',            platform: 'both'      },
  ],
  fashion: [
    { format: 'Outfit transition + trending audio', why: 'Transitions are top format on TikTok',        platform: 'tiktok'    },
    { format: 'OOTD carousel flat-lay',             why: 'Saves-heavy format on IG',                    platform: 'instagram' },
    { format: 'Thrift haul video',                  why: 'Budget content drives high shares on both',   platform: 'both'      },
  ],
  fitness: [
    { format: 'Workout form clip + caption tips',   why: 'Educational clips drive saves on TikTok',     platform: 'tiktok'    },
    { format: 'Progress photo carousel',            why: 'Transformation content saves well on IG',     platform: 'instagram' },
    { format: 'Quick 60s routine no equipment',     why: 'Accessibility drives shares on both',         platform: 'both'      },
  ],
  food: [
    { format: 'Recipe process fast-cut video',     why: 'Fast recipe cuts are top food format on TikTok', platform: 'tiktok'    },
    { format: 'Aesthetic plating carousel',         why: 'Food aesthetics drive saves on IG',              platform: 'instagram' },
    { format: '3-ingredient recipe hook',           why: 'Simple + shareable works on both',               platform: 'both'      },
  ],
  travel: [
    { format: 'Hidden gem location reveal',        why: 'Discovery content drives shares on TikTok',    platform: 'tiktok'    },
    { format: 'Aesthetic location carousel',        why: 'Travel aesthetics are top saves on IG',        platform: 'instagram' },
    { format: 'Budget travel tips voiceover',       why: 'Useful content drives shares on both',         platform: 'both'      },
  ],
  tech: [
    { format: 'Quick product demo + verdict',      why: 'Fast reviews perform best on TikTok',          platform: 'tiktok'    },
    { format: 'Setup aesthetic photo + specs',      why: 'Tech setups drive saves on IG',                platform: 'instagram' },
    { format: 'Hidden feature reveal',              why: 'Surprise value drives shares on both',         platform: 'both'      },
  ],
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  const { niche = 'skincare', platform = 'both', noFace = false } = JSON.parse(event.body ?? '{}')
  const cfg = NICHE_MAP[niche]
  if (!cfg) return { statusCode: 400, headers, body: JSON.stringify({ error: `Unknown niche: ${niche}` }) }

  try {
    const [redditData, ytVideos] = await Promise.all([
      fetchReddit(cfg.subreddits, 25),
      fetchYouTube(cfg.ytQueries,  10),
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
    const emerging  = predicted.filter(h => h.trend === 'emerging').slice(0, 3)

    const rawFormats = FORMAT_MAP[niche] ?? FORMAT_MAP.reviews
    const filteredFormats = rawFormats.filter(f => platform === 'both' || f.platform === platform || f.platform === 'both')
    const formats = noFace
      ? filteredFormats
      : filteredFormats.map(f => ({ ...f, why: f.why.replace('No face needed — ', '').replace('no face needed', '').replace('No face, ', '') }))

    const postingTimes = platform === 'tiktok'
      ? { tiktok: POSTING_TIMES.tiktok }
      : platform === 'instagram'
      ? { instagram: POSTING_TIMES.instagram }
      : POSTING_TIMES

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        viralScore: scores.viralScore,
        scores: {
          virality:    scores.viralScore,
          engagement:  scores.engagement,
          longevity:   scores.longevity,
          reach:       scores.reach,
          competition: scores.competition,
        },
        hashtags: predicted.slice(0, 12).map(h => ({
          tag:   h.tag,
          score: `${h.viralProb}% viral prob`,
          trend: h.trend,
        })),
        sounds: [
          { name: `Trending ${niche} audio`, usageCount: '240K', trend: 'rising' },
          { name: 'Ambient lo-fi background',  usageCount: '890K', trend: 'peak'   },
        ],
        formats,
        postingTimes,
        prediction: {
          summary: `${cfg.label} content shows ${scores.risingCount} rising signals from ${scores.totalPosts} active posts. ${emerging.length > 0 ? `Emerging: ${emerging.map(t => '#' + t.tag).join(', ')}.` : 'Stable engagement.'} Best window: next 48 hours.`,
          signals: emerging.length ? emerging.map(h => `#${h.tag} emerging (${h.viralProb}% viral prob)`) : [`${niche} content is in steady demand`],
        },
        fetchedAt:    new Date().toISOString(),
        totalSources: titledPosts.length,
      }),
    }
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) }
  }
}
