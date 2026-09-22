# NicheRadar 🎯

AI-powered viral trend intelligence for content creators.
Track hashtags, analyze trends, find opportunities — all in one place.

## Live URL
https://YOUR-NETLIFY-URL.netlify.app

## Features
- **Dashboard** — live viral scores across 15 niches
- **Analyze** — deep hashtag and format analysis per niche
- **Compare** — TikTok vs Instagram head-to-head
- **Hashtags** — live extraction and viral prediction
- **History** — trend tracking over time
- **Intelligence** — cross-niche momentum and opportunities
- **Content Analyzer** — AI video analysis with platform predictions
- **Trending Posts** — top posts, videos and audio signals
- **Monetize** — Ko-fi, Gumroad, Payhip strategies per niche
- **Posting Times** — best times to post per platform
- **Currency** — live exchange rates with LKR first
- **Home** — features overview and API quota tracker

## Tech Stack
- **Frontend:** React + Vite + Tailwind CSS
- **Hosting:** Netlify free tier
- **Functions:** Netlify Serverless
- **Database:** Supabase + MongoDB Atlas
- **AI:** Google Gemini
- **Data:** YouTube, NewsAPI, Hacker News

## Environment Variables Required
See `.env.local.example` for the list of required keys.
Never commit actual API keys to GitHub.

## Setup
1. Clone the repository
2. Copy `.env.local.example` to `.env.local`
3. Fill in your API keys
4. Run `npm install`
5. Run `netlify dev`

## Deployment
1. Create a Netlify account
2. Connect your GitHub repository
3. Add environment variables in Netlify dashboard
4. Deploy
5. Visit `/api/migrate` once after deploy
6. Lock auto-publishing to preserve build minutes

## Data Sources
| Source | Free Limit | Signup |
|---|---|---|
| YouTube Data API | 10,000 units/day | console.cloud.google.com |
| NewsAPI | 100 requests/day | newsapi.org |
| Hacker News API | Unlimited | No signup needed |
| Gemini AI | 15 requests/day | aistudio.google.com |
| Supabase | 500MB storage | supabase.com |
| MongoDB Atlas | 512MB storage | mongodb.com/atlas |
| Frankfurter | Unlimited | No signup needed |

## Architecture
- Daily master scan scheduled at 2pm UTC
- Smart niche tiers ranked by historical performance
- MongoDB cache — functions read from cache first
- Zero API calls after daily scan until next reset
- Automated health check with email alerts
