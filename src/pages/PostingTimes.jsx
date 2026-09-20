import { useState, useEffect } from 'react'
import { Clock, Calendar, CheckCircle2 } from 'lucide-react'
import { getPostingTimes } from '../utils/api'
import { SkeletonCard } from '../components/Skeleton'
import clsx from 'clsx'

export default function PostingTimes() {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)
  const [active,  setActive]  = useState('tiktok')

  async function load() {
    setLoading(true); setError(null)
    try {
      const res = await getPostingTimes()
      setData(res)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const currentPlatform = data?.platforms?.[active]

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold text-white">Posting Times Guide</h1>
        <p className="text-radar-muted text-sm mt-1">
          Optimal posting slots per platform based on user behavior patterns
        </p>
      </div>

      {loading && <div className="grid grid-cols-2 gap-4">{[1,2,3,4].map(i => <SkeletonCard key={i} />)}</div>}
      {error   && <div className="card border-red-500/30 bg-red-500/5 text-red-400 text-sm">{error}</div>}

      {data && !loading && (
        <div className="space-y-6 animate-slide-up">
          {/* Tabs */}
          <div className="flex gap-3">
            {Object.entries(data.platforms).map(([key, p]) => (
              <button
                key={key}
                onClick={() => setActive(key)}
                className={clsx(
                  'flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium border transition-all duration-200',
                  active === key
                    ? 'bg-radar-accent border-radar-accent text-white'
                    : 'border-radar-border text-radar-muted hover:text-white hover:border-radar-accent'
                )}
              >
                <span>{p.icon}</span>
                {p.name}
              </button>
            ))}
          </div>

          {currentPlatform && (
            <div className="space-y-6 animate-fade-in">
              <div className="card space-y-2">
                <div className="flex items-center justify-between">
                  <h2 className="text-white font-medium text-lg flex items-center gap-2">
                    <span>{currentPlatform.icon}</span> {currentPlatform.name} Schedule
                  </h2>
                  <span className="text-xs text-radar-muted font-mono bg-radar-border px-3 py-1 rounded-full">
                    {currentPlatform.timezone}
                  </span>
                </div>
                <p className="text-sm text-radar-muted leading-relaxed">
                  {currentPlatform.description}
                </p>
              </div>

              {/* Slots Table / Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="card space-y-4">
                  <h3 className="text-sm font-medium text-white flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-radar-accent" /> Recommended Time Slots
                  </h3>
                  <div className="space-y-3">
                    {currentPlatform.slots.map((slot, i) => (
                      <div key={i} className="p-3 bg-radar-bg rounded-xl border border-radar-border/50 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-radar-accent">{slot.day} @ {slot.time}</span>
                          <span className="text-[10px] text-radar-muted uppercase tracking-wider bg-radar-border px-2 py-0.5 rounded">
                            {slot.label}
                          </span>
                        </div>
                        <p className="text-xs text-radar-muted">{slot.reason}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="card space-y-4">
                  <h3 className="text-sm font-medium text-white flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-radar-green" /> Algorithm Best Practices
                  </h3>
                  <ul className="space-y-3">
                    {currentPlatform.tips.map((tip, i) => (
                      <li key={i} className="p-3 bg-radar-bg rounded-xl border border-radar-border/50 text-xs text-radar-muted flex items-start gap-2.5">
                        <span className="text-radar-accent font-mono font-bold text-xs">{i + 1}.</span>
                        <span className="leading-relaxed">{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
