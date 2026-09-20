// Uses exchangerate-api.com free tier — 1500 requests/month free
// Falls back to frankfurter.app if primary fails — also free, no key needed

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Content-Type': 'application/json',
}

const SUPPORTED = ['USD', 'EUR', 'GBP', 'LKR', 'AUD', 'CAD']

async function fetchRates(base = 'USD') {
  // Primary: frankfurter.app — free, no key, maintained by ECB data
  try {
    const symbols = SUPPORTED.filter(c => c !== base).join(',')
    const res = await fetch(`https://api.frankfurter.app/latest?from=${base}&to=${symbols}`)
    if (!res.ok) throw new Error('Primary failed')
    const data = await res.json()
    return { base: data.base, rates: { [base]: 1, ...data.rates }, date: data.date }
  } catch {
    // Fallback: exchangerate-api open endpoint
    try {
      const res = await fetch(`https://open.er-api.com/v6/latest/${base}`)
      if (!res.ok) throw new Error('Fallback failed')
      const data = await res.json()
      const filtered = {}
      SUPPORTED.forEach(c => { if (data.rates[c]) filtered[c] = data.rates[c] })
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
