import {
  headers,
  getProductsCollection,
  getPricesCollection,
  getSettingsCollection,
  PRODUCT_NICHES,
  parseOfferPrice,
  getFXRates,
  convertToLKR,
  classifyMerchant,
  evaluateComparability,
  flagPriceOutliers,
  computeLandingCost,
  generateManualCheckLinks,
  ObjectId
} from './_market.js'

// ── Normalize and derive stats from raw SerpAPI results (0 API searches) ──
export function deriveProductPriceAnalysis(product, rawResults, fxRates, settings = {}) {
  const lkResults = rawResults.lk || []
  const usResults = rawResults.us || []

  // Flatten and tag source country
  const allRawOffers = [
    ...lkResults.map(r => ({ ...r, originEngine: 'gl=lk', isLkSearch: true })),
    ...usResults.map(r => ({ ...r, originEngine: 'gl=us', isLkSearch: false })),
  ]

  // 1. Normalize every offer
  const normalizedOffers = allRawOffers.map((r, idx) => {
    const rawLink = r.link || r.product_link || '#'
    const { price, currency, raw: rawPriceStr } = parseOfferPrice(r.price)
    const priceLkr = convertToLKR(price, currency, fxRates)
    const { classification, hostname } = classifyMerchant(r.source, rawLink, product.brand)
    const { isComparable, reason: exclusionReason, overlapRatio } = evaluateComparability(product.name, r.title)

    // Compute landing cost (especially relevant for imports/unknown)
    const landingCost = computeLandingCost(price, currency, fxRates, settings)

    return {
      id: `${product._id || product.id}-offer-${idx}`,
      title: r.title || 'Untitled',
      merchant: r.source || 'Unknown Merchant',
      hostname,
      classification,
      price,
      currency,
      rawPriceStr,
      priceLkr,
      landingCost,
      link: rawLink,
      rating: r.rating || null,
      reviews: r.reviews || 0,
      thumbnail: r.thumbnail || '',
      originEngine: r.originEngine,
      isComparable,
      exclusionReason,
      overlapRatio,
    }
  })

  // 2. Apply IQR outlier removal to comparable offers
  const processedOffers = flagPriceOutliers(normalizedOffers)

  // 3. Filter valid comparable offers that are not price outliers
  const validOffers = processedOffers.filter(o => o.isComparable && !o.isOutlier)

  const localOffers = validOffers.filter(o => o.classification === 'local' || o.classification === 'official-store')
  const importOffers = validOffers.filter(o => o.classification === 'import')
  const otherOffers = validOffers.filter(o => o.classification === 'unknown')

  // Calculate statistics
  let stats = {
    isDataSufficient: validOffers.length >= 3,
    totalOffersScanned: processedOffers.length,
    comparableCount: validOffers.length,
    localComparableCount: localOffers.length,
    importComparableCount: importOffers.length,
    priceRangeLkr: { min: 0, max: 0 },
    medianPriceLkr: 0,
    cheapestOverall: null,
    bestLocalOffer: null,
    bestImportedOffer: null,
  }

  if (validOffers.length > 0) {
    const sortedByPrice = [...validOffers].sort((a, b) => a.priceLkr - b.priceLkr)
    const sortedByLanded = [...validOffers].sort((a, b) => a.landingCost.landedLkr - b.landingCost.landedLkr)

    const minPrice = sortedByPrice[0].priceLkr
    const maxPrice = sortedByPrice[sortedByPrice.length - 1].priceLkr

    const mid = Math.floor(sortedByPrice.length / 2)
    const medianPrice = sortedByPrice.length % 2 !== 0
      ? sortedByPrice[mid].priceLkr
      : Math.round((sortedByPrice[mid - 1].priceLkr + sortedByPrice[mid].priceLkr) / 2)

    stats.priceRangeLkr = { min: minPrice, max: maxPrice }
    stats.medianPriceLkr = medianPrice
    stats.cheapestOverall = sortedByPrice[0]

    if (localOffers.length > 0) {
      stats.bestLocalOffer = [...localOffers].sort((a, b) => a.priceLkr - b.priceLkr)[0]
    }

    if (importOffers.length > 0) {
      // Best imported offer ranked by estimated LANDED cost
      stats.bestImportedOffer = [...importOffers].sort((a, b) => a.landingCost.landedLkr - b.landingCost.landedLkr)[0]
    }
  }

  const manualLinks = generateManualCheckLinks(product.name)

  return {
    offers: processedOffers,
    stats,
    manualLinks,
    fxRates: {
      rates: fxRates.rates,
      date: fxRates.date,
      source: fxRates.source,
      isStale: fxRates.isStale || false,
      isOverride: fxRates.isOverride || false,
    },
    analyzedAt: new Date().toISOString(),
  }
}

// ── Check SerpAPI Quota via account.json ──────────────────────────────────
async function getSerpApiQuota(key) {
  if (!key) return null
  try {
    const res = await fetch(`https://serpapi.com/account.json?api_key=${key}`)
    if (!res.ok) return null
    const data = await res.json()
    return {
      total: data.plan_searches_left + data.total_searches_done,
      used: data.total_searches_done,
      remaining: data.plan_searches_left,
      resetDate: data.plan_month_end,
    }
  } catch {
    return null
  }
}

// ── Log Quota Usage via existing POST /api/quota-status pattern ──────────
async function logSerpApiQuota(count) {
  if (count <= 0) return
  try {
    const port = process.env.PORT || 8888
    await fetch(`http://localhost:${port}/.netlify/functions/quota-status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api: 'serpapi', amount: count }),
    })
  } catch (err) {
    console.warn('Quota status logging skipped:', err.message)
  }
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  const method = event.httpMethod
  const params = event.queryStringParameters || {}
  const action = params.action || (method === 'POST' ? 'check-price' : 'products')

  let body = {}
  if (method === 'POST' || method === 'PUT') {
    try {
      body = JSON.parse(event.body || '{}')
    } catch {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON body' }) }
    }
  }

  try {
    // ═══════════════════════════════════════════════════════════════════════
    // PRODUCTS CRUD
    // ═══════════════════════════════════════════════════════════════════════
    if (action === 'products') {
      const prodCol = await getProductsCollection()
      if (!prodCol) return { statusCode: 500, headers, body: JSON.stringify({ error: 'DB unavailable' }) }

      if (method === 'GET') {
        const docs = await prodCol.find().sort({ createdAt: -1 }).toArray()
        const products = docs.map(d => ({ ...d, id: d._id.toString() }))
        return { statusCode: 200, headers, body: JSON.stringify({ products }) }
      }

      if (method === 'POST') {
        const { name, niche, brand = '' } = body
        if (!name || !niche) {
          return { statusCode: 400, headers, body: JSON.stringify({ error: 'Product name and niche are required' }) }
        }
        if (!PRODUCT_NICHES.includes(niche)) {
          return { statusCode: 400, headers, body: JSON.stringify({ error: `Invalid product niche: ${niche}` }) }
        }

        const newDoc = {
          name: name.trim(),
          niche,
          brand: (brand || '').trim(),
          createdAt: new Date(),
        }
        const insertRes = await prodCol.insertOne(newDoc)
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ ok: true, id: insertRes.insertedId.toString(), product: { ...newDoc, id: insertRes.insertedId.toString() } }),
        }
      }

      if (method === 'DELETE') {
        if (!params.id) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Product ID required' }) }
        await prodCol.deleteOne({ _id: new ObjectId(params.id) })
        // Also remove associated cached prices
        const priceCol = await getPricesCollection()
        if (priceCol) await priceCol.deleteOne({ productId: params.id })
        return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) }
      }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // SETTINGS (Landing cost assumptions, FX override, reserve searches)
    // ═══════════════════════════════════════════════════════════════════════
    if (action === 'settings') {
      const settingsCol = await getSettingsCollection()
      if (!settingsCol) return { statusCode: 500, headers, body: JSON.stringify({ error: 'DB unavailable' }) }

      if (method === 'GET') {
        const userSettings = await settingsCol.findOne({ _id: 'user_settings' })
        const fxRates = await getFXRates()
        const defaultSettings = {
          reserveSearches: 20,
          manualUsdToLkr: 0,
          shippingEstimate: 0,
          dutyPercent: 0,
          vatPercent: 0,
          otherPercent: 0,
        }
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            settings: { ...defaultSettings, ...(userSettings || {}) },
            fxRates,
          }),
        }
      }

      if (method === 'POST' || method === 'PUT') {
        const {
          reserveSearches = 20,
          manualUsdToLkr = 0,
          shippingEstimate = 0,
          dutyPercent = 0,
          vatPercent = 0,
          otherPercent = 0,
        } = body

        await settingsCol.updateOne(
          { _id: 'user_settings' },
          {
            $set: {
              reserveSearches: Number(reserveSearches),
              manualUsdToLkr: Number(manualUsdToLkr),
              shippingEstimate: Number(shippingEstimate),
              dutyPercent: Number(dutyPercent),
              vatPercent: Number(vatPercent),
              otherPercent: Number(otherPercent),
              updatedAt: new Date(),
            }
          },
          { upsert: true }
        )

        const fxRates = await getFXRates()
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ ok: true, settings: body, fxRates }),
        }
      }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // QUOTA CHECK
    // ═══════════════════════════════════════════════════════════════════════
    if (action === 'quota') {
      const key = process.env.SERPAPI_KEY
      const quota = await getSerpApiQuota(key)
      const settingsCol = await getSettingsCollection()
      const userSettings = settingsCol ? await settingsCol.findOne({ _id: 'user_settings' }) : null
      const reserve = userSettings?.reserveSearches ?? 20

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          quota,
          reserve,
          hasKey: !!key,
        }),
      }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // CACHED PRICE LOOKUP (<14 days TTL)
    // ═══════════════════════════════════════════════════════════════════════
    if (action === 'cached-price') {
      const priceCol = await getPricesCollection()
      if (!priceCol) return { statusCode: 500, headers, body: JSON.stringify({ error: 'DB unavailable' }) }
      if (!params.productId) return { statusCode: 400, headers, body: JSON.stringify({ error: 'productId required' }) }

      const cached = await priceCol.findOne({
        productId: params.productId,
        expiresAt: { $gt: new Date() }
      })

      if (!cached) {
        return { statusCode: 200, headers, body: JSON.stringify({ cached: false, data: null }) }
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ cached: true, data: cached })
      }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // REPROCESS ACTION (0 SerpAPI searches — rebuilds filters & stats)
    // ═══════════════════════════════════════════════════════════════════════
    if (action === 'reprocess') {
      const priceCol = await getPricesCollection()
      const prodCol = await getProductsCollection()
      const settingsCol = await getSettingsCollection()
      if (!priceCol || !prodCol) return { statusCode: 500, headers, body: JSON.stringify({ error: 'DB unavailable' }) }

      const productId = body.productId || params.productId
      if (!productId) return { statusCode: 400, headers, body: JSON.stringify({ error: 'productId required' }) }

      const cachedDoc = await priceCol.findOne({ productId })
      if (!cachedDoc || !cachedDoc.rawShoppingResults) {
        return { statusCode: 404, headers, body: JSON.stringify({ error: 'No raw search data stored for this product' }) }
      }

      const product = await prodCol.findOne({ _id: new ObjectId(productId) })
      if (!product) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Product not found' }) }

      const fxRates = await getFXRates()
      const userSettings = settingsCol ? await settingsCol.findOne({ _id: 'user_settings' }) : {}

      // Re-run derivation at 0 API searches
      const analysis = deriveProductPriceAnalysis(product, cachedDoc.rawShoppingResults, fxRates, userSettings || {})

      // Update cached record
      await priceCol.updateOne(
        { productId },
        {
          $set: {
            offers: analysis.offers,
            stats: analysis.stats,
            fxRates: analysis.fxRates,
            reprocessedAt: new Date(),
          }
        }
      )

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          ok: true,
          reprocessed: true,
          searchesUsed: 0,
          data: {
            ...cachedDoc,
            offers: analysis.offers,
            stats: analysis.stats,
            fxRates: analysis.fxRates,
            reprocessedAt: new Date(),
          }
        })
      }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // CHECK PRICE (SerpAPI google_shopping: gl=lk and gl=us)
    // ═══════════════════════════════════════════════════════════════════════
    if (action === 'check-price') {
      const prodCol = await getProductsCollection()
      const priceCol = await getPricesCollection()
      const settingsCol = await getSettingsCollection()
      if (!prodCol || !priceCol) return { statusCode: 500, headers, body: JSON.stringify({ error: 'DB unavailable' }) }

      const key = process.env.SERPAPI_KEY
      if (!key) return { statusCode: 400, headers, body: JSON.stringify({ error: 'SERPAPI_KEY is not configured' }) }

      const { productIds = [], force = false } = body
      if (!productIds || productIds.length === 0) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'At least one productId is required' }) }
      }

      // Max 5 products per batch
      const targetIds = productIds.slice(0, 5)
      const userSettings = settingsCol ? await settingsCol.findOne({ _id: 'user_settings' }) : {}
      const reserve = userSettings?.reserveSearches ?? 20

      // Check quota balance
      const quota = await getSerpApiQuota(key)
      const neededSearches = targetIds.length * 2
      if (quota && (quota.remaining - neededSearches < reserve)) {
        return {
          statusCode: 429,
          headers,
          body: JSON.stringify({
            error: `Insufficient SerpAPI balance: checking ${targetIds.length} product(s) requires ${neededSearches} searches, leaving less than the required reserve of ${reserve} searches (${quota.remaining} remaining).`
          })
        }
      }

      const fxRates = await getFXRates()
      let totalSearchesMade = 0
      const results = []

      for (const pId of targetIds) {
        let objId
        try { objId = new ObjectId(pId) } catch { continue }

        const product = await prodCol.findOne({ _id: objId })
        if (!product) continue

        // Check cache unless force refresh
        if (!force) {
          const cached = await priceCol.findOne({ productId: pId, expiresAt: { $gt: new Date() } })
          if (cached) {
            results.push({ ...cached, fromCache: true })
            continue
          }
        }

        // Per-product lock: prevent double-clicks
        const recentCheck = await priceCol.findOne({
          productId: pId,
          checkingStartedAt: { $gt: new Date(Date.now() - 60 * 1000) }
        })
        if (recentCheck) {
          results.push({ ...recentCheck, fromCache: true, message: 'Price check in progress or completed just now' })
          continue
        }

        // Set lock
        await priceCol.updateOne(
          { productId: pId },
          { $set: { checkingStartedAt: new Date() } },
          { upsert: true }
        )

        // Execute 2 SerpAPI searches: gl=lk and gl=us
        let lkItems = []
        let usItems = []

        try {
          totalSearchesMade++
          const lkUrl = `https://serpapi.com/search.json?engine=google_shopping&q=${encodeURIComponent(product.name)}&gl=lk&num=15&api_key=${key}`
          const lkRes = await fetch(lkUrl)
          if (lkRes.ok) {
            const lkData = await lkRes.json()
            if (!lkData.error) {
              lkItems = (lkData.shopping_results || []).slice(0, 15)
            }
          }
        } catch (err) {
          console.warn('LK SerpAPI shopping fetch error:', err.message)
        }

        try {
          totalSearchesMade++
          const usUrl = `https://serpapi.com/search.json?engine=google_shopping&q=${encodeURIComponent(product.name)}&gl=us&num=15&api_key=${key}`
          const usRes = await fetch(usUrl)
          if (usRes.ok) {
            const usData = await usRes.json()
            if (!usData.error) {
              usItems = (usData.shopping_results || []).slice(0, 15)
            }
          }
        } catch (err) {
          console.warn('US SerpAPI shopping fetch error:', err.message)
        }

        const rawShoppingResults = { lk: lkItems, us: usItems }

        // Analyze and derive
        const analysis = deriveProductPriceAnalysis(product, rawShoppingResults, fxRates, userSettings || {})

        const priceDoc = {
          productId: pId,
          productName: product.name,
          brand: product.brand || '',
          niche: product.niche,
          checkedAt: new Date(),
          expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days TTL
          searchesUsed: 2,
          rawShoppingResults,
          offers: analysis.offers,
          stats: analysis.stats,
          manualLinks: analysis.manualLinks,
          fxRates: analysis.fxRates,
        }

        await priceCol.updateOne(
          { productId: pId },
          { $set: priceDoc, $unset: { checkingStartedAt: '' } },
          { upsert: true }
        )

        results.push({ ...priceDoc, fromCache: false })
      }

      // Log SerpAPI quota used
      if (totalSearchesMade > 0) {
        logSerpApiQuota(totalSearchesMade).catch(() => {})
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          ok: true,
          searchesUsed: totalSearchesMade,
          results,
        })
      }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // MERCHANT LEADERBOARD
    // ═══════════════════════════════════════════════════════════════════════
    if (action === 'leaderboard') {
      const priceCol = await getPricesCollection()
      if (!priceCol) return { statusCode: 500, headers, body: JSON.stringify({ error: 'DB unavailable' }) }

      const allPrices = await priceCol.find({ stats: { $exists: true } }).toArray()
      const merchantMap = new Map()

      for (const p of allPrices) {
        const cheapest = p.stats?.cheapestOverall
        const validOffers = (p.offers || []).filter(o => o.isComparable && !o.isOutlier)

        for (const o of validOffers) {
          const m = o.merchant || 'Unknown'
          if (!merchantMap.has(m)) {
            merchantMap.set(m, {
              merchant: m,
              classification: o.classification,
              hostname: o.hostname,
              appearances: 0,
              cheapestWins: 0,
            })
          }
          const item = merchantMap.get(m)
          item.appearances++
          if (cheapest && cheapest.merchant === m && cheapest.id === o.id) {
            item.cheapestWins++
          }
        }
      }

      const leaderboard = Array.from(merchantMap.values())
        .map(m => ({
          ...m,
          winRate: m.appearances > 0 ? Math.round((m.cheapestWins / m.appearances) * 100) : 0,
        }))
        .sort((a, b) => b.cheapestWins - a.cheapestWins || b.appearances - a.appearances)
        .slice(0, 15)

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ leaderboard })
      }
    }

    return { statusCode: 400, headers, body: JSON.stringify({ error: `Unknown action: ${action}` }) }

  } catch (err) {
    console.error('Market Analyzer error:', err)
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) }
  }
}
