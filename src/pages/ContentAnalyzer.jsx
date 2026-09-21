import { useState, useRef } from 'react'
import { Video, Link, Upload, Zap, TrendingUp, Edit3, AlertCircle, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react'
import { analyzeContent } from '../utils/api'
import clsx from 'clsx'

const PLATFORM_COLORS = {
  tiktok:    { color: '#ff2d55', label: 'TikTok'     },
  instagram: { color: '#e1306c', label: 'Instagram'  },
  youtube:   { color: '#ef4444', label: 'YouTube'    },
  pinterest: { color: '#f97316', label: 'Pinterest'  },
}

const PRIORITY_STYLE = {
  high:   { bg: 'bg-red-500/10',          text: 'text-red-400',        border: 'border-red-500/30'      },
  medium: { bg: 'bg-radar-amber/10',      text: 'text-radar-amber',    border: 'border-radar-amber/30'  },
  low:    { bg: 'bg-radar-muted/10',      text: 'text-radar-muted',    border: 'border-radar-border'    },
}

export default function ContentAnalyzer() {
  const [mode,       setMode]       = useState('url')
  const [url,        setUrl]        = useState('')
  const [file,       setFile]       = useState(null)
  const [preview,    setPreview]    = useState(null)
  const [data,       setData]       = useState(null)
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState(null)
  const [expanded,   setExpanded]   = useState({})
  const fileRef = useRef()

  function handleFile(e) {
    const f = e.target.files?.[0]
    if (!f) return
    if (f.size > 20 * 1024 * 1024) {
      setError('File too large — maximum 20MB for free Gemini tier')
      return
    }
    setFile(f)
    setPreview(URL.createObjectURL(f))
    setError(null)
  }

  async function run() {
    setLoading(true); setError(null); setData(null)
    try {
      let payload
      if (mode === 'url') {
        if (!url.trim()) throw new Error('Please enter a video URL')
        payload = { url: url.trim() }
      } else {
        if (!file) throw new Error('Please select a video file')
        const base64 = await toBase64(file)
        payload = { fileData: base64, mimeType: file.type }
      }
      setData(await analyzeContent(payload))
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  function toBase64(file) {
    return new Promise((res, rej) => {
      const r = new FileReader()
      r.onload  = () => res(r.result.split(',')[1])
      r.onerror = rej
      r.readAsDataURL(file)
    })
  }

  function toggle(key) {
    setExpanded(p => ({ ...p, [key]: !p[key] }))
  }

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold text-white flex items-center gap-2">
          <Video className="w-6 h-6 text-radar-accent" />
          Content Analyzer
        </h1>
        <p className="text-radar-muted text-sm mt-1">
          Upload a video or paste a URL — get editing breakdown, platform predictions and improvement tips
        </p>
      </div>

      {/* Input card */}
      <div className="card space-y-5">
        {/* Mode toggle */}
        <div className="flex gap-2">
          {[
            { key: 'url',    icon: Link,   label: 'Paste URL'     },
            { key: 'upload', icon: Upload, label: 'Upload Video'  },
          ].map(m => (
            <button key={m.key} onClick={() => { setMode(m.key); setError(null) }}
              className={clsx(
                'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all',
                mode === m.key
                  ? 'bg-radar-accent border-radar-accent text-white'
                  : 'border-radar-border text-radar-muted hover:text-white'
              )}>
              <m.icon className="w-4 h-4" />
              {m.label}
            </button>
          ))}
        </div>

        {/* URL input */}
        {mode === 'url' && (
          <div>
            <label className="text-xs text-radar-muted block mb-2">YouTube or TikTok URL</label>
            <input
              type="url"
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=... or https://www.tiktok.com/@..."
              className="w-full bg-radar-bg border border-radar-border text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-radar-accent transition-colors"
            />
            <p className="text-xs text-radar-muted mt-1.5">
              Note: Public videos only. TikTok URLs work best with the full video URL.
            </p>
          </div>
        )}

        {/* File upload */}
        {mode === 'upload' && (
          <div>
            <input ref={fileRef} type="file" accept="video/*" onChange={handleFile} className="hidden" />
            {!file ? (
              <button
                onClick={() => fileRef.current.click()}
                className="w-full border-2 border-dashed border-radar-border hover:border-radar-accent rounded-2xl p-10 text-center transition-colors group"
              >
                <Upload className="w-8 h-8 text-radar-muted group-hover:text-radar-accent mx-auto mb-3 transition-colors" />
                <p className="text-white font-medium">Click to upload video</p>
                <p className="text-radar-muted text-xs mt-1">MP4, MOV, AVI · max 20MB (Gemini free tier)</p>
              </button>
            ) : (
              <div className="space-y-3">
                <video src={preview} controls className="w-full rounded-xl max-h-48 bg-black" />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-white">{file.name}</p>
                    <p className="text-xs text-radar-muted">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
                  </div>
                  <button
                    onClick={() => { setFile(null); setPreview(null) }}
                    className="text-xs text-radar-muted hover:text-red-400 transition-colors"
                  >
                    Remove
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <button onClick={run} disabled={loading} className="btn-primary w-full justify-center">
          <Zap className="w-4 h-4" />
          {loading ? 'Analysing with Gemini AI...' : 'Analyse Video'}
        </button>
      </div>

      {loading && (
        <div className="space-y-2">
          <div className="h-0.5 w-full rounded-full overflow-hidden">
            <div className="loading-bar h-full w-full" />
          </div>
          <p className="text-xs text-radar-muted text-center animate-pulse">
            Gemini is analysing your video — takes 10-20 seconds...
          </p>
        </div>
      )}

      {error && (
        <div className="card border-red-500/30 bg-red-500/5 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <div>
            <p className="text-red-400 text-sm font-medium">Analysis failed</p>
            <p className="text-red-400/70 text-xs mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {data && !loading && (
        <div className="space-y-5 animate-slide-up">

          {/* Overall score + best platform */}
          <div className="grid grid-cols-3 gap-4">
            <div className="card flex flex-col items-center justify-center gap-2 col-span-1">
              <div className="text-5xl font-bold"
                style={{ color: data.overallScore >= 70 ? '#10b981' : data.overallScore >= 50 ? '#f59e0b' : '#64748b' }}>
                {data.overallScore}
              </div>
              <p className="text-xs text-radar-muted">Overall Score</p>
            </div>
            <div className="card col-span-2 space-y-2">
              <p className="text-xs text-radar-muted uppercase tracking-wider">Video Overview</p>
              <p className="text-white font-medium">{data.overview?.title}</p>
              <p className="text-sm text-radar-muted leading-relaxed">{data.overview?.summary}</p>
              <div className="flex gap-2 flex-wrap">
                {[
                  data.overview?.category,
                  data.overview?.tone,
                  data.overview?.niche,
                  data.content?.pacing + ' pace',
                ].filter(Boolean).map(tag => (
                  <span key={tag} className="badge bg-radar-accent/10 text-radar-accent border border-radar-accent/20 text-xs capitalize">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Content flags */}
          <div className="card">
            <p className="text-xs text-radar-muted uppercase tracking-wider mb-3">Content Detection</p>
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: 'Voiceover',     val: data.content?.hasVoiceover     },
                { label: 'Face on camera',val: data.content?.hasFaceOnCamera  },
                { label: 'Text overlay',  val: data.content?.hasTextOverlay   },
                { label: 'Subtitles',     val: data.content?.hasSubtitles     },
              ].map(({ label, val }) => (
                <div key={label} className={clsx(
                  'flex items-center gap-2 px-3 py-2 rounded-xl border text-xs',
                  val ? 'bg-radar-green/10 border-radar-green/30 text-radar-green'
                      : 'bg-radar-border border-radar-border text-radar-muted'
                )}>
                  <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                  {label}
                </div>
              ))}
            </div>
          </div>

          {/* Editing techniques */}
          <div className="card space-y-3">
            <button
              onClick={() => toggle('editing')}
              className="flex items-center justify-between w-full"
            >
              <div className="flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-radar-accent" />
                <span className="text-sm font-medium text-white">Editing Breakdown</span>
              </div>
              {expanded.editing ? <ChevronUp className="w-4 h-4 text-radar-muted" /> : <ChevronDown className="w-4 h-4 text-radar-muted" />}
            </button>
            {expanded.editing && (
              <div className="space-y-3 animate-fade-in pt-2 border-t border-radar-border">
                <p className="text-sm text-radar-muted">{data.editing?.style}</p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Transitions',    val: data.editing?.transitions   },
                    { label: 'Color Grading',  val: data.editing?.colorGrading  },
                    { label: 'Music Style',    val: data.editing?.musicStyle    },
                    { label: 'Hook',           val: data.content?.hook          },
                  ].map(({ label, val }) => (
                    <div key={label} className="bg-radar-bg border border-radar-border rounded-xl p-3">
                      <p className="text-xs text-radar-muted mb-1">{label}</p>
                      <p className="text-sm text-white">{val ?? '—'}</p>
                    </div>
                  ))}
                </div>
                <div>
                  <p className="text-xs text-radar-muted mb-2">Techniques used</p>
                  <div className="flex flex-wrap gap-2">
                    {(data.editing?.techniques ?? []).map(t => (
                      <span key={t} className="text-xs bg-radar-card border border-radar-border rounded-lg px-2.5 py-1 text-white">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Platform predictions */}
          <div className="card space-y-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-radar-accent" />
              <span className="text-sm font-medium text-white">Platform Predictions</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(data.platformPredictions ?? {}).map(([platform, pred]) => {
                const pc = PLATFORM_COLORS[platform] ?? PLATFORM_COLORS.tiktok
                return (
                  <div key={platform} className="bg-radar-bg border border-radar-border rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: pc.color }}>
                        {pc.label}
                      </p>
                      <span className="text-xl font-bold" style={{ color: pc.color }}>{pred.score}</span>
                    </div>
                    <div className="h-1.5 bg-radar-border rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${pred.score}%`, background: pc.color }} />
                    </div>
                    <p className="text-xs text-radar-muted">{pred.verdict}</p>
                    <div className="space-y-1">
                      {(pred.strengths ?? []).map(s => (
                        <p key={s} className="text-xs text-radar-green flex items-start gap-1.5">
                          <span className="mt-0.5">✓</span> {s}
                        </p>
                      ))}
                      {(pred.weaknesses ?? []).map(w => (
                        <p key={w} className="text-xs text-red-400 flex items-start gap-1.5">
                          <span className="mt-0.5">✗</span> {w}
                        </p>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Improvements */}
          <div className="card space-y-3">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-radar-accent" />
              <span className="text-sm font-medium text-white">Improvement Recommendations</span>
            </div>
            <div className="space-y-2">
              {(data.improvements ?? []).map((imp, i) => {
                const ps = PRIORITY_STYLE[imp.priority] ?? PRIORITY_STYLE.low
                return (
                  <div key={i} className="flex items-start gap-3 bg-radar-bg border border-radar-border rounded-xl p-3">
                    <span className={clsx('badge border flex-shrink-0 mt-0.5 capitalize', ps.bg, ps.text, ps.border)}>
                      {imp.priority}
                    </span>
                    <div className="flex-1">
                      <p className="text-xs font-medium text-radar-accent">{imp.area}</p>
                      <p className="text-xs text-radar-muted mt-0.5">{imp.issue}</p>
                      <p className="text-xs text-white mt-1">→ {imp.fix}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Suggested hashtags */}
          {data.hashtags?.length > 0 && (
            <div className="card space-y-3">
              <p className="text-xs text-radar-muted uppercase tracking-wider">Suggested Hashtags</p>
              <div className="flex flex-wrap gap-2">
                {data.hashtags.map(tag => (
                  <span key={tag} className="text-sm bg-radar-accent/10 text-radar-accent border border-radar-accent/20 rounded-xl px-3 py-1.5 font-mono">
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          <p className="text-xs text-radar-muted text-right">
            Analysed by Gemini AI · {new Date(data.analyzedAt).toLocaleTimeString()}
          </p>
        </div>
      )}
    </div>
  )
}
