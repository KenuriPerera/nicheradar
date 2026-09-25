const headers = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
}

const BASE_URL = process.env.URL ?? 'http://localhost:8888'

const TESTS = [
  {
    name:    'Niches API',
    fn:      'niches',
    method:  'GET',
    params:  '',
    check:   d => Array.isArray(d?.niches) && d.niches.length > 0,
    apiCost: 'zero',
  },
  {
    name:    'Currency API',
    fn:      'currency',
    method:  'GET',
    params:  '',
    check:   d => d?.rates && Object.keys(d.rates).length > 0,
    apiCost: 'zero — frankfurter unlimited',
  },
  {
    name:    'Posting Times',
    fn:      'posting-times',
    method:  'GET',
    params:  '',
    check:   d => d?.platforms && Object.keys(d.platforms).length > 0,
    apiCost: 'zero — static data',
  },
  {
    name:    'Monetize API',
    fn:      'monetize',
    method:  'GET',
    params:  '?niche=skincare',
    check:   d => d?.platforms?.length > 0,
    apiCost: 'zero — static data',
  },
  {
    name:    'Quota Status',
    fn:      'quota-status',
    method:  'GET',
    params:  '',
    check:   d => Array.isArray(d?.status) && d.status.length > 0,
    apiCost: 'zero — Supabase read',
  },
  {
    name:    'Supabase History',
    fn:      'history',
    method:  'GET',
    params:  '?niche=skincare&days=1',
    check:   d => d !== null && !d?.error?.includes('not connected'),
    apiCost: 'zero — Supabase read',
  },
  {
    name:    'Daily Summaries',
    fn:      'daily-summaries',
    method:  'GET',
    params:  '',
    check:   d => Array.isArray(d?.summaries),
    apiCost: 'zero — MongoDB read',
  },
  {
    name:    'MongoDB Cache',
    fn:      'daily-summaries',
    method:  'GET',
    params:  '',
    check:   d => d?.fetchedAt !== undefined,
    apiCost: 'zero — MongoDB read',
  },
  {
    name:    'SerpAPI Quota',
    fn:      'serp-insights',
    method:  'GET',
    params:  '?type=quota',
    check:   d => d?.quota !== undefined,
    apiCost: 'zero — quota check uses no searches',
  },
  {
    name:    'Improv Cache',
    fn:      'improv',
    method:  'GET',
    params:  '?feature=hooks',
    check:   d => d !== null,
    apiCost: 'zero — MongoDB read',
  },
]

async function runTest(test) {
  const start = Date.now()
  try {
    const url = `${BASE_URL}/.netlify/functions/${test.fn}${test.params}`
    const res = await fetch(url, {
      method:  test.method,
      headers: { 'Content-Type': 'application/json' },
      signal:  AbortSignal.timeout(10000),
    })
    const data    = await res.json().catch(() => null)
    const elapsed = Date.now() - start
    const passed  = res.ok && test.check(data)

    return {
      name:    test.name,
      passed,
      status:  res.status,
      elapsed: `${elapsed}ms`,
      apiCost: test.apiCost,
      error:   passed ? null : `HTTP ${res.status} — check failed`,
    }
  } catch (e) {
    return {
      name:    test.name,
      passed:  false,
      status:  0,
      elapsed: `${Date.now() - start}ms`,
      apiCost: test.apiCost,
      error:   e.message,
    }
  }
}

async function sendAlertEmail(failed, passed, total) {
  const serviceId  = process.env.EMAILJS_SERVICE_ID
  const templateId = process.env.EMAILJS_TEMPLATE_ID
  const publicKey  = process.env.EMAILJS_PUBLIC_KEY
  const toEmail    = process.env.EMAILJS_TO_EMAIL

  if (!serviceId || !templateId || !publicKey || !toEmail) {
    console.log('EmailJS not configured — skipping email')
    return false
  }

  const failedList = failed.map(t =>
    `• ${t.name} — ${t.error} (${t.elapsed})`
  ).join('\n')

  const passedList = passed.map(t =>
    `✅ ${t.name} (${t.elapsed})`
  ).join('\n')

  try {
    const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service_id:  serviceId,
        template_id: templateId,
        user_id:     publicKey,
        template_params: {
          to_email:     toEmail,
          subject:      `🚨 NicheRadar Alert — ${failed.length} of ${total} functions failing`,
          date:         new Date().toLocaleString('en-US', { timeZone: 'Asia/Colombo' }),
          failed_count: String(failed.length),
          passed_count: String(passed.length),
          total_count:  String(total),
          failed_list:  failedList || 'None',
          passed_list:  passedList || 'None',
          app_url:      BASE_URL,
          api_cost:     'Zero quota used by this health check',
        },
      }),
    })
    console.log('Email sent:', res.status)
    return res.ok
  } catch (e) {
    console.log('Email failed:', e.message)
    return false
  }
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  const isScheduled = event.headers?.['x-netlify-event'] === 'schedule'
  console.log(`=== Health Check Started (${isScheduled ? 'scheduled' : 'manual'}) ===`)
  console.log('Time (SL):', new Date().toLocaleString('en-US', { timeZone: 'Asia/Colombo' }))

  // Run all tests sequentially
  const results = []
  for (const test of TESTS) {
    const result = await runTest(test)
    results.push(result)
    console.log(`${result.passed ? '✅' : '❌'} ${result.name} — ${result.elapsed}`)
  }

  const passed  = results.filter(r => r.passed)
  const failed  = results.filter(r => !r.passed)
  const allGood = failed.length === 0

  const summary = {
    date:        new Date().toISOString(),
    dateSL:      new Date().toLocaleString('en-US', { timeZone: 'Asia/Colombo' }),
    total:       results.length,
    passed:      passed.length,
    failed:      failed.length,
    allGood,
    apiCostNote: 'Zero YouTube/NewsAPI/Gemini quota used',
  }

  // Send email only when something breaks
  let emailSent = false
  if (!allGood) {
    console.log(`❌ ${failed.length} tests failed — sending alert`)
    emailSent = await sendAlertEmail(failed, passed, results.length)
  } else {
    console.log('✅ All tests passed — no alert needed')
  }

  console.log('=== Health Check Complete ===')

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ summary, results, emailSent }),
  }
}
