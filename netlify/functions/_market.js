import { MongoClient, ObjectId } from 'mongodb'
import dns from 'dns'
import { getCachedScan, getImprovData } from './_mongodb.js'

try { dns.setDefaultResultOrder('ipv4first') } catch {}

let cachedClient = null

export const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
}

// ── Database Connection ──────────────────────────────────────────────────
export async function getMarketClient() {
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
    console.error('Market Analyzer MongoDB connection failed:', e.message)
    return null
  }
}

export async function getMarketDB() {
  const client = await getMarketClient()
  if (!client) return null
  return client.db('nicheradar')
}

export async function getProductsCollection() {
  const db = await getMarketDB()
  return db ? db.collection('market_products') : null
}

export async function getPricesCollection() {
  const db = await getMarketDB()
  return db ? db.collection('market_prices') : null
}

export async function getSettingsCollection() {
  const db = await getMarketDB()
  return db ? db.collection('market_settings') : null
}

export { ObjectId, getCachedScan, getImprovData }

// ── Product-only Niches (Excludes movies, quotes, finance, travel, reviews) ──
export const PRODUCT_NICHES = [
  'skincare',
  'fashion',
  'fitness',
  'food',
  'tech',
  'wellness',
  'pets',
  'gaming',
  'art',
  'stationery',
  'books'
]

// ── Accessory Words Denylist (Editable) ───────────────────────────────────
export const ACCESSORY_WORDS = [
  'case', 'cover', 'protector', 'sleeve', 'strap', 'cable', 'charger',
  'adapter', 'refill', 'replacement', 'stand', 'mount', 'vinyl skin', 'decal skin', 'film',
  'battery', 'pouch', 'holder', 'accessory', 'accessories', 'earpads',
  'cushion', 'hood', 'cap', 'stylus tip', 'dock', 'bracket'
]

// ── Merchant Domains & Names (Editable) ──────────────────────────────────
export const LOCAL_DOMAINS = [
  'daraz.lk', 'kapruka.com', 'singer.lk', 'abans.com', 'buyabans.com',
  'softlogic.lk', 'softlogicglitz.lk', 'takas.lk', 'wasi.lk', 'keellssuper.com',
  'cargillsonline.com', 'glomark.lk', 'dialcom.lk', 'doctorlaptop.lk',
  'urbangreens.lk', 'chocola.lk', 'simplysrilanka.com', 'mydeal.lk',
  'glowmark.lk', 'ikman.lk', 'nanotek.lk', 'redline.lk', 'barclays.lk',
  'chamacomputers.com', 'scs.lk', 'daraz', 'kapruka'
]

export const LOCAL_MERCHANT_NAMES = [
  'daraz', 'kapruka', 'singer', 'abans', 'softlogic', 'takas', 'wasi',
  'keells', 'cargills', 'glomark', 'dialcom', 'mydeal', 'glowmark',
  'nanotek', 'redline', 'barclays', 'chama computers', 'ikman'
]

export const IMPORT_DOMAINS = [
  'amazon.com', 'amazon.co.uk', 'aliexpress.com', 'ebay.com', 'ebay.co.uk',
  'temu.com', 'shein.com', 'alibaba.com', 'banggood.com', 'walmart.com',
  'target.com', 'bestbuy.com', 'etsy.com', 'iherb.com', 'asos.com',
  'b&h', 'bhphotovideo.com', 'newegg.com'
]

export const IMPORT_MERCHANT_NAMES = [
  'amazon', 'aliexpress', 'ebay', 'temu', 'shein', 'alibaba',
  'banggood', 'walmart', 'target', 'best buy', 'etsy', 'iherb', 'asos',
  'b&h photo', 'newegg'
]

export const OFFICIAL_KEYWORDS = [
  'official', 'flagship', 'authorized', 'authorised', 'official store', 'direct'
]

// ── Unicode Tokenizer ────────────────────────────────────────────────────
export function tokenize(text) {
  if (!text) return []
  const matches = text.toLowerCase().match(/[\p{L}\p{M}\p{N}]+/gu)
  return matches || []
}

// ── Word Boundary Matcher ────────────────────────────────────────────────
export function containsWordBoundary(text, word) {
  if (!text || !word) return false
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(`(?:^|[^\\p{L}\\p{N}])${escaped}(?:[^\\p{L}\\p{N}]|$)`, 'iu')
  return regex.test(text)
}

// ── Currency & Price Parser ──────────────────────────────────────────────
export function parseOfferPrice(priceStr) {
  if (!priceStr || typeof priceStr !== 'string') {
    return { price: 0, currency: 'USD', raw: priceStr || '' }
  }
  const cleanStr = priceStr.trim()

  let currency = 'USD'
  if (/lkr/i.test(cleanStr) || /rs\.?|රු/i.test(cleanStr)) {
    currency = 'LKR'
  } else if (/£|gbp/i.test(cleanStr)) {
    currency = 'GBP'
  } else if (/€|eur/i.test(cleanStr)) {
    currency = 'EUR'
  } else if (/au\$|aud/i.test(cleanStr)) {
    currency = 'AUD'
  } else if (/ca\$|cad/i.test(cleanStr)) {
    currency = 'CAD'
  } else if (/\$|usd/i.test(cleanStr)) {
    currency = 'USD'
  }

  // Extract numeric digits with optional decimals
  const match = cleanStr.match(/[\d,]+(?:\.\d+)?/)
  if (!match) return { price: 0, currency, raw: cleanStr }

  const num = parseFloat(match[0].replace(/,/g, ''))
  return { price: isNaN(num) ? 0 : num, currency, raw: cleanStr }
}

// ── FX Rate Service (open.er-api.com) ────────────────────────────────────
export async function getFXRates() {
  const settingsCol = await getSettingsCollection()

  // 1. Check user manual override in market_settings
  let userSettings = null
  if (settingsCol) {
    userSettings = await settingsCol.findOne({ _id: 'user_settings' })
  }

  let baseRateInfo = null

  // 2. Try live fetch from open.er-api.com
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD')
    if (res.ok) {
      const data = await res.json()
      if (data && data.rates && data.rates.LKR) {
        baseRateInfo = {
          rates: data.rates,
          date: data.time_last_update_utc || new Date().toISOString(),
          source: 'open.er-api.com (live)',
          isStale: false,
        }

        // Cache successful rate in market_settings
        if (settingsCol) {
          await settingsCol.updateOne(
            { _id: 'fx_rates' },
            {
              $set: {
                rates: data.rates,
                date: baseRateInfo.date,
                updatedAt: new Date(),
                source: 'open.er-api.com',
              }
            },
            { upsert: true }
          )
        }
      }
    }
  } catch (err) {
    console.warn('Live FX fetch failed:', err.message)
  }

  // 3. Fallback to cached rate if live fetch failed
  if (!baseRateInfo && settingsCol) {
    const cached = await settingsCol.findOne({ _id: 'fx_rates' })
    if (cached && cached.rates && cached.rates.LKR) {
      baseRateInfo = {
        rates: cached.rates,
        date: cached.date || (cached.updatedAt ? new Date(cached.updatedAt).toISOString() : 'Unknown'),
        source: 'cached rate',
        isStale: true,
      }
    }
  }

  // 4. Ultimate fallback if DB has no cached rate
  if (!baseRateInfo) {
    baseRateInfo = {
      rates: { USD: 1, LKR: 320, EUR: 0.92, GBP: 0.78, AUD: 1.5, CAD: 1.35 },
      date: null,
      source: 'placeholder (no live or saved rate)',
      isStale: true,
      isFallback: true,
    }
  }

  // 5. Apply manual override if user configured one
  if (userSettings && userSettings.manualUsdToLkr && userSettings.manualUsdToLkr > 0) {
    const overrideLkr = Number(userSettings.manualUsdToLkr)
    baseRateInfo = {
      ...baseRateInfo,
      rates: {
        ...baseRateInfo.rates,
        LKR: overrideLkr,
      },
      isOverride: true,
      manualUsdToLkr: overrideLkr,
      source: `Manual override (${overrideLkr} LKR/USD)`,
    }
  }

  return baseRateInfo
}

// ── Convert Currency to LKR ──────────────────────────────────────────────
export function convertToLKR(amount, fromCurrency, fxRates) {
  if (!amount || amount <= 0) return 0
  const curr = (fromCurrency || 'USD').toUpperCase()
  if (curr === 'LKR') return Math.round(amount)

  const rates = fxRates?.rates || {}
  const lkrPerUsd = rates.LKR || 320
  const unitsPerUsd = rates[curr] || 1

  // Amount in USD = amount / unitsPerUsd
  // Amount in LKR = (amount / unitsPerUsd) * lkrPerUsd
  const usdVal = amount / unitsPerUsd
  const lkrVal = Math.round(usdVal * lkrPerUsd)
  return lkrVal
}

// ── Merchant Classifier ──────────────────────────────────────────────────
export function classifyMerchant(merchantName, linkUrl, brandName = '') {
  let hostname = ''
  if (linkUrl && linkUrl !== '#') {
    try {
      const parsed = new URL(linkUrl).hostname.toLowerCase().replace(/^www\./, '')
      if (parsed !== 'google.com' && !parsed.endsWith('.google.com')) {
        hostname = parsed
      }
    } catch {}
  }

  const mName = (merchantName || '').toLowerCase().trim()
  if (!hostname && mName.includes('.') && !mName.includes(' ')) {
    hostname = mName
  }

  const bName = (brandName || '').toLowerCase().trim()

  // 1. Check official store first
  if (bName && bName.length >= 2) {
    const containsBrand = containsWordBoundary(mName, bName) || (hostname && hostname.includes(bName))
    if (containsBrand) {
      const hasOfficialKeyword = OFFICIAL_KEYWORDS.some(k => containsWordBoundary(mName, k))
      if (hasOfficialKeyword || mName === bName) {
        return { classification: 'official-store', hostname, matchedOn: 'brand-official' }
      }
    }
  }

  // 2. Classify by hostname first
  if (hostname) {
    for (const d of LOCAL_DOMAINS) {
      if (hostname === d || hostname.endsWith(`.${d}`)) {
        return { classification: 'local', hostname, matchedOn: `domain:${d}` }
      }
    }
    for (const d of IMPORT_DOMAINS) {
      if (hostname === d || hostname.endsWith(`.${d}`)) {
        return { classification: 'import', hostname, matchedOn: `domain:${d}` }
      }
    }
  }

  // 3. Whole-word match on merchant name
  if (mName) {
    for (const name of LOCAL_MERCHANT_NAMES) {
      if (containsWordBoundary(mName, name)) {
        return { classification: 'local', hostname, matchedOn: `merchant:${name}` }
      }
    }
    for (const name of IMPORT_MERCHANT_NAMES) {
      if (containsWordBoundary(mName, name)) {
        return { classification: 'import', hostname, matchedOn: `merchant:${name}` }
      }
    }
  }

  return { classification: 'unknown', hostname, matchedOn: 'none' }
}

// ── Comparability Evaluator ──────────────────────────────────────────────
export function evaluateComparability(productName, offerTitle) {
  if (!productName || !offerTitle) {
    return { isComparable: false, reason: 'Missing product or offer title', overlapRatio: 0 }
  }

  const oTitleLower = offerTitle.toLowerCase()

  // 1. Accessory check
  for (const acc of ACCESSORY_WORDS) {
    if (containsWordBoundary(oTitleLower, acc)) {
      return { isComparable: false, reason: `Contains accessory term: "${acc}"`, overlapRatio: 0 }
    }
  }

  // 2. Token overlap check (>= 60%)
  const prodTokens = tokenize(productName).filter(t => t.length > 1)
  if (prodTokens.length === 0) {
    return { isComparable: true, reason: null, overlapRatio: 1 }
  }

  const offerTokens = new Set(tokenize(offerTitle))
  let sharedCount = 0
  for (const t of prodTokens) {
    if (offerTokens.has(t)) {
      sharedCount++
    }
  }

  const overlapRatio = Number((sharedCount / prodTokens.length).toFixed(2))
  if (overlapRatio < 0.60) {
    return {
      isComparable: false,
      reason: `Insufficient name match (${Math.round(overlapRatio * 100)}% < 60%)`,
      overlapRatio,
    }
  }

  return { isComparable: true, reason: null, overlapRatio }
}

// ── Outlier Removal (IQR Rule) ───────────────────────────────────────────
export function flagPriceOutliers(offers) {
  // Extract LKR prices of comparable offers
  const comparable = offers.filter(o => o.isComparable)
  if (comparable.length < 4) {
    return offers.map(o => ({ ...o, isOutlier: false, outlierReason: null }))
  }

  const prices = comparable.map(o => o.priceLkr).sort((a, b) => a - b)
  const q1Index = Math.floor(prices.length * 0.25)
  const q3Index = Math.floor(prices.length * 0.75)
  const q1 = prices[q1Index]
  const q3 = prices[q3Index]
  const iqr = q3 - q1
  const lowerBound = Math.max(0, q1 - 1.5 * iqr)
  const upperBound = q3 + 1.5 * iqr

  return offers.map(o => {
    if (!o.isComparable) return { ...o, isOutlier: false, outlierReason: null }
    if (o.priceLkr < lowerBound || o.priceLkr > upperBound) {
      return {
        ...o,
        isOutlier: true,
        outlierReason: `Price ${o.priceLkr.toLocaleString()} LKR is outside IQR range [${Math.round(lowerBound).toLocaleString()} - ${Math.round(upperBound).toLocaleString()}]`,
      }
    }
    return { ...o, isOutlier: false, outlierReason: null }
  })
}

// ── Landing Cost Formula ─────────────────────────────────────────────────
// base = offerPrice(in offer currency) x FX to LKR
// CIF = base + shippingEstimate
// duty = CIF x duty%
// VAT = (CIF + duty) x VAT%
// other = CIF x other%
// landed = CIF + duty + VAT + other
export function computeLandingCost(priceInCurrency, currency, fxRates, settings = {}) {
  const baseLkr = convertToLKR(priceInCurrency, currency, fxRates)
  const shippingEstimate = Number(settings.shippingEstimate || 0)
  const dutyPercent = Number(settings.dutyPercent || 0)
  const vatPercent = Number(settings.vatPercent || 0)
  const otherPercent = Number(settings.otherPercent || 0)

  const CIF = baseLkr + shippingEstimate
  const duty = Math.round(CIF * (dutyPercent / 100))
  const VAT = Math.round((CIF + duty) * (vatPercent / 100))
  const other = Math.round(CIF * (otherPercent / 100))
  const landedLkr = CIF + duty + VAT + other

  return {
    baseLkr,
    shippingEstimate,
    CIF,
    dutyPercent,
    duty,
    vatPercent,
    VAT,
    otherPercent,
    other,
    landedLkr,
    formulaNote: 'Rates vary by product category and change over time. Verify with Sri Lanka Customs.',
  }
}

// ── Marketplace Deep Links Generator ─────────────────────────────────────
export function generateManualCheckLinks(productName) {
  const q = encodeURIComponent(productName)
  return [
    { name: 'Daraz', url: `https://www.daraz.lk/catalog/?q=${q}`, icon: '🛒', local: true },
    { name: 'AliExpress', url: `https://www.aliexpress.com/wholesale?SearchText=${q}`, icon: '📦', local: false },
    { name: 'Temu', url: `https://www.temu.com/search_result.html?search_key=${q}`, icon: '🏷️', local: false },
    { name: 'Amazon', url: `https://www.amazon.com/s?k=${q}`, icon: '🅰️', local: false },
    { name: 'eBay', url: `https://www.ebay.com/sch/i.html?_nkw=${q}`, icon: '🛍️', local: false },
  ]
}
