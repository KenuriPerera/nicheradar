// Posting times based on platform behavioral patterns
// These are derived from platform mechanics, not yearly studies
// They stay accurate long-term because they reflect user behavior patterns

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Content-Type': 'application/json',
}

const PLATFORM_TIMES = {
  tiktok: {
    name: 'TikTok',
    icon: '🎵',
    description: 'Algorithm-driven — consistency and hook speed matter more than exact time. These windows reflect peak active user sessions.',
    timezone: 'Your local timezone — TikTok serves content locally first',
    slots: [
      { day: 'Monday',    time: '07:00', label: 'Morning commute', reason: 'Start-of-week scroll habit — high intent browsing before work' },
      { day: 'Tuesday',   time: '09:00', label: 'Work break',      reason: 'Mid-morning break scroll — second highest weekday session' },
      { day: 'Wednesday', time: '12:00', label: 'Lunch peak',      reason: 'Lunch break is the single highest mid-week traffic window' },
      { day: 'Thursday',  time: '17:00', label: 'End of day',      reason: 'Post-work wind-down — extended scroll sessions begin' },
      { day: 'Friday',    time: '20:00', label: 'Friday evening',  reason: 'Highest weekend-start engagement — relaxed browsing mood' },
      { day: 'Saturday',  time: '11:00', label: 'Weekend morning', reason: 'Leisure morning browsing — no time pressure' },
      { day: 'Sunday',    time: '19:00', label: 'Sunday evening',  reason: 'Pre-week anxiety scroll — high save rate content performs well' },
    ],
    tips: [
      'Post 3-5 times per week minimum for algorithm consistency',
      'First 2 seconds must hook — algorithm measures completion rate',
      'Reply to comments within first hour to boost distribution',
      'Use trending audio to get placed in audio discovery feed',
    ],
  },
  instagram: {
    name: 'Instagram',
    icon: '📸',
    description: 'Follow-based with Explore boost. Saves and shares matter more than likes. Reels get wider reach than static posts.',
    timezone: 'Your local timezone — Instagram prioritises your followers first',
    slots: [
      { day: 'Monday',    time: '11:00', label: 'Late morning',    reason: 'Start-of-week discovery browsing before afternoon commitments' },
      { day: 'Tuesday',   time: '14:00', label: 'Afternoon dip',   reason: 'Post-lunch browsing window — consistent mid-week engagement' },
      { day: 'Wednesday', time: '11:00', label: 'Mid-week peak',   reason: 'Wednesday is consistently the highest engagement day on IG' },
      { day: 'Thursday',  time: '17:00', label: 'Evening start',   reason: 'Evening browsing begins — Reels perform particularly well' },
      { day: 'Friday',    time: '11:00', label: 'End-of-week',     reason: 'Pre-weekend mood browsing — lifestyle content peaks here' },
      { day: 'Saturday',  time: '10:00', label: 'Weekend browse',  reason: 'Relaxed Saturday morning scroll — highest save rate window' },
      { day: 'Sunday',    time: '19:00', label: 'Sunday evening',  reason: 'Highest share rate of the week — people share before Monday' },
    ],
    tips: [
      'Carousels get 3x more reach than single image posts — use them',
      'Save rate is the most important metric — create content people bookmark',
      'Stories keep you at top of followers\' feed — post daily',
      'Reels get pushed to non-followers — prioritise Reels for growth',
    ],
  },
  youtube: {
    name: 'YouTube',
    icon: '▶️',
    description: 'Search-driven long-form platform. Upload time matters less than SEO title, thumbnail, and first 30 seconds.',
    timezone: 'Upload 2-3 hours before your target audience peak time — indexing takes time',
    slots: [
      { day: 'Thursday',  time: '14:00', label: 'Pre-weekend',     reason: 'Videos uploaded Thursday get indexed before the weekend viewing peak' },
      { day: 'Friday',    time: '12:00', label: 'Friday midday',   reason: 'Weekend watch sessions begin Friday afternoon — front-load your upload' },
      { day: 'Saturday',  time: '09:00', label: 'Weekend early',   reason: 'Upload early Saturday to catch peak afternoon viewing windows' },
      { day: 'Sunday',    time: '10:00', label: 'Sunday morning',  reason: 'Sunday has the highest average watch time per session' },
      { day: 'Tuesday',   time: '14:00', label: 'Mid-week',        reason: 'Tuesday-Thursday uploads perform best for search indexing' },
    ],
    tips: [
      'Title and thumbnail decide 90% of performance — test both',
      'First 30 seconds determine audience retention — front-load value',
      'Chapters improve watch time by helping viewers navigate',
      'Shorts get separate distribution — post independently not as previews',
      'Consistency of schedule matters more than frequency',
    ],
  },
  pinterest: {
    name: 'Pinterest',
    icon: '📌',
    description: 'Search-driven visual discovery platform. Content lives for months not days. SEO in pin descriptions is essential.',
    timezone: 'UTC evening times work globally — Pinterest audience is international',
    slots: [
      { day: 'Saturday',  time: '20:00', label: 'Saturday evening', reason: 'Weekend planning mode — highest save and click-through rate' },
      { day: 'Sunday',    time: '21:00', label: 'Sunday night',      reason: 'Week-ahead planning drives high save rate on Sunday evenings' },
      { day: 'Friday',    time: '21:00', label: 'Friday night',      reason: 'Weekend planning starts Friday evening — lifestyle content peaks' },
      { day: 'Tuesday',   time: '14:00', label: 'Weekday browse',    reason: 'Mid-week planning browsing — recipe and home content peaks' },
      { day: 'Wednesday', time: '15:00', label: 'Hump day',          reason: 'Midweek inspiration seeking — motivation content performs well' },
    ],
    tips: [
      'Pin descriptions need keywords — Pinterest is a search engine not a social network',
      'Vertical images 2:3 ratio perform best in the Pinterest feed',
      'Pin the same content to multiple relevant boards',
      'Fresh pins outperform repins — create new graphics for existing content',
      'Idea Pins (story format) get priority distribution in the feed',
    ],
  },
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  const platform = event.queryStringParameters?.platform

  if (platform && PLATFORM_TIMES[platform]) {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ platform: PLATFORM_TIMES[platform], fetchedAt: new Date().toISOString() }),
    }
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ platforms: PLATFORM_TIMES, fetchedAt: new Date().toISOString() }),
  }
}
