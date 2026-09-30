import { fetchYouTube, fetchNewsAPI } from './_data.js'

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Content-Type': 'application/json',
}

const GEMINI_MODEL = 'gemini-3.8-flash'

// LKR exchange rate — fetched live from frankfurter
async function getLKRRate() {
  try {
    const res  = await fetch('https://api.frankfurter.app/latest?from=USD&to=LKR')
    const data = await res.json()
    return data.rates?.LKR ?? 330
  } catch {
    return 330 // fallback rate
  }
}

// Fetch Google Trends via SerpAPI
async function fetchGoogleTrends(query) {
  const key = process.env.SERPAPI_KEY
  if (!key) return null
  try {
    const url = `https://serpapi.com/search.json?engine=google_trends&q=${encodeURIComponent(query)}&data_type=TIMESERIES&api_key=${key}`
    const res  = await fetch(url)
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

// Fetch Etsy-related signals via SerpAPI Google Shopping
async function fetchEtsySignals(query) {
  const key = process.env.SERPAPI_KEY
  if (!key) return []
  try {
    const url = `https://serpapi.com/search.json?engine=google_shopping&q=${encodeURIComponent(query + ' stationery')}&api_key=${key}&num=10`
    const res  = await fetch(url)
    if (!res.ok) return []
    const data = await res.json()
    return (data.shopping_results ?? []).slice(0, 8).map(r => ({
      title:    r.title,
      price:    r.price,
      source:   r.source,
      rating:   r.rating,
      reviews:  r.reviews,
      link:     r.link,
    }))
  } catch {
    return []
  }
}

// Stop words for phrase extraction
const STOP = new Set([
  'the','a','an','and','or','but','in','on','at','to','for','of',
  'with','by','from','is','are','was','be','have','do','will',
  'this','that','it','i','you','we','they','new','best','top',
  'how','what','why','when','my','your','our','get','make','buy',
  'shop','sale','free','review','reviews','2025','2026','video',
  'watch','haul','collection','unboxing','setup','tour','flip',
])

// Extract meaningful phrases from titles
function extractPhrases(titles) {
  const map = {}
  for (const title of titles) {
    const words = title.toLowerCase()
      .replace(/[^a-z\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 3 && !STOP.has(w))

    // Unigrams
    for (const w of words) {
      map[w] = (map[w] ?? 0) + 1
    }
    // Bigrams
    for (let i = 0; i < words.length - 1; i++) {
      const p = `${words[i]} ${words[i+1]}`
      map[p] = (map[p] ?? 0) + 1
    }
    // Trigrams
    for (let i = 0; i < words.length - 2; i++) {
      const p = `${words[i]} ${words[i+1]} ${words[i+2]}`
      map[p] = (map[p] ?? 0) + 1
    }
  }
  return map
}

// Detect product category from phrase
function detectCategory(phrase) {
  const p = phrase.toLowerCase()
  if (/journal|notebook|diary/.test(p))           return { cat: 'Journals & Notebooks',    icon: '📓' }
  if (/planner|schedule|calendar|organis/.test(p)) return { cat: 'Planning',                icon: '📅' }
  if (/pen|pencil|marker|highlighter|ink/.test(p)) return { cat: 'Pens & Markers',          icon: '✒️'  }
  if (/sticker|washi|tape|seal|stamp/.test(p))     return { cat: 'Decorative',              icon: '🎀' }
  if (/digital|notion|template|printable/.test(p)) return { cat: 'Digital Products',        icon: '💻' }
  if (/bag|pouch|case|organiser/.test(p))          return { cat: 'Storage & Organisation',  icon: '🗂️' }
  if (/clip|binder|folder|divider/.test(p))        return { cat: 'Filing & Binding',        icon: '📁' }
  return { cat: 'Stationery General', icon: '✏️' }
}

// Detect trajectory from frequency + source diversity
function detectTrajectory(freq, sources) {
  if (freq >= 8 && sources >= 3) return 'explosive'
  if (freq >= 5 && sources >= 2) return 'rising fast'
  if (freq >= 3 && sources >= 2) return 'gaining traction'
  if (freq >= 2)                 return 'emerging'
  return 'early signal'
}

// Detect customer base from signal context
function detectCustomerBase(phrase, titles) {
  const text = titles.join(' ').toLowerCase()
  const bases = []
  if (/student|study|school|university|college|exam/.test(text))  bases.push('Students')
  if (/office|work|professional|business|corporate/.test(text))   bases.push('Professionals')
  if (/journal|mindful|self care|wellness|mental/.test(text))     bases.push('Wellness seekers')
  if (/art|creative|design|illustration|draw/.test(text))        bases.push('Creatives')
  if (/gift|present|birthday|christmas|holiday/.test(text))      bases.push('Gift buyers')
  if (/bullet|bujo|planner|organis|productive/.test(text))       bases.push('Planners & organizers')
  if (/aesthetic|cute|kawaii|pastel|cottage/.test(text))         bases.push('Aesthetic enthusiasts')
  if (bases.length === 0) bases.push('General stationery lovers')
  return bases.slice(0, 3)
}

// Estimate pricing in LKR and USD
function estimatePricing(phrase, lkrRate, shoppingResults) {
  // Try to extract price from shopping results first
  const relevant = shoppingResults.filter(r =>
    r.title?.toLowerCase().includes(phrase.split(' ')[0])
  )

  let usdMin = 5
  let usdMax = 25

  if (relevant.length > 0) {
    const prices = relevant
      .map(r => parseFloat(r.price?.replace(/[^0-9.]/g, '') ?? '0'))
      .filter(p => p > 0)
    if (prices.length > 0) {
      usdMin = Math.min(...prices)
      usdMax = Math.max(...prices)
    }
  } else {
    // Estimate by category
    const p = phrase.toLowerCase()
    if (/digital|template|printable/.test(p)) { usdMin = 3;  usdMax = 20  }
    else if (/journal|notebook/.test(p))       { usdMin = 12; usdMax = 40  }
    else if (/pen|marker/.test(p))             { usdMin = 8;  usdMax = 30  }
    else if (/sticker|washi/.test(p))          { usdMin = 4;  usdMax = 15  }
    else if (/planner/.test(p))                { usdMin = 15; usdMax = 45  }
  }

  const lkrMin     = Math.round(usdMin * lkrRate)
  const lkrMax     = Math.round(usdMax * lkrRate)

  // Sri Lanka market pricing — local consumers pay less
  // Import cost estimate (for physical items)
  const importCostUSD  = phrase.toLowerCase().includes('digital') ? 0 : usdMin * 0.4
  const importCostLKR  = Math.round(importCostUSD * lkrRate)

  // Selling price in Sri Lanka market
  const slSellingLKR   = Math.round(lkrMin * 0.7) // SL market ~30% lower than USD equiv
  const slSellingMax   = Math.round(lkrMax * 0.6)

  // Profit margin
  const profitLKR      = slSellingLKR - importCostLKR
  const marginPct      = importCostLKR > 0
    ? Math.round((profitLKR / slSellingLKR) * 100)
    : 85 // digital products = ~85% margin

  return {
    global: {
      usd:    `$${usdMin.toFixed(0)}–$${usdMax.toFixed(0)}`,
      lkr:    `Rs ${lkrMin.toLocaleString()}–Rs ${lkrMax.toLocaleString()}`,
    },
    sriLanka: {
      importCost:   importCostLKR > 0 ? `Rs ${importCostLKR.toLocaleString()}` : 'N/A (digital)',
      sellingPrice: `Rs ${slSellingLKR.toLocaleString()}–Rs ${slSellingMax.toLocaleString()}`,
      profitMargin: `${marginPct}%`,
      marginLabel:  marginPct >= 70 ? 'very high' : marginPct >= 50 ? 'high' : marginPct >= 30 ? 'medium' : 'low',
      bestChannel:  phrase.toLowerCase().includes('digital')
        ? 'Gumroad / Payhip (digital download)'
        : 'Instagram DM / Etsy / local markets',
    },
  }
}

// Generate content angles
function generateAngles(phrase) {
  return [
    `Unboxing and reviewing ${phrase} — honest thoughts`,
    `${phrase} setup for my study desk`,
    `Best ${phrase} under Rs 2000 — Sri Lanka edition`,
    `I tried ${phrase} for 30 days`,
    `${phrase} haul — what I got and is it worth it`,
  ]
}

// Generate hashtags
function generateHashtags(phrase, category) {
  const base = phrase.replace(/\s+/g, '')
  const cat  = category.replace(/\s+/g, '').toLowerCase()
  return [
    base, `${base}lover`, `${base}aesthetic`,
    cat, 'stationeryaddict', 'stationerylover',
    'stationeryhaul', 'studygram', 'bulletjournal',
    'stationerysrilanka',
  ].map(t => t.replace(/[^a-z0-9]/g, '')).slice(0, 8)
}

// Market growth timeline based on signal recency
function buildTimeline(phrase, ytItems, newsItems) {
  const allItems = [
    ...ytItems.map(v => ({ date: v.published, source: 'YouTube' })),
    ...newsItems.map(a => ({ date: a.publishedAt, source: 'News' })),
  ]
  .filter(i => i.date)
  .sort((a, b) => new Date(a.date) - new Date(b.date))

  if (allItems.length === 0) return []

  const byMonth = {}
  for (const item of allItems) {
    const month = item.date.slice(0, 7) // YYYY-MM
    byMonth[month] = (byMonth[month] ?? 0) + 1
  }

  return Object.entries(byMonth)
    .map(([month, count]) => ({ month, signals: count }))
    .slice(-6) // last 6 months of data
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' }

  console.log('=== Stationery Intel Started ===')

  try {
    // Fetch LKR rate first
    const lkrRate = await getLKRRate()
    console.log('LKR rate:', lkrRate)

    // Broad stationery signal queries — timeless, no dates
    const QUERIES = [
      'stationery haul trending',
      'new stationery products popular',
      'journal supplies going viral',
      'planner stationery obsession',
      'aesthetic stationery must have',
      'stationery collection setup',
      'bullet journal supplies trending',
      'study stationery popular',
    ]

    // Fetch from all sources simultaneously
    const [ytBatches, newsBatches, googleTrends, shoppingResults] = await Promise.all([
      Promise.all(QUERIES.slice(0, 4).map(q => fetchYouTube([q], 8).catch(() => []))),
      Promise.all(QUERIES.slice(0, 4).map(q => fetchNewsAPI(q, 6).catch(() => []))),
      fetchGoogleTrends('stationery').catch(() => null),
      fetchEtsySignals('trending stationery').catch(() => []),
    ])

    // Flatten all content
    const allYT   = ytBatches.flat()
    const allNews = newsBatches.flat()
    const allTitles = [
      ...allYT.map(v => v.title),
      ...allNews.map(a => a.title),
    ]

    console.log('YT items:', allYT.length, 'News items:', allNews.length)

    // Extract phrases and score them
    const phraseMap = extractPhrases(allTitles)

    // Build product intelligence from phrases
    const products = Object.entries(phraseMap)
      .filter(([phrase, freq]) => {
        // Must appear at least twice
        if (freq < 2) return false
        // Must be stationery-related
        const stationeryTerms = [
          'journal','notebook','planner','pen','pencil','marker','highlighter',
          'sticker','washi','tape','stamp','binder','folder','clip','pouch',
          'case','organiser','template','printable','notion','digital','diary',
          'agenda','calendar','bullet','bujo','fountain','brush','lettering',
          'pastel','aesthetic','kawaii','study','desk','stationary','stationery',
        ]
        return stationeryTerms.some(t => phrase.includes(t))
      })
      .map(([phrase, freq]) => {
        // Count how many sources mention this phrase
        const inYT   = allYT.filter(v  => v.title.toLowerCase().includes(phrase)).length
        const inNews = allNews.filter(a => a.title.toLowerCase().includes(phrase)).length
        const sources = (inYT > 0 ? 1 : 0) + (inNews > 0 ? 1 : 0) +
                        (shoppingResults.some(r => r.title?.toLowerCase().includes(phrase)) ? 1 : 0)

        const relatedTitles = allTitles.filter(t => t.toLowerCase().includes(phrase))
        const { cat, icon } = detectCategory(phrase)
        const trajectory    = detectTrajectory(freq, sources)
        const customerBase  = detectCustomerBase(phrase, relatedTitles)
        const pricing       = estimatePricing(phrase, lkrRate, shoppingResults)
        const angles        = generateAngles(phrase)
        const hashtags      = generateHashtags(phrase, cat)
        const timeline      = buildTimeline(
          phrase,
          allYT.filter(v  => v.title.toLowerCase().includes(phrase)),
          allNews.filter(a => a.title.toLowerCase().includes(phrase))
        )

        // Opportunity score
        const opportunityScore = Math.min(100, Math.round(
          (freq / 10) * 30 +
          (sources / 3) * 30 +
          (parseInt(pricing.sriLanka.profitMargin) / 100) * 25 +
          (trajectory === 'explosive' ? 15 : trajectory === 'rising fast' ? 10 : 5)
        ))

        return {
          product:        phrase,
          category:       cat,
          icon,
          trajectory,
          frequency:      freq,
          sources,
          customerBase,
          pricing,
          angles,
          hashtags,
          timeline,
          opportunityScore,
          relatedTitles:  relatedTitles.slice(0, 3),
          shoppingSamples: shoppingResults
            .filter(r => r.title?.toLowerCase().includes(phrase.split(' ')[0]))
            .slice(0, 2),
        }
      })
      .sort((a, b) => b.opportunityScore - a.opportunityScore)
      .slice(0, 20)

    // Build market timeline from Google Trends if available
    const marketTimeline = googleTrends?.interest_over_time?.timeline_data
      ?.slice(-12)
      .map(t => ({
        date:   t.date,
        value:  t.values?.[0]?.extracted_value ?? 0,
      })) ?? []

    // Category breakdown
    const categoryBreakdown = {}
    for (const p of products) {
      if (!categoryBreakdown[p.category]) {
        categoryBreakdown[p.category] = { count: 0, icon: p.icon, avgScore: 0, scores: [] }
      }
      categoryBreakdown[p.category].count++
      categoryBreakdown[p.category].scores.push(p.opportunityScore)
    }
    for (const cat of Object.values(categoryBreakdown)) {
      cat.avgScore = Math.round(cat.scores.reduce((a,b) => a+b,0) / cat.scores.length)
      delete cat.scores
    }

    // Summary
    const summary = {
      totalSignals:     allTitles.length,
      productsFound:    products.length,
      lkrRate:          Math.round(lkrRate),
      topProduct:       products[0]?.product ?? null,
      topCategory:      products[0]?.category ?? null,
      explosive:        products.filter(p => p.trajectory === 'explosive').length,
      rising:           products.filter(p => p.trajectory === 'rising fast').length,
      bestMargin:       products.sort((a,b) =>
        parseInt(b.pricing.sriLanka.profitMargin) -
        parseInt(a.pricing.sriLanka.profitMargin)
      )[0]?.product ?? null,
      scannedAt:        new Date().toISOString(),
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        summary,
        products,
        categoryBreakdown,
        marketTimeline,
        shoppingMarket: shoppingResults.slice(0, 6),
        lkrRate,
      }),
    }

  } catch (e) {
    console.log('Stationery intel error:', e.message)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: e.message }),
    }
  }
}
