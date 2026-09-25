import { useState, useEffect } from 'react'
import { Brain, TrendingUp, Zap, Target, RefreshCw, AlertCircle } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell
} from 'recharts'
import { getIntelligence } from '../utils/api'
import { SkeletonCard } from '../components/Skeleton'
import clsx from 'clsx'
import { usePageCache } from '../hooks/usePageCache'

const TREND_STYLE = {
  rising:  { label: '↑ Rising',  bg: 'bg-radar-green/10',  text: 'text-radar-green',  border: 'border-radar-green/30'  },
  stable:  { label: '→ Stable',  bg: 'bg-radar-amber/10',  text: 'text-radar-amber',  border: 'border-radar-amber/30'  },
  cooling: { label: '↓ Cooling', bg: 'bg-radar-muted/10',  text: 'text-radar-muted',  border: 'border-radar-border'    },
}

const CROSS_STYLE = {
  viral:    { label: '🔥 Viral',    bg: 'bg-red-500/10',          text: 'text-red-400',        border: 'border-red-500/30'      },
  strong:   { label: '⚡ Strong',   bg: 'bg-radar-amber/10',      text: 'text-radar-amber',    border: 'border-radar-amber/30'  },
  emerging: { label: '🌱 Emerging', bg: 'bg-radar-green/10',      text: 'text-radar-green',    border: 'border-radar-green/30'  },
}

const OPP_COLORS = ['#7c3aed', '#10b981', '#06b6d4', '#f59e0b', '#ff2d55']

export default function Intelligence() {
  const { data, set: setData } = usePageCache('intelligence')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)
  const [tab,     setTab]     = useState('momentum')

  async function run(force = false) {
    if (data && !force) return
    setLoading(true); setError(null)
    try { setData(await getIntelligence()) }
    catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  useEffect(() => { run() }, [])

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white flex items-center gap-2">
            <Brain className="w-6 h-6 text-radar-accent" />
            Intelligence
          </h1>
          <p className="text-radar-muted text-sm mt-1">
            Cross-niche analysis — momentum, signals and opportunities across all {15} niches
          </p>
        </div>
        <button onClick={() => run(true)} disabled={loading} className="btn-primary">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Analysing...' : 'Run Analysis'}
        </button>
      </div>

      {loading && (
        <div className="space-y-4">
          <div className="h-0.5 w-full rounded-full overflow-hidden">
            <div className="loading-bar h-full w-full" />
          </div>
          <p className="text-xs text-radar-muted text-center animate-pulse">
            Scanning all niches — this takes 15-20 seconds...
          </p>
          <div className="grid grid-cols-3 gap-4">
            {[1,2,3,4,5,6].map(i => <SkeletonCard key={i} />)}
          </div>
        </div>
      )}

      {error && (
        <div className="card border-red-500/30 bg-red-500/5 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {!data && !loading && !error && (
        <div className="card text-center py-16 space-y-4">
          <Brain className="w-12 h-12 text-radar-muted mx-auto" />
          <p className="text-white font-medium">Run a full cross-niche analysis</p>
          <p className="text-radar-muted text-sm max-w-md mx-auto">
            Scans all 15 niches simultaneously to find momentum leaders,
            cross-niche viral signals, and your best posting opportunities right now.
          </p>
          <button onClick={() => run(true)} className="btn-primary mx-auto">
            <Brain className="w-4 h-4" />
            Run Analysis
          </button>
        </div>
      )}

      {data && !loading && (
        <div className="space-y-6 animate-slide-up">

          {/* Summary cards */}
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: 'Hottest Niche',      value: `${data.summary.hotNicheIcon} ${data.summary.hotNiche}`,            icon: TrendingUp, color: 'text-radar-green'   },
              { label: 'Best Opportunity',   value: `${data.summary.bestOpportunityIcon} ${data.summary.bestOpportunity}`, icon: Target,    color: 'text-radar-accent'  },
              { label: 'Cross Signals',      value: `${data.summary.crossSignalCount} tags`,                             icon: Zap,        color: 'text-radar-amber'   },
              { label: 'Avg Viral Score',    value: data.summary.avgViralScore,                                          icon: Brain,      color: 'text-radar-accent2' },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="card flex items-center gap-3">
                <div className={`p-2.5 rounded-xl bg-radar-border ${color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">{value}</div>
                  <div className="text-xs text-radar-muted">{label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Tab switcher */}
          <div className="flex gap-2 border-b border-radar-border pb-0">
            {[
              { key: 'momentum',   label: '↑ Momentum Ranking' },
              { key: 'cross',      label: '⚡ Cross-Niche Signals' },
              { key: 'opportunity',label: '🎯 Opportunity Finder' },
            ].map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={clsx(
                  'px-4 py-2.5 text-sm font-medium border-b-2 transition-all duration-200 -mb-px',
                  tab === t.key
                    ? 'border-radar-accent text-white'
                    : 'border-transparent text-radar-muted hover:text-white'
                )}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Momentum Ranking tab */}
          {tab === 'momentum' && (
            <div className="space-y-4 animate-fade-in">
              <div className="card">
                <p className="text-xs text-radar-muted mb-4 uppercase tracking-wider">
                  Momentum score — rising signals × viral score
                </p>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={data.momentumRanking.slice(0, 10)}
                    margin={{ top: 8, right: 8, left: -20, bottom: 8 }}
                    barCategoryGap="20%"
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fill: '#94a3b8', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      interval={0}
                      angle={-30}
                      textAnchor="end"
                      height={50}
                    />
                    <YAxis
                      tick={{ fill: '#64748b', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      domain={[0, 100]}
                    />
                    <Tooltip
                      contentStyle={{
                        background: '#13131f',
                        border: '1px solid #2a2a3d',
                        borderRadius: 12,
                        fontSize: 12,
                        padding: '10px 14px',
                      }}
                      formatter={(v, _, props) => [
                        <span style={{ color: '#fff', fontWeight: 600 }}>{v}</span>,
                        <span style={{ color: '#64748b' }}>momentum</span>
                      ]}
                      labelFormatter={(label) => (
                        <span style={{ color: '#a78bfa', fontWeight: 600 }}>{label}</span>
                      )}
                      cursor={{ fill: 'rgba(124,58,237,0.08)' }}
                    />
                    <Bar dataKey="momentum" radius={[8, 8, 0, 0]} maxBarSize={48}>
                      {data.momentumRanking.slice(0, 10).map((entry, i) => (
                        <Cell
                          key={entry.niche}
                          fill={
                            entry.trend === 'rising'
                              ? i === 0
                                ? '#10b981'   // #1 = bright green
                                : i <= 2
                                ? '#34d399'   // top 3 = lighter green
                                : '#6ee7b7'   // rest = faint green
                              : entry.trend === 'stable'
                              ? '#f59e0b'     // stable = amber
                              : '#475569'     // cooling = slate
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>

                {/* Legend */}
                <div className="flex items-center gap-6 mt-2 justify-center">
                  {[
                    { color: '#10b981', label: 'Rising'  },
                    { color: '#f59e0b', label: 'Stable'  },
                    { color: '#475569', label: 'Cooling' },
                  ].map(l => (
                    <div key={l.label} className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-sm" style={{ background: l.color }} />
                      <span className="text-xs text-radar-muted">{l.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Ranking table */}
              <div className="card p-0 overflow-hidden">
                <div className="grid grid-cols-12 px-5 py-3 border-b border-radar-border text-xs text-radar-muted uppercase tracking-wider">
                  <span className="col-span-1">#</span>
                  <span className="col-span-3">Niche</span>
                  <span className="col-span-2 text-center">Trend</span>
                  <span className="col-span-2 text-center">Momentum</span>
                  <span className="col-span-2 text-center">Viral score</span>
                  <span className="col-span-2 text-center">Emerging</span>
                </div>
                {data.momentumRanking.map((n) => {
                  const ts = TREND_STYLE[n.trend] ?? TREND_STYLE.stable
                  return (
                    <div key={n.niche}
                      className="grid grid-cols-12 px-5 py-3 border-b border-radar-border/50 last:border-0 hover:bg-radar-card/50 transition-colors items-center">
                      <span className="col-span-1 text-radar-muted text-sm font-mono">{n.rank}</span>
                      <span className="col-span-3 text-sm text-white">{n.icon} {n.label}</span>
                      <div className="col-span-2 flex justify-center">
                        <span className={clsx('badge border text-xs', ts.bg, ts.text, ts.border)}>{ts.label}</span>
                      </div>
                      <div className="col-span-2 flex justify-center items-center gap-2">
                        <div className="w-12 h-1.5 bg-radar-border rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-radar-accent"
                            style={{ width: `${n.momentum}%` }} />
                        </div>
                        <span className="text-xs text-white font-mono">{n.momentum}</span>
                      </div>
                      <span className="col-span-2 text-center text-sm text-white font-mono">{n.viralScore}</span>
                      <span className="col-span-2 text-center text-sm text-radar-green font-mono">+{n.emerging}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Cross-Niche Signals tab */}
          {tab === 'cross' && (
            <div className="space-y-4 animate-fade-in">
              <p className="text-sm text-radar-muted">
                These hashtags are trending across multiple niches simultaneously — highest signal strength for universal content.
              </p>
              {data.crossNicheSignals.length === 0 ? (
                <div className="card text-center py-8 text-radar-muted text-sm">
                  No cross-niche signals detected yet. Run more hashtag scans to build data.
                </div>
              ) : (
                <div className="space-y-3">
                  {data.crossNicheSignals.map((s, i) => {
                    const cs = CROSS_STYLE[s.crossSignal] ?? CROSS_STYLE.emerging
                    return (
                      <div key={s.tag} className="card hover:border-radar-accent/30 transition-colors">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl font-mono text-radar-accent">#{i + 1}</span>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-white font-mono font-medium">#{s.tag}</span>
                                <span className={clsx('badge border text-xs', cs.bg, cs.text, cs.border)}>
                                  {cs.label}
                                </span>
                              </div>
                              <p className="text-xs text-radar-muted mt-1">
                                Trending in <span className="text-white font-medium">{s.nicheCount} niches</span> · avg {s.avgProb}% viral probability
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-semibold text-radar-amber">{s.maxProb}%</p>
                            <p className="text-xs text-radar-muted">peak prob</p>
                          </div>
                        </div>
                        <div className="flex gap-2 mt-3 flex-wrap">
                          {s.niches.map(n => (
                            <span key={n.niche}
                              className="text-xs bg-radar-bg border border-radar-border rounded-lg px-2.5 py-1">
                              {n.icon} {n.label}
                              <span className="text-radar-accent ml-1">{n.prob}%</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Opportunity Finder tab */}
          {tab === 'opportunity' && (
            <div className="space-y-4 animate-fade-in">
              <p className="text-sm text-radar-muted">
                Opportunity score = high viral demand + lower competition + emerging hashtags. Higher = better window to post now.
              </p>
              <div className="grid grid-cols-2 gap-4">
                {data.opportunities.map((o, i) => (
                  <div key={o.niche}
                    className={clsx(
                      'card space-y-3 hover:border-radar-accent/30 transition-all',
                      i === 0 && 'border-radar-green/30 bg-radar-green/5'
                    )}>
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium text-white">{o.icon} {o.label}</p>
                        <p className="text-xs text-radar-muted mt-0.5">{o.reason}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-xl font-bold"
                          style={{ color: OPP_COLORS[Math.min(i, OPP_COLORS.length - 1)] }}>
                          {o.opportunity}
                        </div>
                        <p className="text-xs text-radar-muted">score</p>
                      </div>
                    </div>

                    {/* Score bar */}
                    <div className="h-1.5 bg-radar-border rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${o.opportunity}%`,
                          background: OPP_COLORS[Math.min(i, OPP_COLORS.length - 1)]
                        }} />
                    </div>

                    {/* Metrics row */}
                    <div className="flex gap-4 text-xs">
                      <span className="text-radar-muted">
                        Viral: <span className="text-white font-mono">{o.viralScore}</span>
                      </span>
                      <span className="text-radar-muted">
                        Competition: <span className="text-white font-mono">{o.competition}</span>
                      </span>
                      <span className="text-radar-muted">
                        Emerging: <span className="text-radar-green font-mono">+{o.emerging}</span>
                      </span>
                    </div>

                    {/* Action */}
                    <div className="bg-radar-bg border border-radar-border rounded-xl px-3 py-2">
                      <p className="text-xs text-radar-accent">→ {o.action}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <p className="text-xs text-radar-muted text-right">
            Analysed {data.summary.totalNiches} niches · {new Date(data.fetchedAt).toLocaleTimeString()}
          </p>
        </div>
      )}
    </div>
  )
}
