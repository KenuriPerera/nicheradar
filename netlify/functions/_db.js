import { sql } from '@vercel/postgres'

export async function dbAvailable() {
  return Boolean(
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.POSTGRES_PRISMA_URL
  )
}

export async function saveSnapshot(niche, hashtags) {
  try {
    const jsonStr = JSON.stringify(hashtags)
    await sql`
      INSERT INTO trend_snapshots (niche, hashtags, created_at)
      VALUES (${niche}, ${jsonStr}::jsonb, NOW())
    `
    return true
  } catch (err) {
    console.error('Failed to save snapshot to DB:', err)
    return false
  }
}

export async function getSnapshots(niche, days = 14) {
  try {
    const { rows } = await sql`
      SELECT id, niche, hashtags, created_at
      FROM trend_snapshots
      WHERE niche = ${niche}
        AND created_at >= NOW() - INTERVAL '1 day' * ${days}
      ORDER BY created_at ASC
    `
    return rows
  } catch (err) {
    console.error('Failed to fetch history from DB:', err)
    return []
  }
}
