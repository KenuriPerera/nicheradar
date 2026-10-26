import { useState, useEffect } from 'react'
import {
  Routes, Route, NavLink, useNavigate, useLocation, Navigate
} from 'react-router-dom'
import {
  Clapperboard, Play, RefreshCw, AlertCircle, CheckCircle,
  Clock, Sparkles, Filter, ChevronDown, Compass, Lightbulb,
  Layers, Package, ShieldAlert, X, Zap
} from 'lucide-react'
import clsx from 'clsx'
import {
  getLatestScan, getScansList, getScanById, runCollectStep,
  retryAiOnly, reprocessScan
} from './api'
import DiscoverTab from './DiscoverTab'

const TABS = [
  { path: 'discover',  label: 'Discover',       icon: Compass     },
  { path: 'ideas',     label: 'Story Ideas',    icon: Lightbulb   },
  { path: 'series',    label: 'Series Planner', icon: Layers      },
  { path: 'packaging', label: 'Packaging',      icon: Package     },
  { path: 'policy',    label: 'Policy Check',   icon: ShieldAlert },
]

export default function ClipTubeShell() {
  const navigate = useNavigate()
  const location = useLocation()

  // Data states
  const [currentScan, setCurrentScan] = useState(null)
  const [scansList, setScansList] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Scan modal & options state
  const [showScanModal, setShowScanModal] = useState(false)
  const [scanOptions, setScanOptions] = useState({
    language: 'en',
    format: 'shorts',
    genre: '',
    timeframe: '7d',
  })

  // Scan running orchestration state
  const [isScanning, setIsScanning] = useState(false)
  const [scanStep, setScanStep] = useState(0) // 0: idle, 1: collect, 2: analyze, 3: save
  const [scanProgressMessage, setScanProgressMessage] = useState('')
  const [scanError, setScanError] = useState(null)

  // Load initial scans
  async function loadInitialData(selectScanId = null) {
    try {
      setLoading(true)
      const list = await getScansList().catch(() => [])
      setScansList(list)

      if (selectScanId) {
        const target = await getScanById(selectScanId)
        setCurrentScan(target)
      } else if (list.length > 0) {
        const latest = await getLatestScan()
        setCurrentScan(latest)
      }
    } catch (err) {
      console.error('Failed to load scans:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadInitialData()
  }, [])

  // Switch scan from dropdown
  const handleSelectScan = async (scanId) => {
    try {
      setLoading(true)
      const scan = await getScanById(scanId)
      setCurrentScan(scan)
    } catch (err) {
      setError(`Failed to load scan: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  // Orchestrate Scan Execution
  const handleStartScan = async () => {
    setShowScanModal(false)
    setIsScanning(true)
    setScanStep(1)
    setScanProgressMessage('Step 1/3: Querying YouTube Data API & Computing Velocity Metrics…')
    setScanError(null)

    try {
      // Step 1: COLLECT (YouTube only)
      const collectResult = await runCollectStep(scanOptions)
      const scanId = collectResult.scanId
      const units = collectResult.unitsUsed || 600

      // Update current scan with collected facts
      setCurrentScan({
        id: scanId,
        status: collectResult.status,
        options: scanOptions,
        facts: collectResult.facts,
        unitsUsed: units,
        createdAt: new Date().toISOString(),
      })

      // Refresh history list
      getScansList().then(setScansList).catch(() => {})

      // In Phase 1, Step 1 is the complete scope!
      setScanStep(0)
      setIsScanning(false)
      setScanProgressMessage('')

    } catch (err) {
      console.error('Scan execution failed:', err)
      setScanError(err.message || 'Scan failed')
      setIsScanning(false)
      setScanStep(0)
    }
  }

  // Reprocess raw records at 0 YouTube units
  const handleReprocess = async () => {
    if (!currentScan?.id || isScanning) return
    setIsScanning(true)
    setScanProgressMessage('Reprocessing raw video records (0 YouTube units)…')
    setScanError(null)
    try {
      const result = await reprocessScan(currentScan.id)
      setCurrentScan(prev => ({
        ...prev,
        facts: result.facts,
        classificationCounts: result.classificationCounts,
      }))
    } catch (err) {
      setScanError(`Reprocess failed: ${err.message}`)
    } finally {
      setIsScanning(false)
      setScanProgressMessage('')
    }
  }

  // Determine current active subroute
  const currentPath = location.pathname.split('/')[2] || 'discover'

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6 animate-fade-in">
      {/* ── Header ────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-radar-border">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-radar-accent flex items-center justify-center glow-accent flex-shrink-0">
              <Clapperboard className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-white tracking-tight">ClipTube</h1>
                <span className="badge bg-radar-accent/20 text-radar-accent border border-radar-accent/30 font-mono text-[11px]">
                  AI Stories
                </span>
              </div>
              <p className="text-radar-muted text-xs">
                YouTube AI Story Generator & Trend Intelligence
              </p>
            </div>
          </div>
        </div>

        {/* Scan Actions & History */}
        <div className="flex flex-wrap items-center gap-3">
          {/* History Dropdown */}
          {scansList.length > 0 && (
            <div className="relative">
              <select
                value={currentScan?.id || ''}
                onChange={(e) => handleSelectScan(e.target.value)}
                disabled={isScanning}
                className="bg-radar-card border border-radar-border text-white text-xs rounded-xl px-3 py-2 pr-8 appearance-none focus:outline-none focus:border-radar-accent cursor-pointer"
              >
                {scansList.map((s, idx) => (
                  <option key={s.id} value={s.id}>
                    Scan {idx + 1}: {new Date(s.createdAt).toLocaleDateString()} {new Date(s.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-2.5 w-3.5 h-3.5 text-radar-muted pointer-events-none" />
            </div>
          )}

          {/* Reprocess Button (0 units) */}
          {currentScan && (
            <button
              onClick={handleReprocess}
              disabled={isScanning}
              className="btn-ghost text-xs"
              title="Re-run classification and clustering from stored raw videos at 0 YouTube units"
            >
              <RefreshCw className={clsx('w-3.5 h-3.5', isScanning && 'animate-spin')} />
              Reprocess (0 units)
            </button>
          )}

          {/* Run Scan Button */}
          <button
            onClick={() => setShowScanModal(true)}
            disabled={isScanning}
            className="btn-primary"
          >
            <Zap className={clsx('w-4 h-4 text-white', isScanning && 'animate-spin')} />
            {isScanning ? 'Scanning…' : 'Run ClipTube Scan'}
          </button>
        </div>
      </div>

      {/* ── Scan Status & Info Bar ─────────────────────────────────────── */}
      {currentScan && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-radar-card/50 border border-radar-border/60 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-radar-muted">Active Scan:</span>
            <span className={clsx(
              'px-2 py-0.5 rounded-full font-mono text-[11px] font-medium border',
              currentScan.status === 'ready' && 'bg-radar-green/10 text-radar-green border-radar-green/30',
              currentScan.status === 'facts_ready' && 'bg-radar-accent2/10 text-radar-accent2 border-radar-accent2/30',
              currentScan.status === 'ai_failed' && 'bg-red-500/10 text-red-400 border-red-500/30',
              currentScan.status === 'collecting' && 'bg-radar-amber/10 text-radar-amber border-radar-amber/30 animate-pulse'
            )}>
              {currentScan.status}
            </span>
            <span className="text-radar-muted">·</span>
            <span className="text-radar-muted flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {currentScan.createdAt ? new Date(currentScan.createdAt).toLocaleString() : 'Just now'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {currentScan.unitsUsed > 0 && (
              <span className="text-radar-muted font-mono">
                YouTube Units: <strong className="text-white">{currentScan.unitsUsed}</strong>
              </span>
            )}
            <span className="text-radar-muted font-mono">
              Language: <strong className="text-white">English (Filtered)</strong>
            </span>
            {(currentScan.facts?.totalEnglishVideos !== undefined || currentScan.classificationCounts) && (
              <span className="text-radar-muted font-mono text-[11px]">
                (EN: <span className="text-radar-green">{currentScan.classificationCounts?.english ?? currentScan.facts?.totalEnglishVideos ?? 0}</span> ·
                Global: <span className="text-radar-accent2">{currentScan.classificationCounts?.global ?? currentScan.facts?.totalGlobalVideos ?? 0}</span> ·
                Blocked: <span className="text-red-400">{currentScan.classificationCounts?.blocked ?? currentScan.facts?.totalBlockedVideos ?? 0}</span>)
              </span>
            )}
          </div>
        </div>
      )}

      {/* ── Scan In-Progress Bar ────────────────────────────────────────── */}
      {isScanning && (
        <div className="card border-radar-accent/40 bg-radar-accent/5 p-4 space-y-3 animate-fade-in">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-white font-medium">
              <RefreshCw className="w-4 h-4 animate-spin text-radar-accent" />
              <span>{scanProgressMessage}</span>
            </div>
            <span className="font-mono text-radar-accent font-semibold">Step {scanStep} of 3</span>
          </div>
          <div className="h-1.5 w-full bg-radar-border rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-radar-accent to-radar-accent2 transition-all duration-500"
              style={{ width: `${(scanStep / 3) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* ── Error Notification ─────────────────────────────────────────── */}
      {(error || scanError) && (
        <div className="card border-red-500/30 bg-red-500/5 flex items-start gap-3 p-4">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-sm font-medium text-red-400">Notice</h4>
            <p className="text-xs text-red-300">{error || scanError}</p>
          </div>
        </div>
      )}

      {/* ── Sub-navigation Tabs ─────────────────────────────────────────── */}
      <div className="flex border-b border-radar-border gap-1 overflow-x-auto pb-1">
        {TABS.map(({ path, label, icon: Icon }) => {
          const isActive = currentPath === path
          return (
            <NavLink
              key={path}
              to={`/cliptube/${path}`}
              className={clsx(
                'flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs md:text-sm font-medium transition-all duration-200 whitespace-nowrap',
                isActive
                  ? 'bg-radar-card text-white border border-radar-border shadow-sm'
                  : 'text-radar-muted hover:text-white hover:bg-radar-card/50'
              )}
            >
              <Icon className={clsx('w-4 h-4', isActive ? 'text-radar-accent' : 'text-radar-muted')} />
              {label}
            </NavLink>
          )
        })}
      </div>

      {/* ── Tab Content Routing ────────────────────────────────────────── */}
      <div className="min-h-[400px]">
        <Routes>
          <Route index element={<Navigate to="discover" replace />} />
          <Route
            path="discover"
            element={
              <DiscoverTab
                scan={currentScan}
                onSeedSaved={() => getScansList().then(setScansList)}
              />
            }
          />
          <Route
            path="ideas"
            element={
              <div className="card text-center py-16 space-y-3">
                <Lightbulb className="w-8 h-8 text-radar-accent mx-auto" />
                <h3 className="text-white font-medium">Story Ideas (Phase 2)</h3>
                <p className="text-radar-muted text-xs max-w-md mx-auto">
                  Step 2 AI analysis and script outline generation will be unlocked in Phase 2.
                </p>
              </div>
            }
          />
          <Route
            path="series"
            element={
              <div className="card text-center py-16 space-y-3">
                <Layers className="w-8 h-8 text-radar-accent2 mx-auto" />
                <h3 className="text-white font-medium">Series Planner (Phase 3)</h3>
                <p className="text-radar-muted text-xs max-w-md mx-auto">
                  Story bibles, episode production checklists, and scene prompts will be available in Phase 3.
                </p>
              </div>
            }
          />
          <Route
            path="packaging"
            element={
              <div className="card text-center py-16 space-y-3">
                <Package className="w-8 h-8 text-radar-green mx-auto" />
                <h3 className="text-white font-medium">Packaging (Phase 3)</h3>
                <p className="text-radar-muted text-xs max-w-md mx-auto">
                  Title variants, thumbnail visual prompts, and descriptions will be available in Phase 3.
                </p>
              </div>
            }
          />
          <Route
            path="policy"
            element={
              <div className="card text-center py-16 space-y-3">
                <ShieldAlert className="w-8 h-8 text-radar-amber mx-auto" />
                <h3 className="text-white font-medium">Policy Check (Phase 4)</h3>
                <p className="text-radar-muted text-xs max-w-md mx-auto">
                  Local repetition heuristic scoring and pre-publish guidelines will be available in Phase 4.
                </p>
              </div>
            }
          />
        </Routes>
      </div>

      {/* ── Scan Configuration Modal & Quota Confirmation ──────────────── */}
      {showScanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-radar-surface border border-radar-border rounded-2xl w-full max-w-md p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-radar-border">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-radar-accent/10 text-radar-accent">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white">Run ClipTube Scan</h3>
                  <p className="text-xs text-radar-muted">Configure scan parameters</p>
                </div>
              </div>
              <button
                onClick={() => setShowScanModal(false)}
                className="text-radar-muted hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Options Form */}
            <div className="space-y-4 text-xs">
              {/* Language */}
              <div className="space-y-1.5">
                <label className="text-radar-muted font-medium">Language</label>
                <select
                  value={scanOptions.language}
                  onChange={(e) => setScanOptions(prev => ({ ...prev, language: e.target.value }))}
                  className="w-full bg-radar-bg border border-radar-border text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-radar-accent"
                >
                  <option value="en">English (English results + Global inspiration)</option>
                </select>
              </div>

              {/* Format */}
              <div className="space-y-1.5">
                <label className="text-radar-muted font-medium">Video Format</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'shorts', label: 'Shorts (<=3m)' },
                    { id: 'long',   label: 'Long Form (>3m)' },
                    { id: 'all',    label: 'All Formats' },
                  ].map(f => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setScanOptions(prev => ({ ...prev, format: f.id }))}
                      className={clsx(
                        'px-2.5 py-2 rounded-xl border text-xs font-medium transition-colors text-center',
                        scanOptions.format === f.id
                          ? 'bg-radar-accent text-white border-radar-accent'
                          : 'bg-radar-bg text-radar-muted border-radar-border hover:text-white'
                      )}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Timeframe */}
              <div className="space-y-1.5">
                <label className="text-radar-muted font-medium">Timeframe</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: '24h', label: 'Last 24h' },
                    { id: '7d',  label: 'Last 7 Days' },
                    { id: '30d', label: 'Last 30 Days' },
                  ].map(t => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setScanOptions(prev => ({ ...prev, timeframe: t.id }))}
                      className={clsx(
                        'px-2.5 py-2 rounded-xl border text-xs font-medium transition-colors text-center',
                        scanOptions.timeframe === t.id
                          ? 'bg-radar-accent text-white border-radar-accent'
                          : 'bg-radar-bg text-radar-muted border-radar-border hover:text-white'
                      )}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Genre (Optional) */}
              <div className="space-y-1.5">
                <label className="text-radar-muted font-medium">Story Genre (Optional)</label>
                <select
                  value={scanOptions.genre}
                  onChange={(e) => setScanOptions(prev => ({ ...prev, genre: e.target.value }))}
                  className="w-full bg-radar-bg border border-radar-border text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-radar-accent"
                >
                  <option value="">All AI Story Genres</option>
                  <option value="horror">Horror & Creepypasta</option>
                  <option value="scifi">Sci-Fi & Cyberpunk</option>
                  <option value="mythology">Mythology & Folklore</option>
                  <option value="drama">Drama & Cinematic</option>
                  <option value="fantasy">Bedtime & Fantasy</option>
                </select>
              </div>
            </div>

            {/* Quota Impact Notice */}
            <div className="p-3.5 rounded-xl bg-radar-card border border-radar-border/80 space-y-1.5">
              <div className="flex items-center gap-2 text-white font-medium text-xs">
                <CheckCircle className="w-4 h-4 text-radar-green" />
                <span>Estimated Quota Usage</span>
              </div>
              <ul className="text-[11px] text-radar-muted space-y-1 list-disc list-inside">
                <li>YouTube API: <strong className="text-white">~600 units</strong> (capped 6 searches + batch details)</li>
                <li>Gemini API: <strong className="text-white">1 request</strong> (in Phase 2)</li>
                <li>Runs only on demand — no cron or automated fetches</li>
              </ul>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowScanModal(false)}
                className="btn-ghost"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleStartScan}
                className="btn-primary"
              >
                Start Scan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
