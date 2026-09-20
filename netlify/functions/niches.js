// GET /api/niches — returns all available niches dynamically
// Frontend reads this once on load — no hardcoded niche lists anywhere in UI

import { cors, NICHE_MAP } from './_data.js'

export default async function handler(req, res) {
  if (res && typeof res.setHeader === 'function') {
    cors(res)
    if (req.method === 'OPTIONS') return res.status(200).end()

    const niches = Object.entries(NICHE_MAP).map(([key, cfg]) => ({
      key,
      label: cfg.label,
      icon:  cfg.icon,
    }))

    return res.status(200).json({ niches })
  }

  const headers = {}
  cors({ setHeader: (k, v) => headers[k] = v })

  if (req?.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  const niches = Object.entries(NICHE_MAP).map(([key, cfg]) => ({
    key,
    label: cfg.label,
    icon:  cfg.icon,
  }))

  return {
    statusCode: 200,
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ niches }),
  }
}

export { handler }
