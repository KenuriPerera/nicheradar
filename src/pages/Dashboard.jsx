import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { TrendingUp, Zap, Clock, ArrowRight, RefreshCw } from 'lucide-react'
import { getDashboard } from '../utils/api'
import ScoreRing from '../components/ScoreRing'
import PlatformBadge from '../components/PlatformBadge'
import { SkeletonCard } from '../components/Skeleton'
import { useNiches } from '../hooks/useNiches'

export default function Dashboard() {
  const { niches } = useNiches()
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)
  const [lastRun, setLastRun] = useState(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const res = await getDashboard()
      setData(res)
      setLastRun(new Date())
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Trend Dashboard</h1>
          <p className="text-radar-muted text-sm mt-1">
            Real-time viral intelligence across your niches
          </p>
        </div>
        <button onClick={load} disabled={loading} className="btn-ghost">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Loading bar */}
      {loading && (
        <div className="h-0.5 w-full rounded-full overflow-hidden">
          <div className="loading-bar h-full w-full" />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="card border-red-500/30 bg-red-500/5 text-red-400 text-sm">
          {error} — check your Netlify environment variables (YOUTUBE_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_KEY).
        </div>
      )}

      {/* Stats row */}
      {data && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Trending Niches',    value: data.summary?.trendingNiches   ?? '—', icon: TrendingUp, color: 'text-radar-green'  },
            { label: 'Avg Viral Score',    value: data.summary?.avgViralScore    ?? '—', icon: Zap,        color: 'text-radar-amber'  },
            { label: 'Best Posting Hour',  value: data.summary?.bestPostingHour  ?? '—', icon: Clock,      color: 'text-radar-accent2' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="card flex items-center gap-4">
              <div className={`p-3 rounded-xl bg-radar-border ${color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xl font-semibold text-white">{value}</div>
                <div className="text-xs text-radar-muted">{label}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Niche cards */}
      <div>
        <h2 className="text-sm font-medium text-radar-muted uppercase tracking-wider mb-4">
          Your Niches
        </h2>
        {loading && !data ? (
          <div className="grid grid-cols-3 gap-4">
            {niches.map(n => <SkeletonCard key={n.key} />)}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {(data?.niches ?? niches.map(n => ({ niche: n.key }))).map((item) => (
              <NicheCard key={item.niche} item={item} />
            ))}
          </div>
        )}
      </div>

      {lastRun && (
        <p className="text-xs text-radar-muted text-right">
          Last updated {lastRun.toLocaleTimeString()}
        </p>
      )}
    </div>
  )
}

function NicheCard({ item }) {
  return (
    <div className="card hover:border-radar-accent/50 transition-all duration-200 group space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-white font-medium">{item.icon} {item.label ?? item.niche}</h3>
          <p className="text-radar-muted text-xs mt-0.5 line-clamp-2">
            {item.summary ?? `Fetching live ${item.niche} trends...`}
          </p>
        </div>
        {item.viralScore != null && (
          <ScoreRing score={item.viralScore} label="" size={64} />
        )}
      </div>

      {item.topHashtags?.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {item.topHashtags.slice(0, 4).map(tag => (
            <span key={tag} className="text-xs bg-radar-border text-radar-muted px-2 py-0.5 rounded-full font-mono">
              #{tag}
            </span>
          ))}
        </div>
      )}

      {item.leadingPlatform && (
        <div className="flex items-center justify-between">
          <PlatformBadge platform={item.leadingPlatform} />
          <Link
            to={`/analyze?niche=${item.niche}`}
            className="text-xs text-radar-accent hover:text-violet-400 flex items-center gap-1 transition-colors"
          >
            Deep analysis <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      )}
    </div>
  )
}
