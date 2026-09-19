# NicheRadar

AI-powered viral trend intelligence for TikTok & Instagram creators.
Built with React (Vite) + Vercel Serverless + free live data APIs + Claude AI.

---

## How data works (free tier architecture)

```
Reddit API (free, no key)  ──┐
                              ├──▶  Vercel backend  ──▶  Claude Haiku (synthesis)  ──▶  UI
YouTube Data API (free key) ──┘
```

- Reddit and YouTube fetch live data for free — no scraping limits
- Claude Haiku only synthesizes/scores the data (not searching) — ~$0.0003 per call
- No TikTok/Instagram API needed — YouTube signals closely mirror both platforms

---

## What's free and what's not

| Source         | Cost       | What it gives you                        |
|----------------|------------|------------------------------------------|
| Reddit API     | Free       | Hot posts, engagement, community trends  |
| YouTube API    | Free*      | Trending videos, titles, channels        |
| Claude Haiku   | ~$0.0003/call | Scores, predictions, format advice  |
| Vercel hosting | Free       | Serverless deployment, auto-scaling      |
| GitHub         | Free       | Version control, CI/CD trigger           |

*YouTube: 10,000 units/day free. Each search = 100 units → 100 free trend checks/day.

---

## Deploy in 5 steps

### 1. Push to GitHub
```bash
git init
git add .
git commit -m "init: NicheRadar"
git remote add origin https://github.com/YOUR_USERNAME/nicheradar.git
git push -u origin main
```

### 2. Connect Vercel (free)
- Go to https://vercel.com → New Project
- Import your GitHub repo
- Framework: **Vite** | Build: `npm run build` | Output: `dist`

### 3. Add environment variables in Vercel
Project → Settings → Environment Variables:
```
ANTHROPIC_API_KEY  =  sk-ant-xxxxxxxxx   ← required
YOUTUBE_API_KEY    =  AIzaSyxxxxxxx      ← strongly recommended (free)
```

**Getting your YouTube API key (free, 2 minutes):**
1. Go to https://console.cloud.google.com
2. Create a project → Enable "YouTube Data API v3"
3. Credentials → Create API Key → copy it

**Getting your Anthropic key (free $5 credit):**
1. Go to https://console.anthropic.com
2. API Keys → Create Key → copy it

### 4. Deploy → get your live URL in ~60 seconds

### 5. Local development
```bash
npm install
cp .env.example .env.local
# fill in your keys
npm install -g vercel
vercel dev   # runs both frontend + API locally
```

---

## Project structure

```
nicheradar/
├── api/
│   ├── _claude.js       # Free data fetchers + Claude synthesis helper
│   ├── analyze.js       # POST /api/analyze  — deep niche analysis
│   ├── compare.js       # POST /api/compare  — TikTok vs Instagram
│   └── dashboard.js     # GET  /api/dashboard — all 5 niches overview
├── src/
│   ├── components/      # Layout, ScoreRing, PlatformBadge, Skeleton
│   ├── pages/           # Dashboard, Analyze, Compare
│   └── utils/api.js     # Frontend fetch helpers
├── .env.example
├── vercel.json
└── package.json
```

---

## Usage limits (free tier)

| What          | Free limit           | What happens if exceeded        |
|---------------|---------------------|---------------------------------|
| YouTube API   | 10,000 units/day    | Falls back to Reddit-only mode  |
| Reddit API    | Soft limit ~60 req/min | Add 1s delay between requests |
| Anthropic     | $5 free credit      | Pay-as-you-go after (~$0.0003/call) |
| Vercel        | 100GB bandwidth/mo  | Upgrade plan ($20/mo)           |

For personal use you will never hit any of these limits.
