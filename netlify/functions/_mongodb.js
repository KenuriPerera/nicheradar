import { MongoClient } from 'mongodb'

let cachedClient = null

export async function getMongoClient() {
  const uri = process.env.MONGODB_URI
  if (!uri) return null
  if (cachedClient) return cachedClient
  try {
    const client = new MongoClient(uri, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
    })
    await client.connect()
    cachedClient = client
    return client
  } catch (e) {
    console.log('MongoDB connection failed:', e.message)
    return null
  }
}

export async function getDB() {
  const client = await getMongoClient()
  if (!client) return null
  return client.db('nicheradar')
}

// ── Cache operations ──────────────────────────────────────────────────────

// Save master scan data for a niche
export async function saveMasterScan(niche, data) {
  const db = await getDB()
  if (!db) return false
  try {
    await db.collection('master_scans').updateOne(
      { niche },
      {
        $set: {
          niche,
          data,
          fetchedAt:  new Date(),
          expiresAt:  new Date(Date.now() + 23 * 60 * 60 * 1000), // 23h TTL
        }
      },
      { upsert: true }
    )
    return true
  } catch (e) {
    console.log('MongoDB save error:', e.message)
    return false
  }
}

// Get cached scan for a niche (returns null if expired or missing)
export async function getCachedScan(niche) {
  const db = await getDB()
  if (!db) return null
  try {
    const doc = await db.collection('master_scans').findOne({
      niche,
      expiresAt: { $gt: new Date() },
    })
    return doc?.data ?? null
  } catch {
    return null
  }
}

// Save niche tier rankings
export async function saveNicheTiers(tiers) {
  const db = await getDB()
  if (!db) return false
  try {
    await db.collection('niche_tiers').updateOne(
      { _id: 'current' },
      { $set: { tiers, updatedAt: new Date() } },
      { upsert: true }
    )
    return true
  } catch {
    return false
  }
}

// Get current niche tier rankings
export async function getNicheTiers() {
  const db = await getDB()
  if (!db) return null
  try {
    const doc = await db.collection('niche_tiers').findOne({ _id: 'current' })
    return doc?.tiers ?? null
  } catch {
    return null
  }
}

// Save daily intelligence summary
export async function saveDailySummary(date, summary) {
  const db = await getDB()
  if (!db) return false
  try {
    await db.collection('daily_summaries').updateOne(
      { date },
      { $set: { date, summary, savedAt: new Date() } },
      { upsert: true }
    )
    return true
  } catch {
    return false
  }
}

// Get last N daily summaries
export async function getDailySummaries(days = 7) {
  const db = await getDB()
  if (!db) return []
  try {
    return await db.collection('daily_summaries')
      .find()
      .sort({ date: -1 })
      .limit(days)
      .toArray()
  } catch {
    return []
  }
}

// Check if MongoDB is available
export async function mongoAvailable() {
  const db = await getDB()
  return db !== null
}
