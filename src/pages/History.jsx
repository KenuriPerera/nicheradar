import { useState, useEffect } from 'react'
import { Clock, Search, ChevronDown, Database, AlertCircle, RefreshCw, TrendingUp } from 'lucide-react'
import { getHistory } from '../utils/api'
import { SkeletonCard } from '../components/Skeleton'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import clsx from 'clsx'
import { useNiches } from '../hooks/useNiches'

export default function History() {
  const { niches } = useNiches()
  const [niche, setNiche] = useState('skincare')
  const [days, setDays] = useState(14)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  async function loadHistory() {
    setLoading(true)
    setError(null)
    try {
      const res = await getHistory(niche, days)
      setData(res)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadHistory()
  }, [niche, days])

  // Format historical snapshots for charting
  const chartData = data?.chart?.dates?.map((date, idx) => {
    const point = { time: date }
    data.chart.series?.forEach(s => {
      point[s.tag] = s.data[idx]
    })
    return point
  }) ?? []

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold text-white">Trend History</h1>
        <p className="text-radar-muted text-sm mt-1">
          Track historical hashtag snapshot trends over time powered by Supabase
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

        <div className="w-36">
          <label className="text-xs text-radar-muted block mb-2">Timeframe</label>
          <div className="relative">
            <select
              value={days}
              onChange={e => setDays(Number(e.target.value))}
              className="w-full bg-radar-bg border border-radar-border text-white rounded-xl px-4 py-2.5 text-sm appearance-none pr-8 focus:outline-none focus:border-radar-accent"
            >
              <option value={7}>Last 7 days</option>
              <option value={14}>Last 14 days</option>
              <option value={30}>Last 30 days</option>
            </select>
            <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-radar-muted pointer-events-none" />
          </div>
        </div>

        <button onClick={loadHistory} disabled={loading} className="btn-primary">
          <RefreshCw className={clsx("w-4 h-4", loading && "animate-spin")} />
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {/* Empty State Banner */}
      {data && (!data.topHashtags || data.topHashtags.length === 0) && (
        <div className="card border-radar-amber/30 bg-radar-amber/5 space-y-3">
          <div className="flex items-center gap-3">
            <Database className="w-5 h-5 text-radar-amber flex-shrink-0" />
            <p className="text-radar-amber font-medium text-sm">No history yet for {niche}</p>
          </div>
          <p className="text-radar-muted text-sm leading-relaxed">
            Go to the <strong className="text-white">Hashtags</strong> page, pick a niche and click <strong className="text-white">Scan Trends</strong>. 
            Each scan saves data here. After a few scans the trend chart and history table will populate.
          </p>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 flex items-center gap-3 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="space-y-4">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : data?.topHashtags?.length > 0 ? (
        <div className="space-y-6">
          <div className="card">
            <h3 className="text-white text-base font-medium mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4 text-radar-accent" />
              Top Hashtag Score Trajectory ({niche})
            </h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 12 }} />
                  <YAxis stroke="#64748b" tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', color: '#fff' }}
                  />
                  {data.chart?.series?.slice(0, 5).map((s, idx) => (
                    <Line
                      key={s.tag}
                      type="monotone"
                      dataKey={s.tag}
                      stroke={['#7c3aed', '#10b981', '#f59e0b', '#3b82f6', '#ec4899'][idx % 5]}
                      strokeWidth={2}
                      name={`#${s.tag}`}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card space-y-4">
            <h3 className="text-white text-base font-medium">Snapshot Logs</h3>
            <div className="divide-y divide-radar-border">
              {data.topHashtags.map((item) => (
                <div key={item.tag} className="py-3 flex items-center justify-between text-sm">
                  <div>
                    <span className="text-white font-medium">#{item.tag}</span>
                    <span className="text-radar-muted text-xs ml-3">
                      Dominant trend: {item.dominant_trend || 'stable'}
                    </span>
                  </div>
                  <div className="text-radar-accent font-medium text-xs bg-radar-accent/10 px-2.5 py-1 rounded-full">
                    {item.avg_viral_prob}% avg viral prob ({item.appearances} appearances)
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* History Analyzer */}
          {data.topHashtags?.length > 0 && (
            <div className="card space-y-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-radar-accent" />
                <h2 className="text-sm font-medium text-white">History Analysis — Findings</h2>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {/* Best performer */}
                <div className="bg-radar-bg border border-radar-green/20 rounded-xl p-4 space-y-2">
                  <p className="text-xs text-radar-green font-medium uppercase tracking-wider">Top Performer</p>
                  <p className="text-xl font-mono text-white">
                    #{data.topHashtags[0]?.tag}
                  </p>
                  <p className="text-xs text-radar-muted">
                    Avg viral probability: <span className="text-radar-green font-medium">{data.topHashtags[0]?.avg_viral_prob}%</span>
                  </p>
                  <p className="text-xs text-radar-muted">
                    Peak reached: <span className="text-radar-amber font-medium">{data.topHashtags[0]?.peak_viral_prob}%</span>
                  </p>
                </div>

                {/* Most consistent */}
                {(() => {
                  const consistent = [...(data.topHashtags ?? [])]
                    .filter(h => h.appearances >= 2)
                    .sort((a, b) => (b.avg_viral_prob - b.min_viral_prob) - (a.avg_viral_prob - a.min_viral_prob))[0]
                  return consistent ? (
                    <div className="bg-radar-bg border border-radar-accent/20 rounded-xl p-4 space-y-2">
                      <p className="text-xs text-radar-accent font-medium uppercase tracking-wider">Most Consistent</p>
                      <p className="text-xl font-mono text-white">#{consistent.tag}</p>
                      <p className="text-xs text-radar-muted">
                        Appeared <span className="text-white font-medium">{consistent.appearances}x</span> in last {data.days} days
                      </p>
                      <p className="text-xs text-radar-muted">
                        Stability: low variance across scans
                      </p>
                    </div>
                  ) : null
                })()}

                {/* Momentum leader */}
                {data.emerging?.[0] && (
                  <div className="bg-radar-bg border border-radar-amber/20 rounded-xl p-4 space-y-2">
                    <p className="text-xs text-radar-amber font-medium uppercase tracking-wider">Momentum Leader</p>
                    <p className="text-xl font-mono text-white">#{data.emerging[0].tag}</p>
                    <p className="text-xs text-radar-muted">
                      Gained <span className="text-radar-amber font-medium">+{data.emerging[0].momentum}%</span> viral probability
                    </p>
                    <p className="text-xs text-radar-muted">Post this hashtag now — it is still rising</p>
                  </div>
                )}

                {/* Summary insight */}
                <div className="bg-radar-bg border border-radar-border rounded-xl p-4 space-y-2">
                  <p className="text-xs text-radar-muted font-medium uppercase tracking-wider">Summary</p>
                  <p className="text-xs text-radar-muted leading-relaxed">
                    Over the last <span className="text-white">{data.days} days</span>, tracked <span className="text-white">{data.topHashtags.length}</span> hashtags for <span className="text-white capitalize">{data.niche}</span>.
                    {data.emerging?.length > 0
                      ? ` ${data.emerging.length} tag${data.emerging.length > 1 ? 's are' : ' is'} gaining momentum — prioritise these in your next posts.`
                      : ' No strong momentum signals yet — run more scans to build data.'}
                  </p>
                  <p className="text-xs text-radar-muted leading-relaxed">
                    Best performing tag on average: <span className="text-radar-accent font-mono">#{data.topHashtags[0]?.tag}</span> at {data.topHashtags[0]?.avg_viral_prob}% viral probability.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}
