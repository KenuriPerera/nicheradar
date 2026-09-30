import { useState } from 'react'
import { Palette, RefreshCw, Copy, CheckCircle2, Wand2 } from 'lucide-react'
import { getPalette } from '../utils/api'
import { useNiches } from '../hooks/useNiches'
import { usePageCache } from '../hooks/usePageCache'
import clsx from 'clsx'

export default function ColorPalette() {
  const { niches }                              = useNiches()
  const { data, set: setData }                  = usePageCache('color-palette')
  const [loading,    setLoading]                = useState(false)
  const [error,      setError]                  = useState(null)
  const [mode,       setMode]                   = useState('niche')
  const [niche,      setNiche]                  = useState('skincare')
  const [seedColor,  setSeedColor]              = useState('#7c3aed')
  const [copied,     setCopied]                 = useState(null)

  async function generate(force = false) {
    if (data && !force) return
    setLoading(true); setError(null)
    try {
      let res
      if (mode === 'niche') {
        res = await getPalette('niche', { niche })
      } else if (mode === 'seed') {
        res = await getPalette('seed', { seed: seedColor.replace('#', '') })
      } else {
        res = await getPalette('generate')
      }
      setData(res)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  function copyHex(hex) {
    navigator.clipboard.writeText(hex)
    setCopied(hex)
    setTimeout(() => setCopied(null), 2000)
  }

  function copyCSSVars(palette) {
    const css = palette.colors.map((c, i) =>
      `--color-${i + 1}: ${c.hex};`
    ).join('\n')
    navigator.clipboard.writeText(`:root {\n${css}\n}`)
    setCopied('css-' + palette.name)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold text-white flex items-center gap-2">
          <Palette className="w-6 h-6 text-radar-accent" />
          Color Palette Generator
        </h1>
        <p className="text-radar-muted text-sm mt-1">
          Generate aesthetic palettes for your content — niche-matched, seed-based or random
        </p>
      </div>

      {/* Controls */}
      <div className="card space-y-4">
        {/* Mode selector */}
        <div>
          <label className="text-xs text-radar-muted block mb-2">Generation mode</label>
          <div className="flex gap-2">
            {[
              { key: 'niche',   label: '✨ By Niche'       },
              { key: 'seed',    label: '🎨 From Color'     },
              { key: 'random',  label: '🎲 Random'         },
            ].map(m => (
              <button key={m.key} onClick={() => setMode(m.key)}
                className={clsx(
                  'text-sm px-4 py-2 rounded-xl border transition-all',
                  mode === m.key
                    ? 'bg-radar-accent border-radar-accent text-white'
                    : 'border-radar-border text-radar-muted hover:text-white'
                )}>
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Niche selector */}
        {mode === 'niche' && (
          <div>
            <label className="text-xs text-radar-muted block mb-2">Niche</label>
            <div className="flex flex-wrap gap-2">
              {niches.map(n => (
                <button key={n.key} onClick={() => setNiche(n.key)}
                  className={clsx(
                    'text-xs px-3 py-1.5 rounded-xl border transition-all',
                    niche === n.key
                      ? 'bg-radar-accent border-radar-accent text-white'
                      : 'border-radar-border text-radar-muted hover:text-white'
                  )}>
                  {n.icon} {n.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Seed color */}
        {mode === 'seed' && (
          <div>
            <label className="text-xs text-radar-muted block mb-2">Seed color</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={seedColor}
                onChange={e => setSeedColor(e.target.value)}
                className="w-12 h-10 rounded-xl border border-radar-border cursor-pointer bg-transparent"
              />
              <input
                type="text"
                value={seedColor}
                onChange={e => setSeedColor(e.target.value)}
                className="flex-1 bg-radar-bg border border-radar-border text-white rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:border-radar-accent"
                placeholder="#7c3aed"
              />
            </div>
          </div>
        )}

        <button
          onClick={() => generate(true)}
          disabled={loading}
          className="btn-primary w-full justify-center"
        >
          <Wand2 className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Generating...' : 'Generate Palettes'}
        </button>
      </div>

      {error && (
        <div className="card border-red-500/30 bg-red-500/5 text-red-400 text-sm">
          {error}
        </div>
      )}

      {!data && !loading && (
        <div className="card text-center py-12 space-y-3">
          <Palette className="w-10 h-10 text-radar-muted mx-auto" />
          <p className="text-white font-medium">Generate your first palette</p>
          <p className="text-radar-muted text-sm">
            Choose a mode above — niche palettes are pre-tuned for your content aesthetic
          </p>
        </div>
      )}

      {/* Palette results */}
      {data && !loading && (
        <div className="space-y-6 animate-slide-up">
          {data.palettes.map((palette, pi) => (
            <div key={pi} className="card space-y-4">
              {/* Palette header */}
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-white">{palette.name}</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => copyCSSVars(palette)}
                    className="text-xs text-radar-muted hover:text-radar-accent transition-colors flex items-center gap-1.5 border border-radar-border px-2.5 py-1.5 rounded-xl">
                    {copied === 'css-' + palette.name
                      ? <><CheckCircle2 className="w-3 h-3 text-radar-green" /> Copied!</>
                      : <><Copy className="w-3 h-3" /> Copy CSS vars</>
                    }
                  </button>
                </div>
              </div>

              {/* Color strip */}
              <div className="flex rounded-2xl overflow-hidden h-20">
                {palette.colors.map((color, ci) => (
                  <button
                    key={ci}
                    onClick={() => copyHex(color.hex)}
                    className="flex-1 relative group transition-all hover:flex-[2] duration-300"
                    style={{ background: color.hex }}
                    title={`Click to copy ${color.hex}`}
                  >
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      {copied === color.hex
                        ? <CheckCircle2 className="w-5 h-5" style={{ color: color.isLight ? '#000' : '#fff' }} />
                        : <Copy className="w-4 h-4" style={{ color: color.isLight ? '#000' : '#fff' }} />
                      }
                    </div>
                  </button>
                ))}
              </div>

              {/* Color details */}
              <div className="grid grid-cols-5 gap-2">
                {palette.colors.map((color, ci) => (
                  <button
                    key={ci}
                    onClick={() => copyHex(color.hex)}
                    className="space-y-1 text-center group"
                  >
                    <div
                      className="w-full h-8 rounded-lg border border-radar-border"
                      style={{ background: color.hex }}
                    />
                    <p className="text-xs font-mono text-white group-hover:text-radar-accent transition-colors">
                      {color.hex}
                    </p>
                    <p className="text-xs text-radar-muted">{color.name}</p>
                    <p className="text-xs text-radar-muted">
                      {color.rgb.r}, {color.rgb.g}, {color.rgb.b}
                    </p>
                  </button>
                ))}
              </div>

              {/* Usage suggestions */}
              <div className="bg-radar-bg border border-radar-border rounded-xl p-3">
                <p className="text-xs text-radar-muted mb-2">Suggested usage</p>
                <div className="flex gap-2 flex-wrap">
                  {[
                    { role: 'Background',  color: palette.colors[0] },
                    { role: 'Primary',     color: palette.colors[2] },
                    { role: 'Accent',      color: palette.colors[4] },
                    { role: 'Text',        color: palette.colors[1] },
                  ].map(({ role, color }) => (
                    <div key={role} className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-full border border-radar-border"
                        style={{ background: color?.hex }} />
                      <span className="text-xs text-radar-muted">{role}: </span>
                      <span className="text-xs font-mono text-white">{color?.hex}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}

          <p className="text-xs text-radar-muted text-center">
            Powered by Colormind AI · {new Date(data.generatedAt).toLocaleTimeString()}
          </p>
        </div>
      )}
    </div>
  )
}
