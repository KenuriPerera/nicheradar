import { sql } from '@vercel/postgres'
import { cors } from './_data.js'

export default async function handler(req, res) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(200).end()

  try {
    await sql`
      CREATE TABLE IF NOT EXISTS trend_snapshots (
        id SERIAL PRIMARY KEY,
        niche VARCHAR(50) NOT NULL,
        hashtags JSONB NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `
    res.status(200).json({ success: true, message: 'Database migrated successfully: trend_snapshots table ready.' })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
}
