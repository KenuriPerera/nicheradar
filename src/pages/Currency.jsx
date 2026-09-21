import { useState, useEffect } from 'react'
import { DollarSign, ArrowRightLeft } from 'lucide-react'
import { getCurrency } from '../utils/api'
import { SkeletonCard } from '../components/Skeleton'

const CURRENCY_INFO = {
  USD: { name: 'US Dollar', flag: '🇺🇸', symbol: '$' },
  EUR: { name: 'Euro', flag: '🇪🇺', symbol: '€' },
  GBP: { name: 'British Pound', flag: '🇬🇧', symbol: '£' },
  LKR: { name: 'Sri Lankan Rupee', flag: '🇱🇰', symbol: 'Rs' },
  AUD: { name: 'Australian Dollar', flag: '🇦🇺', symbol: 'A$' },
  CAD: { name: 'Canadian Dollar', flag: '🇨🇦', symbol: 'C$' },
}

export default function Currency() {
  const [base, setBase] = useState('USD')
  const [amount, setAmount] = useState(100)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  async function load() {
    setLoading(true); setError(null)
    try {
      const res = await getCurrency(base)
      setData(res)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [base])

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold text-white">Live Currency Converter</h1>
        <p className="text-radar-muted text-sm mt-1">
          Real-time exchange rates for global creator earnings (USD, EUR, GBP, LKR, AUD, CAD)
        </p>
      </div>

      <div className="card space-y-6">
        <div className="grid grid-cols-2 gap-4 items-end">
          <div>
            <label className="text-xs text-radar-muted block mb-2">Base Amount ({base})</label>
            <input
              type="number"
              value={amount}
              onChange={e => setAmount(Number(e.target.value) || 0)}
              className="w-full bg-radar-bg border border-radar-border text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-radar-accent font-mono"
            />
          </div>

          <div>
            <label className="text-xs text-radar-muted block mb-2">Base Currency</label>
            <select
              value={base}
              onChange={e => setBase(e.target.value)}
              className="w-full bg-radar-bg border border-radar-border text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-radar-accent"
            >
              {['USD', 'EUR', 'GBP', 'LKR', 'AUD', 'CAD'].map(curr => (
                <option key={curr} value={curr}>{curr}</option>
              ))}
            </select>
          </div>
        </div>

        {loading && <div className="grid grid-cols-3 gap-4">{[1, 2, 3, 4, 5, 6].map(i => <SkeletonCard key={i} />)}</div>}
        {error && <div className="card border-red-500/30 bg-red-500/5 text-red-400 text-sm">{error}</div>}

        {data && !loading && (
          <div className="space-y-4 animate-slide-up">
            <div className="flex items-center justify-between text-xs text-radar-muted">
              <span>Converted Values for {amount} {base}</span>
              <span>Updated: {data.date}</span>
            </div>

            <div className="grid grid-cols-3 gap-4">
              {Object.entries(data.rates).map(([curr, rate]) => {
                const info = CURRENCY_INFO[curr] || { flag: '', symbol: '' }
                return (
                  <div key={curr} className="card bg-radar-bg border-radar-border/60 flex items-center justify-between">
                    <div>
                      <div className="text-xs text-radar-muted uppercase font-mono flex items-center gap-1.5">
                        <span>{info.flag}</span>
                        <span>{curr}</span>
                      </div>
                      <div className="text-xl font-semibold text-white font-mono mt-1 flex gap-1">
                        <span className="text-radar-muted font-normal">{info.symbol}</span>
                        <span>{(amount * rate).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                    <div className="text-right text-[10px] text-radar-muted font-mono">
                      1 {base} = {rate.toFixed(4)} {curr}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
