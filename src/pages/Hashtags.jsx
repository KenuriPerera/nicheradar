import { useState } from 'react'
import { Hash, TrendingUp, Zap, Search, ChevronDown, AlertCircle, RefreshCw } from 'lucide-react'
import { getHashtags, incrementQuota } from '../utils/api'
import { SkeletonCard } from '../components/Skeleton'
import clsx from 'clsx'
import { useNiches } from '../hooks/useNiches'

const TREND_CONFIG = {
  emerging: { label: 'Emerging',  bg: 'bg-radar-green/10',  text: 'text-radar-green',  border: 'border-radar-green/30',  bar: '#10b981', tip: 'New trend — low competition, post NOW' },
  rising:   { label: 'Rising',    bg: 'bg-radar-accent/10', text: 'text-radar-accent', border: 'border-radar-accent/30', bar: '#7c3aed', tip: 'Growing fast — 3-day window'          },
  peak:     { label: 'Peak',      bg: 'bg-radar-amber/10',  text: 'text-radar-amber',  border: 'border-radar-amber/30',  bar: '#f59e0b', tip: 'At peak — act before saturation'       },
  stable:   { label: 'Stable',    bg: 'bg-radar-border',    text: 'text-radar-muted',  border: 'border-radar-border',    bar: '#64748b', tip: 'Consistent long-tail reach'             },
}

export default function Hashtags() {
  const { niches }  = useNiches()
  const [niche,   setNiche]   = useState('skincare')
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)
  const [filter,  setFilter]  = useState('all')

  async function run() {
    setLoading(true); setError(null); setData(null)
    try {
      const res = await getHashtags(niche)
      setData(res)
      incrementQuota('youtube', 100).catch(() => {})
    }
    catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  const shown = data?.hashtags?.filter(h => filter === 'all' || h.trend === filter) ?? []

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold text-white">Hashtag Radar</h1>
        <p className="text-radar-muted text-sm mt-1">
          Live hashtag extraction and viral prediction — 100% free, no AI cost
        </p>
      </div>

      {/* Controls */}
      <div className="card flex flex-wrap items-end gap-4">
        <div className="flex-1 min-w-40">
          <label className="text-xs text-radar-muted block mb-2">Niche</label>
          <div className="relative">
            <select
              value={niche}
              onChange={e => setNiche(e.target.value)}
              className="w-full bg-radar-bg border border-radar-border text-white rounded-xl px-4 py-2.5 text-sm appearance-none pr-8 focus:outline-none focus:border-radar-accent"
            >
              {niches.map(n => (
                <option key={n.key} value={n.key}>{n.icon} {n.label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-radar-muted pointer-events-none" />
          </div>
        </div>
        <button onClick={run} disabled={loading} className="btn-primary">
          <Search className="w-4 h-4" />
          {loading ? 'Scanning…' : 'Scan Trends'}
        </button>
      </div>

      {loading && (
        <div className="space-y-4">
          <div className="h-0.5 w-full rounded-full overflow-hidden">
            <div className="loading-bar h-full w-full" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[1,2,3,4].map(i => <SkeletonCard key={i} />)}
          </div>
        </div>
      )}

      {error && (
        <div className="card border-red-500/30 bg-red-500/5 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {data && !loading && (
        <div className="space-y-6 animate-slide-up">

          {/* Summary row */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Total hashtags found',  value: data.hashtags?.length ?? 0,        icon: Hash,       color: 'text-radar-accent'  },
              { label: 'Emerging right now',    value: data.topEmerging?.length ?? 0,      icon: Zap,        color: 'text-radar-green'   },
              { label: 'Data sources scanned',  value: `${data.totalSources ?? 0} posts`,  icon: TrendingUp, color: 'text-radar-amber'   },
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

          {/* Spotlight row — top emerging */}
          {data.topEmerging?.length > 0 && (
            <div className="card border-radar-green/20 bg-radar-green/5 space-y-3">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-radar-green" />
                <span className="text-sm font-medium text-white">Emerging now — post before they peak</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {data.topEmerging.map(h => (
                  <div
                    key={h.tag}
                    className="flex items-center gap-2 bg-radar-bg border border-radar-green/20 rounded-xl px-3 py-2"
                  >
                    <span className="text-sm text-white font-mono">#{h.tag}</span>
                    <span className="text-xs text-radar-green font-medium">{h.viralProb}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Filter tabs */}
          <div className="flex gap-2 flex-wrap">
            {['all', 'emerging', 'rising', 'peak', 'stable'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={clsx(
                  'px-4 py-1.5 rounded-full text-xs font-medium border transition-all duration-200 capitalize',
                  filter === f
                    ? 'bg-radar-accent text-white border-radar-accent'
                    : 'text-radar-muted border-radar-border hover:border-radar-accent hover:text-white'
                )}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Hashtag table */}
          <div className="card p-0 overflow-hidden">
            <div className="grid grid-cols-12 px-5 py-3 border-b border-radar-border text-xs text-radar-muted uppercase tracking-wider">
              <span className="col-span-4">Hashtag</span>
              <span className="col-span-2 text-center">Trend</span>
              <span className="col-span-3">Viral probability</span>
              <span className="col-span-3">Prediction</span>
            </div>
            {shown.length === 0 && (
              <div className="px-5 py-8 text-center text-radar-muted text-sm">
                No hashtags found for this filter.
              </div>
            )}
            {shown.map((h, i) => {
              const cfg = TREND_CONFIG[h.trend] ?? TREND_CONFIG.stable
              return (
                <div
                  key={h.tag}
                  className="grid grid-cols-12 px-5 py-3 border-b border-radar-border/50 last:border-0 hover:bg-radar-card/50 transition-colors items-center"
                >
                  <div className="col-span-4 flex items-center gap-2">
                    <span className="text-radar-muted text-xs w-5">{i + 1}</span>
                    <span className="text-sm text-white font-mono">#{h.tag}</span>
                  </div>
                  <div className="col-span-2 flex justify-center">
                    <span className={clsx('badge border', cfg.bg, cfg.text, cfg.border)}>
                      {cfg.label}
                    </span>
                  </div>
                  <div className="col-span-3 flex items-center gap-3">
                    <div className="flex-1 h-1.5 bg-radar-border rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${h.viralProb}%`, background: cfg.bar }}
                      />
                    </div>
                    <span className="text-xs font-mono text-white w-8 text-right">{h.viralProb}%</span>
                  </div>
                  <div className="col-span-3 text-xs text-radar-muted">{h.prediction}</div>
                </div>
              )
            })}
          </div>

          <p className="text-xs text-radar-muted text-right">
            Scanned {data.totalSources} posts · {new Date(data.fetchedAt).toLocaleTimeString()}
          </p>
        </div>
      )}
    </div>
  )
}
