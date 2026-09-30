const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Content-Type': 'application/json',
}

// Colormind API — completely free, no key needed
async function generatePalette(model = 'default', input = []) {
  // Try http first, fall back to generating locally if blocked
  try {
    const res = await fetch('http://colormind.io/api/', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ model, input }),
    })
    const text = await res.text()
    // Check if response is HTML (blocked)
    if (text.trim().startsWith('<')) {
      console.log('Colormind blocked — using local generation')
      return generateLocalPalette(input)
    }
    const data = JSON.parse(text)
    return data.result
  } catch (e) {
    console.log('Colormind error:', e.message, '— using local generation')
    return generateLocalPalette(input)
  }
}

// Local palette generation — no external API needed
function generateLocalPalette(seeds = []) {
  const palette = []
  for (let i = 0; i < 5; i++) {
    if (Array.isArray(seeds[i])) {
      // Use seed with slight variation
      palette.push(seeds[i].map(v =>
        Math.min(255, Math.max(0, v + Math.floor(Math.random() * 30 - 15)))
      ))
    } else {
      // Generate harmonious random color
      const hue = (Math.random() * 360)
      palette.push(hslToRgb(hue, 0.4 + Math.random() * 0.4, 0.3 + Math.random() * 0.5))
    }
  }
  return palette
}

function hslToRgb(h, s, l) {
  h = h / 360
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  return [
    Math.round(hue2rgb(p, q, h + 1/3) * 255),
    Math.round(hue2rgb(p, q, h)       * 255),
    Math.round(hue2rgb(p, q, h - 1/3) * 255),
  ]
}

function hue2rgb(p, q, t) {
  if (t < 0) t += 1
  if (t > 1) t -= 1
  if (t < 1/6) return p + (q - p) * 6 * t
  if (t < 1/2) return q
  if (t < 2/3) return p + (q - p) * (2/3 - t) * 6
  return p
}

// Convert RGB array to hex
function toHex([r, g, b]) {
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')
}

// Generate color name from hex (approximation)
function colorName(hex) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)

  if (r > 200 && g < 100 && b < 100) return 'Red'
  if (r > 200 && g > 150 && b < 100) return 'Orange'
  if (r > 200 && g > 200 && b < 100) return 'Yellow'
  if (r < 100 && g > 150 && b < 100) return 'Green'
  if (r < 100 && g > 150 && b > 150) return 'Teal'
  if (r < 100 && g < 100 && b > 150) return 'Blue'
  if (r > 100 && g < 100 && b > 150) return 'Purple'
  if (r > 150 && g < 100 && b > 100) return 'Pink'
  if (r > 180 && g > 180 && b > 180) return 'Light'
  if (r < 80  && g < 80  && b < 80)  return 'Dark'
  if (r > 120 && g > 100 && b < 80)  return 'Brown'
  if (Math.abs(r-g) < 20 && Math.abs(g-b) < 20) return 'Neutral'
  return 'Mixed'
}

// Determine if color is light or dark (for text contrast)
function isLight([r, g, b]) {
  return (0.299 * r + 0.587 * g + 0.114 * b) > 128
}

// Generate palette metadata
function buildPaletteData(rgbColors, paletteName) {
  return rgbColors.map(rgb => {
    const hex = toHex(rgb)
    return {
      hex,
      rgb:       { r: rgb[0], g: rgb[1], b: rgb[2] },
      name:      colorName(hex),
      isLight:   isLight(rgb),
      textColor: isLight(rgb) ? '#000000' : '#ffffff',
    }
  })
}

// Niche-specific aesthetic palettes
const NICHE_PALETTES = {
  skincare:   { name: 'Skincare Aesthetic',  seeds: [[255,240,230], 'N', [200,170,150], 'N', [240,220,200]] },
  stationery: { name: 'Pastel Journal',      seeds: [[255,240,245], 'N', [200,220,255], 'N', [220,255,220]] },
  fashion:    { name: 'Editorial Fashion',   seeds: [[20,20,20],    'N', [180,160,140], 'N', [240,235,230]] },
  food:       { name: 'Food & Warmth',       seeds: [[255,200,100], 'N', [200,80,60],   'N', [255,240,200]] },
  travel:     { name: 'Wanderlust',          seeds: [[50,130,180],  'N', [240,200,100], 'N', [200,230,240]] },
  fitness:    { name: 'Energy & Motion',     seeds: [[255,80,0],    'N', [20,20,40],    'N', [200,200,200]] },
  books:      { name: 'Dark Academia',       seeds: [[60,40,20],    'N', [140,110,80],  'N', [240,230,210]] },
  wellness:   { name: 'Calm & Restore',      seeds: [[200,230,210], 'N', [240,245,240], 'N', [100,160,130]] },
  tech:       { name: 'Digital Minimal',     seeds: [[10,10,20],    'N', [0,150,255],   'N', [240,240,255]] },
  art:        { name: 'Creative Studio',     seeds: [[255,60,100],  'N', [255,200,0],   'N', [60,60,200]]   },
  movies:     { name: 'Cinema Dark',         seeds: [[10,10,15],    'N', [180,140,100], 'N', [240,230,210]] },
  gaming:     { name: 'Neon Gaming',         seeds: [[0,255,150],   'N', [10,10,30],    'N', [200,0,255]]   },
  finance:    { name: 'Trust & Growth',      seeds: [[0,80,40],     'N', [200,220,200], 'N', [240,245,240]] },
  pets:       { name: 'Warm & Playful',      seeds: [[255,200,100], 'N', [200,150,100], 'N', [255,240,220]] },
}

const generateRandom = (count = 5) => {
  const palettes = []
  const configs = [
    { name: 'Complementary',  hues: [0, 30, 180, 210, 330] },
    { name: 'Analogous',      hues: [200, 220, 240, 260, 280] },
    { name: 'Triadic',        hues: [0, 120, 240, 60, 180] },
    { name: 'Monochromatic',  hues: [260, 260, 260, 260, 260] },
    { name: 'Split Complement',hues: [0, 150, 210, 30, 330] },
  ]
  for (const cfg of configs.slice(0, count)) {
    const colors = cfg.hues.map((h, i) =>
      hslToRgb(h, 0.5 + i * 0.05, 0.3 + i * 0.1)
    )
    palettes.push({
      name:   cfg.name,
      colors: buildPaletteData(colors, cfg.name),
      type:   'random',
    })
  }
  return palettes
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' }

  const params     = event.queryStringParameters ?? {}
  const action     = params.action ?? 'generate'
  const niche      = params.niche  ?? null
  const seedHex    = params.seed   ?? null    // optional hex seed color
  const count      = Math.min(5, parseInt(params.count ?? '5'))

  try {
    const palettes = []

    if (action === 'niche' && niche && NICHE_PALETTES[niche]) {
      // Generate niche-specific palette
      const nicheCfg = NICHE_PALETTES[niche]
      const rgb = await generatePalette('default', nicheCfg.seeds)
      palettes.push({
        name:     nicheCfg.name,
        niche,
        colors:   buildPaletteData(rgb, nicheCfg.name),
        type:     'niche',
      })

      // Also generate a random variation
      const rgb2 = await generatePalette('default', nicheCfg.seeds.map(s =>
        s === 'N' ? 'N' : s.map(v => Math.min(255, v + Math.floor(Math.random() * 40 - 20)))
      ))
      palettes.push({
        name:     nicheCfg.name + ' Variation',
        niche,
        colors:   buildPaletteData(rgb2, nicheCfg.name + ' Alt'),
        type:     'variation',
      })

    } else if (action === 'seed' && seedHex) {
      // Generate from seed color
      const hex    = seedHex.replace('#', '')
      const r      = parseInt(hex.slice(0, 2), 16)
      const g      = parseInt(hex.slice(2, 4), 16)
      const b      = parseInt(hex.slice(4, 6), 16)
      const seed   = [[r, g, b], 'N', 'N', 'N', 'N']

      for (let i = 0; i < 3; i++) {
        const rgb = await generatePalette('default', seed)
        palettes.push({
          name:   `Palette ${i + 1}`,
          colors: buildPaletteData(rgb, `Palette ${i + 1}`),
          type:   'seed',
        })
      }

    } else {
      const generated = generateRandom(count)
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          palettes:    generated,
          action:      'generate',
          generatedAt: new Date().toISOString(),
        }),
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        palettes,
        action,
        niche:     niche ?? null,
        generatedAt: new Date().toISOString(),
      }),
    }
  } catch (e) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: e.message }),
    }
  }
}
