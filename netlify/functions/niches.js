import { NICHE_MAP } from './_data.js'

export const handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Content-Type': 'application/json',
  }

  if (event?.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  const niches = Object.entries(NICHE_MAP).map(([key, cfg]) => ({
    key,
    label: cfg.label,
    icon:  cfg.icon,
  }))

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ niches }),
  }
}
