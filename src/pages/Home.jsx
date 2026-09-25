import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Radio, TrendingUp, Hash, BarChart2, Brain, Flame, Video, DollarSign,
  Clock, RefreshCw, Activity, Search, ShoppingBag, ExternalLink, AlertCircle, Compass, Sparkles
} from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from 'recharts'
import QuotaPanel from '../components/QuotaPanel'
import { runHealthCheck, getSerpInsights, getSerpQuota } from '../utils/api'
import clsx from 'clsx'

export default function Home() {
  const nav = useNavigate()
  const [healthLoading, setHealthLoading] = useState(false)
  const [healthResult,  setHealthResult]  = useState(null)

  // SerpAPI search states
  const [serpQuery,   setSerpQuery]   = useState('')
  const [serpData,    setSerpData]    = useState(null)
  const [serpLoading, setSerpLoading] = useState(false)
  const [serpError,   setSerpError]   = useState(null)
  const [serpQuota,   setSerpQuota]   = useState(null)

  async function runSerp(type, overrideQuery) {
    const q = overrideQuery ?? serpQuery
    if (!q.trim()) return
    setSerpLoading(true)
    setSerpError(null)
    try {
      const res = await getSerpInsights(q, type)
      setSerpData(res)
      // refresh quota after each search
      getSerpQuota().then(r => r.quota && setSerpQuota(r.quota)).catch(() => {})
    } catch (e) {
      setSerpError(e.message)
    } finally {
      setSerpLoading(false)
    }
  }

  // Load quota on mount — zero searches used
  useEffect(() => {
    getSerpQuota()
      .then(r => r.quota && setSerpQuota(r.quota))
      .catch(() => {})
  }, [])

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

      {/* Main content */}
      <div className="max-w-5xl mx-auto px-8 pb-20">
        {/* Search Intelligence Panel */}
        <div className="mt-8 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-medium text-white flex items-center gap-2">
                <Search className="w-4 h-4 text-radar-accent" />
                Search Intelligence
              </h2>
              <p className="text-xs text-radar-muted mt-0.5">
                Google Search + Trends + Shopping · uses 1-3 SerpAPI searches per lookup
              </p>
            </div>
            {serpQuota && (
              <div className="text-right">
                <p className="text-xs text-white font-mono">
                  {serpQuota.remaining} / {serpQuota.total} searches left
                </p>
                <p className="text-xs text-radar-muted">resets {serpQuota.resetDate?.slice(0,10)}</p>
              </div>
            )}
          </div>

          {/* Search input */}
          <div className="card space-y-4">
            <div className="flex gap-3">
              <input
                type="text"
                value={serpQuery}
                onChange={e => setSerpQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !serpLoading && serpQuery.trim() && runSerp('all')}
                placeholder="Enter keyword — e.g. skincare, stationery, bullet journal..."
                className="flex-1 bg-radar-bg border border-radar-border text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-radar-accent transition-colors"
              />
              <button
                onClick={() => runSerp('all')}
                disabled={serpLoading || !serpQuery.trim()}
                className="btn-primary flex-shrink-0"
              >
                <Search className={`w-4 h-4 ${serpLoading ? 'animate-spin' : ''}`} />
                {serpLoading ? 'Searching...' : 'Search (3 credits)'}
              </button>
            </div>

            {/* Individual search buttons */}
            <div className="flex gap-2 flex-wrap items-center">
              <p className="text-xs text-radar-muted self-center">Or search individually:</p>
              {[
                { type: 'search',   label: '🔍 Web results',    credits: 1 },
                { type: 'trends',   label: '📈 Trends only',    credits: 1 },
                { type: 'shopping', label: '🛒 Shopping only',  credits: 1 },
              ].map(b => (
                <button key={b.type}
                  onClick={() => runSerp(b.type)}
                  disabled={serpLoading || !serpQuery.trim()}
                  className="btn-ghost text-xs">
                  {b.label} ({b.credits} credit)
                </button>
              ))}
            </div>
          </div>

          {serpError && (
            <div className="card border-red-500/30 bg-red-500/5 flex items-start gap-3">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-400 text-sm">{serpError}</p>
            </div>
          )}

          {serpData && !serpLoading && (
            <div className="space-y-4 animate-slide-up">

              {/* Google Trends chart */}
              {serpData.trends?.timeline?.length > 0 && (
                <div className="card space-y-3">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-radar-accent" />
                    <p className="text-sm font-medium text-white">
                      Google Trends — "{serpData.query}"
                    </p>
                  </div>
                  <ResponsiveContainer width="100%" height={160}>
                    <LineChart data={serpData.trends.timeline}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3d" />
                      <XAxis
                        dataKey="date"
                        tick={{ fill: '#64748b', fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                        interval="preserveStartEnd"
                      />
                      <YAxis
                        tick={{ fill: '#64748b', fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                        domain={[0, 100]}
                      />
                      <Tooltip
                        contentStyle={{ background: '#1a1a26', border: '1px solid #2a2a3d', borderRadius: 8, fontSize: 11 }}
                        formatter={v => [`${v} / 100`, 'Interest']}
                      />
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke="#7c3aed"
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4, fill: '#7c3aed' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>

                  {/* Rising queries */}
                  {serpData.trends.relatedQueries?.length > 0 && (
                    <div>
                      <p className="text-xs text-radar-muted mb-2">Rising related queries</p>
                      <div className="flex flex-wrap gap-2">
                        {serpData.trends.relatedQueries.map(q => (
                          <button key={q.query}
                            onClick={() => { setSerpQuery(q.query); runSerp('all', q.query) }}
                            className="text-xs bg-radar-accent/10 text-radar-accent border border-radar-accent/20 rounded-xl px-2.5 py-1 hover:bg-radar-accent/20 transition-colors">
                            {q.query}
                            {q.value && <span className="ml-1 text-radar-muted">+{q.value}%</span>}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Google Search results */}
              {serpData.search?.organic?.length > 0 && (
                <div className="card space-y-3">
                  <div className="flex items-center gap-2">
                    <Search className="w-4 h-4 text-radar-accent" />
                    <p className="text-sm font-medium text-white">
                      Top Search Results
                    </p>
                    {serpData.search.searchInfo?.total_results && (
                      <span className="text-xs text-radar-muted">
                        ~{parseInt(serpData.search.searchInfo.total_results).toLocaleString()} results
                      </span>
                    )}
                  </div>

                  <div className="space-y-2">
                    {serpData.search.organic.slice(0, 5).map((r, i) => (
                      <a key={i} href={r.link} target="_blank" rel="noopener noreferrer"
                        className="flex items-start gap-3 bg-radar-bg border border-radar-border rounded-xl p-3 hover:border-radar-accent/30 transition-colors group">
                        <span className="text-xs font-mono text-radar-muted w-4 flex-shrink-0 mt-0.5">
                          {r.position}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-radar-accent truncate">{r.domain}</p>
                          <p className="text-sm text-white font-medium line-clamp-1">{r.title}</p>
                          <p className="text-xs text-radar-muted line-clamp-2 mt-0.5">{r.snippet}</p>
                        </div>
                        <ExternalLink className="w-3.5 h-3.5 text-radar-muted group-hover:text-radar-accent flex-shrink-0 mt-1 transition-colors" />
                      </a>
                    ))}
                  </div>

                  {/* People also ask */}
                  {serpData.search.peopleAlsoAsk?.length > 0 && (
                    <div>
                      <p className="text-xs text-radar-muted mb-2">People also ask</p>
                      <div className="space-y-1">
                        {serpData.search.peopleAlsoAsk.map((q, i) => (
                          <button key={i}
                            onClick={() => { setSerpQuery(q); runSerp('search', q) }}
                            className="w-full text-left text-xs text-white bg-radar-bg border border-radar-border rounded-lg px-3 py-2 hover:border-radar-accent/30 transition-colors">
                            ❓ {q}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Related searches */}
                  {serpData.search.relatedSearches?.length > 0 && (
                    <div>
                      <p className="text-xs text-radar-muted mb-2">Related searches</p>
                      <div className="flex flex-wrap gap-2">
                        {serpData.search.relatedSearches.map(q => (
                          <button key={q}
                            onClick={() => { setSerpQuery(q); runSerp('search', q) }}
                            className="text-xs bg-radar-border text-radar-muted rounded-xl px-2.5 py-1 hover:text-white hover:bg-radar-card transition-colors">
                            {q}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Google Shopping */}
              {serpData.shopping?.products?.length > 0 && (
                <div className="card space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShoppingBag className="w-4 h-4 text-radar-accent" />
                      <p className="text-sm font-medium text-white">Shopping Results</p>
                    </div>
                    {serpData.shopping.priceRange && (
                      <p className="text-xs text-radar-muted">
                        Range: <span className="text-white">
                          ${serpData.shopping.priceRange.min} – ${serpData.shopping.priceRange.max}
                        </span>
                        {' '}· Avg: <span className="text-radar-green">${serpData.shopping.priceRange.avg}</span>
                      </p>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {serpData.shopping.products.map((p, i) => (
                      <a key={i} href={p.link} target="_blank" rel="noopener noreferrer"
                        className="bg-radar-bg border border-radar-border rounded-xl p-3 space-y-1 hover:border-radar-accent/30 transition-colors group">
                        <p className="text-xs text-white font-medium line-clamp-2">{p.title}</p>
                        <p className="text-xs text-radar-muted">{p.source}</p>
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-radar-green font-semibold">{p.price}</p>
                          {p.rating && (
                            <p className="text-xs text-radar-amber">⭐ {p.rating}</p>
                          )}
                        </div>
                        {p.delivery && (
                          <p className="text-xs text-radar-muted">{p.delivery}</p>
                        )}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              <p className="text-xs text-radar-muted text-right">
                Used {serpData.searchesUsed} SerpAPI search{serpData.searchesUsed > 1 ? 'es' : ''} ·{' '}
                {new Date(serpData.fetchedAt).toLocaleTimeString()}
              </p>
            </div>
          )}
        </div>

        {/* Quota tracker */}
        <div className="mt-8">
          <QuotaPanel />
        </div>

        {/* System Health */}
        <div className="mt-8 card space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-radar-green" />
              <div>
                <h3 className="text-sm font-medium text-white">System Health</h3>
                <p className="text-xs text-radar-muted">
                  Auto-checks daily at 2pm Sri Lanka time · Uses zero API quota
                </p>
              </div>
            </div>
            <button
              onClick={async () => {
                setHealthLoading(true)
                try {
                  const res = await runHealthCheck()
                  setHealthResult(res)
                } catch (e) {
                  setHealthResult({ error: e.message })
                } finally {
                  setHealthLoading(false)
                }
              }}
              disabled={healthLoading}
              className="btn-ghost text-sm"
            >
              <RefreshCw className={`w-4 h-4 ${healthLoading ? 'animate-spin' : ''}`} />
              {healthLoading ? 'Checking...' : 'Run Check Now'}
            </button>
          </div>

          {healthResult && !healthResult.error && (
            <div className="space-y-2 animate-fade-in">
              <div className={clsx(
                'text-sm font-medium px-3 py-2 rounded-xl',
                healthResult.summary.allGood
                  ? 'bg-radar-green/10 text-radar-green border border-radar-green/30'
                  : 'bg-red-500/10 text-red-400 border border-red-500/30'
              )}>
                {healthResult.summary.allGood
                  ? `✅ All ${healthResult.summary.total} functions healthy`
                  : `❌ ${healthResult.summary.failed} of ${healthResult.summary.total} functions failing`
                }
              </div>
              <div className="grid grid-cols-2 gap-2">
                {healthResult.results.map(r => (
                  <div key={r.name}
                    className={clsx(
                      'flex items-center justify-between px-3 py-2 rounded-xl border text-xs',
                      r.passed
                        ? 'bg-radar-green/5 border-radar-green/20'
                        : 'bg-red-500/5 border-red-500/20'
                    )}>
                    <span className={r.passed ? 'text-white' : 'text-red-400'}>
                      {r.passed ? '✅' : '❌'} {r.name}
                    </span>
                    <span className="text-radar-muted font-mono">{r.elapsed}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-radar-muted text-right">
                {healthResult.summary.dateSL}
              </p>
            </div>
          )}

          {healthResult?.error && (
            <p className="text-xs text-red-400">{healthResult.error}</p>
          )}
        </div>

        {/* Free APIs powering NicheRadar */}
        <div className="mt-12 card space-y-4">
          <h2 className="text-sm font-medium text-white">
            Free APIs powering NicheRadar
          </h2>
          <p className="text-xs text-radar-muted">
            All free — payment only needed if you exceed limits heavily.
          </p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { name: 'YouTube Data API v3',  limit: '10,000 units/day',    reset: 'Daily',    note: 'console.cloud.google.com',  color: 'text-red-400'        },
              { name: 'NewsAPI',              limit: '100 requests/day',     reset: 'Daily',    note: 'newsapi.org',               color: 'text-radar-amber'    },
              { name: 'Hacker News API',      limit: 'Unlimited',            reset: 'Never',    note: 'No signup needed',          color: 'text-radar-green'    },
              { name: 'Gemini AI',            limit: '15 requests/day',      reset: 'Daily',    note: 'aistudio.google.com',       color: 'text-radar-accent2'  },
              { name: 'SerpAPI',              limit: '200 searches/month',   reset: 'Monthly',  note: 'serpapi.com',               color: 'text-radar-accent'   },
              { name: 'Supabase',             limit: '500MB storage',        reset: 'Monthly',  note: 'supabase.com',              color: 'text-purple-400'     },
              { name: 'MongoDB Atlas',        limit: '512MB storage',        reset: 'Monthly',  note: 'mongodb.com/atlas',         color: 'text-radar-green'    },
              { name: 'Frankfurter',          limit: 'Unlimited',            reset: 'Never',    note: 'No signup needed',          color: 'text-radar-green'    },
            ].map(api => (
              <div key={api.name}
                className="bg-radar-bg border border-radar-border rounded-xl p-3 space-y-1">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-white">{api.name}</p>
                  <span className={`text-xs font-mono ${api.color}`}>{api.limit}</span>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-radar-muted">{api.note}</p>
                  <span className="text-xs text-radar-muted">resets {api.reset}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
