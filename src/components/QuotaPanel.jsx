import { useState, useEffect } from 'react'
import { Activity, RefreshCw } from 'lucide-react'
import { getQuotaStatus } from '../utils/api'
import clsx from 'clsx'

const STATUS_STYLE = {
  good:     { label: 'Good',     text: 'text-radar-green',  bg: 'bg-radar-green'  },
  warning:  { label: 'Warning',  text: 'text-radar-amber',  bg: 'bg-radar-amber'  },
  critical: { label: 'Critical', text: 'text-red-400',      bg: 'bg-red-400'      },
}

export default function QuotaPanel() {
  const [data,      setData]      = useState(null)
  const [loading,   setLoading]   = useState(true)
  const [lastFetch, setLastFetch] = useState(null)

  async function load() {
    setLoading(true)
    try {
      const res = await getQuotaStatus()
      setData(res)
      setLastFetch(new Date())
    } catch {
      // silently fail — quota panel is non-critical
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  if (loading && !data) return (
    <div className="card animate-pulse space-y-3">
      <div className="h-4 w-32 bg-radar-border rounded" />
      {[1,2,3,4].map(i => <div key={i} className="h-8 bg-radar-border rounded" />)}
    </div>
  )

  if (!data) return null

  return (
    <div className="card space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-radar-accent" />
          <h2 className="text-sm font-medium text-white">API Quota Tracker</h2>
        </div>
        <div className="flex items-center gap-3">
          {lastFetch && (
            <p className="text-xs text-radar-muted">
              {lastFetch.toLocaleTimeString()}
            </p>
          )}
          <button onClick={load} disabled={loading}
            className="text-radar-muted hover:text-white transition-colors">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {data.status.map(q => {
          const ss = STATUS_STYLE[q.status] ?? STATUS_STYLE.good
          return (
            <div key={q.key} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-white font-medium">{q.label}</span>
                  {q.unlimited && (
                    <span className="text-xs text-radar-green">∞ unlimited</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {!q.unlimited && (
                    <>
                      <span className={clsx('text-xs font-mono', ss.text)}>
                        {q.used.toLocaleString()} used
                      </span>
                      <span className="text-xs text-radar-muted">·</span>
                      <span className="text-xs font-mono text-white">
                        {q.left.toLocaleString()} left
                      </span>
                    </>
                  )}
                </div>
              </div>

              {!q.unlimited && (
                <>
                  <div className="h-1.5 bg-radar-border rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width:      `${q.pct}%`,
                        background: q.pct >= 90 ? '#ef4444'
                                  : q.pct >= 70 ? '#f59e0b'
                                  : q.color,
                      }}
                    />
                  </div>
                  <div className="flex justify-between items-center">
                    <span className={clsx('text-xs', ss.text)}>
                      {q.pct}% used
                    </span>
                    <span className="text-xs text-radar-muted">
                      {q.total.toLocaleString()} {q.unit} · resets {q.resetIn}
                    </span>
                  </div>
                </>
              )}
            </div>
          )
        })}
      </div>

      <div className="pt-2 border-t border-radar-border">
        <p className="text-xs text-radar-muted text-center">
          Counts update automatically as you use each feature
        </p>
      </div>
    </div>
  )
}
