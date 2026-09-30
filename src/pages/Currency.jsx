import { useState, useEffect } from 'react'
import { RefreshCw, TrendingUp } from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts'
import { getCurrency } from '../utils/api'

const CURRENCIES = [
  { code: 'USD', name: 'US Dollar',         flag: '🇺🇸', symbol: '$',   color: '#10b981' },
  { code: 'LKR', name: 'Sri Lankan Rupee',  flag: '🇱🇰', symbol: 'Rs',  color: '#7c3aed', decimals: 0 },
  { code: 'EUR', name: 'Euro',              flag: '🇪🇺', symbol: '€',   color: '#06b6d4' },
  { code: 'GBP', name: 'British Pound',     flag: '🇬🇧', symbol: '£',   color: '#f59e0b' },
  { code: 'AUD', name: 'Australian Dollar', flag: '🇦🇺', symbol: 'A$',  color: '#ff2d55' },
  { code: 'CAD', name: 'Canadian Dollar',   flag: '🇨🇦', symbol: 'C$',  color: '#e1306c' },
]

export default function Currency() {
  const [base,       setBase]       = useState('USD')
  const [rates,      setRates]      = useState(null)
  const [date,       setDate]       = useState(null)
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState(null)
  const [prediction, setPrediction] = useState(null)

  async function load(b = base, force = false) {
    setLoading(true); setError(null)
    try {
      const res = await getCurrency(b)
      setRates(res.rates)
      setDate(res.date)
      if (res.prediction) {
        setPrediction(res.prediction)
      } else {
        console.warn('No prediction in response:', Object.keys(res))
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load(base) }, [base])

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 animate-fade-in">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white flex items-center gap-2">
            <RefreshCw className="w-6 h-6 text-radar-accent" />
            Currency
          </h1>
          <p className="text-radar-muted text-sm mt-1">
            Live exchange rates · USD/LKR 7-day prediction
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select value={base} onChange={e => { setBase(e.target.value); load(e.target.value) }}
            className="bg-radar-bg border border-radar-border text-white rounded-xl px-3 py-2 text-sm">
            {CURRENCIES.map(c => (
              <option key={c.code} value={c.code}>{c.flag} {c.code}</option>
            ))}
          </select>
          <button onClick={() => load(base, true)} disabled={loading} className="btn-primary">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {loading && <div className="h-1 w-full bg-radar-accent/20 rounded-full overflow-hidden"><div className="loading-bar h-full" /></div>}
      {error   && <div className="card border-red-500/30 bg-red-500/5 text-red-400 text-sm">{error}</div>}

      {/* Currency cards grid */}
      {rates && (
        <div className="grid grid-cols-2 gap-4">
          {CURRENCIES.filter(c => c.code !== base).map(c => {
            const rate = rates[c.code]
            if (!rate) return null
            return (
              <div key={c.code} className="card flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{c.flag}</span>
                  <div>
                    <p className="text-xs text-radar-muted">{c.name}</p>
                    <p className="text-sm font-bold text-white">{c.code}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-mono font-bold text-white">
                    {rate.toFixed(c.decimals ?? 2)}
                  </p>
                  <p className="text-xs text-radar-muted">1 {base}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── USD/LKR PREDICTION PANEL ── always rendered when prediction exists */}
      {prediction && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-radar-accent" />
            <h2 className="text-sm font-medium text-white">USD → LKR 7-Day Prediction</h2>
            <span className={`text-xs px-2.5 py-1 rounded-full border capitalize ml-auto ${
              prediction.trend?.weekly === 'rising'
                ? 'bg-red-500/10 text-red-400 border-red-500/30'
                : prediction.trend?.weekly === 'falling'
                ? 'bg-radar-green/10 text-radar-green border-radar-green/30'
                : 'bg-radar-muted/10 text-radar-muted border-radar-border'
            }`}>
              {prediction.trend?.weekly === 'rising' ? '▲' : prediction.trend?.weekly === 'falling' ? '▼' : '—'} {prediction.trend?.weekly}
            </span>
          </div>

          {/* Chart */}
          <div className="card space-y-2">
            <p className="text-xs text-radar-muted">
              Historical (green) vs Predicted (purple dashed) · current rate: Rs {prediction.currentRate?.toFixed(2)}
            </p>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart
                data={[
                  ...(prediction.historical ?? []).slice(-14).map(h => ({
                    date:   h.date.slice(5),
                    actual: h.rate,
                  })),
                  ...(prediction.predictions ?? []).map(p => ({
                    date:      p.date.slice(5),
                    predicted: p.predicted,
                  })),
                ]}
                margin={{ top: 5, right: 10, left: -10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3d" />
                <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} interval={2} />
                <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} domain={['auto','auto']} />
                <Tooltip
                  contentStyle={{ background: '#13131f', border: '1px solid #2a2a3d', borderRadius: 8, fontSize: 11 }}
                  formatter={(v, name) => [`Rs ${Number(v).toFixed(2)}`, name === 'actual' ? 'Historical' : 'Predicted']}
                />
                <ReferenceLine x={prediction.currentDate?.slice(5)} stroke="#7c3aed" strokeDasharray="3 3" />
                <Line type="monotone" dataKey="actual"    stroke="#10b981" strokeWidth={2} dot={false} connectNulls />
                <Line type="monotone" dataKey="predicted" stroke="#7c3aed" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3, fill: '#7c3aed' }} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* 7-day table */}
          <div className="card space-y-2">
            <p className="text-xs text-radar-muted uppercase tracking-wider">7-Day Forecast</p>
            <div className="space-y-1.5">
              {(prediction.predictions ?? []).map((p, i) => (
                <div key={i} className="flex items-center justify-between bg-radar-bg border border-radar-border rounded-xl px-4 py-2.5">
                  <span className="text-xs text-radar-muted w-24">{p.date}</span>
                  <span className="text-sm font-mono font-bold text-white">Rs {Number(p.predicted).toFixed(2)}</span>
                  <span className={`text-xs font-mono w-16 text-right ${
                    p.direction === 'up' ? 'text-red-400' : p.direction === 'down' ? 'text-radar-green' : 'text-radar-muted'
                  }`}>
                    {p.direction === 'up' ? '▲ +' : p.direction === 'down' ? '▼ -' : '— '}{Math.abs(p.change ?? 0).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Trend summary */}
          <div className="grid grid-cols-2 gap-3">
            <div className="card space-y-1">
              <p className="text-xs text-radar-muted">Weekly momentum</p>
              <p className={`text-lg font-bold ${(prediction.trend?.weeklyChange ?? 0) > 0 ? 'text-red-400' : 'text-radar-green'}`}>
                {(prediction.trend?.weeklyChange ?? 0) > 0 ? '+' : ''}{prediction.trend?.weeklyChange ?? 0} LKR/day
              </p>
            </div>
            <div className="card space-y-1">
              <p className="text-xs text-radar-muted">30-day total shift</p>
              <p className={`text-lg font-bold ${(prediction.trend?.monthlyChange ?? 0) > 0 ? 'text-red-400' : 'text-radar-green'}`}>
                {(prediction.trend?.monthlyChange ?? 0) > 0 ? '+' : ''}{prediction.trend?.monthlyChange ?? 0} LKR
              </p>
            </div>
          </div>

          <p className="text-xs text-radar-muted text-center">{prediction.disclaimer}</p>
        </div>
      )}

      {/* Show loading state for prediction if rates loaded but prediction not yet */}
      {rates && !prediction && !loading && (
        <div className="card text-center py-6">
          <p className="text-xs text-radar-muted">
            USD/LKR prediction loading... if this persists, click Refresh
          </p>
        </div>
      )}

      {date && (
        <p className="text-xs text-radar-muted text-right">
          Rates as of {date} · Frankfurter API · unlimited free
        </p>
      )}
    </div>
  )
}
