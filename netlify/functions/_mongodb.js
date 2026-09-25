import { MongoClient } from 'mongodb'
import dns from 'dns'

try { dns.setDefaultResultOrder('ipv4first') } catch {}

let cachedClient = null

export async function getMongoClient() {
  let uri = process.env.MONGODB_URI
  if (!uri) return null
  uri = uri.replace(/^["']|["']$/g, '').trim()
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

// ── Improv Data Operations ────────────────────────────────────────────────

// Save Improv cache from master scan
export async function saveImprovData(data) {
  const db = await getDB()
  if (!db) return false
  try {
    await db.collection('improv_cache').updateOne(
      { _id: 'current' },
      { $set: { ...data, savedAt: new Date() } },
      { upsert: true }
    )
    return true
  } catch (e) {
    console.log('Improv save error:', e.message)
    return false
  }
}

// Get Improv cache
export async function getImprovData() {
  const db = await getDB()
  if (!db) return null
  try {
    return await db.collection('improv_cache').findOne({ _id: 'current' })
  } catch {
    return null
  }
}

// Save content calendar entries
export async function saveCalendarEntry(entry) {
  const db = await getDB()
  if (!db) return false
  try {
    await db.collection('content_calendar').insertOne({
      ...entry,
      createdAt: new Date(),
    })
    return true
  } catch {
    return false
  }
}

// Get calendar entries for a date range
export async function getCalendarEntries(startDate, endDate) {
  const db = await getDB()
  if (!db) return []
  try {
    return await db.collection('content_calendar')
      .find({
        date: { $gte: startDate, $lte: endDate }
      })
      .sort({ date: 1 })
      .toArray()
  } catch {
    return []
  }
}

// Update calendar entry
export async function updateCalendarEntry(id, updates) {
  const db = await getDB()
  if (!db) return false
  try {
    const { ObjectId } = await import('mongodb')
    await db.collection('content_calendar').updateOne(
      { _id: new ObjectId(id) },
      { $set: { ...updates, updatedAt: new Date() } }
    )
    return true
  } catch {
    return false
  }
}

// Save growth tracker entry
export async function saveGrowthEntry(entry) {
  const db = await getDB()
  if (!db) return false
  try {
    await db.collection('growth_tracker').insertOne({
      ...entry,
      recordedAt: new Date(),
    })
    return true
  } catch {
    return false
  }
}

// Get growth entries
export async function getGrowthEntries(limit = 30) {
  const db = await getDB()
  if (!db) return []
  try {
    return await db.collection('growth_tracker')
      .find()
      .sort({ recordedAt: -1 })
      .limit(limit)
      .toArray()
  } catch {
    return []
  }
}

// Save Cloudinary image reference
export async function saveCloudinaryImage(data) {
  const db = await getDB()
  if (!db) return false
  try {
    await db.collection('cloudinary_images').insertOne({
      ...data,
      uploadedAt: new Date(),
    })
    return true
  } catch {
    return false
  }
}

// Get saved images by type
export async function getCloudinaryImages(type) {
  const db = await getDB()
  if (!db) return []
  try {
    return await db.collection('cloudinary_images')
      .find({ type })
      .sort({ uploadedAt: -1 })
      .limit(20)
      .toArray()
  } catch {
    return []
  }
}

