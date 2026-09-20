import { setupSchema, dbAvailable } from './_db.js'

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
}

export const handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'GET only' }) }
  }

  const available = await dbAvailable()
  if (!available) {
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
    await setupSchema()
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok:      true,
        message: 'Schema ready — hashtag_snapshots table created',
        next:    'Go to /hashtags and run a scan to start building history',
      }),
    }
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) }
  }
}
