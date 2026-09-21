const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Content-Type': 'application/json',
}

const GEMINI_MODEL = 'gemini-1.5-flash' // free tier model

// Upload file to Gemini Files API then analyze
async function analyzeVideoFile(base64Data, mimeType) {
  const key = process.env.GEMINI_API_KEY
  if (!key) throw new Error('GEMINI_API_KEY not set')

  // Step 1 — Upload to Gemini Files API
  const uploadRes = await fetch(
    `https://generativelanguage.googleapis.com/upload/v1beta/files?uploadType=multipart&key=${key}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': `${mimeType}`,
        'X-Goog-Upload-Protocol': 'raw',
      },
      body: Buffer.from(base64Data, 'base64'),
    }
  )
  if (!uploadRes.ok) {
    const err = await uploadRes.json()
    throw new Error(`Gemini upload failed: ${err?.error?.message ?? uploadRes.status}`)
  }
  const uploadData = await uploadRes.json()
  const fileUri    = uploadData.file?.uri
  if (!fileUri) throw new Error('No file URI returned from Gemini')

  // Wait for file to be processed
  await new Promise(r => setTimeout(r, 3000))

  return analyzeWithGemini({ fileUri, mimeType })
}

// Analyze a YouTube/TikTok URL via Gemini
async function analyzeVideoURL(url) {
  const key = process.env.GEMINI_API_KEY
  if (!key) throw new Error('GEMINI_API_KEY not set')

  // For URLs we use the inline URL approach
  return analyzeWithGemini({ url })
}

async function analyzeWithGemini({ fileUri, mimeType, url }) {
  const key = process.env.GEMINI_API_KEY

  const videoPart = fileUri
    ? { fileData: { mimeType, fileUri } }
    : { text: `Analyze this video: ${url}` }

  const prompt = `You are an expert social media content analyst and video editor. Analyze this video thoroughly and return ONLY a valid JSON object with no markdown, no prose.

Return this exact structure:
{
  "overview": {
    "title": "inferred title or topic of the video",
    "duration": "estimated or actual duration",
    "category": "content category",
    "niche": "closest niche: skincare|movies|quotes|books|reviews|fashion|fitness|food|travel|tech|wellness|pets|gaming|art|finance",
    "summary": "2-3 sentence summary of what this video is about"
  },
  "content": {
    "hook": "describe the opening hook — first 3 seconds",
    "structure": ["section 1 description", "section 2 description"],
    "callToAction": "what CTA is used if any",
    "tone": "educational|entertaining|inspiring|funny|controversial|aesthetic",
    "pacing": "fast|medium|slow",
    "hasVoiceover": true or false,
    "hasFaceOnCamera": true or false,
    "hasTextOverlay": true or false,
    "hasSubtitles": true or false
  },
  "editing": {
    "style": "describe the overall editing style in one sentence",
    "techniques": ["technique 1", "technique 2", "technique 3"],
    "transitions": "cut types and transition styles used",
    "colorGrading": "describe the color palette and grading",
    "musicStyle": "describe the audio/music style",
    "paceScore": 0-100
  },
  "platformPredictions": {
    "tiktok": {
      "score": 0-100,
      "verdict": "one sentence prediction",
      "strengths": ["strength 1", "strength 2"],
      "weaknesses": ["weakness 1"]
    },
    "instagram": {
      "score": 0-100,
      "verdict": "one sentence prediction",
      "strengths": ["strength 1", "strength 2"],
      "weaknesses": ["weakness 1"]
    },
    "youtube": {
      "score": 0-100,
      "verdict": "one sentence prediction",
      "strengths": ["strength 1"],
      "weaknesses": ["weakness 1", "weakness 2"]
    },
    "pinterest": {
      "score": 0-100,
      "verdict": "one sentence prediction",
      "strengths": ["strength 1"],
      "weaknesses": ["weakness 1"]
    }
  },
  "improvements": [
    {
      "priority": "high|medium|low",
      "area": "Hook|Pacing|Audio|Visuals|CTA|Caption|Hashtags|Format",
      "issue": "what is the specific problem",
      "fix": "exact actionable fix — one sentence"
    }
  ],
  "hashtags": ["suggested1", "suggested2", "suggested3", "suggested4", "suggested5"],
  "bestPlatform": "tiktok|instagram|youtube|pinterest",
  "overallScore": 0-100
}`

  const body = {
    contents: [{
      parts: [
        videoPart,
        { text: prompt }
      ]
    }],
    generationConfig: {
      temperature:     0.3,
      maxOutputTokens: 2000,
    }
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`,
    {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    }
  )

  if (!res.ok) {
    const err = await res.json()
    throw new Error(`Gemini error: ${err?.error?.message ?? res.status}`)
  }

  const data = await res.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
  const clean = text.replace(/```json|```/g, '').trim()

  try {
    return JSON.parse(clean)
  } catch {
    throw new Error('Gemini returned malformed JSON: ' + clean.slice(0, 200))
  }
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' }
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'POST only' }) }

  try {
    const body = JSON.parse(event.body ?? '{}')

    let result

    if (body.url) {
      // URL mode — YouTube or TikTok link
      result = await analyzeVideoURL(body.url)
    } else if (body.fileData && body.mimeType) {
      // File upload mode — base64 encoded video
      result = await analyzeVideoFile(body.fileData, body.mimeType)
    } else {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Provide either url or fileData + mimeType' })
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ ...result, analyzedAt: new Date().toISOString() })
    }
  } catch (e) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: e.message })
    }
  }
}
