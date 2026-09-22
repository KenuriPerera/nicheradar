# NicheRadar 🎯
AI-powered viral trend intelligence for content creators.
Track hashtags, analyze trends, find opportunities — all in one place.

## Features
- **Dashboard** — live viral scores across 15 niches
- **Analyze** — deep hashtag and format analysis per niche
- **Compare** — TikTok vs Instagram head-to-head
- **Hashtags** — live extraction and viral prediction
- **History** — trend tracking over time powered by Supabase
- **Intelligence** — cross-niche momentum, signals and opportunities
- **Content Analyzer** — Gemini AI video analysis with platform predictions
- **Trending Posts** — top posts, videos and audio signals with direct links
- **Monetize** — Ko-fi, Gumroad, Payhip strategies per niche
- **Posting Times** — best times to post on TikTok, Instagram, YouTube, Pinterest
- **Currency** — live exchange rates with LKR first
- **Home** — features overview, API quota tracker and system health check

## Tech Stack
- **Frontend:** React + Vite + Tailwind CSS + Recharts + Lucide React
- **Hosting:** Netlify free tier (serverless functions)
- **Databases:** Supabase PostgreSQL (hashtag history) + MongoDB Atlas (data cache)
- **AI:** Google Gemini 2.0 Flash (video analysis, 15 req/day free)
- **Data Sources:** YouTube Data API v3, NewsAPI, Hacker News API

## Niches Tracked (15)
Skincare · Movies · Quotes · Books · Reviews · Fashion · Fitness · Food · Travel · Tech · Wellness · Pets · Gaming · Art · Finance

## Environment Variables Required
See `.env.local.example` for the full list of required keys.
**Never commit actual API keys to GitHub.**

## Local Setup
1. Clone the repository
2. Copy `.env.local.example` to `.env.local`
3. Fill in your API keys (see Data Sources table below)
4. Run `npm install`
5. Run `netlify dev`
6. Open `http://localhost:8888`

## Deployment
1. Create a free Netlify account at netlify.com
2. Connect your GitHub repository
3. Set Production visibility to **Public**
4. Set Branch deploys to **None** and Deploy Previews to **None**
5. Add all environment variables in Netlify dashboard
6. Deploy — takes 2-3 minutes
7. Visit `/api/migrate` once after deploy to create Supabase tables
8. Lock auto-publishing to preserve build minutes

## Data Sources
| Source | Free Limit | Reset | Signup |
|---|---|---|---|
| YouTube Data API v3 | 10,000 units/day | Daily 1:30pm SL time | console.cloud.google.com |
| NewsAPI | 100 requests/day | Daily midnight UTC | newsapi.org |
| Hacker News API | Unlimited | Never | No signup needed |
| Gemini AI | 15 requests/day | Daily 1:30pm SL time | aistudio.google.com |
| Supabase | 500MB storage | Monthly | supabase.com |
| MongoDB Atlas | 512MB storage | Monthly | mongodb.com/atlas |
| Frankfurter Exchange Rates | Unlimited | Never | No signup needed |
