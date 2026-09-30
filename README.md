# NicheRadar 🎯

A real-time trend intelligence and content discovery platform for digital creators, marketers, and researchers. Track emerging viral signals, analyze content formats, compare platform momentum, and uncover monetization opportunities.

## Core Features
- **Dashboard**
- **Trend Analyzer**
- **Platform Comparison**
- **Hashtag Intelligence**
- **Historical Analytics**
- **Cross-Platform Intelligence**
- **AI Content Analyzer**
- **Trending Media & Signals**
- **Monetization Insights**
- **Posting Schedule Predictor**
- **Global Currency Converter**
- **API Quota & System Health Tracker**

## Tech Stack
- **Frontend:** React + Vite + Tailwind CSS + Recharts + Lucide Icons
- **Backend:** Netlify Serverless Functions
- **Databases:** Supabase PostgreSQL + MongoDB Atlas
- **AI Engine:** Google Gemini AI
- **Data Integrations:** YouTube Data API, NewsAPI, Hacker News, Dev.to, TMDB, Open Library, iTunes Podcasts, 4chan

## Environment Variables
Ensure all required environment keys are defined in your local environment file (`.env.local`). Refer to `.env.local.example` for the complete list of keys.

## Local Setup
1. Clone the repository
2. Copy `.env.local.example` to `.env.local` and populate keys
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start the local development server:
   ```bash
   netlify dev
   ```
5. Open `http://localhost:8888`

## Deployment
1. Connect the repository to Netlify
2. Configure required environment variables in the Netlify Dashboard
3. Deploy build
