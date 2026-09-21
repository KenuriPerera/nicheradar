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

// Fetch one niche with timeout
async function fetchNicheData(niche) {
  const cfg = NICHE_MAP[niche]
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('timeout')), 10000)
  )
  try {
    const [redditData, ytVideos] = await Promise.race([
      Promise.all([
        fetchReddit(cfg.subreddits.slice(0, 1), 10),
        fetchYouTube(cfg.ytQueries.slice(0, 1), 3),
      ]),
      timeout
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
    return {
      niche,
      label:        cfg.label,
      icon:         cfg.icon,
      viralScore:   scores.viralScore,
      engagement:   scores.engagement,
      reach:        scores.reach,
      longevity:    scores.longevity,
      competition:  scores.competition,
      totalPosts:   scores.totalPosts,
      risingCount:  scores.risingCount,
      hashtags:     predicted.slice(0, 8),
      emerging:     predicted.filter(h => h.trend === 'emerging'),
      topTag:       predicted[0]?.tag ?? null,
      topTagProb:   predicted[0]?.viralProb ?? 0,
    }
  } catch {
    return {
      niche, label: cfg.label, icon: cfg.icon,
      viralScore: 0, engagement: 0, reach: 0,
      longevity: 0, competition: 0, totalPosts: 0,
      risingCount: 0, hashtags: [], emerging: [],
      topTag: null, topTagProb: 0,
    }
  }
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  // Fetch all niches in batches of 2
  const allData = []
  const BATCH = 2
  for (let i = 0; i < NICHE_KEYS.length; i += BATCH) {
    const batch = NICHE_KEYS.slice(i, i + BATCH)
    const done  = await Promise.all(batch.map(fetchNicheData))
    allData.push(...done)
  }

  const valid = allData.filter(n => n.viralScore > 0)

  // ── 1. Momentum Ranking ────────────────────────────────────────────────
  const momentumRanking = [...allData]
    .sort((a, b) => {
      // Rising count weighted by viral score
      const scoreA = (a.risingCount * 2 + a.emerging.length * 3) * (a.viralScore / 100 + 0.1)
      const scoreB = (b.risingCount * 2 + b.emerging.length * 3) * (b.viralScore / 100 + 0.1)
      return scoreB - scoreA
    })
    .map((n, i) => ({
      rank:        i + 1,
      niche:       n.niche,
      label:       n.label,
      icon:        n.icon,
      viralScore:  n.viralScore,
      risingCount: n.risingCount,
      emerging:    n.emerging.length,
      momentum:    Math.min(100, Math.round(
        (n.risingCount * 2 + n.emerging.length * 3) * (n.viralScore / 100 + 0.1) * 10
      )),
      trend: n.risingCount > 2 ? 'rising'
           : n.viralScore  > 40 ? 'stable'
           : 'cooling',
    }))

  // ── 2. Cross-Niche Signals ─────────────────────────────────────────────
  // Find hashtags/topics appearing in multiple niches
  const tagMap = {}
  for (const n of allData) {
    for (const h of n.hashtags) {
      if (!tagMap[h.tag]) tagMap[h.tag] = { tag: h.tag, niches: [], totalProb: 0, maxProb: 0 }
      tagMap[h.tag].niches.push({ niche: n.niche, label: n.label, icon: n.icon, prob: h.viralProb })
      tagMap[h.tag].totalProb += h.viralProb
      tagMap[h.tag].maxProb   = Math.max(tagMap[h.tag].maxProb, h.viralProb)
    }
  }
  const crossNicheSignals = Object.values(tagMap)
    .filter(t => t.niches.length >= 2)
    .sort((a, b) => (b.niches.length * 10 + b.maxProb) - (a.niches.length * 10 + a.maxProb))
    .slice(0, 10)
    .map(t => ({
      tag:         t.tag,
      nicheCount:  t.niches.length,
      niches:      t.niches.slice(0, 4),
      avgProb:     Math.round(t.totalProb / t.niches.length),
      maxProb:     t.maxProb,
      crossSignal: t.niches.length >= 4 ? 'viral' : t.niches.length >= 3 ? 'strong' : 'emerging',
    }))

  // ── 3. Opportunity Finder ──────────────────────────────────────────────
  // Low competition + high trend momentum = best opportunity
  const opportunities = [...allData]
    .filter(n => n.viralScore > 0)
    .map(n => {
      // Opportunity = high viral + low competition + emerging tags
      const competitionScore = 100 - n.competition
      const emergingBonus    = n.emerging.length * 5
      const opportunity      = Math.min(100, Math.round(
        (n.viralScore * 0.4) + (competitionScore * 0.4) + emergingBonus
      ))
      const reason = opportunity >= 70
        ? `High demand, lower competition — prime window to post ${n.label} content`
        : opportunity >= 50
        ? `Moderate opportunity — consistent engagement with room to grow`
        : `Saturated or low activity — consider a different angle`
      return {
        niche:       n.niche,
        label:       n.label,
        icon:        n.icon,
        opportunity,
        viralScore:  n.viralScore,
        competition: n.competition,
        emerging:    n.emerging.length,
        topTag:      n.topTag,
        topTagProb:  n.topTagProb,
        reason,
        action: n.emerging.length > 0
          ? `Post now using #${n.emerging[0]?.tag} — emerging signal detected`
          : `Use #${n.topTag ?? n.niche} — strongest current hashtag`,
      }
    })
    .sort((a, b) => b.opportunity - a.opportunity)

  // ── 4. Overall Intelligence Summary ───────────────────────────────────
  const topNiche      = momentumRanking[0]
  const topOpportunity = opportunities[0]
  const topCross      = crossNicheSignals[0]
  const avgViral      = valid.length
    ? Math.round(valid.reduce((s, n) => s + n.viralScore, 0) / valid.length)
    : 0

  const summary = {
    avgViralScore:    avgViral,
    hotNiche:         topNiche?.label ?? '—',
    hotNicheIcon:     topNiche?.icon  ?? '',
    bestOpportunity:  topOpportunity?.label ?? '—',
    bestOpportunityIcon: topOpportunity?.icon ?? '',
    crossSignalCount: crossNicheSignals.length,
    topCrossTag:      topCross?.tag ?? null,
    totalNiches:      NICHE_KEYS.length,
    activeNiches:     valid.length,
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      summary,
      momentumRanking,
      crossNicheSignals,
      opportunities,
      fetchedAt: new Date().toISOString(),
    }),
  }
}
