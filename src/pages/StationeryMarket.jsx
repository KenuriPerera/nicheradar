import { useState, useEffect } from 'react'
import { PenTool, RefreshCw, TrendingUp, ShoppingBag, Target, AlertCircle } from 'lucide-react'
import { getStationeryIntel } from '../utils/api'
import { SkeletonCard } from '../components/Skeleton'
import clsx from 'clsx'
import { usePageCache } from '../hooks/usePageCache'

const TRAJECTORY_STYLE = {
  'explosive':        { bg: 'bg-red-500/10',         text: 'text-red-400',       border: 'border-red-500/30',      icon: '🔥' },
  'rising fast':      { bg: 'bg-radar-amber/10',     text: 'text-radar-amber',   border: 'border-radar-amber/30',  icon: '📈' },
  'gaining traction': { bg: 'bg-radar-green/10',     text: 'text-radar-green',   border: 'border-radar-green/30',  icon: '⚡' },
  'emerging':         { bg: 'bg-radar-accent/10',    text: 'text-radar-accent',  border: 'border-radar-accent/30', icon: '🌱' },
  'early signal':     { bg: 'bg-radar-muted/10',     text: 'text-radar-muted',   border: 'border-radar-border',    icon: '👀' },
}

export default function StationeryMarket() {
  const { data, set: setData } = usePageCache('stationery')
  const [loading,        setLoading]        = useState(false)
  const [error,          setError]          = useState(null)
  const [filter,         setFilter]         = useState('all')
  const [expandedProduct,setExpandedProduct]= useState(null)

  async function load(force = false) {
    if (data && !force) return
    setLoading(true); setError(null)
    try { setData(await getStationeryIntel()) }
    catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const products = data?.products?.filter(p =>
    filter === 'all' || p.trajectory === filter
  ) ?? []

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white flex items-center gap-2">
            <PenTool className="w-6 h-6 text-radar-accent" />
            Stationery Market
          </h1>
          <p className="text-radar-muted text-sm mt-1">
            Live stationery trends — products, SL pricing, customer base and content angles
          </p>
        </div>
        <button onClick={() => load(true)} disabled={loading} className="btn-primary">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Scanning market...' : 'Scan Market'}
        </button>
      </div>

      {loading && (
        <div className="space-y-4">
          <div className="h-0.5 w-full rounded-full overflow-hidden">
            <div className="loading-bar h-full w-full" />
          </div>
          <p className="text-xs text-radar-muted text-center animate-pulse">
            Scanning YouTube, news and Google Shopping for stationery signals...
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

      {!data && !loading && !error && (
        <div className="card text-center py-16 space-y-4">
          <p className="text-4xl">✏️</p>
          <p className="text-white font-medium">Stationery market intelligence</p>
          <p className="text-radar-muted text-sm max-w-md mx-auto">
            Discovers trending stationery products from live signals. Estimates Sri Lanka
            import costs vs selling prices and identifies your target customer base.
          </p>
          <button onClick={() => load(true)} className="btn-primary mx-auto">
            Scan Market Now
          </button>
        </div>
      )}

      {data && !loading && (
        <div className="space-y-6 animate-slide-up">
          {/* Summary */}
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: 'Products found',   value: data.summary.productsFound,                color: 'text-radar-accent' },
              { label: 'Explosive trends', value: data.summary.explosive,                    color: 'text-red-400'      },
              { label: 'Live LKR rate',    value: `Rs ${data.summary.lkrRate}`,              color: 'text-radar-green'  },
              { label: 'Signals scanned',  value: data.summary.totalSignals,                 color: 'text-radar-amber'  },
            ].map(s => (
              <div key={s.label} className="card text-center space-y-1">
                <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-radar-muted">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Category breakdown */}
          {Object.keys(data.categoryBreakdown ?? {}).length > 0 && (
            <div className="card space-y-3">
              <p className="text-xs text-radar-muted uppercase tracking-wider">Category Breakdown</p>
              <div className="grid grid-cols-3 gap-2">
                {Object.entries(data.categoryBreakdown).map(([cat, info]) => (
                  <div key={cat} className="bg-radar-bg border border-radar-border rounded-xl p-3 space-y-1">
                    <p className="text-xs text-white">{info.icon} {cat}</p>
                    <div className="flex justify-between text-xs">
                      <span className="text-radar-muted">{info.count} products</span>
                      <span className="text-radar-green font-mono">{info.avgScore}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Market timeline */}
          {data.marketTimeline?.length > 0 && (
            <div className="card space-y-3">
              <p className="text-xs text-radar-muted uppercase tracking-wider">
                Market Interest Timeline
              </p>
              <div className="flex items-end gap-1 h-16">
                {data.marketTimeline.map((point, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full rounded-t-sm bg-radar-accent transition-all"
                      style={{ height: `${(point.value / 100) * 56}px`, minHeight: '4px' }}
                    />
                    <span className="text-radar-muted" style={{ fontSize: '9px' }}>
                      {point.date?.slice(0, 7)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Filter tabs */}
          <div className="flex gap-2 border-b border-radar-border">
            {[
              { key: 'all',              label: `All (${data.products?.length ?? 0})`                                                              },
              { key: 'explosive',        label: `🔥 Explosive (${data.products?.filter(p=>p.trajectory==='explosive').length ?? 0})`               },
              { key: 'rising fast',      label: `📈 Rising (${data.products?.filter(p=>p.trajectory==='rising fast').length ?? 0})`                },
              { key: 'gaining traction', label: `⚡ Gaining (${data.products?.filter(p=>p.trajectory==='gaining traction').length ?? 0})`          },
            ].map(t => (
              <button key={t.key} onClick={() => setFilter(t.key)}
                className={clsx(
                  'px-3 py-2 text-xs font-medium border-b-2 transition-all -mb-px whitespace-nowrap',
                  filter === t.key
                    ? 'border-radar-accent text-white'
                    : 'border-transparent text-radar-muted hover:text-white'
                )}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Product cards */}
          <div className="space-y-3">
            {products.map((product, i) => {
              const ts     = TRAJECTORY_STYLE[product.trajectory] ?? TRAJECTORY_STYLE['early signal']
              const isOpen = expandedProduct === product.product

              return (
                <div key={product.product}
                  className="card hover:border-radar-accent/30 transition-all cursor-pointer"
                  onClick={() => setExpandedProduct(isOpen ? null : product.product)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <span className="text-lg font-bold text-radar-border w-7 flex-shrink-0">{i+1}</span>
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-white font-semibold text-sm capitalize">
                            {product.icon} {product.product}
                          </span>
                          <span className={clsx('badge border text-xs', ts.bg, ts.text, ts.border)}>
                            {ts.icon} {product.trajectory}
                          </span>
                          <span className="text-xs text-radar-muted bg-radar-border px-2 py-0.5 rounded-full">
                            {product.category}
                          </span>
                        </div>
                        <div className="flex gap-4 text-xs">
                          <span className="text-radar-muted">
                            Global: <span className="text-white">{product.pricing?.global?.usd}</span>
                          </span>
                          <span className="text-radar-muted">
                            SL sell: <span className="text-radar-green">{product.pricing?.sriLanka?.sellingPrice}</span>
                          </span>
                          <span className="text-radar-muted">
                            Margin: <span className="text-radar-green">{product.pricing?.sriLanka?.profitMargin}</span>
                          </span>
                        </div>
                        <div className="flex gap-1.5 flex-wrap">
                          {product.customerBase?.map(c => (
                            <span key={c} className="text-xs bg-radar-accent/10 text-radar-accent border border-radar-accent/20 px-2 py-0.5 rounded-full">
                              {c}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Score ring */}
                    <div className="flex-shrink-0 text-center">
                      <div className="relative w-12 h-12">
                        <svg className="w-12 h-12 -rotate-90" viewBox="0 0 48 48">
                          <circle cx="24" cy="24" r="20" fill="none" stroke="#2a2a3d" strokeWidth="4" />
                          <circle cx="24" cy="24" r="20" fill="none"
                            stroke={product.opportunityScore >= 70 ? '#10b981' : product.opportunityScore >= 50 ? '#f59e0b' : '#7c3aed'}
                            strokeWidth="4"
                            strokeDasharray={`${product.opportunityScore * 1.257} 125.7`}
                            strokeLinecap="round"
                          />
                        </svg>
                        <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">
                          {product.opportunityScore}
                        </span>
                      </div>
                      <p className="text-xs text-radar-muted mt-0.5">score</p>
                    </div>
                  </div>

                  {/* Expanded */}
                  {isOpen && (
                    <div className="mt-4 pt-4 border-t border-radar-border space-y-4 animate-fade-in">
                      {/* Pricing breakdown */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-radar-bg border border-radar-border rounded-xl p-3 space-y-2">
                          <p className="text-xs text-radar-muted uppercase tracking-wider">Global Market</p>
                          <div className="space-y-1 text-xs">
                            <div className="flex justify-between">
                              <span className="text-radar-muted">USD</span>
                              <span className="text-white">{product.pricing?.global?.usd}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-radar-muted">LKR equiv</span>
                              <span className="text-white">{product.pricing?.global?.lkr}</span>
                            </div>
                          </div>
                        </div>
                        <div className="bg-radar-bg border border-radar-border rounded-xl p-3 space-y-2">
                          <p className="text-xs text-radar-muted uppercase tracking-wider">Sri Lanka</p>
                          <div className="space-y-1 text-xs">
                            <div className="flex justify-between">
                              <span className="text-radar-muted">Import cost</span>
                              <span className="text-white">{product.pricing?.sriLanka?.importCost}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-radar-muted">Selling price</span>
                              <span className="text-radar-green">{product.pricing?.sriLanka?.sellingPrice}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-radar-muted">Margin</span>
                              <span className="text-radar-green font-bold">{product.pricing?.sriLanka?.profitMargin}</span>
                            </div>
                            <div className="flex justify-between pt-1 border-t border-radar-border">
                              <span className="text-radar-muted">Best channel</span>
                              <span className="text-radar-accent text-right" style={{ maxWidth: '55%' }}>
                                {product.pricing?.sriLanka?.bestChannel}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Content angles */}
                      <div>
                        <p className="text-xs text-radar-muted uppercase tracking-wider mb-2">Content Angles</p>
                        <div className="space-y-1.5">
                          {product.angles?.map((a, j) => (
                            <p key={j} className="text-xs text-white flex items-start gap-2">
                              <span className="text-radar-accent flex-shrink-0">→</span> {a}
                            </p>
                          ))}
                        </div>
                      </div>

                      {/* Hashtags */}
                      <div>
                        <p className="text-xs text-radar-muted uppercase tracking-wider mb-2">Hashtags</p>
                        <div className="flex flex-wrap gap-2">
                          {product.hashtags?.map(tag => (
                            <span key={tag}
                              className="text-xs bg-radar-accent/10 text-radar-accent border border-radar-accent/20 rounded-xl px-2.5 py-1 font-mono">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Signal timeline */}
                      {product.timeline?.length > 0 && (
                        <div>
                          <p className="text-xs text-radar-muted uppercase tracking-wider mb-2">Signal Timeline</p>
                          <div className="flex items-end gap-1 h-10">
                            {product.timeline.map((point, j) => (
                              <div key={j} className="flex-1 flex flex-col items-center gap-0.5">
                                <div className="w-full rounded-t-sm bg-radar-accent/60"
                                  style={{
                                    height: `${(point.signals / Math.max(...product.timeline.map(t=>t.signals))) * 36}px`,
                                    minHeight: '3px'
                                  }} />
                                <span style={{ fontSize: '8px' }} className="text-radar-muted">{point.month?.slice(5)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <p className="text-xs text-radar-muted text-right">
            Live LKR: Rs {data.lkrRate} · {new Date(data.summary.scannedAt).toLocaleTimeString()}
          </p>
        </div>
      )}
    </div>
  )
}
