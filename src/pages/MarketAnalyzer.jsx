import { useState, useEffect } from 'react'
import {
  Store, Plus, Search, RefreshCw, AlertCircle, CheckCircle,
  ExternalLink, ChevronDown, Trash2, ArrowRight, Shield,
  TrendingDown, Globe, ShoppingBag, Sliders, Info, Zap, AlertTriangle
} from 'lucide-react'
import clsx from 'clsx'

const PRODUCT_NICHES = [
  'skincare', 'fashion', 'fitness', 'food', 'tech',
  'wellness', 'pets', 'gaming', 'art', 'stationery', 'books'
]

export default function MarketAnalyzer() {
  const [activeTab, setActiveTab] = useState('products') // 'products' | 'results' | 'leaderboard' | 'settings'

  // Data states
  const [products, setProducts] = useState([])
  const [selectedIds, setSelectedIds] = useState([])
  const [productPrices, setProductPrices] = useState({}) // { [productId]: priceDoc }
  const [leaderboard, setLeaderboard] = useState([])
  const [quotaInfo, setQuotaInfo] = useState(null)
  const [fxRates, setFxRates] = useState(null)
  const [settings, setSettings] = useState({
    reserveSearches: 20,
    manualUsdToLkr: 0,
    shippingEstimate: 0,
    dutyPercent: 0,
    vatPercent: 0,
    otherPercent: 0,
  })

  // UI state
  const [loading, setLoading] = useState(true)
  const [checkingPrice, setCheckingPrice] = useState(false)
  const [actionError, setActionError] = useState(null)
  const [actionSuccess, setActionSuccess] = useState(null)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [confirmTarget, setConfirmTarget] = useState(null) // null for batch, or single productId
  const [expandedOfferTable, setExpandedOfferTable] = useState({}) // { [productId]: boolean }

  // New product form state
  const [newProduct, setNewProduct] = useState({
    name: '',
    niche: 'skincare',
    brand: '',
  })
  const [addingProduct, setAddingProduct] = useState(false)

  // ── Fetch Initial Data ─────────────────────────────────────────────────
  async function loadInitialData() {
    try {
      setLoading(true)
      setActionError(null)

      const [prodsRes, settingsRes, quotaRes] = await Promise.all([
        fetch('/api/market-analyzer?action=products').then(r => r.json()),
        fetch('/api/market-analyzer?action=settings').then(r => r.json()),
        fetch('/api/market-analyzer?action=quota').then(r => r.json()),
      ])

      if (prodsRes.products) setProducts(prodsRes.products)
      if (settingsRes.settings) setSettings(settingsRes.settings)
      if (settingsRes.fxRates) setFxRates(settingsRes.fxRates)
      if (quotaRes.quota) setQuotaInfo({ ...quotaRes.quota, reserve: quotaRes.reserve })

      // Fetch cached prices for saved products
      if (prodsRes.products?.length > 0) {
        const pricesMap = {}
        await Promise.all(
          prodsRes.products.map(async (p) => {
            try {
              const res = await fetch(`/api/market-analyzer?action=cached-price&productId=${p.id}`).then(r => r.json())
              if (res.cached && res.data) {
                pricesMap[p.id] = res.data
              }
            } catch {}
          })
        )
        setProductPrices(pricesMap)
      }
    } catch (err) {
      console.error('Failed to load initial Market Analyzer data:', err)
      setActionError('Failed to load initial data: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadInitialData()
  }, [])

  // ── Load Leaderboard ───────────────────────────────────────────────────
  async function loadLeaderboard() {
    try {
      const res = await fetch('/api/market-analyzer?action=leaderboard').then(r => r.json())
      if (res.leaderboard) setLeaderboard(res.leaderboard)
    } catch (err) {
      console.warn('Failed to load leaderboard:', err.message)
    }
  }

  useEffect(() => {
    if (activeTab === 'leaderboard') {
      loadLeaderboard()
    }
  }, [activeTab])

  // ── Add Product ────────────────────────────────────────────────────────
  async function handleAddProduct(e) {
    e.preventDefault()
    if (!newProduct.name.trim()) return
    setAddingProduct(true)
    setActionError(null)

    try {
      const res = await fetch('/api/market-analyzer?action=products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProduct),
      }).then(r => r.json())

      if (res.error) throw new Error(res.error)

      setProducts(prev => [res.product, ...prev])
      setNewProduct({ name: '', niche: 'skincare', brand: '' })
      setActionSuccess(`Added "${res.product.name}" to tracked products.`)
      setTimeout(() => setActionSuccess(null), 4000)
    } catch (err) {
      setActionError(err.message)
    } finally {
      setAddingProduct(false)
    }
  }

  // ── Delete Product ─────────────────────────────────────────────────────
  async function handleDeleteProduct(id, name) {
    if (!confirm(`Delete product "${name}"?`)) return
    try {
      await fetch(`/api/market-analyzer?action=products&id=${id}`, { method: 'DELETE' })
      setProducts(prev => prev.filter(p => p.id !== id))
      setSelectedIds(prev => prev.filter(item => item !== id))
      setProductPrices(prev => {
        const next = { ...prev }
        delete next[id]
        return next
      })
    } catch (err) {
      setActionError('Failed to delete product: ' + err.message)
    }
  }

  // ── Toggle Select Product for Batch ────────────────────────────────────
  function toggleSelectProduct(id) {
    setSelectedIds(prev => {
      if (prev.includes(id)) return prev.filter(i => i !== id)
      if (prev.length >= 5) {
        alert('Maximum 5 products per price-check batch (to prevent excessive SerpAPI usage).')
        return prev
      }
      return [...prev, id]
    })
  }

  // ── Trigger Price Check Confirm Dialog ─────────────────────────────────
  function initiatePriceCheck(targetId = null) {
    setActionError(null)
    setConfirmTarget(targetId)
    setShowConfirmModal(true)
  }

  // ── Execute Price Check ────────────────────────────────────────────────
  async function executePriceCheck() {
    setShowConfirmModal(false)
    setCheckingPrice(true)
    setActionError(null)

    const targetList = confirmTarget ? [confirmTarget] : selectedIds
    if (targetList.length === 0) {
      setCheckingPrice(false)
      return
    }

    try {
      const res = await fetch('/api/market-analyzer?action=check-price', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productIds: targetList, force: true }),
      }).then(r => r.json())

      if (res.error) throw new Error(res.error)

      // Update cached prices map
      const nextMap = { ...productPrices }
      for (const item of (res.results || [])) {
        if (item.productId) {
          nextMap[item.productId] = item
        }
      }
      setProductPrices(nextMap)

      // Refresh quota info
      fetch('/api/market-analyzer?action=quota')
        .then(r => r.json())
        .then(q => { if (q.quota) setQuotaInfo({ ...q.quota, reserve: q.reserve }) })
        .catch(() => {})

      setActionSuccess(`Price check completed! Used ${res.searchesUsed} SerpAPI search${res.searchesUsed > 1 ? 'es' : ''}.`)
      setActiveTab('results')
      setTimeout(() => setActionSuccess(null), 5000)
    } catch (err) {
      setActionError(err.message)
    } finally {
      setCheckingPrice(false)
      setConfirmTarget(null)
    }
  }

  // ── Reprocess Action (0 SerpAPI searches) ──────────────────────────────
  async function handleReprocess(productId) {
    setActionError(null)
    try {
      const res = await fetch('/api/market-analyzer?action=reprocess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId }),
      }).then(r => r.json())

      if (res.error) throw new Error(res.error)

      setProductPrices(prev => ({
        ...prev,
        [productId]: res.data
      }))
      setActionSuccess(`Reprocessed raw offers at 0 SerpAPI searches.`)
      setTimeout(() => setActionSuccess(null), 4000)
    } catch (err) {
      setActionError(err.message)
    }
  }

  // ── Save Settings ──────────────────────────────────────────────────────
  async function handleSaveSettings(e) {
    e.preventDefault()
    setActionError(null)
    try {
      const res = await fetch('/api/market-analyzer?action=settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      }).then(r => r.json())

      if (res.error) throw new Error(res.error)
      if (res.fxRates) setFxRates(res.fxRates)

      setActionSuccess('Settings and landing cost parameters saved!')
      setTimeout(() => setActionSuccess(null), 4000)
    } catch (err) {
      setActionError(err.message)
    }
  }

  // Calculate needed searches for confirmation
  const targetCount = confirmTarget ? 1 : selectedIds.length
  const neededSearches = targetCount * 2
  const remainingSearches = quotaInfo?.remaining ?? 0
  const reserveSearches = Number(settings.reserveSearches || 20)
  const isReserveBlocked = (remainingSearches - neededSearches) < reserveSearches

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6 animate-fade-in">
      {/* ── Header ────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-radar-border">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-radar-accent flex items-center justify-center glow-accent flex-shrink-0">
              <Store className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-white tracking-tight">Market Analyzer</h1>
                <span className="badge bg-radar-accent/20 text-radar-accent border border-radar-accent/30 font-mono text-[11px]">
                  Price Intelligence
                </span>
              </div>
              <p className="text-radar-muted text-xs">
                Compare Sri Lanka (gl=lk) vs. International (gl=us) offers · Landed LKR Cost Calculator
              </p>
            </div>
          </div>
        </div>

        {/* Quota & Exchange Rate Status Chips */}
        <div className="flex flex-wrap items-center gap-2.5 text-xs">
          {quotaInfo && (
            <div className="px-3 py-1.5 rounded-xl bg-radar-card border border-radar-border flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-radar-accent" />
              <span className="text-radar-muted">SerpAPI:</span>
              <strong className="text-white font-mono">{quotaInfo.remaining}</strong>
              <span className="text-[11px] text-radar-muted">({reserveSearches} reserved)</span>
            </div>
          )}

          {fxRates && (
            <div className={clsx(
              'px-3 py-1.5 rounded-xl border flex items-center gap-2',
              (fxRates.source === 'placeholder (no live or saved rate)' || fxRates.isFallback || !fxRates.date)
                ? 'bg-red-500/10 border-red-500/30 text-red-400'
                : fxRates.isStale
                ? 'bg-radar-amber/10 border-radar-amber/30 text-radar-amber'
                : 'bg-radar-card border-radar-border text-white'
            )}>
              <Globe className={clsx('w-3.5 h-3.5', (fxRates.source === 'placeholder (no live or saved rate)' || fxRates.isFallback || !fxRates.date) ? 'text-red-400' : 'text-radar-green')} />
              <span>1 USD = <strong>{fxRates.rates?.LKR || 320} LKR</strong></span>
              <span className="text-[10px] text-radar-muted font-mono">({fxRates.source})</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Stale / Fallback Rate Alert ─────────────────────────────────── */}
      {(fxRates?.source === 'placeholder (no live or saved rate)' || fxRates?.isFallback || (!fxRates?.date && fxRates?.isStale)) ? (
        <div className="card border-red-500/40 bg-red-500/5 p-3 flex items-center gap-3 text-xs">
          <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <p className="text-red-300">
            <strong>Warning:</strong> Live exchange rate and cached rates are unavailable. Using hard-coded placeholder rate (1 USD = {fxRates.rates?.LKR || 320} LKR). Currency conversions may be inaccurate. Configure a manual override in Settings if needed.
          </p>
        </div>
      ) : fxRates?.isStale && (
        <div className="card border-radar-amber/40 bg-radar-amber/5 p-3 flex items-center gap-3 text-xs">
          <AlertTriangle className="w-4 h-4 text-radar-amber flex-shrink-0" />
          <p className="text-radar-amber">
            <strong>Notice:</strong> Live exchange rate fetch unavailable. Using stored rate from{' '}
            <span className="font-mono">{fxRates.date || 'unknown'}</span>. Configure manual override in Settings if needed.
          </p>
        </div>
      )}

      {/* ── Action Notifications ───────────────────────────────────────── */}
      {actionError && (
        <div className="card border-red-500/30 bg-red-500/5 p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-red-300 text-xs">{actionError}</p>
        </div>
      )}

      {actionSuccess && (
        <div className="card border-radar-green/30 bg-radar-green/5 p-4 flex items-center gap-3">
          <CheckCircle className="w-4 h-4 text-radar-green flex-shrink-0" />
          <p className="text-radar-green text-xs">{actionSuccess}</p>
        </div>
      )}

      {/* ── Sub-navigation Tabs ─────────────────────────────────────────── */}
      <div className="flex border-b border-radar-border gap-1 overflow-x-auto pb-1">
        {[
          { id: 'products',    label: `My Products (${products.length})`, icon: ShoppingBag },
          { id: 'results',     label: 'Price Comparisons',                icon: TrendingDown },
          { id: 'leaderboard', label: 'Merchant Leaderboard',             icon: Shield       },
          { id: 'settings',    label: 'Landing Costs & Settings',          icon: Sliders      },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={clsx(
              'flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs md:text-sm font-medium transition-all duration-200 whitespace-nowrap',
              activeTab === id
                ? 'bg-radar-card text-white border border-radar-border shadow-sm'
                : 'text-radar-muted hover:text-white hover:bg-radar-card/50'
            )}
          >
            <Icon className={clsx('w-4 h-4', activeTab === id ? 'text-radar-accent' : 'text-radar-muted')} />
            {label}
          </button>
        ))}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* TAB 1: MY PRODUCTS                                                  */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'products' && (
        <div className="space-y-6 animate-fade-in">
          {/* Add Product Form */}
          <div className="card p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Plus className="w-4 h-4 text-radar-accent" />
              <h2 className="text-sm font-semibold text-white">Add Product to Track (Zero Cost)</h2>
            </div>

            <form onSubmit={handleAddProduct} className="grid grid-cols-1 md:grid-cols-12 gap-3">
              <div className="md:col-span-5">
                <input
                  type="text"
                  placeholder="Product Name (e.g. CeraVe Hydrating Facial Cleanser)"
                  value={newProduct.name}
                  onChange={(e) => setNewProduct(prev => ({ ...prev, name: e.target.value }))}
                  required
                  className="w-full bg-radar-bg border border-radar-border text-white text-xs rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-radar-accent"
                />
              </div>

              <div className="md:col-span-3">
                <select
                  value={newProduct.niche}
                  onChange={(e) => setNewProduct(prev => ({ ...prev, niche: e.target.value }))}
                  className="w-full bg-radar-bg border border-radar-border text-white text-xs rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-radar-accent"
                >
                  {PRODUCT_NICHES.map(n => (
                    <option key={n} value={n} className="capitalize">{n}</option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <input
                  type="text"
                  placeholder="Brand (optional)"
                  value={newProduct.brand}
                  onChange={(e) => setNewProduct(prev => ({ ...prev, brand: e.target.value }))}
                  className="w-full bg-radar-bg border border-radar-border text-white text-xs rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-radar-accent"
                />
              </div>

              <div className="md:col-span-2">
                <button
                  type="submit"
                  disabled={addingProduct || !newProduct.name.trim()}
                  className="btn-primary w-full justify-center text-xs py-2.5"
                >
                  <Plus className="w-4 h-4" />
                  {addingProduct ? 'Adding…' : 'Add Product'}
                </button>
              </div>
            </form>
          </div>

          {/* Products List & Batch Actions */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-white">Tracked Products</h3>
                <span className="text-xs font-mono text-radar-muted">({products.length})</span>
              </div>

              {selectedIds.length > 0 && (
                <div className="flex items-center gap-2 animate-fade-in">
                  <span className="text-xs text-radar-muted">{selectedIds.length} selected</span>
                  <button
                    onClick={() => initiatePriceCheck()}
                    disabled={checkingPrice}
                    className="btn-primary text-xs py-1.5 px-3"
                  >
                    <Search className="w-3.5 h-3.5" />
                    Check Selected ({selectedIds.length * 2} searches)
                  </button>
                </div>
              )}
            </div>

            {products.length === 0 ? (
              <div className="card text-center py-16 text-radar-muted text-sm space-y-2">
                <ShoppingBag className="w-10 h-10 text-radar-muted mx-auto opacity-50" />
                <p>No products added yet.</p>
                <p className="text-xs">Add a product above to check Sri Lanka vs. International prices.</p>
              </div>
            ) : (
              <div className="card p-0 overflow-hidden divide-y divide-radar-border/40">
                {products.map(prod => {
                  const cachedData = productPrices[prod.id]
                  const isSelected = selectedIds.includes(prod.id)
                  const stats = cachedData?.stats

                  return (
                    <div
                      key={prod.id}
                      className={clsx(
                        'p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors',
                        isSelected ? 'bg-radar-card/80' : 'hover:bg-radar-card/40'
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectProduct(prod.id)}
                          className="mt-1 rounded bg-radar-bg border-radar-border text-radar-accent focus:ring-0 cursor-pointer"
                        />
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm font-medium text-white">{prod.name}</h4>
                            <span className="badge bg-radar-border/60 text-radar-muted uppercase text-[10px] font-mono">
                              {prod.niche}
                            </span>
                            {prod.brand && (
                              <span className="badge bg-radar-accent/10 text-radar-accent border border-radar-accent/20 text-[10px]">
                                {prod.brand}
                              </span>
                            )}
                          </div>

                          {cachedData ? (
                            <div className="flex items-center gap-3 text-xs text-radar-muted">
                              <span>
                                Cheapest:{' '}
                                <strong className="text-radar-green font-mono">
                                  {stats?.cheapestOverall ? `${stats.cheapestOverall.priceLkr.toLocaleString()} LKR` : 'N/A'}
                                </strong>
                              </span>
                              <span>·</span>
                              <span>{stats?.comparableCount || 0} comparable offers</span>
                              <span>·</span>
                              <span className="text-[11px]">
                                Checked {new Date(cachedData.checkedAt).toLocaleDateString()}
                              </span>
                            </div>
                          ) : (
                            <p className="text-xs text-radar-muted">Price not checked yet (requires 2 searches)</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <button
                          onClick={() => initiatePriceCheck(prod.id)}
                          disabled={checkingPrice}
                          className="btn-ghost text-xs py-1.5 px-3"
                          title="Run gl=lk and gl=us SerpAPI searches"
                        >
                          <Search className="w-3.5 h-3.5" />
                          {cachedData ? 'Refresh Prices' : 'Check Price'}
                        </button>

                        {cachedData && (
                          <button
                            onClick={() => handleReprocess(prod.id)}
                            className="btn-ghost text-xs py-1.5 px-2.5"
                            title="Re-run filters & classification at 0 SerpAPI searches"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                          </button>
                        )}

                        <button
                          onClick={() => handleDeleteProduct(prod.id, prod.name)}
                          className="p-1.5 rounded-lg text-radar-muted hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* TAB 2: PRICE RESULTS & COMPARISONS                                  */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'results' && (
        <div className="space-y-6 animate-fade-in">
          {Object.keys(productPrices).length === 0 ? (
            <div className="card text-center py-16 text-radar-muted text-sm space-y-3">
              <TrendingDown className="w-10 h-10 text-radar-muted mx-auto opacity-50" />
              <p className="text-white font-medium">No Price Checks Run Yet</p>
              <p className="text-xs max-w-md mx-auto">
                Go to the "My Products" tab, add a product, and click "Check Price" to view local vs. import comparisons.
              </p>
              <button onClick={() => setActiveTab('products')} className="btn-primary mx-auto text-xs">
                Go to My Products
              </button>
            </div>
          ) : (
            Object.values(productPrices).map(priceDoc => {
              const stats = priceDoc.stats || {}
              const isTableOpen = !!expandedOfferTable[priceDoc.productId]
              const offers = priceDoc.offers || []

              return (
                <div key={priceDoc.productId} className="card p-6 space-y-6 border-radar-border">
                  {/* Product Card Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-radar-border">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-lg font-bold text-white">{priceDoc.productName}</h3>
                        <span className="badge bg-radar-border text-radar-muted uppercase font-mono text-[10px]">
                          {priceDoc.niche}
                        </span>
                        {priceDoc.brand && (
                          <span className="badge bg-radar-accent/10 text-radar-accent border border-radar-accent/30 text-[10px]">
                            {priceDoc.brand}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-radar-muted mt-1">
                        Checked: {new Date(priceDoc.checkedAt).toLocaleDateString()} {new Date(priceDoc.checkedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ·
                        Valid through {new Date(priceDoc.expiresAt).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleReprocess(priceDoc.productId)}
                        className="btn-ghost text-xs py-1.5 px-3"
                        title="Rebuild normalized offers & stats from stored raw results at 0 searches"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Reprocess (0 units)
                      </button>

                      <button
                        onClick={() => initiatePriceCheck(priceDoc.productId)}
                        className="btn-ghost text-xs py-1.5 px-3"
                        title="Force fresh SerpAPI searches"
                      >
                        <Search className="w-3.5 h-3.5 text-radar-accent" />
                        Refresh Prices
                      </button>
                    </div>
                  </div>

                  {/* Insufficient Data Warning (< 3 comparable offers) */}
                  {!stats.isDataSufficient && (
                    <div className="p-3.5 rounded-xl bg-radar-amber/10 border border-radar-amber/30 flex items-start gap-3 text-xs">
                      <Info className="w-4 h-4 text-radar-amber flex-shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-radar-amber">Insufficient Comparable Data:</strong>
                        <p className="text-radar-muted mt-0.5">
                          Found only {stats.comparableCount || 0} comparable offer(s) matching ≥60% of the product name tokens.
                          Check the manual marketplace links below for Daraz, AliExpress, and Temu.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Sri Lankan Coverage Thin Notice (< 3 local offers) */}
                  {stats.isDataSufficient && stats.localComparableCount < 3 && (
                    <div className="p-3 rounded-xl bg-radar-card border border-radar-border/60 flex items-center justify-between gap-3 text-xs">
                      <span className="text-radar-muted">
                        Sri Lankan local coverage is thin ({stats.localComparableCount} local offer found in Google Shopping).
                      </span>
                      <a
                        href={`https://www.daraz.lk/catalog/?q=${encodeURIComponent(priceDoc.productName)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-radar-accent hover:underline flex items-center gap-1 font-medium"
                      >
                        Verify on Daraz LK <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}

                  {/* Core 3 Comparison Metric Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Best Local Offer */}
                    <div className="p-4 rounded-xl bg-radar-bg border border-radar-border space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-radar-green flex items-center gap-1.5">
                          🇱🇰 Best Local Offer
                        </span>
                        {stats.bestLocalOffer && (
                          <span className="badge bg-radar-green/10 text-radar-green border border-radar-green/30 text-[10px]">
                            Local Available
                          </span>
                        )}
                      </div>

                      {stats.bestLocalOffer ? (
                        <div className="space-y-1.5">
                          <div className="text-xl font-bold text-white font-mono">
                            {stats.bestLocalOffer.priceLkr.toLocaleString()} <span className="text-xs text-radar-muted font-normal">LKR</span>
                          </div>
                          <p className="text-xs text-radar-text line-clamp-1 font-medium">
                            {stats.bestLocalOffer.merchant}
                          </p>
                          <p className="text-[11px] text-radar-muted line-clamp-1 italic">
                            "{stats.bestLocalOffer.title}"
                          </p>
                          <a
                            href={stats.bestLocalOffer.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-radar-accent hover:underline pt-1"
                          >
                            View Store <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      ) : (
                        <p className="text-xs text-radar-muted py-3">No local Sri Lanka sellers indexed by Google Shopping</p>
                      )}
                    </div>

                    {/* Best Imported Offer (By Landed Cost) */}
                    <div className="p-4 rounded-xl bg-radar-bg border border-radar-border space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-radar-accent2 flex items-center gap-1.5">
                          ✈️ Best Import (Landed Cost)
                        </span>
                        {stats.bestImportedOffer && (
                          <span className="badge bg-radar-accent2/10 text-radar-accent2 border border-radar-accent2/30 text-[10px]">
                            Landed Formula
                          </span>
                        )}
                      </div>

                      {stats.bestImportedOffer ? (
                        <div className="space-y-1.5">
                          <div className="text-xl font-bold text-radar-accent2 font-mono">
                            {stats.bestImportedOffer.landingCost?.landedLkr.toLocaleString()}{' '}
                            <span className="text-xs text-radar-muted font-normal">LKR Landed</span>
                          </div>
                          <div className="text-xs text-radar-muted">
                            Base: <strong className="text-white font-mono">{stats.bestImportedOffer.rawPriceStr}</strong>{' '}
                            ({stats.bestImportedOffer.priceLkr.toLocaleString()} LKR)
                          </div>
                          <p className="text-xs text-radar-text line-clamp-1 font-medium">
                            {stats.bestImportedOffer.merchant}
                          </p>
                          <a
                            href={stats.bestImportedOffer.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-radar-accent2 hover:underline pt-1"
                          >
                            View Store <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      ) : (
                        <p className="text-xs text-radar-muted py-3">No comparable imported offers found</p>
                      )}
                    </div>

                    {/* Median & Range */}
                    <div className="p-4 rounded-xl bg-radar-bg border border-radar-border space-y-3">
                      <span className="text-xs font-semibold uppercase tracking-wider text-radar-muted">
                        📊 Market Benchmark
                      </span>
                      <div className="space-y-2">
                        <div>
                          <div className="text-xl font-bold text-white font-mono">
                            {stats.medianPriceLkr?.toLocaleString()} <span className="text-xs text-radar-muted font-normal">LKR Median</span>
                          </div>
                          <p className="text-xs text-radar-muted">
                            Range: {stats.priceRangeLkr?.min.toLocaleString()} – {stats.priceRangeLkr?.max.toLocaleString()} LKR
                          </p>
                        </div>
                        <div className="text-[11px] text-radar-muted pt-1 border-t border-radar-border/40">
                          Based on {stats.comparableCount || 0} comparable items across Sri Lanka & US engines
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Landing Cost Breakdown (If best imported offer exists) */}
                  {stats.bestImportedOffer && (
                    <div className="p-4 rounded-xl bg-radar-card/50 border border-radar-border/70 space-y-2.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-white">Import Landing Cost Breakdown</span>
                        <span className="text-[11px] text-radar-muted font-mono">{stats.bestImportedOffer.merchant}</span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                        <div className="p-2 rounded-lg bg-radar-bg border border-radar-border/40">
                          <span className="text-[10px] text-radar-muted block">Base Price:</span>
                          <strong className="text-white font-mono">{stats.bestImportedOffer.landingCost.baseLkr.toLocaleString()} LKR</strong>
                        </div>
                        <div className="p-2 rounded-lg bg-radar-bg border border-radar-border/40">
                          <span className="text-[10px] text-radar-muted block">Shipping Est:</span>
                          <strong className="text-white font-mono">+{stats.bestImportedOffer.landingCost.shippingEstimate.toLocaleString()} LKR</strong>
                        </div>
                        <div className="p-2 rounded-lg bg-radar-bg border border-radar-border/40">
                          <span className="text-[10px] text-radar-muted block">Duty ({stats.bestImportedOffer.landingCost.dutyPercent}%):</span>
                          <strong className="text-white font-mono">+{stats.bestImportedOffer.landingCost.duty.toLocaleString()} LKR</strong>
                        </div>
                        <div className="p-2 rounded-lg bg-radar-bg border border-radar-border/40">
                          <span className="text-[10px] text-radar-muted block">VAT ({stats.bestImportedOffer.landingCost.vatPercent}%):</span>
                          <strong className="text-white font-mono">+{stats.bestImportedOffer.landingCost.VAT.toLocaleString()} LKR</strong>
                        </div>
                        <div className="p-2 rounded-lg bg-radar-bg border border-radar-border/40">
                          <span className="text-[10px] text-radar-muted block">Total Landed:</span>
                          <strong className="text-radar-accent2 font-mono">{stats.bestImportedOffer.landingCost.landedLkr.toLocaleString()} LKR</strong>
                        </div>
                      </div>

                      <p className="text-[10px] text-radar-muted italic">
                        * {stats.bestImportedOffer.landingCost.formulaNote}
                      </p>
                    </div>
                  )}

                  {/* Manual Marketplace Deep Links */}
                  <div className="space-y-2 pt-2 border-t border-radar-border/40">
                    <span className="text-xs font-semibold text-radar-muted block">
                      Check Marketplaces Manually (Direct Search):
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {priceDoc.manualLinks?.map(m => (
                        <a
                          key={m.name}
                          href={m.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 rounded-xl bg-radar-bg border border-radar-border/60 hover:border-radar-accent text-xs text-radar-text hover:text-white flex items-center gap-1.5 transition-colors"
                        >
                          <span>{m.icon}</span>
                          <span>{m.name}</span>
                          <ExternalLink className="w-3 h-3 text-radar-muted" />
                        </a>
                      ))}
                    </div>
                  </div>

                  {/* Toggle Normalized Offers Table */}
                  <div className="pt-2">
                    <button
                      onClick={() => setExpandedOfferTable(prev => ({ ...prev, [priceDoc.productId]: !prev[priceDoc.productId] }))}
                      className="text-xs text-radar-accent hover:underline flex items-center gap-1 font-medium"
                    >
                      <ChevronDown className={clsx('w-3.5 h-3.5 transition-transform', isTableOpen && 'rotate-180')} />
                      {isTableOpen ? 'Hide Raw Normalized Offers' : `Show Raw Normalized Offers (${offers.length} found)`}
                    </button>

                    {isTableOpen && (
                      <div className="mt-3 overflow-x-auto border border-radar-border/60 rounded-xl animate-fade-in">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-radar-card text-[11px] text-radar-muted font-mono uppercase border-b border-radar-border">
                            <tr>
                              <th className="p-3">Merchant / Hostname</th>
                              <th className="p-3">Offer Title</th>
                              <th className="p-3 text-right">Raw Price</th>
                              <th className="p-3 text-right">Price (LKR)</th>
                              <th className="p-3 text-center">Type</th>
                              <th className="p-3 text-center">Comparable?</th>
                              <th className="p-3 text-center">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-radar-border/30">
                            {offers.map(off => (
                              <tr key={off.id} className="hover:bg-radar-card/30">
                                <td className="p-3 font-medium">
                                  <div className="text-white">{off.merchant}</div>
                                  <div className="text-[10px] text-radar-muted font-mono">{off.hostname || 'no-domain'}</div>
                                </td>
                                <td className="p-3 max-w-xs truncate text-radar-text/90" title={off.title}>
                                  {off.title}
                                </td>
                                <td className="p-3 text-right font-mono text-radar-muted">
                                  {off.rawPriceStr}
                                </td>
                                <td className="p-3 text-right font-mono text-white font-medium">
                                  {off.priceLkr.toLocaleString()}
                                </td>
                                <td className="p-3 text-center">
                                  <span className={clsx(
                                    'badge text-[10px] border',
                                    off.classification === 'local' && 'bg-radar-green/10 text-radar-green border-radar-green/30',
                                    off.classification === 'import' && 'bg-radar-accent2/10 text-radar-accent2 border-radar-accent2/30',
                                    off.classification === 'official-store' && 'bg-radar-accent/10 text-radar-accent border-radar-accent/30',
                                    off.classification === 'unknown' && 'bg-radar-border text-radar-muted'
                                  )}>
                                    {off.classification}
                                  </span>
                                </td>
                                <td className="p-3 text-center">
                                  {off.isComparable && !off.isOutlier ? (
                                    <span className="badge bg-radar-green/10 text-radar-green border border-radar-green/30 text-[10px]">
                                      Yes ({Math.round((off.overlapRatio || 1) * 100)}%)
                                    </span>
                                  ) : (
                                    <span
                                      className="badge bg-red-500/10 text-red-400 border border-red-500/30 text-[10px] cursor-help"
                                      title={off.outlierReason || off.exclusionReason}
                                    >
                                      No ({off.outlierReason ? 'outlier' : 'excluded'})
                                    </span>
                                  )}
                                </td>
                                <td className="p-3 text-center">
                                  <a
                                    href={off.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-radar-accent hover:underline text-xs flex items-center justify-center gap-1"
                                  >
                                    View <ExternalLink className="w-3 h-3" />
                                  </a>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* TAB 3: MERCHANT LEADERBOARD                                         */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'leaderboard' && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white">Merchant Best-Price Leaderboard</h3>
              <p className="text-xs text-radar-muted">
                Who offers the lowest price most frequently across your checked products
              </p>
            </div>
            <button onClick={loadLeaderboard} className="btn-ghost text-xs py-1.5 px-3">
              <RefreshCw className="w-3 h-3" /> Refresh
            </button>
          </div>

          {leaderboard.length === 0 ? (
            <div className="card text-center py-12 text-radar-muted text-sm">
              No merchant data collected yet. Run price checks on products to populate the leaderboard.
            </div>
          ) : (
            <div className="card p-0 overflow-hidden">
              <div className="grid grid-cols-12 px-5 py-3 border-b border-radar-border text-xs text-radar-muted font-mono uppercase">
                <span className="col-span-1">#</span>
                <span className="col-span-5">Merchant / Platform</span>
                <span className="col-span-2 text-center">Classification</span>
                <span className="col-span-2 text-center">Appearances</span>
                <span className="col-span-2 text-right">Cheapest Wins</span>
              </div>
              <div className="divide-y divide-radar-border/40">
                {leaderboard.map((m, idx) => (
                  <div key={m.merchant} className="grid grid-cols-12 px-5 py-3 items-center hover:bg-radar-card/30 text-xs">
                    <span className="col-span-1 font-mono text-radar-muted">{idx + 1}</span>
                    <div className="col-span-5">
                      <strong className="text-white">{m.merchant}</strong>
                      <span className="text-[10px] text-radar-muted font-mono block">{m.hostname}</span>
                    </div>
                    <div className="col-span-2 text-center">
                      <span className={clsx(
                        'badge text-[10px] border',
                        m.classification === 'local' && 'bg-radar-green/10 text-radar-green border-radar-green/30',
                        m.classification === 'import' && 'bg-radar-accent2/10 text-radar-accent2 border-radar-accent2/30',
                        m.classification === 'official-store' && 'bg-radar-accent/10 text-radar-accent border-radar-accent/30',
                        m.classification === 'unknown' && 'bg-radar-border text-radar-muted'
                      )}>
                        {m.classification}
                      </span>
                    </div>
                    <span className="col-span-2 text-center font-mono text-radar-muted">{m.appearances}</span>
                    <div className="col-span-2 text-right">
                      <strong className="text-radar-green font-mono">{m.cheapestWins}</strong>{' '}
                      <span className="text-[10px] text-radar-muted font-mono">({m.winRate}%)</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* TAB 4: SETTINGS & LANDING COSTS                                     */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'settings' && (
        <div className="card p-6 space-y-6 animate-fade-in max-w-2xl">
          <div>
            <h3 className="text-base font-semibold text-white">Import Landing Cost & Quota Settings</h3>
            <p className="text-xs text-radar-muted mt-0.5">
              Configure customs duty, VAT, shipping estimates, FX override, and SerpAPI safety reserve
            </p>
          </div>

          <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
            {/* Exchange Rate Override */}
            <div className="p-3.5 rounded-xl bg-radar-bg border border-radar-border space-y-2">
              <label className="text-white font-medium block">
                USD to LKR Exchange Rate Override (Optional)
              </label>
              <input
                type="number"
                step="0.01"
                placeholder={`Current Live: ${fxRates?.rates?.LKR || 320}`}
                value={settings.manualUsdToLkr || ''}
                onChange={(e) => setSettings(prev => ({ ...prev, manualUsdToLkr: e.target.value }))}
                className="w-full bg-radar-card border border-radar-border text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-radar-accent"
              />
              <p className="text-[11px] text-radar-muted">
                Leave blank or 0 to use live rate from <span className="font-mono text-radar-green">open.er-api.com</span>.
              </p>
            </div>

            {/* Landing Cost Assumptions */}
            <div className="p-3.5 rounded-xl bg-radar-bg border border-radar-border space-y-3">
              <h4 className="text-white font-medium">Sri Lanka Landing Cost Formula Parameters</h4>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-radar-muted">Default Shipping Estimate (LKR)</label>
                  <input
                    type="number"
                    value={settings.shippingEstimate || ''}
                    onChange={(e) => setSettings(prev => ({ ...prev, shippingEstimate: e.target.value }))}
                    className="w-full bg-radar-card border border-radar-border text-white rounded-xl px-3 py-2 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-radar-muted">Customs Duty % (CIF x duty%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={settings.dutyPercent || ''}
                    onChange={(e) => setSettings(prev => ({ ...prev, dutyPercent: e.target.value }))}
                    className="w-full bg-radar-card border border-radar-border text-white rounded-xl px-3 py-2 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-radar-muted">VAT % ((CIF + duty) x VAT%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={settings.vatPercent || ''}
                    onChange={(e) => setSettings(prev => ({ ...prev, vatPercent: e.target.value }))}
                    className="w-full bg-radar-card border border-radar-border text-white rounded-xl px-3 py-2 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-radar-muted">Other Surcharges % (CIF x other%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={settings.otherPercent || ''}
                    onChange={(e) => setSettings(prev => ({ ...prev, otherPercent: e.target.value }))}
                    className="w-full bg-radar-card border border-radar-border text-white rounded-xl px-3 py-2 text-xs"
                  />
                </div>
              </div>

              <p className="text-[11px] text-radar-muted italic pt-1">
                Note: Rates vary by product category and change over time. Verify with Sri Lanka Customs.
              </p>
            </div>

            {/* Reserve Searches */}
            <div className="p-3.5 rounded-xl bg-radar-bg border border-radar-border space-y-2">
              <label className="text-white font-medium block">
                Keep at least N SerpAPI Searches in Reserve (Default 20)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={settings.reserveSearches}
                onChange={(e) => setSettings(prev => ({ ...prev, reserveSearches: e.target.value }))}
                className="w-full bg-radar-card border border-radar-border text-white rounded-xl px-3 py-2 text-xs"
              />
              <p className="text-[11px] text-radar-muted">
                Prevents Market Analyzer price checks from exhausting the 200/mo quota needed by other features.
              </p>
            </div>

            <button type="submit" className="btn-primary text-xs py-2 px-5">
              Save Settings
            </button>
          </form>
        </div>
      )}

      {/* ── SerpAPI Confirmation Modal ──────────────────────────────────── */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-radar-surface border border-radar-border rounded-2xl w-full max-w-md p-6 space-y-5 shadow-2xl">
            <div className="flex items-center gap-2.5 pb-3 border-b border-radar-border">
              <div className="p-2 rounded-xl bg-radar-accent/10 text-radar-accent">
                <Search className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">Confirm SerpAPI Price Check</h3>
                <p className="text-xs text-radar-muted">Google Shopping (gl=lk and gl=us)</p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-radar-text">
                This price check will run <strong className="text-white">2 searches per product</strong> (one in Sri Lanka gl=lk and one international gl=us).
              </p>

              <div className="p-3.5 rounded-xl bg-radar-card border border-radar-border space-y-2 font-mono text-xs">
                <div className="flex justify-between">
                  <span className="text-radar-muted">Products to check:</span>
                  <span className="text-white font-bold">{targetCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-radar-muted">SerpAPI searches needed:</span>
                  <span className="text-radar-accent font-bold">{neededSearches}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-radar-muted">Monthly searches remaining:</span>
                  <span className="text-white">{remainingSearches}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-radar-muted">Configured safety reserve:</span>
                  <span className="text-radar-amber">{reserveSearches}</span>
                </div>
              </div>

              {isReserveBlocked && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
                  <strong>Quota Blocked:</strong> Executing this check would leave less than the required reserve of {reserveSearches} searches. Lower your selection or adjust reserve in Settings.
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="btn-ghost text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executePriceCheck}
                disabled={isReserveBlocked}
                className="btn-primary text-xs"
              >
                Start Price Check ({neededSearches} searches)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
