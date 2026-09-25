const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Content-Type': 'application/json',
}

const SERP_KEY = () => process.env.SERPAPI_KEY

async function googleSearch(query, numResults = 10) {
  const key = SERP_KEY()
  if (!key) throw new Error('SERPAPI_KEY not set')
  const url = `https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(query)}&num=${numResults}&api_key=${key}`
  const res  = await fetch(url)
  if (!res.ok) throw new Error(`SerpAPI error: ${res.status}`)
  return res.json()
}

async function googleTrends(query) {
  const key = SERP_KEY()
  if (!key) throw new Error('SERPAPI_KEY not set')
  const url = `https://serpapi.com/search.json?engine=google_trends&q=${encodeURIComponent(query)}&data_type=TIMESERIES&api_key=${key}`
  const res  = await fetch(url)
  if (!res.ok) throw new Error(`SerpAPI trends error: ${res.status}`)
  return res.json()
}

async function googleShopping(query, numResults = 10) {
  const key = SERP_KEY()
  if (!key) throw new Error('SERPAPI_KEY not set')
  const url = `https://serpapi.com/search.json?engine=google_shopping&q=${encodeURIComponent(query)}&num=${numResults}&api_key=${key}`
  const res  = await fetch(url)
  if (!res.ok) throw new Error(`SerpAPI shopping error: ${res.status}`)
  return res.json()
}

// Check remaining SerpAPI quota
async function checkQuota() {
  const key = SERP_KEY()
  if (!key) return null
  try {
    const res  = await fetch(`https://serpapi.com/account.json?api_key=${key}`)
    const data = await res.json()
    return {
      total:     data.plan_searches_left + data.total_searches_done,
      used:      data.total_searches_done,
      remaining: data.plan_searches_left,
      resetDate: data.plan_month_end,
    }
  } catch {
    return null
  }
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' }

  const params = event.queryStringParameters ?? {}
  const type   = params.type   // 'search' | 'trends' | 'shopping' | 'all' | 'quota'
  const query  = params.query  // keyword to search

  // Quota check — uses zero searches
  if (type === 'quota') {
    const quota = await checkQuota()
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ quota }),
    }
  }

  if (!query) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'query parameter required' }),
    }
  }

  try {
    let result = {}

    if (type === 'search' || type === 'all') {
      const data = await googleSearch(query, 10)
      result.search = {
        organic: (data.organic_results ?? []).slice(0, 8).map(r => ({
          title:    r.title,
          link:     r.link,
          snippet:  r.snippet,
          position: r.position,
          domain:   new URL(r.link).hostname,
        })),
        relatedSearches: (data.related_searches ?? []).slice(0, 8).map(r => r.query),
        peopleAlsoAsk:   (data.related_questions ?? []).slice(0, 5).map(q => q.question),
        searchInfo:      data.search_information,
      }
    }

    if (type === 'trends' || type === 'all') {
      const data = await googleTrends(query)
      result.trends = {
        timeline: (data.interest_over_time?.timeline_data ?? []).slice(-12).map(t => ({
          date:  t.date,
          value: t.values?.[0]?.extracted_value ?? 0,
        })),
        relatedTopics: (data.related_topics?.rising ?? []).slice(0, 6).map(t => ({
          topic: t.topic?.title,
          value: t.extracted_value,
        })),
        relatedQueries: (data.related_queries?.rising ?? []).slice(0, 6).map(q => ({
          query: q.query,
          value: q.extracted_value,
        })),
      }
    }

    if (type === 'shopping' || type === 'all') {
      const data = await googleShopping(query, 10)
      result.shopping = {
        products: (data.shopping_results ?? []).slice(0, 8).map(p => ({
          title:    p.title,
          price:    p.price,
          source:   p.source,
          rating:   p.rating,
          reviews:  p.reviews,
          link:     p.link,
          delivery: p.delivery,
        })),
        priceRange: (() => {
          const prices = (data.shopping_results ?? [])
            .map(p => parseFloat(p.price?.replace(/[^0-9.]/g, '') ?? '0'))
            .filter(p => p > 0)
          return prices.length > 0
            ? { min: Math.min(...prices), max: Math.max(...prices), avg: Math.round(prices.reduce((a,b)=>a+b,0)/prices.length) }
            : null
        })(),
      }
    }

    // Count how many searches this call used
    const searchesUsed = type === 'all' ? 3 : 1

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        query,
        type,
        searchesUsed,
        ...result,
        fetchedAt: new Date().toISOString(),
      }),
    }
  } catch (e) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: e.message }),
    }
  }
}
