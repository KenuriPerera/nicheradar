import { cors } from './_data.js'
import { getSnapshots, dbAvailable } from './_db.js'

export default async function handler(req, res) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const { niche = 'skincare', days = 14 } = req.query ?? {}
  const hasDB = await dbAvailable()

  if (!hasDB) {
    return res.status(200).json({
      niche,
      dbConnected: false,
      history: [],
      message: 'Vercel Postgres not configured. Set POSTGRES_URL environment variable to store and view historical data.'
    })
  }

  const rows = await getSnapshots(niche, parseInt(days, 10) || 14)

  res.status(200).json({
    niche,
    dbConnected: true,
    history: rows
  })
}
