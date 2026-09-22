import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Search, Zap, Hash, Clock, Film, TrendingUp,
  ChevronDown, CheckCircle2, AlertCircle
} from 'lucide-react'
import {
  RadarChart, PolarGrid, PolarAngleAxis,
  Radar, ResponsiveContainer, Tooltip
} from 'recharts'
import clsx from 'clsx'
import { analyzeTrend, incrementQuota } from '../utils/api'
import ScoreRing from '../components/ScoreRing'
import PlatformBadge from '../components/PlatformBadge'
import { SkeletonCard } from '../components/Skeleton'
import { useNiches } from '../hooks/useNiches'

const PLATFORMS = [
  { key: 'both', label: 'All Platforms' },
  { key: 'tiktok', label: '🎵 TikTok' },
  { key: 'instagram', label: '📸 Instagram' },
  { key: 'youtube', label: '▶️ YouTube' },
  { key: 'pinterest', label: '📌 Pinterest' },
]

export default function Analyze() {
  const { niches } = useNiches()
  const [params] = useSearchParams()
  const [niche, setNiche] = useState(params.get('niche') || 'skincare')
  const [platform, setPlatform] = useState('both')
  const [noFace, setNoFace] = useState(false)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function run() {
    setLoading(true)
    setError(null)
    setData(null)
    try {
      const res = await analyzeTrend(niche, platform, noFace)
      setData(res)
      incrementQuota('youtube', 100).catch(() => {})
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { run() }, [])

  const radarData = data ? [
    { subject: 'Virality', A: data.scores?.virality ?? 0 },
    { subject: 'Engagement', A: data.scores?.engagement ?? 0 },
    { subject: 'Longevity', A: data.scores?.longevity ?? 0 },
    { subject: 'Reach', A: data.scores?.reach ?? 0 },
    { subject: 'Competition', A: data.scores?.competition ?? 0 },
  ] : []

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-white">Trend Analysis</h1>
        <p className="text-radar-muted text-sm mt-1">Deep-dive into viral patterns for a specific niche</p>
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

        <div className="flex-1 min-w-40">
          <label className="text-xs text-radar-muted block mb-2">Platform</label>
          <div className="relative">
            <select
              value={platform}
              onChange={e => setPlatform(e.target.value)}
              className="w-full bg-radar-bg border border-radar-border text-white rounded-xl px-4 py-2.5 text-sm appearance-none pr-8 focus:outline-none focus:border-radar-accent"
            >
              {PLATFORMS.map(p => (
                <option key={p.key} value={p.key} className="capitalize">{p.label}</option>
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
          <Search className="w-4 h-4" />
          {loading ? 'Analyzing…' : 'Analyze'}
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-4">
          <div className="h-0.5 w-full rounded-full overflow-hidden">
            <div className="loading-bar h-full w-full" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => <SkeletonCard key={i} />)}
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="card border-red-500/30 bg-red-500/5 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-400 font-medium text-sm">Analysis failed</p>
            <p className="text-red-400/70 text-xs mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Results */}
      {data && !loading && (
        <div className="space-y-6 animate-slide-up">
          {/* Top row */}
          <div className="grid grid-cols-3 gap-4">
            {/* Score */}
            <div className="card flex flex-col items-center justify-center gap-2">
              <ScoreRing score={data.viralScore ?? 0} label="Viral Score" size={110} />
              <PlatformBadge platform={platform} />
            </div>

            {/* Radar */}
            <div className="card col-span-2">
              <p className="text-xs text-radar-muted mb-3 font-medium uppercase tracking-wider">Strength Breakdown</p>
              <ResponsiveContainer width="100%" height={180}>
                <RadarChart data={radarData} margin={{ top: 0, right: 20, bottom: 0, left: 20 }}>
                  <PolarGrid stroke="#2a2a3d" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 11 }} />
                  <Radar dataKey="A" stroke="#7c3aed" fill="#7c3aed" fillOpacity={0.25} strokeWidth={2} />
                  <Tooltip
                    contentStyle={{ background: '#1a1a26', border: '1px solid #2a2a3d', borderRadius: 8, fontSize: 12 }}
                    itemStyle={{ color: '#e2e8f0' }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Hashtags */}
          <Section icon={Hash} title="Trending Hashtags">
            <div className="flex flex-wrap gap-2">
              {(data.hashtags ?? []).map(({ tag, score }) => (
                <div key={tag} className="flex items-center gap-1.5 bg-radar-bg border border-radar-border rounded-xl px-3 py-1.5">
                  <span className="text-sm text-white font-mono">#{tag}</span>
                  <span className="text-xs text-radar-accent font-medium">{score}</span>
                </div>
              ))}
            </div>
          </Section>

          {/* Sounds */}
          {data.sounds?.length > 0 && (
            <Section icon={Film} title="Trending Audio / Sounds">
              <div className="grid grid-cols-2 gap-3">
                {data.sounds.map(({ name, usageCount, trend }) => (
                  <div key={name} className="flex items-center justify-between bg-radar-bg border border-radar-border rounded-xl px-4 py-3">
                    <div>
                      <p className="text-sm text-white">{name}</p>
                      <p className="text-xs text-radar-muted">{usageCount} uses</p>
                    </div>
                    <TrendBadge trend={trend} />
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Content formats */}
          {data.formats?.length > 0 && (
            <Section icon={Film} title="Content Format Recommendations">
              <div className="space-y-3">
                {data.formats.map(({ format, why, platform: p }) => (
                  <div key={format} className="flex items-start gap-3 bg-radar-bg border border-radar-border rounded-xl px-4 py-3">
                    <CheckCircle2 className="w-4 h-4 text-radar-green mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm text-white font-medium">{format}</p>
                        <PlatformBadge platform={p} />
                      </div>
                      <p className="text-xs text-radar-muted mt-1">{why}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Posting times */}
          {data.postingTimes && (
            <Section icon={Clock} title="Best Posting Times">
              <div className="space-y-4">
                {Object.entries(data.postingTimes).map(([plat, times]) => (
                  <div key={plat} className="bg-radar-bg border border-radar-border rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium uppercase tracking-wider"
                        style={{ color: plat === 'tiktok' ? '#ff2d55' : plat === 'instagram' ? '#e1306c' : plat === 'youtube' ? '#ef4444' : '#e97316' }}>
                        {plat}
                      </p>
                      {times.predicted !== undefined && (
                        <span className={`badge border text-xs ${times.predicted
                            ? 'bg-radar-green/10 text-radar-green border-radar-green/30'
                            : 'bg-radar-amber/10 text-radar-amber border-radar-amber/30'
                          }`}>
                          {times.predicted ? '📊 Predicted from live data' : '⚡ Pattern-based default'}
                        </span>
                      )}
                    </div>

                    {times.message && (
                      <p className="text-xs text-radar-muted italic">{times.message}</p>
                    )}

                    {/* Predicted slots */}
                    <div className="space-y-2">
                      {(times.slots ?? times).map((s, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <span className="text-xs font-mono text-radar-accent w-16">{s.time}</span>
                          <span className="text-xs text-white w-24">{s.day}</span>
                          <span className="text-xs text-radar-muted flex-1">{s.reason}</span>
                          {s.source === 'live data' && (
                            <span className="text-xs text-radar-green">live</span>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Hour heatmap if available */}
                    {times.topHours?.length > 0 && (
                      <div className="pt-2 border-t border-radar-border">
                        <p className="text-xs text-radar-muted mb-2">Peak hours from data</p>
                        <div className="flex gap-2 flex-wrap">
                          {times.topHours.map(h => (
                            <div key={h.hour}
                              className="bg-radar-accent/10 border border-radar-accent/20 rounded-lg px-3 py-1 text-xs text-radar-accent font-mono">
                              {String(h.hour).padStart(2, '0')}:00
                              <span className="text-radar-muted ml-1">({h.count} posts)</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Prediction */}
          {data.prediction && (
            <Section icon={TrendingUp} title="Viral Prediction">
              <div className="bg-radar-accent/10 border border-radar-accent/30 rounded-xl p-4 space-y-2">
                <p className="text-sm text-white">{data.prediction.summary}</p>
                <div className="flex flex-wrap gap-2 pt-1">
                  {(data.prediction.signals ?? []).map(s => (
                    <span key={s} className="text-xs bg-radar-accent/10 text-radar-accent border border-radar-accent/20 px-2.5 py-1 rounded-full">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            </Section>
          )}
        </div>
      )}
    </div>
  )
}

function Section({ icon: Icon, title, children }) {
  return (
    <div className="card space-y-4">
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-radar-accent" />
        <h2 className="text-sm font-medium text-white">{title}</h2>
      </div>
      {children}
    </div>
  )
}

function TrendBadge({ trend }) {
  const map = {
    rising: { label: '↑ Rising', cls: 'text-radar-green bg-radar-green/10 border-radar-green/20' },
    peak: { label: '⚡ Peak', cls: 'text-radar-amber bg-radar-amber/10 border-radar-amber/20' },
    falling: { label: '↓ Falling', cls: 'text-radar-muted bg-radar-border border-radar-border' },
  }
  const t = map[trend] || map.rising
  return <span className={`badge border ${t.cls}`}>{t.label}</span>
}
