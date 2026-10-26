import { headers } from './_cliptube.js'

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  // Click-only extras will be implemented in Phase 2 & 3
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ message: 'ClipTube AI extras endpoint ready' })
  }
}
