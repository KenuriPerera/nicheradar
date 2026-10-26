import {
  headers,
  getScansCollection,
  parseDuration,
  classifyVideo,
  clusterTopics,
  extractSeries,
  extractHashtags,
  extractBreakoutChannels,
  buildGlobalInspiration,
  getSeedQueryConfig,
  pruneScans,
  ObjectId
} from './_cliptube.js'

// ── Shared Fact Builder from Normalized Raw Videos (0 YouTube Units) ─────
export function buildFactsFromRawVideos(rawVideos, channelMap = {}) {
  // 1. Classify every video into english | global | blocked
  const classifiedVideos = rawVideos.map(v => {
    // Ensure velocity is computed
    const published = new Date(v.publishedAt).getTime()
    const hoursSinceUpload = Math.max(0.1, (Date.now() - published) / (1000 * 60 * 60))
    const views = v.views || v.viewCount || 0
    const velocity = v.velocity || Math.round(views / hoursSinceUpload)

    const classification = classifyVideo(v)
    return { ...v, velocity, classification }
  })

  const blocked = classifiedVideos.filter(v => v.classification === 'blocked')
  const english = classifiedVideos.filter(v => v.classification === 'english')
  const global = classifiedVideos.filter(v => v.classification === 'global')

  // 2. Derive facts ONLY from English videos
  const topics = clusterTopics(english)
  const series = extractSeries(english, channelMap)
  const hashtags = extractHashtags(english)
  const breakoutChannels = extractBreakoutChannels(english, channelMap)

  // 3. Global inspiration bucket (top ~15 non-blocked global videos by velocity)
  const globalInspiration = buildGlobalInspiration(global)

  const facts = {
    topics,
    series,
    hashtags,
    breakoutChannels,
    globalInspiration,
    totalEnglishVideos: english.length,
    totalGlobalVideos: global.length,
    totalBlockedVideos: blocked.length,
    topVideos: [...english]
      .sort((a, b) => b.velocity - a.velocity)
      .slice(0, 15)
      .map(v => ({
        id: v.id,
        title: v.title,
        channelTitle: v.channelTitle,
        views: v.views || v.viewCount,
        velocity: v.velocity,
        durationSec: v.durationSec || v.durationSeconds,
        thumbnail: v.thumbnail,
        publishedAt: v.publishedAt,
      })),
    generatedAt: new Date().toISOString(),
  }

  const classificationCounts = {
    english: english.length,
    global: global.length,
    blocked: blocked.length,
    total: rawVideos.length,
  }

  const samples = {
    english: english.slice(0, 5).map(v => ({ title: v.title, channel: v.channelTitle, velocity: v.velocity })),
    global: global.slice(0, 5).map(v => ({ title: v.title, channel: v.channelTitle, velocity: v.velocity })),
    blocked: blocked.slice(0, 5).map(v => ({ title: v.title, channel: v.channelTitle, velocity: v.velocity })),
  }

  return { facts, classificationCounts, samples, classifiedVideos }
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  let body = {}
  try {
    body = JSON.parse(event.body || '{}')
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON body' }) }
  }

  const { action = 'collect' } = body

  try {
    // ═══════════════════════════════════════════════════════════════════════
    // ACTION: REPROCESS (Rebuild facts from stored raw videos at 0 units)
    // ═══════════════════════════════════════════════════════════════════════
    if (action === 'reprocess') {
      const scansCol = await getScansCollection()
      if (!scansCol) {
        return { statusCode: 500, headers, body: JSON.stringify({ error: 'Database unavailable' }) }
      }

      let scan = null
      if (body.scanId) {
        try {
          scan = await scansCol.findOne({ _id: new ObjectId(body.scanId) })
        } catch {
          return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid scanId' }) }
        }
      } else {
        scan = await scansCol.findOne({ rawVideos: { $exists: true, $ne: [] } }, { sort: { createdAt: -1 } })
      }

      if (!scan || !scan.rawVideos || scan.rawVideos.length === 0) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'No raw videos found in scan to reprocess.' })
        }
      }

      // Reconstruct channel map from raw videos
      const channelMap = {}
      for (const v of scan.rawVideos) {
        if (v.channelId && !channelMap[v.channelId]) {
          channelMap[v.channelId] = {
            title: v.channelTitle,
            subscriberCount: v.subscriberCount || 0,
            thumbnail: v.thumbnail || '',
          }
        }
      }

      const { facts, classificationCounts, samples, classifiedVideos } = buildFactsFromRawVideos(
        scan.rawVideos,
        channelMap
      )

      // Update scan document with new facts and classifications
      await scansCol.updateOne(
        { _id: scan._id },
        {
          $set: {
            rawVideos: classifiedVideos,
            facts,
            classificationCounts,
            status: scan.status === 'collecting' ? 'facts_ready' : scan.status,
            reprocessedAt: new Date(),
          }
        }
      )

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          ok: true,
          scanId: scan._id.toString(),
          unitsUsed: 0,
          classificationCounts,
          facts,
          samples,
        })
      }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // ACTION: COLLECT (4 English Searches + 2 Global Inspiration Searches)
    // ═══════════════════════════════════════════════════════════════════════
    if (action === 'collect') {
      const scansCol = await getScansCollection()
      if (!scansCol) {
        return { statusCode: 500, headers, body: JSON.stringify({ error: 'Database unavailable' }) }
      }

      // Check scan lock: reject a new collect if one started less than 60s ago
      const recentRunning = await scansCol.findOne({
        status: 'collecting',
        createdAt: { $gt: new Date(Date.now() - 60 * 1000) }
      })
      if (recentRunning) {
        return {
          statusCode: 429,
          headers,
          body: JSON.stringify({
            error: 'A scan is currently in progress. Please wait up to 60s for it to finish.'
          })
        }
      }

      const apiKey = process.env.YOUTUBE_API_KEY
      if (!apiKey) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'YOUTUBE_API_KEY is not configured in environment variables.' })
        }
      }

      const {
        language = 'en',
        format = 'all',
        genre = '',
        timeframe = '7d'
      } = body.options || {}

      // Calculate publishedAfter from timeframe
      const now = Date.now()
      const timeframeMap = {
        '24h': 24 * 60 * 60 * 1000,
        '7d':  7 * 24 * 60 * 60 * 1000,
        '30d': 30 * 24 * 60 * 60 * 1000,
      }
      const msAgo = timeframeMap[timeframe] || timeframeMap['7d']
      const publishedAfter = new Date(now - msAgo).toISOString()

      // Insert scan document with status 'collecting'
      const initialScanDoc = {
        status: 'collecting',
        createdAt: new Date(),
        options: { language: 'en', format, genre, timeframe },
        facts: null,
        ai: null,
        unitsUsed: 0,
      }
      const insertResult = await scansCol.insertOne(initialScanDoc)
      const scanId = insertResult.insertedId

      let searchCalls = 0
      let videoBatchCalls = 0
      let channelBatchCalls = 0

      try {
        const { englishQueries, globalQueries } = getSeedQueryConfig(genre)

        // 1. Search Calls: 4 English (relevanceLanguage=en & regionCode=US) + 2 Global (no language filter)
        const allSearchTasks = [
          ...englishQueries.slice(0, 4).map(query => ({ query, isEnglishSearch: true })),
          ...globalQueries.slice(0, 2).map(query => ({ query, isEnglishSearch: false }))
        ]

        const searchPromises = allSearchTasks.map(async ({ query, isEnglishSearch }) => {
          searchCalls++
          const paramsObj = {
            part: 'snippet',
            q: query,
            type: 'video',
            maxResults: isEnglishSearch ? '25' : '15',
            order: 'viewCount',
            publishedAfter,
            key: apiKey,
          }
          if (isEnglishSearch) {
            paramsObj.relevanceLanguage = 'en'
            paramsObj.regionCode = 'US'
          }

          const params = new URLSearchParams(paramsObj)
          const url = `https://www.googleapis.com/youtube/v3/search?${params.toString()}`
          const res = await fetch(url)
          if (!res.ok) {
            console.error(`Search failed for "${query}":`, res.status)
            return []
          }
          const data = await res.json()
          return data.items || []
        })

        const searchResultsNested = await Promise.all(searchPromises)
        const rawVideoItems = searchResultsNested.flat()

        // Extract and deduplicate video IDs (capped to 90 for 2 video batches)
        const uniqueVideoIds = [...new Set(
          rawVideoItems
            .map(item => item?.id?.videoId)
            .filter(Boolean)
        )].slice(0, 90)

        if (uniqueVideoIds.length === 0) {
          const finalUnits = searchCalls * 100
          await scansCol.updateOne(
            { _id: scanId },
            {
              $set: {
                status: 'facts_ready',
                rawVideos: [],
                facts: { topics: [], series: [], hashtags: [], breakoutChannels: [], globalInspiration: [], totalVideosScanned: 0 },
                unitsUsed: finalUnits
              }
            }
          )
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              ok: true,
              scanId: scanId.toString(),
              status: 'facts_ready',
              unitsUsed: finalUnits,
              classificationCounts: { english: 0, global: 0, blocked: 0, total: 0 },
              facts: { topics: [], series: [], hashtags: [], breakoutChannels: [], globalInspiration: [] }
            })
          }
        }

        // 2. Batch fetch videos.list (snippet, statistics, contentDetails) in chunks of 50
        const videoChunks = []
        for (let i = 0; i < uniqueVideoIds.length; i += 50) {
          videoChunks.push(uniqueVideoIds.slice(i, i + 50))
        }

        const videoPromises = videoChunks.map(async (chunk) => {
          videoBatchCalls++
          const params = new URLSearchParams({
            part: 'snippet,statistics,contentDetails',
            id: chunk.join(','),
            key: apiKey,
          })
          const res = await fetch(`https://www.googleapis.com/youtube/v3/videos?${params.toString()}`)
          if (!res.ok) {
            console.error('Videos.list batch failed:', res.status)
            return []
          }
          const data = await res.json()
          return data.items || []
        })

        const videoBatches = await Promise.all(videoPromises)
        const detailedVideos = videoBatches.flat()

        // 3. Batch fetch channels.list for subscriber counts (up to 50 IDs per call)
        const uniqueChannelIds = [...new Set(detailedVideos.map(v => v.snippet?.channelId).filter(Boolean))].slice(0, 50)
        const channelMap = {}

        if (uniqueChannelIds.length > 0) {
          channelBatchCalls++
          const params = new URLSearchParams({
            part: 'snippet,statistics',
            id: uniqueChannelIds.join(','),
            key: apiKey,
          })
          const res = await fetch(`https://www.googleapis.com/youtube/v3/channels?${params.toString()}`)
          if (res.ok) {
            const data = await res.json()
            for (const ch of (data.items || [])) {
              channelMap[ch.id] = {
                title: ch.snippet?.title,
                subscriberCount: parseInt(ch.statistics?.subscriberCount || '0', 10),
                thumbnail: ch.snippet?.thumbnails?.default?.url,
              }
            }
          }
        }

        // 4. Normalize raw video records
        let parsedVideos = detailedVideos.map(v => {
          const published = new Date(v.snippet.publishedAt).getTime()
          const hoursSinceUpload = Math.max(0.1, (now - published) / (1000 * 60 * 60))
          const views = parseInt(v.statistics?.viewCount || '0', 10)
          const velocity = Math.round(views / hoursSinceUpload)
          const durationSec = parseDuration(v.contentDetails?.duration)
          const isShort = durationSec > 0 && durationSec <= 180

          return {
            id: v.id,
            title: v.snippet.title,
            channelId: v.snippet.channelId,
            channelTitle: v.snippet.channelTitle,
            publishedAt: v.snippet.publishedAt,
            views,
            likes: parseInt(v.statistics?.likeCount || '0', 10),
            durationSec,
            isShort,
            tags: v.snippet.tags || [],
            description: (v.snippet.description || '').slice(0, 300),
            subscriberCount: channelMap[v.snippet.channelId]?.subscriberCount || 0,
            defaultLanguage: v.snippet.defaultLanguage || null,
            defaultAudioLanguage: v.snippet.defaultAudioLanguage || null,
            thumbnail: v.snippet.thumbnails?.medium?.url || v.snippet.thumbnails?.default?.url,
            velocity,
          }
        })

        // Apply format filter if specified
        if (format === 'shorts') {
          const shorts = parsedVideos.filter(v => v.isShort)
          if (shorts.length >= 5) parsedVideos = shorts
        } else if (format === 'long') {
          const longForm = parsedVideos.filter(v => !v.isShort)
          if (longForm.length >= 5) parsedVideos = longForm
        }

        // 5. Build facts and classify videos
        const { facts, classificationCounts, samples, classifiedVideos } = buildFactsFromRawVideos(
          parsedVideos,
          channelMap
        )

        // Exact units consumed: 100 per search, 1 per videos chunk, 1 per channels chunk
        const unitsUsed = (searchCalls * 100) + (videoBatchCalls * 1) + (channelBatchCalls * 1)

        // Save rawVideos and derived facts into MongoDB
        await scansCol.updateOne(
          { _id: scanId },
          {
            $set: {
              status: 'facts_ready',
              rawVideos: classifiedVideos,
              facts,
              classificationCounts,
              unitsUsed,
              updatedAt: new Date(),
            }
          }
        )

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            ok: true,
            scanId: scanId.toString(),
            status: 'facts_ready',
            unitsUsed,
            classificationCounts,
            facts,
            samples,
          })
        }
      } catch (err) {
        console.error('Error during YouTube collect step:', err)
        const unitsUsedSoFar = (searchCalls * 100) + (videoBatchCalls * 1) + (channelBatchCalls * 1)
        await scansCol.updateOne(
          { _id: scanId },
          {
            $set: {
              status: 'collect_failed',
              error: err.message,
              unitsUsed: unitsUsedSoFar,
              updatedAt: new Date(),
            }
          }
        )
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: `YouTube collection failed: ${err.message}`, unitsUsed: unitsUsedSoFar })
        }
      }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // STEP 2: ANALYZE / RETRY-AI (Prepared for Phase 2)
    // ═══════════════════════════════════════════════════════════════════════
    if (action === 'analyze' || action === 'retry-ai') {
      return {
        statusCode: 501,
        headers,
        body: JSON.stringify({ error: 'Step 2 (Analyze) will be completed in Phase 2.' })
      }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // STEP 3: SAVE (Prepared for Phase 2)
    // ═══════════════════════════════════════════════════════════════════════
    if (action === 'save') {
      return {
        statusCode: 501,
        headers,
        body: JSON.stringify({ error: 'Step 3 (Save) will be completed in Phase 2.' })
      }
    }

    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: `Unknown action: ${action}` })
    }

  } catch (globalErr) {
    console.error('Unhandled cliptube-scan error:', globalErr)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: globalErr.message })
    }
  }
}
