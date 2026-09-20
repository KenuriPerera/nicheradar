import { NICHE_MAP } from './_data.js'
import { getTopHashtagsHistory, getDailyTrends, getEmergingTags, dbAvailable } from './_db.js'

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Content-Type': 'application/json',
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  const niche = event.queryStringParameters?.niche ?? 'skincare'
  const days  = parseInt(event.queryStringParameters?.days ?? '14', 10)

  const hasDB = await dbAvailable()
  if (!hasDB) {
    return {
      statusCode: 503,
      headers,
      body: JSON.stringify({
        error: 'Database not connected',
        fix:   'Add SUPABASE_URL and SUPABASE_SERVICE_KEY to Netlify environment variables',
      }),
    }
  }

  try {
    const [topHashtags, dailyTrends, emerging] = await Promise.all([
      getTopHashtagsHistory(niche, days, 15),
      getDailyTrends(niche, days),
      getEmergingTags(niche),
    ])

    const dates  = [...new Set(dailyTrends.map(r => r.day))].sort()
    const tags   = [...new Set(dailyTrends.map(r => r.tag))]
    const series = tags.map(tag => ({
      tag,
      data: dates.map(day => {
        const match = dailyTrends.find(r => r.tag === tag && r.day === day)
        return match ? match.avg_prob : null
      }),
    }))

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        niche,
        days,
        fetchedAt: new Date().toISOString(),
        topHashtags,
        chart: { dates, series },
        emerging,
      }),
    }
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) }
  }
}
