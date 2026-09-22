import {
  fetchReddit, fetchYouTube,
  scoreNiche, extractHashtags, predictViralHashtags,
  extractSoundSignals, predictPostingTimes, NICHE_MAP
} from './_data.js'
import { getCachedScan } from './_mongodb.js'

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Content-Type': 'application/json',
}

const POSTING_TIMES = {
  tiktok: [
    { day: 'Tuesday', time: '09:00', reason: 'Morning commute scroll peak' },
    { day: 'Thursday', time: '12:00', reason: 'Lunch break — highest mid-week traffic' },
    { day: 'Saturday', time: '11:00', reason: 'Weekend leisure browsing starts' },
  ],
  instagram: [
    { day: 'Monday', time: '11:00', reason: 'Start-of-week discovery browsing' },
    { day: 'Wednesday', time: '17:00', reason: 'Post-work wind-down peak' },
    { day: 'Sunday', time: '19:00', reason: 'Sunday evening engagement peak' },
  ],
  youtube: [
    { day: 'Thursday', time: '14:00', reason: 'Upload before weekend — indexing takes hours' },
    { day: 'Friday', time: '12:00', reason: 'Weekend viewing starts Friday afternoon' },
    { day: 'Sunday', time: '10:00', reason: 'Highest average watch time per session' },
  ],
  pinterest: [
    { day: 'Saturday', time: '20:00', reason: 'Weekend planning mode — highest save rate' },
    { day: 'Sunday', time: '21:00', reason: 'Week-ahead planning drives saves' },
    { day: 'Friday', time: '21:00', reason: 'Weekend planning starts Friday evening' },
  ],
}

const FORMAT_MAP = {
  skincare: [
    { format: 'Ingredient deep-dive close-up', why: 'Educational ingredient content drives saves and shares consistently', platform: 'both' },
    { format: 'Morning vs night routine split', why: 'Contrast format drives comments and saves on both platforms', platform: 'both' },
    { format: 'Before and after texture reveal', why: 'Visual proof is the highest-converting skincare format', platform: 'both' },
    { format: 'Product dupe comparison flat-lay', why: 'Budget alternatives drive massive shares across all demographics', platform: 'instagram' },
    { format: '60s routine voiceover fast-cut', why: 'Short routine format dominates TikTok watch-through rate', platform: 'tiktok' },
    { format: 'Dermatologist myth-busting text post', why: 'Authority + controversy drives comment engagement', platform: 'both' },
    { format: 'Seasonal skincare switch carousel', why: 'Timely content gets saved for future reference', platform: 'instagram' },
    { format: 'Packaging aesthetic unboxing', why: 'Unboxing content consistently outperforms standard reviews', platform: 'both' },
  ],
  movies: [
    { format: 'Hot take text-on-screen review', why: 'Controversy drives comments — disagreement is engagement', platform: 'tiktok' },
    { format: 'Hidden gem recommendation list', why: 'Discovery content is the most saved format in movie niche', platform: 'both' },
    { format: 'Ending explained breakdown', why: 'Confusion drives search — explanation content ranks long-term', platform: 'both' },
    { format: 'Aesthetic film still carousel', why: 'Visual storytelling drives saves and follows on Instagram', platform: 'instagram' },
    { format: 'Genre mood board recommendation', why: '"If you liked X watch Y" format has evergreen shareability', platform: 'both' },
    { format: 'Director filmography ranking', why: 'Ranking content drives debate in comments', platform: 'both' },
    { format: 'Underrated vs overhyped comparison', why: 'Binary comparison format drives strong opinion engagement', platform: 'tiktok' },
    { format: 'Monthly watchlist preview graphic', why: 'Recurring format builds audience habit and return visits', platform: 'instagram' },
  ],
  quotes: [
    { format: 'Handwritten quote on paper close-up', why: 'Authenticity of handwriting outperforms digital text consistently', platform: 'tiktok' },
    { format: 'Minimal dark background typography', why: 'High contrast aesthetic drives saves across all demographics', platform: 'instagram' },
    { format: 'Quote with personal 2-line story', why: 'Context adds value beyond text and drives follow conversion', platform: 'both' },
    { format: 'Stoic philosophy quote carousel', why: 'Philosophy niche has highly engaged, save-heavy audience', platform: 'instagram' },
    { format: 'Quote reaction duet or stitch', why: 'Reactive format on TikTok multiplies reach via original creator', platform: 'tiktok' },
    { format: 'Morning affirmation series', why: 'Series format builds return audience and habit-following', platform: 'both' },
    { format: 'Quote paired with nature B-roll', why: 'Visual + text combination increases watch time significantly', platform: 'both' },
    { format: 'Weekly wisdom compilation reel', why: 'Compilation format performs well at end and start of week', platform: 'instagram' },
  ],
  books: [
    { format: 'Emotional reaction to ending', why: 'Emotional hooks are the top BookTok growth driver', platform: 'tiktok' },
    { format: 'Aesthetic shelf organisation video', why: 'Organisation content drives saves and follow for visual appeal', platform: 'both' },
    { format: '"Books that broke me" ranked list', why: 'Emotional ranking format is highest shared in book niche', platform: 'both' },
    { format: 'Reading vlog page flip close-up', why: 'ASMR reading content has dedicated evergreen audience', platform: 'tiktok' },
    { format: 'Book cover aesthetic flat-lay', why: 'Cover aesthetics drive saves and shares on Instagram', platform: 'instagram' },
    { format: 'Genre recommendation by mood', why: 'Mood-based recommendations are highly saved for future reference', platform: 'both' },
    { format: 'Annotated page close-up with caption', why: 'Annotation aesthetic is BookStagram signature format', platform: 'instagram' },
    { format: 'Reading challenge progress update', why: 'Progress content builds parasocial connection and return visits', platform: 'both' },
  ],
  reviews: [
    { format: 'Honest verdict with B-roll product', why: 'Authenticity over polish consistently outperforms branded content', platform: 'tiktok' },
    { format: 'Pros and cons text overlay flat-lay', why: 'Structured review format drives saves for purchase decision', platform: 'instagram' },
    { format: 'Dupe vs original side by side', why: 'Budget comparison format is highest shared review type', platform: 'both' },
    { format: 'Rating scale graphic carousel', why: 'Visual scoring system drives saves and shares', platform: 'instagram' },
    { format: 'One month later follow-up review', why: 'Longevity review fills gap most creators miss — high trust', platform: 'both' },
    { format: 'Worst to best product ranking', why: 'Ranking format drives debate and comment engagement', platform: 'both' },
    { format: 'Unboxing with real-time reaction', why: 'Unfiltered reaction content builds authenticity and trust', platform: 'tiktok' },
    { format: 'Weekly haul overview carousel', why: 'Recurring haul format builds habit audience and return visits', platform: 'instagram' },
  ],
  fashion: [
    { format: 'Outfit transition with beat drop', why: 'Transition format is algorithmically boosted on TikTok', platform: 'tiktok' },
    { format: 'OOTD carousel with item links', why: 'Shoppable carousel is top converting format on Instagram', platform: 'instagram' },
    { format: 'Thrift haul try-on', why: 'Budget fashion content drives highest shares across demographics', platform: 'both' },
    { format: 'Capsule wardrobe flat-lay', why: 'Minimalist wardrobe content is highly saved for planning', platform: 'instagram' },
    { format: 'Style same item 5 ways', why: 'Versatility content drives saves — proves purchase value', platform: 'both' },
    { format: 'Trend vs classic comparison', why: 'Binary fashion debate drives strong comment engagement', platform: 'tiktok' },
    { format: 'Seasonal lookbook reel', why: 'Seasonal content gets saved for future outfit planning', platform: 'both' },
    { format: 'Budget outfit dupe breakdown', why: 'Affordable alternatives consistently outperform luxury content', platform: 'both' },
  ],
  fitness: [
    { format: '30 second exercise form breakdown', why: 'Quick educational format drives saves from beginners', platform: 'tiktok' },
    { format: 'Progress photo transformation carousel', why: 'Transformation content drives the highest engagement in fitness', platform: 'both' },
    { format: 'Full workout no equipment routine', why: 'Accessibility drives shares — no barrier to try content', platform: 'both' },
    { format: 'Common form mistake correction', why: 'Authority correction content drives saves and shares', platform: 'both' },
    { format: 'Weekly training split overview', why: 'Planning content is saved for future programming reference', platform: 'instagram' },
    { format: 'Gym aesthetic B-roll with caption tips', why: 'Aesthetic fitness content dominates Instagram explore', platform: 'instagram' },
    { format: 'Nutrition myth debunked', why: 'Myth-busting drives comment debate and share rate', platform: 'both' },
    { format: 'Challenge result reveal', why: 'Challenge format drives participation and duet engagement', platform: 'tiktok' },
  ],
  food: [
    { format: 'Recipe process fast-cut under 60s', why: 'Fast recipe format is the single highest performing food format', platform: 'tiktok' },
    { format: '3 ingredient recipe hook', why: 'Simplicity drives shares — low barrier to recreate', platform: 'both' },
    { format: 'Aesthetic plating close-up reel', why: 'Food aesthetics consistently drive saves on Instagram', platform: 'instagram' },
    { format: 'Restaurant dupe homemade version', why: 'Cost-saving angle drives massive shares across demographics', platform: 'both' },
    { format: 'Meal prep Sunday routine', why: 'Weekly recurring format builds habit-following audience', platform: 'both' },
    { format: 'Seasonal ingredient spotlight', why: 'Timely content performs well and stays evergreen in search', platform: 'both' },
    { format: 'Food science explanation', why: 'Educational food content drives saves and long-term search traffic', platform: 'both' },
    { format: 'Taste test reaction video', why: 'Reaction format drives entertainment engagement and shares', platform: 'tiktok' },
  ],
  travel: [
    { format: 'Hidden gem location reveal', why: 'Discovery content is the most shared travel format', platform: 'both' },
    { format: 'Budget breakdown for destination', why: 'Cost transparency drives saves from planning travelers', platform: 'both' },
    { format: 'Aesthetic location B-roll reel', why: 'Visual travel content dominates Instagram explore page', platform: 'instagram' },
    { format: 'Travel mistake and lesson format', why: 'Failure content builds trust and drives comment engagement', platform: 'both' },
    { format: 'Packing process flat-lay', why: 'Packing content is saved for future trip planning reference', platform: 'instagram' },
    { format: 'One location multiple moods reel', why: 'Mood-based travel content drives saves and shares', platform: 'both' },
    { format: 'Solo travel safety tips', why: 'Safety content fills a gap and drives high save rate', platform: 'both' },
    { format: 'Local food guide per destination', why: 'Food + travel combo content performs above average on both', platform: 'both' },
  ],
  tech: [
    { format: 'Quick product demo with verdict', why: 'Fast demos with clear conclusions drive saves and shares', platform: 'tiktok' },
    { format: 'Setup aesthetic desk photo', why: 'Workspace aesthetic is a top-saved category on Instagram', platform: 'instagram' },
    { format: 'Hidden feature reveal', why: 'Surprise value drives shares — people want to show others', platform: 'both' },
    { format: 'Spec comparison side by side', why: 'Comparison format helps purchase decisions — high save rate', platform: 'both' },
    { format: 'Productivity tool workflow demo', why: 'Tool tutorials drive long-term search traffic and saves', platform: 'both' },
    { format: 'Budget vs premium comparison', why: 'Value comparison consistently outperforms single reviews', platform: 'both' },
    { format: 'Unboxing with real-time benchmarks', why: 'Real benchmark data builds authority and trust', platform: 'tiktok' },
    { format: 'Tech mistake to avoid list', why: 'Mistake-prevention content drives saves across all tech levels', platform: 'both' },
  ],
  youtube: [
    { format: 'Long-form tutorial or guide', why: 'Educational depth drives watch time and search ranking', platform: 'youtube' },
    { format: 'Listicle — top 5/10 format', why: 'Numbered list titles have highest CTR in YouTube search', platform: 'youtube' },
    { format: 'Comparison video — A vs B', why: 'Comparison intent is one of the highest search volume formats', platform: 'youtube' },
    { format: 'Beginner guide for niche topic', why: 'Beginner content reaches widest audience and ranks long-term', platform: 'youtube' },
    { format: 'Reaction or review with commentary', why: 'Opinion content drives comments and watch-through', platform: 'youtube' },
    { format: 'Weekly or monthly roundup', why: 'Recurring format builds subscriber return rate', platform: 'youtube' },
  ],
  pinterest: [
    { format: 'Vertical infographic 2:3 ratio', why: 'Vertical format fills most Pinterest feed space — more clicks', platform: 'pinterest' },
    { format: 'Step-by-step how-to graphic', why: 'Process content is the most saved format on Pinterest', platform: 'pinterest' },
    { format: 'Mood board aesthetic collage', why: 'Inspiration content drives saves and board adds', platform: 'pinterest' },
    { format: 'Before and after result graphic', why: 'Result-driven visuals drive clicks to source content', platform: 'pinterest' },
    { format: 'Seasonal checklist printable', why: 'Timely actionable content is pinned and repinned seasonally', platform: 'pinterest' },
    { format: 'Quote card with source branding', why: 'Branded quote cards drive traffic back to your profile', platform: 'pinterest' },
  ],
  wellness: [
    { format: 'Morning routine breakdown', why: 'Routine content drives saves for personal habit planning', platform: 'both' },
    { format: 'Mental health tip of the day', why: 'Daily series format builds return audience and habit-following', platform: 'both' },
    { format: 'Anxiety coping technique demo', why: 'Practical technique content is highly saved and shared', platform: 'both' },
    { format: 'Journaling prompt carousel', why: 'Prompt content drives saves — audience uses it directly', platform: 'instagram' },
    { format: 'Breathwork exercise walkthrough', why: 'Interactive technique content drives save rate', platform: 'both' },
    { format: 'Self care Sunday routine reel', why: 'Weekend routine content peaks on Sunday evenings consistently', platform: 'both' },
    { format: 'Burnout signs awareness list', why: 'Awareness content drives shares — people tag others who need it', platform: 'both' },
    { format: 'Gratitude practice guide', why: 'Positive practice content is saved for personal use', platform: 'instagram' },
  ],
  pets: [
    { format: 'Cute moment candid clip', why: 'Authentic pet moments consistently outperform staged content', platform: 'tiktok' },
    { format: 'Training tip demonstration', why: 'Practical training content drives saves from new pet owners', platform: 'both' },
    { format: 'Pet product honest review', why: 'Pet product reviews are highly trusted and saved by owners', platform: 'both' },
    { format: 'Day in the life pet vlog', why: 'Routine content builds parasocial bond with pet personality', platform: 'both' },
    { format: 'Pet myth debunked', why: 'Correction content drives shares — owners want to know truth', platform: 'both' },
    { format: 'Breed spotlight comparison', why: 'Breed content drives engagement from specific breed communities', platform: 'instagram' },
    { format: 'Rescue story before and after', why: 'Emotional rescue content drives the highest share rate in pets', platform: 'both' },
    { format: 'Pet health tip carousel', why: 'Health information is saved for reference by responsible owners', platform: 'instagram' },
  ],
  gaming: [
    { format: 'Clip of unexpected moment', why: 'Surprise clips drive fastest shares in gaming content', platform: 'tiktok' },
    { format: 'Hidden mechanic tutorial', why: 'Secret/hidden content drives shares — people want to tell others', platform: 'both' },
    { format: 'Game recommendation by genre mood', why: 'Mood-based game picks are saved for future purchase reference', platform: 'both' },
    { format: 'Beginner tips for popular game', why: 'Beginner content has the widest audience reach in gaming', platform: 'both' },
    { format: 'Aesthetic game screenshot carousel', why: 'Visual game art drives saves and engagement on Instagram', platform: 'instagram' },
    { format: 'Game comparison value breakdown', why: 'Value comparison helps purchase decisions — high save rate', platform: 'both' },
    { format: 'Speedrun or challenge attempt', why: 'Challenge content drives watch-through rate and comment debate', platform: 'tiktok' },
    { format: 'Underrated game spotlight', why: 'Discovery recommendation content drives high shares in gaming', platform: 'both' },
  ],
  art: [
    { format: 'Time-lapse creation process', why: 'Process content is the top performing format in art niche', platform: 'both' },
    { format: 'Before and after artwork reveal', why: 'Reveal format drives watch-through and saves consistently', platform: 'both' },
    { format: 'Art supply honest review', why: 'Tool reviews drive saves from artists seeking new supplies', platform: 'both' },
    { format: 'Style challenge same subject', why: 'Style variation challenges drive engagement and participation', platform: 'both' },
    { format: 'Commission process walkthrough', why: 'Commission transparency builds trust and drives new clients', platform: 'both' },
    { format: 'Color palette inspiration carousel', why: 'Color content is highly saved for creative reference', platform: 'instagram' },
    { format: 'Beginner art mistake to avoid', why: 'Mistake-prevention content reaches widest beginner audience', platform: 'both' },
    { format: 'Sketchbook flip-through reel', why: 'Sketchbook content builds personal brand and artistic identity', platform: 'both' },
  ],
  finance: [
    { format: 'One tip that saved money', why: 'Single actionable tip drives shares — low friction to consume', platform: 'tiktok' },
    { format: 'Budget breakdown carousel', why: 'Visual budgets are saved for personal financial planning', platform: 'instagram' },
    { format: 'Investment myth debunked', why: 'Myth-busting finance content drives comment debate and shares', platform: 'both' },
    { format: 'Side hustle income report', why: 'Income transparency drives highest engagement in finance niche', platform: 'both' },
    { format: 'Money mistake to avoid', why: 'Mistake-prevention content drives saves across all income levels', platform: 'both' },
    { format: 'Beginner investing explained simply', why: 'Simplification content reaches widest possible audience', platform: 'both' },
    { format: 'Savings challenge progress update', why: 'Challenge progress builds accountability audience', platform: 'both' },
    { format: 'Paycheck allocation breakdown', why: 'Practical allocation content is saved for personal use', platform: 'instagram' },
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
    const cached = await getCachedScan(niche)
    let redditData = cached?.reddit
    let ytVideos   = cached?.youtube

    if (!redditData || !ytVideos) {
      const [rData, yVids] = await Promise.all([
        fetchReddit(cfg.subreddits, 25),
        fetchYouTube(cfg.ytQueries, 10),
      ])
      redditData = rData
      ytVideos   = yVids
    }

    const titledPosts = []
    for (const { posts } of redditData) {
      for (const p of posts) titledPosts.push({ text: p.title, ts: p.created_utc * 1000 })
    }
    for (const v of ytVideos) {
      titledPosts.push({ text: v.title, ts: new Date(v.published).getTime() })
    }

    const scores = scoreNiche(redditData, ytVideos)
    const rawTags = extractHashtags(titledPosts, niche)
    const predicted = predictViralHashtags(rawTags, niche)
    const emerging = predicted.filter(h => h.trend === 'emerging').slice(0, 3)

    const rawFormats = FORMAT_MAP[niche] ?? FORMAT_MAP.reviews
    const filteredFormats = rawFormats.filter(f => platform === 'both' || f.platform === platform || f.platform === 'both')
    const formats = noFace
      ? filteredFormats
      : filteredFormats.map(f => ({ ...f, why: f.why.replace('No face needed — ', '').replace('no face needed', '').replace('No face, ', '') }))

    // Predict posting times from actual data
    const predictedTimes = predictPostingTimes(redditData, ytVideos)

    // Merge predicted slots into platform-specific structure
    const buildSlots = (platformKey) => ({
      predicted: predictedTimes.predicted,
      message: predictedTimes.message,
      slots: predictedTimes.slots,
      topDays: predictedTimes.topDays,
      topHours: predictedTimes.topHours,
      static: POSTING_TIMES[platformKey] ?? POSTING_TIMES.tiktok,
    })

    const postingTimes = platform === 'both'
      ? {
        tiktok: buildSlots('tiktok'),
        instagram: buildSlots('instagram'),
        youtube: buildSlots('youtube'),
        pinterest: buildSlots('pinterest'),
      }
      : { [platform]: buildSlots(platform) }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        viralScore: scores.viralScore,
        scores: {
          virality: scores.viralScore,
          engagement: scores.engagement,
          longevity: scores.longevity,
          reach: scores.reach,
          competition: scores.competition,
        },
        hashtags: predicted.slice(0, 12).map(h => ({
          tag: h.tag,
          score: `${h.viralProb}% viral prob`,
          trend: h.trend,
        })),
        sounds: extractSoundSignals(titledPosts, niche),
        formats,
        postingTimes,
        prediction: {
          summary: `${cfg.label} content shows ${scores.risingCount} rising signals from ${scores.totalPosts} active posts. ${emerging.length > 0 ? `Emerging: ${emerging.map(t => '#' + t.tag).join(', ')}.` : 'Stable engagement.'} Best window: next 48 hours.`,
          signals: emerging.length ? emerging.map(h => `#${h.tag} emerging (${h.viralProb}% viral prob)`) : [`${niche} content is in steady demand`],
        },
        fetchedAt: new Date().toISOString(),
        totalSources: titledPosts.length,
      }),
    }
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) }
  }
}
