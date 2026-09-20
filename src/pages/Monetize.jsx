import { useState } from 'react'
import { DollarSign, ChevronDown, Star, CheckCircle2 } from 'lucide-react'
import { getMonetize } from '../utils/api'
import { useNiches } from '../hooks/useNiches'
import { SkeletonCard } from '../components/Skeleton'
import clsx from 'clsx'

export default function Monetize() {
  const { niches } = useNiches()
  const [niche,   setNiche]   = useState('skincare')
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)
  const [active,  setActive]  = useState(null)

  async function run() {
    setLoading(true); setError(null); setData(null)
    try {
      const res = await getMonetize(niche)
      setData(res)
      setActive(res.platforms[0]?.key ?? null)
    }
    catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  const platform = data?.platforms?.find(p => p.key === active)

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold text-white">Monetization Platforms</h1>
        <p className="text-radar-muted text-sm mt-1">Ko-fi, Gumroad and Payhip — best strategies per niche</p>
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
        <button onClick={run} disabled={loading} className="btn-primary">
          <DollarSign className="w-4 h-4" />
          {loading ? 'Loading…' : 'Get Strategy'}
        </button>
      </div>

      {loading && <div className="grid grid-cols-3 gap-4">{[1,2,3].map(i => <SkeletonCard key={i} />)}</div>}
      {error   && <div className="card border-red-500/30 bg-red-500/5 text-red-400 text-sm">{error}</div>}

      {data && !loading && (
        <div className="space-y-6 animate-slide-up">
          {/* Platform tabs */}
          <div className="flex gap-3">
            {data.platforms.map(p => (
              <button key={p.key} onClick={() => setActive(p.key)}
                className={clsx(
                  'flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium border transition-all duration-200',
                  active === p.key
                    ? 'bg-radar-accent border-radar-accent text-white'
                    : 'border-radar-border text-radar-muted hover:text-white hover:border-radar-accent'
                )}>
                <span>{p.icon}</span>
                {p.name}
                {p.isRecommended && <Star className="w-3 h-3 text-radar-amber fill-radar-amber" />}
              </button>
            ))}
          </div>

          {platform && (
            <div className="space-y-4 animate-fade-in">
              <div className="card space-y-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{platform.icon}</span>
                  <div>
                    <h2 className="text-white font-medium">{platform.name}</h2>
                    <p className="text-radar-muted text-xs">{platform.model}</p>
                  </div>
                  {platform.isRecommended && (
                    <span className="ml-auto text-xs bg-radar-amber/10 text-radar-amber border border-radar-amber/30 px-3 py-1 rounded-full flex items-center gap-1 font-medium">
                      <Star className="w-3 h-3 fill-radar-amber" /> Recommended for {niche}
                    </span>
                  )}
                </div>
                <p className="text-sm text-radar-muted">{platform.strengths}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="card space-y-3">
                  <h3 className="text-sm font-medium text-white flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-radar-green" /> Top Product Ideas for {niche}
                  </h3>
                  <ul className="space-y-2">
                    {platform.nicheProducts.map((prod, i) => (
                      <li key={i} className="text-xs text-radar-muted flex items-start gap-2">
                        <span className="text-radar-accent">•</span>
                        <span>{prod}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="card space-y-3">
                  <h3 className="text-sm font-medium text-white">Content & Link Strategy</h3>
                  <p className="text-xs text-radar-muted leading-relaxed">{platform.linkStrategy}</p>
                  <div className="pt-2 border-t border-radar-border">
                    <h4 className="text-xs font-medium text-white mb-2">Best Practice Tips</h4>
                    <ul className="space-y-1.5">
                      {platform.contentTips.map((tip, i) => (
                        <li key={i} className="text-xs text-radar-muted flex items-start gap-1.5">
                          <span className="text-radar-accent font-mono text-[10px]">{i + 1}.</span>
                          <span>{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
