import { useState, useEffect } from 'react'
import { DollarSign, ChevronDown, ExternalLink } from 'lucide-react'
import { getMonetize } from '../utils/api'
import { useNiches } from '../hooks/useNiches'
import { SkeletonCard } from '../components/Skeleton'
import clsx from 'clsx'
import { usePageCache } from '../hooks/usePageCache'

export default function Monetize() {
  const { niches } = useNiches()
  const [niche, setNiche] = useState('skincare')
  const { data, set: setData } = usePageCache('monetize-' + niche)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [activePlatform, setActivePlatform] = useState(null)

  async function run(force = false) {
    if (data && !force) return
    setLoading(true); setError(null)
    try {
      const res = await getMonetize(niche)
      setData(res)
    }
    catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  useEffect(() => { run() }, [niche])

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold text-white">Monetization Strategy</h1>
        <p className="text-radar-muted text-sm mt-1">Live platform strategies and product offerings for your niche</p>
      </div>

      <div className="card flex flex-wrap items-end gap-4">
        <div className="flex-1 min-w-40">
          <label className="text-xs text-radar-muted block mb-2">Your Niche</label>
          <div className="relative">
            <select value={niche} onChange={e => setNiche(e.target.value)}
              className="w-full bg-radar-bg border border-radar-border text-white rounded-xl px-4 py-2.5 text-sm appearance-none pr-8 focus:outline-none focus:border-radar-accent">
              {niches.map(n => <option key={n.key} value={n.key}>{n.icon} {n.label}</option>)}
            </select>
            <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-radar-muted pointer-events-none" />
          </div>
        </div>
        <button onClick={() => run(true)} disabled={loading} className="btn-primary">
          <DollarSign className="w-4 h-4" />
          {loading ? 'Loading…' : 'Get Strategy'}
        </button>
      </div>

      {loading && <div className="grid grid-cols-2 gap-4">{[1,2,3,4].map(i => <SkeletonCard key={i} />)}</div>}
      {error   && <div className="card border-red-500/30 bg-red-500/5 text-red-400 text-sm">{error}</div>}

      {data && !loading && (
        <div className="space-y-6 animate-slide-up">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data?.platforms?.map((platform, i) => (
              <div key={platform.key}
                className={clsx(
                  'card space-y-4 cursor-pointer hover:border-radar-accent/30 transition-all',
                  activePlatform === platform.key && 'border-radar-accent/40 bg-radar-accent/5'
                )}
                onClick={() => setActivePlatform(
                  activePlatform === platform.key ? null : platform.key
                )}
              >
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{platform.icon}</span>
                    <div>
                      <p className="text-sm font-semibold text-white">{platform.name}</p>
                      <p className="text-xs text-radar-muted capitalize">{platform.type}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-radar-accent">{platform.platformScore}</p>
                    <p className="text-xs text-radar-muted">fit score</p>
                  </div>
                </div>

                {/* Score bar */}
                <div className="h-1.5 bg-radar-border rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-radar-accent transition-all"
                    style={{ width: `${platform.platformScore}%` }} />
                </div>

                {/* Best for */}
                <p className="text-xs text-radar-muted">{platform.bestFor}</p>

                {/* Best tip from live data */}
                <div className="bg-radar-accent/5 border border-radar-accent/20 rounded-xl px-3 py-2">
                  <p className="text-xs text-radar-accent">💡 {platform.bestTip}</p>
                </div>

                {/* Expanded */}
                {activePlatform === platform.key && (
                  <div className="space-y-3 pt-2 border-t border-radar-border animate-fade-in">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-radar-bg border border-radar-border rounded-xl p-3">
                        <p className="text-xs text-radar-muted mb-1">Fee structure</p>
                        <p className="text-xs text-white">{platform.fee}</p>
                      </div>
                      <div className="bg-radar-bg border border-radar-border rounded-xl p-3">
                        <p className="text-xs text-radar-muted mb-1">Audience</p>
                        <p className="text-xs text-white">{platform.audience}</p>
                      </div>
                    </div>

                    {/* Live-derived strategy */}
                    <div>
                      <p className="text-xs text-radar-muted uppercase tracking-wider mb-2">
                        Strategy for {data.label} on {platform.name}
                      </p>
                      <p className="text-xs text-white leading-relaxed">{platform.strategy}</p>
                    </div>

                    {/* Derived products/services */}
                    <div>
                      <p className="text-xs text-radar-muted uppercase tracking-wider mb-2">
                        What to offer right now
                      </p>
                      <div className="space-y-1.5">
                        {platform.products?.map((p, j) => (
                          <p key={j} className="text-xs text-white flex items-start gap-2">
                            <span className="text-radar-accent flex-shrink-0">→</span> {p}
                          </p>
                        ))}
                      </div>
                    </div>

                    <a href={platform.link} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 text-xs text-radar-accent border border-radar-accent/20 bg-radar-accent/5 px-3 py-2 rounded-xl hover:bg-radar-accent/10 transition-colors w-fit"
                      onClick={e => e.stopPropagation()}>
                      <ExternalLink className="w-3 h-3" />
                      Open {platform.name}
                    </a>
                  </div>
                )}
              </div>
            ))}
          </div>
          {data.fetchedAt && (
            <p className="text-xs text-radar-muted text-right">
              Live LKR rate: Rs {data.lkrRate} · Scanned {new Date(data.fetchedAt).toLocaleTimeString()}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
