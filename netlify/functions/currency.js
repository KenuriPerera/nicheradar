// Uses exchangerate-api.com free tier — 1500 requests/month free
// Falls back to frankfurter.app if primary fails — also free, no key needed

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Content-Type': 'application/json',
}

const SUPPORTED = ['USD', 'EUR', 'GBP', 'LKR', 'AUD', 'CAD']

const LKR_FALLBACK_RATE = 320 // approximate — updated by the secondary fetch

async function fetchRates(base = 'USD') {
  const NON_LKR = ['USD', 'EUR', 'GBP', 'AUD', 'CAD']

  try {
    // Frankfurter handles all except LKR
    const symbols = NON_LKR.filter(c => c !== base).join(',')
    const url = base === 'LKR'
      ? `https://api.frankfurter.app/latest?from=USD&to=${NON_LKR.filter(c => c !== 'USD').join(',')}`
      : `https://api.frankfurter.app/latest?from=${base}&to=${symbols.length ? symbols : 'EUR'}`

    const res  = await fetch(url)
    if (!res.ok) throw new Error('Frankfurter failed')
    const data = await res.json()

    let rates = { ...data.rates, [data.base]: 1 }

    // Fetch LKR via open.er-api.com
    const lkrRes  = await fetch(`https://open.er-api.com/v6/latest/USD`)
    const lkrData = lkrRes.ok ? await lkrRes.json() : null
    const lkrUSD  = lkrData?.rates?.LKR ?? LKR_FALLBACK_RATE

    if (base === 'LKR') {
      // Convert everything to LKR base
      const usdToLkr = lkrUSD
      const converted = {}
      NON_LKR.forEach(c => {
        if (c === 'USD') converted['USD'] = 1 / usdToLkr
        else converted[c] = (rates[c] ?? 1) / usdToLkr
      })
      converted['LKR'] = 1
      return { base: 'LKR', rates: converted, date: data.date }
    }

    // Add LKR to non-LKR base results
    const baseToUSD = base === 'USD' ? 1 : (1 / (rates['USD'] ?? 1))
    rates['LKR'] = lkrUSD * (base === 'USD' ? 1 : (rates['USD'] ? 1 / rates['USD'] : 1))

    // Recalculate LKR relative to base
    if (base !== 'USD') {
      const usdRate = data.rates['USD'] ?? 1
      rates['LKR'] = lkrUSD / (1 / usdRate)
    }

    return { base, rates, date: data.date }
  } catch {
    // Full fallback
    try {
      const res  = await fetch(`https://open.er-api.com/v6/latest/${base === 'LKR' ? 'USD' : base}`)
      if (!res.ok) throw new Error('All failed')
      const data = await res.json()
      const filtered = {}
      SUPPORTED.forEach(c => { if (data.rates[c]) filtered[c] = data.rates[c] })
      filtered[data.base] = 1
      return { base, rates: filtered, date: new Date().toISOString().split('T')[0] }
    } catch {
      return null
    }
  }
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  const base = (event.queryStringParameters?.base ?? 'USD').toUpperCase()
  if (!SUPPORTED.includes(base)) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: `Unsupported base. Use: ${SUPPORTED.join(', ')}` }),
    }
  }

  const result = await fetchRates(base)
  if (!result) {
    return {
      statusCode: 503,
      headers,
      body: JSON.stringify({ error: 'Exchange rate services unavailable. Try again shortly.' }),
    }
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      base:       result.base,
      rates:      result.rates,
      currencies: SUPPORTED,
      date:       result.date,
      fetchedAt:  new Date().toISOString(),
    }),
  }
}
