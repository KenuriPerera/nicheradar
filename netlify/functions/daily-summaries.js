import { getDailySummaries, getNicheTiers } from './_mongodb.js'

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' }

  try {
    const [summaries, tiers] = await Promise.all([
      getDailySummaries(14),
      getNicheTiers(),
    ])

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ summaries, tiers, fetchedAt: new Date().toISOString() }),
    }
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) }
  }
}
