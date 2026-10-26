import {
  headers,
  getScansCollection,
  getSeedsCollection,
  getIdeasCollection,
  getSeriesCollection,
  ObjectId
} from './_cliptube.js'

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  const method = event.httpMethod
  const params = event.queryStringParameters || {}
  const type = params.type || 'latest'

  let body = {}
  if (method === 'POST' || method === 'PUT') {
    try {
      body = JSON.parse(event.body || '{}')
    } catch {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON body' }) }
    }
  }

  try {
    // ── SCANS ─────────────────────────────────────────────────────────────
    if (type === 'scans') {
      const scansCol = await getScansCollection()
      if (!scansCol) return { statusCode: 500, headers, body: JSON.stringify({ error: 'DB unavailable' }) }

      const docs = await scansCol
        .find()
        .sort({ createdAt: -1 })
        .limit(10)
        .project({
          _id: 1,
          status: 1,
          createdAt: 1,
          options: 1,
          unitsUsed: 1,
          'facts.totalVideosScanned': 1,
          'facts.topics': { $slice: 3 },
          'facts.series': { $slice: 2 },
          error: 1,
        })
        .toArray()

      const scans = docs.map(d => ({
        id: d._id.toString(),
        status: d.status,
        createdAt: d.createdAt,
        options: d.options,
        unitsUsed: d.unitsUsed || 0,
        videoCount: d.facts?.totalVideosScanned || 0,
        sampleTopics: (d.facts?.topics || []).map(t => t.topic),
        sampleSeries: (d.facts?.series || []).map(s => s.stem),
        error: d.error,
      }))

      return { statusCode: 200, headers, body: JSON.stringify({ scans }) }
    }

    if (type === 'latest') {
      const scansCol = await getScansCollection()
      if (!scansCol) return { statusCode: 500, headers, body: JSON.stringify({ error: 'DB unavailable' }) }

      const doc = await scansCol
        .find()
        .sort({ createdAt: -1 })
        .limit(1)
        .toArray()

      if (!doc || doc.length === 0) {
        return { statusCode: 200, headers, body: JSON.stringify({ scan: null }) }
      }

      const scan = {
        ...doc[0],
        id: doc[0]._id.toString(),
      }
      delete scan._id

      return { statusCode: 200, headers, body: JSON.stringify({ scan }) }
    }

    if (type === 'scan') {
      const scansCol = await getScansCollection()
      if (!scansCol) return { statusCode: 500, headers, body: JSON.stringify({ error: 'DB unavailable' }) }
      if (!params.id) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Scan id required' }) }

      let queryId
      try {
        queryId = new ObjectId(params.id)
      } catch {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid ObjectId' }) }
      }

      const doc = await scansCol.findOne({ _id: queryId })
      if (!doc) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Scan not found' }) }

      const scan = {
        ...doc,
        id: doc._id.toString(),
      }
      delete scan._id

      return { statusCode: 200, headers, body: JSON.stringify({ scan }) }
    }

    // ── SEEDS (Saved trend ideas / seeds for future scans) ─────────────────
    if (type === 'seeds') {
      const seedsCol = await getSeedsCollection()
      if (!seedsCol) return { statusCode: 500, headers, body: JSON.stringify({ error: 'DB unavailable' }) }

      if (method === 'GET') {
        const docs = await seedsCol.find().sort({ createdAt: -1 }).limit(50).toArray()
        const seeds = docs.map(d => ({ ...d, id: d._id.toString() }))
        return { statusCode: 200, headers, body: JSON.stringify({ seeds }) }
      }

      if (method === 'POST') {
        const { text, source, itemType, metadata } = body
        if (!text) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Seed text required' }) }

        const newSeed = {
          text,
          source: source || 'discover',
          itemType: itemType || 'topic',
          metadata: metadata || {},
          createdAt: new Date(),
        }
        const res = await seedsCol.insertOne(newSeed)
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ ok: true, id: res.insertedId.toString(), seed: newSeed })
        }
      }

      if (method === 'DELETE') {
        if (!params.id) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Seed id required' }) }
        await seedsCol.deleteOne({ _id: new ObjectId(params.id) })
        return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) }
      }
    }

    // ── IDEAS (Saved Ideas CRUD) ──────────────────────────────────────────
    if (type === 'ideas') {
      const ideasCol = await getIdeasCollection()
      if (!ideasCol) return { statusCode: 500, headers, body: JSON.stringify({ error: 'DB unavailable' }) }

      if (method === 'GET') {
        const docs = await ideasCol.find().sort({ createdAt: -1 }).toArray()
        const ideas = docs.map(d => ({ ...d, id: d._id.toString() }))
        return { statusCode: 200, headers, body: JSON.stringify({ ideas }) }
      }

      if (method === 'POST') {
        const doc = { ...body, createdAt: new Date() }
        const res = await ideasCol.insertOne(doc)
        return { statusCode: 200, headers, body: JSON.stringify({ ok: true, id: res.insertedId.toString() }) }
      }

      if (method === 'DELETE') {
        if (!params.id) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Idea id required' }) }
        await ideasCol.deleteOne({ _id: new ObjectId(params.id) })
        return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) }
      }
    }

    // ── SERIES (Series Bible & Episodes CRUD) ──────────────────────────────
    if (type === 'series') {
      const seriesCol = await getSeriesCollection()
      if (!seriesCol) return { statusCode: 500, headers, body: JSON.stringify({ error: 'DB unavailable' }) }

      if (method === 'GET') {
        const docs = await seriesCol.find().sort({ updatedAt: -1 }).toArray()
        const series = docs.map(d => ({ ...d, id: d._id.toString() }))
        return { statusCode: 200, headers, body: JSON.stringify({ series }) }
      }

      if (method === 'POST') {
        const doc = { ...body, createdAt: new Date(), updatedAt: new Date() }
        const res = await seriesCol.insertOne(doc)
        return { statusCode: 200, headers, body: JSON.stringify({ ok: true, id: res.insertedId.toString() }) }
      }

      if (method === 'PUT') {
        if (!params.id) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Series id required' }) }
        await seriesCol.updateOne(
          { _id: new ObjectId(params.id) },
          { $set: { ...body, updatedAt: new Date() } }
        )
        return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) }
      }

      if (method === 'DELETE') {
        if (!params.id) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Series id required' }) }
        await seriesCol.deleteOne({ _id: new ObjectId(params.id) })
        return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) }
      }
    }

    return { statusCode: 400, headers, body: JSON.stringify({ error: `Unknown type: ${type}` }) }

  } catch (err) {
    console.error('cliptube-data error:', err)
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) }
  }
}
