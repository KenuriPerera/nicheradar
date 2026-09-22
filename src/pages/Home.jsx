import { useNavigate } from 'react-router-dom'
import { Radio, TrendingUp, Hash, BarChart2, Brain, Flame, Video, DollarSign, Clock, RefreshCw } from 'lucide-react'
import QuotaPanel from '../components/QuotaPanel'

const FEATURES = [
  { icon: TrendingUp, label: 'Dashboard',      path: '/',              desc: 'Live viral scores across all 15 niches'          },
  { icon: BarChart2,  label: 'Analyze',         path: '/analyze',       desc: 'Deep hashtag and format analysis per niche'       },
  { icon: BarChart2,  label: 'Compare',          path: '/compare',       desc: 'TikTok vs Instagram head-to-head'                 },
  { icon: Hash,       label: 'Hashtags',         path: '/hashtags',      desc: 'Live hashtag extraction and viral prediction'      },
  { icon: Clock,      label: 'History',          path: '/history',       desc: 'Track hashtag trends over time'                   },
  { icon: Brain,      label: 'Intelligence',     path: '/intelligence',  desc: 'Cross-niche momentum and opportunity finder'      },
  { icon: Video,      label: 'Content Analyzer', path: '/content-analyzer', desc: 'AI video analysis with platform predictions'  },
  { icon: Flame,      label: 'Trending Posts',   path: '/trending-posts',desc: 'Top posts, videos and audio — live'              },
  { icon: DollarSign, label: 'Monetize',         path: '/monetize',      desc: 'Ko-fi, Gumroad, Payhip strategies per niche'     },
  { icon: Clock,      label: 'Posting Times',    path: '/posting-times', desc: 'Best times to post on each platform'             },
  { icon: RefreshCw,  label: 'Currency',         path: '/currency',      desc: 'Live exchange rates for creator earnings'         },
]

export default function Home() {
  const nav = useNavigate()

  return (
    <div className="min-h-screen bg-radar-bg">
      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-radar-accent/10 via-transparent to-radar-accent2/5" />
        <div className="relative max-w-4xl mx-auto px-8 py-20 text-center space-y-6">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-radar-accent flex items-center justify-center glow-accent">
              <Radio className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-white">NicheRadar</h1>
          </div>
          <p className="text-xl text-radar-muted max-w-2xl mx-auto leading-relaxed">
            AI-powered viral trend intelligence for content creators.
            Track hashtags, analyze trends, find opportunities — all in one place.
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            <button
              onClick={() => nav('/')}
              className="btn-primary px-8 py-3 text-base"
            >
              <TrendingUp className="w-5 h-5" />
              Open Dashboard
            </button>
            <button
              onClick={() => nav('/trending-posts')}
              className="btn-ghost px-8 py-3 text-base"
            >
              <Flame className="w-5 h-5" />
              See What's Trending
            </button>
          </div>
          <div className="flex gap-6 justify-center text-sm text-radar-muted pt-2">
            <span>✅ 100% free</span>
            <span>✅ No AI cost</span>
            <span>✅ Live data</span>
            <span>✅ 15 niches</span>
          </div>
        </div>
      </div>

      {/* Features grid */}
      <div className="max-w-5xl mx-auto px-8 pb-20">
        <h2 className="text-sm font-medium text-radar-muted uppercase tracking-wider mb-6">
          All Features
        </h2>
        <div className="grid grid-cols-3 gap-4">
          {FEATURES.map(({ icon: Icon, label, path, desc }) => (
            <button
              key={path}
              onClick={() => nav(path)}
              className="card text-left hover:border-radar-accent/50 hover:bg-radar-card/80 transition-all duration-200 group space-y-2"
            >
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-radar-accent/10 group-hover:bg-radar-accent/20 transition-colors">
                  <Icon className="w-4 h-4 text-radar-accent" />
                </div>
                <span className="text-sm font-medium text-white">{label}</span>
              </div>
              <p className="text-xs text-radar-muted leading-relaxed">{desc}</p>
            </button>
          ))}
        </div>

        {/* Quota tracker */}
        <div className="mt-8">
          <QuotaPanel />
        </div>

        {/* Free APIs used */}
        <div className="mt-12 card space-y-4">
          <h2 className="text-sm font-medium text-white">Free APIs powering NicheRadar</h2>
          <p className="text-xs text-radar-muted">All of these require no payment — just a free account or no account at all.</p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { name: 'YouTube Data API v3',  url: 'console.cloud.google.com',  limit: '10,000 units/day',   note: 'Free Google account'   },
              { name: 'NewsAPI',              url: 'newsapi.org',               limit: '100 requests/day',   note: 'Free signup'            },
              { name: 'Hacker News API',      url: 'hacker-news.firebaseio.com',limit: 'Unlimited',          note: 'No signup needed'       },
              { name: 'Supabase',             url: 'supabase.com',              limit: '500MB storage',       note: 'Free account'           },
              { name: 'Gemini AI',            url: 'aistudio.google.com',       limit: '15 requests/day',    note: 'Free Google account'   },
              { name: 'Frankfurter.app',      url: 'frankfurter.app',           limit: 'Unlimited',          note: 'No signup needed'       },
              { name: 'Open Exchange Rates',  url: 'open.er-api.com',           limit: '1,500 req/month',    note: 'No signup needed'       },
              { name: 'Reddit OAuth',         url: 'reddit.com/prefs/apps',     limit: 'Rate limited',       note: 'Free Reddit account'   },
            ].map(api => (
              <div key={api.name} className="bg-radar-bg border border-radar-border rounded-xl p-3 space-y-1">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-white">{api.name}</p>
                  <span className="text-xs text-radar-green">{api.limit}</span>
                </div>
                <p className="text-xs text-radar-muted">{api.url}</p>
                <p className="text-xs text-radar-accent">{api.note}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
