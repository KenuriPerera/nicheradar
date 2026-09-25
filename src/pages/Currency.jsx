import { useState, useEffect } from 'react'
import { RefreshCw, ArrowLeftRight, TrendingUp } from 'lucide-react'
import { getCurrency, incrementQuota } from '../utils/api'
import { usePageCache } from '../hooks/usePageCache'

const CURRENCIES = ['LKR', 'USD', 'EUR', 'GBP', 'AUD', 'CAD']

const CURRENCY_INFO = {
  LKR: { name: 'Sri Lankan Rupee',  flag: '🇱🇰', symbol: 'Rs',  color: '#7c3aed' },
  USD: { name: 'US Dollar',         flag: '🇺🇸', symbol: '$',   color: '#10b981' },
  EUR: { name: 'Euro',              flag: '🇪🇺', symbol: '€',   color: '#06b6d4' },
  GBP: { name: 'British Pound',     flag: '🇬🇧', symbol: '£',   color: '#f59e0b' },
  AUD: { name: 'Australian Dollar', flag: '🇦🇺', symbol: 'A$',  color: '#ff2d55' },
  CAD: { name: 'Canadian Dollar',   flag: '🇨🇦', symbol: 'C$',  color: '#e1306c' },
}

export default function Currency() {
  const [base,    setBase]    = useState('USD')
  const [amount,  setAmount]  = useState('100')
  const { data, set: setData } = usePageCache('currency-' + base)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)

  const rates = data?.rates ?? null
  const date  = data?.date  ?? null

  async function load(b = base, force = false) {
    if (data && !force && b === base) return
    setLoading(true); setError(null)
    try {
      const res = await getCurrency(b)
      setData(res)
      incrementQuota('frankfurter', 1).catch(() => {})
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  useEffect(() => { load(base) }, [base])

  function handleBase(b) {
    setBase(b)
  }

  const num = parseFloat(amount) || 0

  // Sort: LKR first, then base currency second, rest alphabetical
  const displayOrder = [
    'LKR',
    ...CURRENCIES.filter(c => c !== 'LKR' && c === base),
    ...CURRENCIES.filter(c => c !== 'LKR' && c !== base),
  ]

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold text-white">Currency Converter</h1>
        <p className="text-radar-muted text-sm mt-1">
          Live exchange rates — track your creator earnings globally
        </p>
      </div>

      {/* Controls */}
      <div className="card space-y-5">
        <div className="grid grid-cols-2 gap-6">
          {/* Amount */}
          <div>
            <label className="text-xs text-radar-muted block mb-2 uppercase tracking-wider">Amount</label>
            <input
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="w-full bg-radar-bg border border-radar-border text-white text-2xl font-semibold rounded-xl px-4 py-3 focus:outline-none focus:border-radar-accent transition-colors"
              placeholder="100"
            />
          </div>
          {/* Base currency */}
          <div>
            <label className="text-xs text-radar-muted block mb-2 uppercase tracking-wider">Convert from</label>
            <div className="flex flex-wrap gap-2">
              {CURRENCIES.map(c => {
                const info = CURRENCY_INFO[c]
                const active = base === c
                return (
                  <button
                    key={c}
                    onClick={() => handleBase(c)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border transition-all duration-200 ${
                      active
                        ? 'text-white border-transparent'
                        : 'border-radar-border text-radar-muted hover:text-white hover:border-radar-accent bg-transparent'
                    }`}
                    style={active ? { background: info.color, borderColor: info.color } : {}}
                  >
                    <span>{info.flag}</span>
                    <span>{c}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        <button
          onClick={() => load(base, true)}
          disabled={loading}
          className="btn-ghost w-full justify-center"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Fetching rates...' : 'Refresh rates'}
        </button>
      </div>

      {error && (
        <div className="card border-red-500/30 bg-red-500/5 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Results */}
      {rates && (
        <div className="space-y-3 animate-slide-up">
          <div className="flex items-center justify-between">
            <p className="text-xs text-radar-muted uppercase tracking-wider">
              {num.toLocaleString()} {base} equals
            </p>
            <p className="text-xs text-radar-muted flex items-center gap-1">
              <ArrowLeftRight className="w-3 h-3" />
              Updated {date}
            </p>
          </div>

          {/* Currency cards grid */}
          <div className="grid grid-cols-2 gap-3">
            {displayOrder.map(c => {
              const info      = CURRENCY_INFO[c]
              const rate      = rates[c] ?? 0
              const converted = (num * rate)
              const isBase    = c === base
              const isLKR     = c === 'LKR'

              return (
                <div
                  key={c}
                  className={`relative overflow-hidden rounded-2xl p-5 border transition-all duration-200 cursor-pointer hover:scale-[1.02] ${
                    isBase
                      ? 'border-radar-accent/40 bg-radar-accent/5'
                      : isLKR
                      ? 'border-purple-500/40 bg-purple-500/5'
                      : 'border-radar-border bg-radar-card'
                  }`}
                  onClick={() => handleBase(c)}
                >
                  {/* Background accent */}
                  <div
                    className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-5 -translate-y-8 translate-x-8"
                    style={{ background: info.color }}
                  />

                  {/* Top row */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{info.flag}</span>
                      <div>
                        <span className="text-xs font-medium text-white">{c}</span>
                        <p className="text-xs text-radar-muted">{info.name}</p>
                      </div>
                    </div>
                    {isBase && (
                      <span className="badge bg-radar-accent/20 text-radar-accent border border-radar-accent/30 text-xs">
                        Base
                      </span>
                    )}
                    {isLKR && !isBase && (
                      <span className="badge bg-purple-500/20 text-purple-400 border border-purple-500/30 text-xs">
                        LKR
                      </span>
                    )}
                  </div>

                  {/* Converted amount */}
                  <div>
                    <span
                      className="text-2xl font-bold"
                      style={{ color: info.color }}
                    >
                      {info.symbol}{converted.toLocaleString('en-US', {
                        minimumFractionDigits: c === 'LKR' ? 0 : 2,
                        maximumFractionDigits: c === 'LKR' ? 0 : 2,
                      })}
                    </span>
                    <p className="text-xs text-radar-muted mt-1">
                      1 {base} = {rate.toFixed(c === 'LKR' ? 2 : 4)} {c}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>

          <p className="text-xs text-radar-muted text-center pt-2">
            Click any currency to use it as base · Rates via European Central Bank
          </p>
        </div>
      )}
    </div>
  )
}
