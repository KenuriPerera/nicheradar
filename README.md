# NicheRadar

AI-powered viral trend intelligence for TikTok & Instagram creators.
Built with React (Vite) + Netlify Functions + Supabase + free live data APIs.

---

## What it does

- Dashboard — live viral scores across all your niches
- Analyze — deep hashtag, audio, format and timing analysis
- Compare — TikTok vs Instagram head-to-head for any niche
- Hashtags — live hashtag extraction and viral prediction
- History — track how hashtag viral scores change over time

---

## Tech stack

| Layer | Technology |
|---|---|---|
| Frontend | React + Vite | 
| Hosting | Netlify | 
| Functions | Netlify Serverless | 
| Database | Supabase Postgres | 
| Data sources | Reddit API + YouTube Data API | 

---

## Data sources

- Reddit API — no key needed, live data
- YouTube Data API v3 — free 10,000 units/day
- No AI cost — pure algorithm-based scoring

---

## Environment variables

Add these in Netlify → Site settings → Environment variables:

YOUTUBE_API_KEY = AIzaSyYOUR_KEY
SUPABASE_URL = https://xxxx.supabase.co
SUPABASE_SERVICE_KEY = your-service-role-key


---

## Local development

```bash
npm install
cp .env.example .env.local
# fill in your keys in .env.local
npm install -g netlify-cli
netlify dev
```

---

## Deploy

1. Push to GitHub
2. Connect repo on netlify.com
3. Add environment variables
4. Deploy
5. Visit /api/migrate once to create the database table

---

## Project structure

nicheradar/
├── netlify/
│ └── functions/
│ ├── _data.js # Reddit + YouTube data fetchers
│ ├── _db.js # Supabase database queries
│ ├── analyze.js # POST /api/analyze
│ ├── compare.js # POST /api/compare
│ ├── dashboard.js # GET /api/dashboard
│ ├── hashtags.js # POST /api/hashtags
│ ├── history.js # GET /api/history
│ └── migrate.js # GET /api/migrate (run once)
├── src/
│ ├── components/
│ ├── pages/
│ └── utils/
├── netlify.toml
└── package.json


---

