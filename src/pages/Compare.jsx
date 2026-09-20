import { useState } from 'react'
import { ChevronDown, BarChart2, AlertCircle } from 'lucide-react'
import clsx from 'clsx'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import { comparePlatforms } from '../utils/api'
import ScoreRing from '../components/ScoreRing'
import { SkeletonCard } from '../components/Skeleton'
import { useNiches } from '../hooks/useNiches'

export default function Compare() {
  const { niches }  = useNiches()
  const [niche,   setNiche]   = useState('skincare')
  const [noFace,  setNoFace]  = useState(false)
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)

  async function run() {
    setLoading(true)
    setError(null)
    setData(null)
    try {
      const res = await comparePlatforms(niche, noFace)
      setData(res)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const chartData = data ? [
    { metric: 'Reach',       TikTok: data.tiktok?.reach ?? 0,       Instagram: data.instagram?.reach ?? 0       },
    { metric: 'Engagement',  TikTok: data.tiktok?.engagement ?? 0,  Instagram: data.instagram?.engagement ?? 0  },
    { metric: 'Viral Score', TikTok: data.tiktok?.viralScore ?? 0,  Instagram: data.instagram?.viralScore ?? 0  },
    { metric: 'Longevity',   TikTok: data.tiktok?.longevity ?? 0,   Instagram: data.instagram?.longevity ?? 0   },
  ] : []

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold text-white">Platform Comparison</h1>
        <p className="text-radar-muted text-sm mt-1">TikTok vs Instagram — where does your niche perform better?</p>
      </div>

      {/* Controls */}
      <div className="card flex items-end gap-4">
        <div className="flex-1">
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

        <div className="flex items-center gap-2 self-end">
          <button
            onClick={() => setNoFace(!noFace)}
            className={clsx(
              'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm border transition-all duration-200',
              noFace
                ? 'bg-radar-accent border-radar-accent text-white'
                : 'border-radar-border text-radar-muted hover:border-radar-accent hover:text-white'
            )}
          >
            <span>{noFace ? '👤' : '👥'}</span>
            {noFace ? 'No-face mode' : 'All content'}
          </button>
        </div>

        <button onClick={run} disabled={loading} className="btn-primary">
          <BarChart2 className="w-4 h-4" />
          {loading ? 'Comparing…' : 'Compare'}
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
          <div>
            <p className="text-red-400 font-medium text-sm">Comparison failed</p>
            <p className="text-red-400/70 text-xs mt-1">{error}</p>
          </div>
        </div>
      )}

      {data && !loading && (
        <div className="space-y-6 animate-slide-up">
          {/* Score heads-up */}
          <div className="grid grid-cols-2 gap-4">
            <PlatformPanel platform="TikTok" color="#ff2d55" data={data.tiktok} />
            <PlatformPanel platform="Instagram" color="#e1306c" data={data.instagram} />
          </div>

          {/* Bar chart */}
          <div className="card">
            <p className="text-sm font-medium text-white mb-4">Head-to-head Metrics</p>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3d" />
                <XAxis dataKey="metric" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ background: '#1a1a26', border: '1px solid #2a2a3d', borderRadius: 8, fontSize: 12 }}
                  itemStyle={{ color: '#e2e8f0' }}
                />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                <Bar dataKey="TikTok"    fill="#ff2d55" radius={[4,4,0,0]} />
                <Bar dataKey="Instagram" fill="#e1306c" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Winner recommendation */}
          {data.recommendation && (
            <div className="card border-radar-accent/30 bg-radar-accent/5 space-y-2">
              <p className="text-xs text-radar-accent font-medium uppercase tracking-wider">Recommendation</p>
              <p className="text-white text-sm leading-relaxed">{data.recommendation}</p>
              {data.noFaceStrategy && noFace && (
                <div className="pt-2 border-t border-radar-accent/10">
                  <p className="text-xs text-radar-muted font-medium mb-1">No-face creator strategy</p>
                  <p className="text-sm text-radar-text/80">{data.noFaceStrategy}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function PlatformPanel({ platform, color, data }) {
  if (!data) return null
  return (
    <div className="card space-y-4" style={{ borderColor: `${color}33` }}>
      <p className="text-xs font-semibold uppercase tracking-wider" style={{ color }}>
        {platform}
      </p>
      <div className="flex items-center gap-4">
        <ScoreRing score={data.viralScore ?? 0} label="Viral Score" size={80} />
        <div className="space-y-2 flex-1">
          {[
            { label: 'Reach',      val: data.reach      },
            { label: 'Engagement', val: data.engagement },
            { label: 'Longevity',  val: data.longevity  },
          ].map(({ label, val }) => (
            <div key={label}>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-radar-muted">{label}</span>
                <span className="text-white font-mono">{val ?? '—'}</span>
              </div>
              <div className="h-1 bg-radar-border rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${val ?? 0}%`, background: color }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="text-xs text-radar-muted leading-relaxed">
        {data.insight}
      </div>
    </div>
  )
}
