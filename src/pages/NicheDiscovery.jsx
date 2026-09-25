import { useState, useEffect } from 'react'
import { Compass, TrendingUp, Zap, Target, RefreshCw, AlertCircle, ExternalLink } from 'lucide-react'
import { discoverNiches } from '../utils/api'
import { SkeletonCard } from '../components/Skeleton'
import clsx from 'clsx'
import { usePageCache } from '../hooks/usePageCache'

const TRAJECTORY_STYLE = {
  'explosive':        { bg: 'bg-red-500/10',          text: 'text-red-400',        border: 'border-red-500/30',      icon: '🔥' },
  'rising fast':      { bg: 'bg-radar-amber/10',      text: 'text-radar-amber',    border: 'border-radar-amber/30',  icon: '📈' },
  'gaining traction': { bg: 'bg-radar-green/10',      text: 'text-radar-green',    border: 'border-radar-green/30',  icon: '⚡' },
  'emerging':         { bg: 'bg-radar-accent/10',     text: 'text-radar-accent',   border: 'border-radar-accent/30', icon: '🌱' },
  'early signal':     { bg: 'bg-radar-muted/10',      text: 'text-radar-muted',    border: 'border-radar-border',    icon: '👀' },
}

const PLATFORM_COLORS = {
  tiktok:    { label: 'TikTok',    color: '#ff2d55' },
  instagram: { label: 'Instagram', color: '#e1306c' },
  youtube:   { label: 'YouTube',   color: '#ef4444' },
  pinterest: { label: 'Pinterest', color: '#f97316' },
}

const SOURCE_ICONS = {
  youtube: '▶️',
  news:    '📰',
  hn:      '🔶',
}

export default function NicheDiscovery() {
  const { data, set: setData } = usePageCache('discover')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)
  const [filter,  setFilter]  = useState('all')
  const [expanded, setExpanded] = useState(null)

  async function run(force = false) {
    if (data && !force) return
    setLoading(true); setError(null)
    try { setData(await discoverNiches()) }
    catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  useEffect(() => { run() }, [])

  const filtered = data?.niches?.filter(n =>
    filter === 'all' ? true : n.trajectory === filter
  ) ?? []

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8 animate-fade-in">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white flex items-center gap-2">
            <Compass className="w-6 h-6 text-radar-accent" />
            Niche Discovery
          </h1>
          <p className="text-radar-muted text-sm mt-1">
            Discovers genuinely new niche categories by analyzing raw signal velocity
            across YouTube, news and Hacker News — no hardcoded lists, no date filters
          </p>
        </div>
        <button onClick={() => run(true)} disabled={loading} className="btn-primary">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Scanning signals...' : 'Discover Niches'}
        </button>
      </div>

      {/* How it works */}
      {!data && !loading && !error && (
        <div className="card space-y-4">
          <p className="text-sm font-medium text-white">How signal-based discovery works</p>
          <div className="grid grid-cols-3 gap-4">
            {[
              { step: '01', title: 'Fetch raw signals',    desc: 'Broad queries with no dates — captures organic human interest regardless of when you run it' },
              { step: '02', title: 'Measure velocity',     desc: 'Phrases appearing across multiple platforms simultaneously = strong emerging signal' },
              { step: '03', title: 'Predict trajectory',   desc: 'Cross-platform frequency + engagement ratio + recency = opportunity score and timing window' },
            ].map(s => (
              <div key={s.step} className="space-y-2">
                <span className="text-3xl font-bold text-radar-border">{s.step}</span>
                <p className="text-sm font-medium text-white">{s.title}</p>
                <p className="text-xs text-radar-muted leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
          <button onClick={() => run(true)} className="btn-primary w-full justify-center">
            <Compass className="w-4 h-4" />
            Run Discovery Now
          </button>
        </div>
      )}

      {loading && (
        <div className="space-y-4">
          <div className="h-0.5 w-full rounded-full overflow-hidden">
            <div className="loading-bar h-full w-full" />
          </div>
          <p className="text-xs text-radar-muted text-center animate-pulse">
            Scanning signals across YouTube, news and Hacker News...
          </p>
          <div className="grid grid-cols-2 gap-4">
            {[1,2,3,4].map(i => <SkeletonCard key={i} />)}
          </div>
        </div>
      )}

      {error && (
        <div className="card border-red-500/30 bg-red-500/5 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {data && !loading && (
        <div className="space-y-6 animate-slide-up">

          {/* Summary */}
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: 'Signals scanned', value: data.summary.totalSignals.toLocaleString(), icon: Zap,       color: 'text-radar-accent'  },
              { label: 'New niches found', value: data.summary.discovered,                   icon: Compass,   color: 'text-radar-green'   },
              { label: 'Explosive',        value: data.summary.explosive,                    icon: TrendingUp,color: 'text-red-400'        },
              { label: 'Top opportunity',  value: `${data.summary.topOpportunity}%`,         icon: Target,    color: 'text-radar-amber'   },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="card flex items-center gap-3">
                <div className={`p-2.5 rounded-xl bg-radar-border ${color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xl font-semibold text-white">{value}</div>
                  <div className="text-xs text-radar-muted">{label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Filter tabs */}
          <div className="flex gap-2 border-b border-radar-border">
            {[
              { key: 'all',              label: `All (${data.niches.length})`                                                             },
              { key: 'explosive',        label: `🔥 Explosive (${data.niches.filter(n=>n.trajectory==='explosive').length})`              },
              { key: 'rising fast',      label: `📈 Rising (${data.niches.filter(n=>n.trajectory==='rising fast').length})`               },
              { key: 'gaining traction', label: `⚡ Gaining (${data.niches.filter(n=>n.trajectory==='gaining traction').length})`         },
              { key: 'emerging',         label: `🌱 Emerging (${data.niches.filter(n=>n.trajectory==='emerging').length})`                },
            ].map(t => (
              <button key={t.key} onClick={() => setFilter(t.key)}
                className={clsx(
                  'px-3 py-2.5 text-xs font-medium border-b-2 transition-all -mb-px whitespace-nowrap',
                  filter === t.key
                    ? 'border-radar-accent text-white'
                    : 'border-transparent text-radar-muted hover:text-white'
                )}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Niche cards */}
          <div className="space-y-3">
            {filtered.map((niche, i) => {
              const ts       = TRAJECTORY_STYLE[niche.trajectory] ?? TRAJECTORY_STYLE['early signal']
              const pc       = PLATFORM_COLORS[niche.platform] ?? PLATFORM_COLORS.tiktok
              const isOpen   = expanded === niche.niche

              return (
                <div key={niche.niche}
                  className="card hover:border-radar-accent/30 transition-all cursor-pointer"
                  onClick={() => setExpanded(isOpen ? null : niche.niche)}
                >
                  {/* Top row */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <span className="text-lg font-bold text-radar-border w-7 flex-shrink-0">
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-white font-semibold capitalize text-sm">
                            {niche.niche}
                          </span>
                          <span className={clsx('badge border text-xs', ts.bg, ts.text, ts.border)}>
                            {ts.icon} {niche.trajectory}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded-lg border"
                            style={{ color: pc.color, borderColor: pc.color + '40', background: pc.color + '10' }}>
                            {pc.label}
                          </span>
                        </div>

                        {/* Signal sources */}
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-radar-muted">Signal from:</span>
                          {niche.sources.map(s => (
                            <span key={s} className="text-xs text-radar-muted">
                              {SOURCE_ICONS[s]} {s}
                            </span>
                          ))}
                        </div>

                        {/* Window */}
                        <p className="text-xs text-radar-accent">→ {niche.window}</p>
                      </div>
                    </div>

                    {/* Opportunity score */}
                    <div className="flex-shrink-0 text-center">
                      <div className="relative w-14 h-14">
                        <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
                          <circle cx="28" cy="28" r="24" fill="none" stroke="#2a2a3d" strokeWidth="4" />
                          <circle cx="28" cy="28" r="24" fill="none"
                            stroke={niche.opportunityScore >= 70 ? '#10b981' : niche.opportunityScore >= 50 ? '#f59e0b' : '#7c3aed'}
                            strokeWidth="4"
                            strokeDasharray={`${niche.opportunityScore * 1.508} 150.8`}
                            strokeLinecap="round"
                          />
                        </svg>
                        <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">
                          {niche.opportunityScore}
                        </span>
                      </div>
                      <p className="text-xs text-radar-muted mt-1">score</p>
                    </div>
                  </div>

                  {/* Metrics row */}
                  <div className="flex gap-4 mt-3 pt-3 border-t border-radar-border/50 text-xs">
                    <span className="text-radar-muted">
                      Frequency: <span className="text-white font-mono">{niche.frequency}×</span>
                    </span>
                    <span className="text-radar-muted">
                      Platforms: <span className="text-white font-mono">{niche.sourceCount}</span>
                    </span>
                    <span className="text-radar-muted">
                      Engagement: <span className="text-white font-mono">{niche.avgEngagement}%</span>
                    </span>
                    <span className="text-radar-muted">
                      Recency: <span className="text-white font-mono">{niche.avgRecency}%</span>
                    </span>
                  </div>

                  {/* Expanded section */}
                  {isOpen && (
                    <div className="mt-4 pt-4 border-t border-radar-border space-y-4 animate-fade-in">

                      {/* Content angles */}
                      <div>
                        <p className="text-xs text-radar-muted uppercase tracking-wider mb-2">
                          Content Angles
                        </p>
                        <div className="space-y-1.5">
                          {niche.contentAngles.map((angle, j) => (
                            <div key={j} className="flex items-start gap-2">
                              <span className="text-radar-accent text-xs mt-0.5 flex-shrink-0">→</span>
                              <p className="text-xs text-white">{angle}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Hashtags */}
                      <div>
                        <p className="text-xs text-radar-muted uppercase tracking-wider mb-2">
                          Suggested Hashtags
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {niche.hashtags.map(tag => (
                            <span key={tag}
                              className="text-xs bg-radar-accent/10 text-radar-accent border border-radar-accent/20 rounded-xl px-2.5 py-1 font-mono">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Example signal titles */}
                      {niche.exampleTitles?.length > 0 && (
                        <div>
                          <p className="text-xs text-radar-muted uppercase tracking-wider mb-2">
                            Signal Sources
                          </p>
                          <div className="space-y-1.5">
                            {niche.exampleTitles.map((title, j) => (
                              <p key={j} className="text-xs text-radar-muted line-clamp-1">
                                • {title}
                              </p>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Source links */}
                      {niche.urls?.filter(u => u && u.startsWith('http')).length > 0 && (
                        <div className="flex gap-2 flex-wrap">
                          {niche.urls
                            .filter(u => u && u.startsWith('http'))
                            .map((url, j) => (
                              <a
                                key={j}
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-xs text-radar-accent hover:text-white border border-radar-accent/20 bg-radar-accent/5 px-3 py-1.5 rounded-xl transition-colors"
                                onClick={e => {
                                  e.stopPropagation()
                                  window.open(url, '_blank', 'noopener,noreferrer')
                                }}
                              >
                                <ExternalLink className="w-3 h-3" />
                                View source {j + 1}
                              </a>
                            ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <p className="text-xs text-radar-muted text-right">
            {data.summary.totalSignals.toLocaleString()} signals analyzed ·{' '}
            {new Date(data.summary.scannedAt).toLocaleTimeString()}
          </p>
        </div>
      )}
    </div>
  )
}
