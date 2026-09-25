import { useState, useEffect, useRef } from 'react'
import { useNiches } from '../hooks/useNiches'
import {
  Sparkles, Calendar, TrendingUp, DollarSign,
  Music, Globe2, Star, Compass, FileText,
  Image, RefreshCw, AlertCircle, CheckCircle2,
  ChevronDown, ExternalLink, Plus, X
} from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from 'recharts'
import {
  getImprovCache, getCalendar, saveCalendarEntry,
  updateCalendarEntry, getGrowthData, saveGrowthEntry,
  analyzeThumbnail, analyzeInspoChannel,
  generateReviewTemplate, uploadToCloudinary
} from '../utils/api'
import clsx from 'clsx'

import { usePageCache } from '../hooks/usePageCache'

const TABS = [
  { key: 'hooks',    icon: Sparkles,  label: 'Hook Generator'         },
  { key: 'captions', icon: FileText,  label: 'Caption Generator'      },
  { key: 'calendar', icon: Calendar,  label: 'Content Calendar'       },
  { key: 'growth',   icon: TrendingUp,label: 'Growth Tracker'         },
  { key: 'audio',    icon: Music,     label: 'Audio Trends'           },
  { key: 'brands',   icon: DollarSign,label: 'Brand Deal Calculator'  },
  { key: 'season',   icon: Globe2,    label: 'Niche Seasonality'      },
  { key: 'inspo',    icon: Compass,   label: 'Inspo'                  },
  { key: 'review',   icon: Star,      label: 'Review Template'        },
  { key: 'thumb',    icon: Image,     label: 'Thumbnail Analyzer'     },
  { key: 'srilanka', icon: Globe2,    label: 'SL Creator Resources'   },
]

const PLATFORMS = ['instagram','tiktok','youtube','pinterest']
const PLATFORM_COLORS = {
  instagram: '#e1306c', tiktok: '#ff2d55',
  youtube: '#ef4444',   pinterest: '#f97316',
}

export default function Improv() {
  const { niches }    = useNiches()
  const [tab,         setTab]         = useState('hooks')
  const { data: cachedData, set: setCachedData } = usePageCache('improv-cache')
  const [cache,       setCache]       = useState(cachedData)
  const [cacheLoaded, setCacheLoaded] = useState(!!cachedData)
  const [niche,       setNiche]       = useState('skincare')

  // Load cache on mount
  useEffect(() => {
    if (cachedData) {
      setCache(cachedData)
      setCacheLoaded(true)
      return
    }
    getImprovCache()
      .then(d => { setCache(d); setCachedData(d); setCacheLoaded(true) })
      .catch(() => setCacheLoaded(true))
  }, [cachedData, setCachedData])

  const NoCacheMessage = () => (
    <div className="card text-center py-10 space-y-3">
      <RefreshCw className="w-8 h-8 text-radar-muted mx-auto" />
      <p className="text-white font-medium">No cache yet</p>
      <p className="text-radar-muted text-sm max-w-sm mx-auto">
        The daily master scan at 8pm Sri Lanka time populates this data.
        Go to Dashboard → Master Scan to run it now.
      </p>
    </div>
  )

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold text-white flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-radar-accent" />
          Improv
        </h1>
        <p className="text-radar-muted text-sm mt-1">
          11 creator tools — powered by daily master scan cache · zero API cost for most features
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 flex-wrap border-b border-radar-border pb-0">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={clsx(
              'flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-all -mb-px whitespace-nowrap',
              tab === t.key
                ? 'border-radar-accent text-white'
                : 'border-transparent text-radar-muted hover:text-white'
            )}>
            <t.icon className="w-3.5 h-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Niche selector — shared across tabs */}
      <div className="flex items-center gap-3">
        <label className="text-xs text-radar-muted">Niche:</label>
        <div className="relative">
          <select value={niche} onChange={e => setNiche(e.target.value)}
            className="bg-radar-bg border border-radar-border text-white rounded-xl px-3 py-1.5 text-sm appearance-none pr-7 focus:outline-none focus:border-radar-accent">
            {niches.map(n => (
              <option key={n.key} value={n.key}>{n.icon} {n.label}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-2 w-3.5 h-3.5 text-radar-muted pointer-events-none" />
        </div>
        {cache?.updatedAt && (
          <p className="text-xs text-radar-muted">
            Cache: {new Date(cache.updatedAt).toLocaleDateString()}
          </p>
        )}
      </div>

      {/* ── HOOK GENERATOR ─────────────────────────────────────────── */}
      {tab === 'hooks' && (
        <HookGenerator cache={cache} niche={niche} loaded={cacheLoaded} NoCacheMessage={NoCacheMessage} />
      )}

      {/* ── CAPTION GENERATOR ──────────────────────────────────────── */}
      {tab === 'captions' && (
        <CaptionGenerator cache={cache} niche={niche} loaded={cacheLoaded} NoCacheMessage={NoCacheMessage} />
      )}

      {/* ── CONTENT CALENDAR ───────────────────────────────────────── */}
      {tab === 'calendar' && (
        <ContentCalendar niche={niche} niches={niches} />
      )}

      {/* ── GROWTH TRACKER ─────────────────────────────────────────── */}
      {tab === 'growth' && (
        <GrowthTracker />
      )}

      {/* ── AUDIO TRENDS ───────────────────────────────────────────── */}
      {tab === 'audio' && (
        <AudioTrends cache={cache} niche={niche} loaded={cacheLoaded} NoCacheMessage={NoCacheMessage} />
      )}

      {/* ── BRAND DEAL CALCULATOR ──────────────────────────────────── */}
      {tab === 'brands' && (
        <BrandDealCalculator cache={cache} niche={niche} loaded={cacheLoaded} NoCacheMessage={NoCacheMessage} />
      )}

      {/* ── NICHE SEASONALITY ──────────────────────────────────────── */}
      {tab === 'season' && (
        <NicheSeasonality cache={cache} loaded={cacheLoaded} NoCacheMessage={NoCacheMessage} />
      )}

      {/* ── INSPO ──────────────────────────────────────────────────── */}
      {tab === 'inspo' && (
        <InspoFinder cache={cache} niche={niche} loaded={cacheLoaded} NoCacheMessage={NoCacheMessage} />
      )}

      {/* ── REVIEW TEMPLATE ────────────────────────────────────────── */}
      {tab === 'review' && (
        <ReviewTemplate niche={niche} />
      )}

      {/* ── THUMBNAIL ANALYZER ─────────────────────────────────────── */}
      {tab === 'thumb' && (
        <ThumbnailAnalyzer niche={niche} />
      )}

      {/* ── SRI LANKA RESOURCES ────────────────────────────────────── */}
      {tab === 'srilanka' && (
        <SriLankaResources />
      )}
    </div>
  )
}

// ── HOOK GENERATOR ────────────────────────────────────────────────────────────
function HookGenerator({ cache, niche, loaded, NoCacheMessage }) {
  const [filter, setFilter] = useState('all')

  if (!loaded) return <div className="card animate-pulse h-40" />
  if (!cache?.hooks) return <NoCacheMessage />

  const nicheHooks = cache.hooks?.[niche]
  if (!nicheHooks) return <NoCacheMessage />

  const TYPES = ['all','curiosity','fomo','controversy','relatability','transformation','value']
  const filtered = filter === 'all'
    ? nicheHooks.fromTitles
    : nicheHooks.fromTitles.filter(h => h.type === filter)

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="card space-y-3">
        <p className="text-xs text-radar-muted uppercase tracking-wider">Template Hooks</p>
        <div className="space-y-2">
          {nicheHooks.templates.map((h, i) => (
            <div key={i} className="flex items-start gap-3 bg-radar-bg border border-radar-border rounded-xl px-4 py-3">
              <span className={clsx(
                'badge border text-xs flex-shrink-0 mt-0.5 capitalize',
                h.type === 'curiosity'     ? 'bg-radar-accent/10 text-radar-accent border-radar-accent/30'   :
                h.type === 'fomo'          ? 'bg-radar-amber/10 text-radar-amber border-radar-amber/30'       :
                h.type === 'controversy'   ? 'bg-red-500/10 text-red-400 border-red-500/30'                   :
                h.type === 'relatability'  ? 'bg-radar-green/10 text-radar-green border-radar-green/30'       :
                h.type === 'transformation'? 'bg-purple-500/10 text-purple-400 border-purple-500/30'          :
                'bg-radar-muted/10 text-radar-muted border-radar-border'
              )}>
                {h.type}
              </span>
              <p className="text-sm text-white flex-1">{h.template}</p>
              <button onClick={() => navigator.clipboard.writeText(h.template)}
                className="text-xs text-radar-muted hover:text-radar-accent transition-colors flex-shrink-0">
                Copy
              </button>
            </div>
          ))}
        </div>
      </div>

      {filtered.length > 0 && (
        <div className="card space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-xs text-radar-muted uppercase tracking-wider">
              Live Hooks from Trending Content
            </p>
            <div className="flex gap-1 flex-wrap">
              {TYPES.map(t => (
                <button key={t} onClick={() => setFilter(t)}
                  className={clsx(
                    'text-xs px-2.5 py-1 rounded-xl border transition-all capitalize',
                    filter === t
                      ? 'bg-radar-accent border-radar-accent text-white'
                      : 'border-radar-border text-radar-muted hover:text-white'
                  )}>
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            {filtered.map((h, i) => (
              <div key={i} className="flex items-start gap-3 bg-radar-bg border border-radar-border rounded-xl px-4 py-3">
                <span className="text-xs text-radar-muted font-mono w-4 flex-shrink-0 mt-0.5">{i+1}</span>
                <p className="text-sm text-white flex-1 leading-snug">{h.hook}</p>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={clsx(
                    'text-xs',
                    h.score === 'high' ? 'text-radar-green' : 'text-radar-amber'
                  )}>
                    {h.score}
                  </span>
                  <button onClick={() => navigator.clipboard.writeText(h.hook)}
                    className="text-xs text-radar-muted hover:text-radar-accent transition-colors">
                    Copy
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── CAPTION GENERATOR ────────────────────────────────────────────────────────
function CaptionGenerator({ cache, niche, loaded, NoCacheMessage }) {
  const [idea,      setIdea]      = useState('')
  const [platform,  setPlatform]  = useState('instagram')
  const [tone,      setTone]      = useState('casual')
  const [captions,  setCaptions]  = useState(null)

  if (!loaded) return <div className="card animate-pulse h-40" />

  function generate() {
    if (!idea.trim()) return
    const nicheHooks = cache?.hooks?.[niche]
    const topHook    = nicheHooks?.templates?.[0]?.template ?? `Check out this ${niche} content`

    const TONES = {
      casual:       { open: 'okay so', close: 'drop a 🔥 if you relate' },
      professional: { open: 'Sharing insights on', close: 'Save this for later ↓' },
      viral:        { open: 'POV:', close: 'Share this with someone who needs it 👇' },
    }
    const { open, close } = TONES[tone]

    const platformCTA = {
      instagram: 'Double tap if you agree! Follow for more.',
      tiktok:    'Duet this with your version! Follow for daily tips.',
      youtube:   'Subscribe and hit the bell for more content like this!',
      pinterest: 'Save this pin! Follow for more inspiration.',
    }

    const hooks = nicheHooks?.fromTitles?.slice(0, 3) ?? []

    setCaptions([
      {
        style:   'Casual',
        caption: `${open} ${idea.toLowerCase()}.\n\n${hooks[0]?.hook ?? topHook}\n\n${close}\n\n${platformCTA[platform]}`,
      },
      {
        style:   'Professional',
        caption: `${idea}.\n\nHere's what you need to know:\n→ Start with the basics\n→ Build consistency\n→ Track your results\n\n${platformCTA[platform]}`,
      },
      {
        style:   'Viral Hook',
        caption: `${topHook}\n\n${idea}.\n\nIf you've been sleeping on this — wake up! 🚨\n\n${platformCTA[platform]}`,
      },
    ])
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="card space-y-4">
        <div>
          <label className="text-xs text-radar-muted block mb-2">Your content idea</label>
          <textarea
            value={idea}
            onChange={e => setIdea(e.target.value)}
            placeholder={`e.g. My morning ${niche} routine that changed my life`}
            rows={3}
            className="w-full bg-radar-bg border border-radar-border text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-radar-accent transition-colors resize-none"
          />
        </div>
        <div className="flex gap-4 flex-wrap">
          <div>
            <label className="text-xs text-radar-muted block mb-2">Platform</label>
            <div className="flex gap-2">
              {PLATFORMS.map(p => (
                <button key={p} onClick={() => setPlatform(p)}
                  className={clsx(
                    'text-xs px-3 py-1.5 rounded-xl border transition-all capitalize',
                    platform === p
                      ? 'text-white border-transparent'
                      : 'border-radar-border text-radar-muted hover:text-white'
                  )}
                  style={platform === p ? { background: PLATFORM_COLORS[p], borderColor: PLATFORM_COLORS[p] } : {}}>
                  {p}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-radar-muted block mb-2">Tone</label>
            <div className="flex gap-2">
              {['casual','professional','viral'].map(t => (
                <button key={t} onClick={() => setTone(t)}
                  className={clsx(
                    'text-xs px-3 py-1.5 rounded-xl border transition-all capitalize',
                    tone === t
                      ? 'bg-radar-accent border-radar-accent text-white'
                      : 'border-radar-border text-radar-muted hover:text-white'
                  )}>
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>
        <button onClick={generate} disabled={!idea.trim()} className="btn-primary w-full justify-center">
          <Sparkles className="w-4 h-4" />
          Generate Captions — Zero API Cost
        </button>
      </div>

      {captions && (
        <div className="space-y-3 animate-fade-in">
          {captions.map((c, i) => (
            <div key={i} className="card space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-radar-accent">{c.style}</span>
                <button
                  onClick={() => navigator.clipboard.writeText(c.caption)}
                  className="text-xs text-radar-muted hover:text-white transition-colors">
                  Copy caption
                </button>
              </div>
              <p className="text-sm text-white whitespace-pre-line leading-relaxed">{c.caption}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── CONTENT CALENDAR ─────────────────────────────────────────────────────────
function ContentCalendar({ niche, niches }) {
  const [entries,    setEntries]    = useState([])
  const [loading,    setLoading]    = useState(true)
  const [showAdd,    setShowAdd]    = useState(false)
  const [newEntry,   setNewEntry]   = useState({
    date: new Date().toISOString().split('T')[0],
    niche: niche,
    platform: 'instagram',
    contentType: 'reel',
    idea: '',
    status: 'planned',
  })

  useEffect(() => {
    const start = new Date().toISOString().split('T')[0]
    const end   = new Date(Date.now() + 30 * 864e5).toISOString().split('T')[0]
    getCalendar(start, end)
      .then(d => setEntries(d.entries ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function add() {
    if (!newEntry.idea.trim()) return
    await saveCalendarEntry(newEntry)
    const start = new Date().toISOString().split('T')[0]
    const end   = new Date(Date.now() + 30 * 864e5).toISOString().split('T')[0]
    const d     = await getCalendar(start, end)
    setEntries(d.entries ?? [])
    setShowAdd(false)
    setNewEntry({ ...newEntry, idea: '' })
  }

  async function markPosted(entry) {
    await updateCalendarEntry(entry._id.toString(), { status: 'posted' })
    setEntries(prev => prev.map(e =>
      e._id.toString() === entry._id.toString()
        ? { ...e, status: 'posted' }
        : e
    ))
  }

  const STATUS_COLORS = {
    planned: 'text-radar-muted border-radar-border',
    ready:   'text-radar-amber border-radar-amber/30 bg-radar-amber/5',
    posted:  'text-radar-green border-radar-green/30 bg-radar-green/5',
  }

  if (loading) return <div className="card animate-pulse h-40" />

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <p className="text-xs text-radar-muted">Next 30 days · {entries.length} planned</p>
        <button onClick={() => setShowAdd(!showAdd)} className="btn-primary text-sm">
          <Plus className="w-4 h-4" />
          Add Post
        </button>
      </div>

      {showAdd && (
        <div className="card space-y-3 border-radar-accent/30 bg-radar-accent/5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-radar-muted block mb-1">Date</label>
              <input type="date" value={newEntry.date}
                onChange={e => setNewEntry({...newEntry, date: e.target.value})}
                className="w-full bg-radar-bg border border-radar-border text-white rounded-xl px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs text-radar-muted block mb-1">Platform</label>
              <select value={newEntry.platform}
                onChange={e => setNewEntry({...newEntry, platform: e.target.value})}
                className="w-full bg-radar-bg border border-radar-border text-white rounded-xl px-3 py-2 text-sm">
                {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-radar-muted block mb-1">Content Type</label>
              <select value={newEntry.contentType}
                onChange={e => setNewEntry({...newEntry, contentType: e.target.value})}
                className="w-full bg-radar-bg border border-radar-border text-white rounded-xl px-3 py-2 text-sm">
                {['reel','post','story','video','short','pin'].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-radar-muted block mb-1">Niche</label>
              <select value={newEntry.niche}
                onChange={e => setNewEntry({...newEntry, niche: e.target.value})}
                className="w-full bg-radar-bg border border-radar-border text-white rounded-xl px-3 py-2 text-sm">
                {niches.map(n => <option key={n.key} value={n.key}>{n.icon} {n.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-radar-muted block mb-1">Content idea</label>
            <textarea value={newEntry.idea}
              onChange={e => setNewEntry({...newEntry, idea: e.target.value})}
              placeholder="What will this post be about?"
              rows={2}
              className="w-full bg-radar-bg border border-radar-border text-white rounded-xl px-3 py-2 text-sm resize-none" />
          </div>
          <div className="flex gap-2">
            <button onClick={add} className="btn-primary text-sm">Save</button>
            <button onClick={() => setShowAdd(false)} className="btn-ghost text-sm">Cancel</button>
          </div>
        </div>
      )}

      {entries.length === 0 ? (
        <div className="card text-center py-8 text-radar-muted text-sm">
          No posts planned yet. Add your first one above.
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map((e, i) => (
            <div key={i} className={clsx('card flex items-center gap-4 border', STATUS_COLORS[e.status])}>
              <div className="flex-shrink-0 text-center">
                <p className="text-xs text-radar-muted">{new Date(e.date).toLocaleDateString('en-US', { month: 'short' })}</p>
                <p className="text-xl font-bold text-white">{new Date(e.date).getDate()}</p>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs capitalize" style={{ color: PLATFORM_COLORS[e.platform] }}>
                    {e.platform}
                  </span>
                  <span className="text-xs text-radar-muted capitalize">{e.contentType}</span>
                  <span className="text-xs text-radar-muted">{e.niche}</span>
                </div>
                <p className="text-sm text-white truncate">{e.idea}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className={clsx('text-xs capitalize badge border', STATUS_COLORS[e.status])}>
                  {e.status}
                </span>
                {e.status !== 'posted' && (
                  <button onClick={() => markPosted(e)}
                    className="text-xs text-radar-green hover:text-white transition-colors">
                    ✓ Posted
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── GROWTH TRACKER ───────────────────────────────────────────────────────────
function GrowthTracker() {
  const [entries,  setEntries]  = useState([])
  const [loading,  setLoading]  = useState(true)
  const [showAdd,  setShowAdd]  = useState(false)
  const [newEntry, setNewEntry] = useState({
    platform: 'instagram', followers: '', views: '', likes: '', week: new Date().toISOString().split('T')[0],
  })

  useEffect(() => {
    getGrowthData()
      .then(d => setEntries(d.entries ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function add() {
    if (!newEntry.followers) return
    await saveGrowthEntry({
      ...newEntry,
      followers: parseInt(newEntry.followers),
      views:     parseInt(newEntry.views     ?? 0),
      likes:     parseInt(newEntry.likes     ?? 0),
    })
    const d = await getGrowthData()
    setEntries(d.entries ?? [])
    setShowAdd(false)
  }

  const chartData = [...entries]
    .reverse()
    .slice(-12)
    .map(e => ({
      week:      e.week?.slice(5) ?? '',
      followers: e.followers ?? 0,
      views:     e.views     ?? 0,
    }))

  if (loading) return <div className="card animate-pulse h-40" />

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <p className="text-xs text-radar-muted">Track your weekly stats manually — stored in MongoDB</p>
        <button onClick={() => setShowAdd(!showAdd)} className="btn-primary text-sm">
          <Plus className="w-4 h-4" />
          Log This Week
        </button>
      </div>

      {showAdd && (
        <div className="card space-y-3 border-radar-accent/30">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-radar-muted block mb-1">Platform</label>
              <select value={newEntry.platform}
                onChange={e => setNewEntry({...newEntry, platform: e.target.value})}
                className="w-full bg-radar-bg border border-radar-border text-white rounded-xl px-3 py-2 text-sm">
                {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-radar-muted block mb-1">Week</label>
              <input type="date" value={newEntry.week}
                onChange={e => setNewEntry({...newEntry, week: e.target.value})}
                className="w-full bg-radar-bg border border-radar-border text-white rounded-xl px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs text-radar-muted block mb-1">Followers</label>
              <input type="number" value={newEntry.followers}
                onChange={e => setNewEntry({...newEntry, followers: e.target.value})}
                placeholder="e.g. 1250"
                className="w-full bg-radar-bg border border-radar-border text-white rounded-xl px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs text-radar-muted block mb-1">Total Views</label>
              <input type="number" value={newEntry.views}
                onChange={e => setNewEntry({...newEntry, views: e.target.value})}
                placeholder="e.g. 5400"
                className="w-full bg-radar-bg border border-radar-border text-white rounded-xl px-3 py-2 text-sm" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={add} className="btn-primary text-sm">Save</button>
            <button onClick={() => setShowAdd(false)} className="btn-ghost text-sm">Cancel</button>
          </div>
        </div>
      )}

      {chartData.length > 1 && (
        <div className="card space-y-3">
          <p className="text-xs text-radar-muted uppercase tracking-wider">Follower Growth</p>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3d" />
              <XAxis dataKey="week" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#1a1a26', border: '1px solid #2a2a3d', borderRadius: 8, fontSize: 11 }} />
              <Line type="monotone" dataKey="followers" stroke="#7c3aed" strokeWidth={2} dot={{ r: 3 }} name="Followers" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {entries.length === 0 && (
        <div className="card text-center py-8 text-radar-muted text-sm">
          No data yet. Log your first week above to start tracking growth.
        </div>
      )}
    </div>
  )
}

// ── AUDIO TRENDS ─────────────────────────────────────────────────────────────
function AudioTrends({ cache, niche, loaded, NoCacheMessage }) {
  if (!loaded) return <div className="card animate-pulse h-40" />
  if (!cache?.audioTrends) return <NoCacheMessage />

  const nicheTrends = cache.audioTrends?.[niche] ?? []

  return (
    <div className="space-y-4 animate-fade-in">
      <p className="text-xs text-radar-muted">
        Audio signals extracted from trending {niche} YouTube videos — search these on TikTok to use trending sounds
      </p>
      {nicheTrends.length === 0 ? (
        <div className="card text-center py-8 text-radar-muted text-sm">
          No audio signals detected for {niche} in the current scan.
          Try after the next master scan runs.
        </div>
      ) : (
        <div className="space-y-3">
          {nicheTrends.map((audio, i) => (
            <div key={i} className="card flex items-center gap-4">
              <div className="w-8 h-8 rounded-lg bg-radar-accent/10 border border-radar-accent/20 flex items-center justify-center flex-shrink-0">
                <Music className="w-4 h-4 text-radar-accent" />
              </div>
              <p className="text-sm text-white flex-1 truncate">{audio.title}</p>
              <a href={audio.tiktokSearch} target="_blank" rel="noopener noreferrer"
                className="text-xs text-radar-tiktok border border-radar-tiktok/20 bg-radar-tiktok/10 px-3 py-1.5 rounded-xl hover:bg-radar-tiktok/20 transition-colors flex-shrink-0">
                🎵 Find on TikTok
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── BRAND DEAL CALCULATOR ────────────────────────────────────────────────────
function BrandDealCalculator({ cache, niche, loaded, NoCacheMessage }) {
  const [followers, setFollowers] = useState('')
  const [platform,  setPlatform]  = useState('instagram')
  const [tier,      setTier]      = useState(null)
  const [lkrRate,   setLkrRate]   = useState(330)

  useEffect(() => {
    fetch('https://api.frankfurter.app/latest?from=USD&to=LKR')
      .then(r => r.json())
      .then(d => setLkrRate(d.rates?.LKR ?? 330))
      .catch(() => {})
  }, [])

  if (!loaded) return <div className="card animate-pulse h-40" />

  const benchmarks = cache?.brands?.[niche]

  function calculate() {
    const f = parseInt(followers)
    if (!f) return
    if (f < 10000)       setTier('micro')
    else if (f < 100000) setTier('mid')
    else                  setTier('macro')
  }

  const rates = tier && benchmarks ? benchmarks[tier] : null

  const CONTENT_TYPES = [
    { key: 'igPost',  label: 'IG Post'  },
    { key: 'igStory', label: 'IG Story' },
    { key: 'igReel',  label: 'IG Reel'  },
    { key: 'ytVideo', label: 'YT Video' },
    { key: 'tiktok',  label: 'TikTok'  },
  ]

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="card space-y-4">
        <p className="text-xs text-radar-muted">
          Estimated rates based on niche viral score and industry benchmarks
        </p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-radar-muted block mb-2">Your followers</label>
            <input type="number" value={followers}
              onChange={e => setFollowers(e.target.value)}
              placeholder="e.g. 5000"
              className="w-full bg-radar-bg border border-radar-border text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-radar-accent" />
          </div>
          <div>
            <label className="text-xs text-radar-muted block mb-2">Primary platform</label>
            <div className="flex gap-2 flex-wrap">
              {PLATFORMS.map(p => (
                <button key={p} onClick={() => setPlatform(p)}
                  className={clsx(
                    'text-xs px-3 py-1.5 rounded-xl border transition-all capitalize',
                    platform === p ? 'text-white' : 'border-radar-border text-radar-muted hover:text-white'
                  )}
                  style={platform === p ? { background: PLATFORM_COLORS[p], borderColor: PLATFORM_COLORS[p] } : {}}>
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>
        <button onClick={calculate} disabled={!followers} className="btn-primary w-full justify-center">
          Calculate Rates — Zero API Cost
        </button>
      </div>

      {rates && (
        <div className="space-y-4 animate-fade-in">
          <div className="card">
            <p className="text-xs text-radar-muted mb-3">
              Estimated rates for <span className="text-white capitalize">{tier}</span> creator
              ({parseInt(followers).toLocaleString()} followers) in <span className="text-white capitalize">{niche}</span>
            </p>
            <div className="grid grid-cols-2 gap-3">
              {CONTENT_TYPES.map(ct => (
                <div key={ct.key} className="bg-radar-bg border border-radar-border rounded-xl p-3 space-y-1">
                  <p className="text-xs text-radar-muted">{ct.label}</p>
                  <p className="text-lg font-bold text-white">${rates[ct.key]}</p>
                  <p className="text-xs text-radar-green">
                    Rs {Math.round(rates[ct.key] * lkrRate).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
            <p className="text-xs text-radar-muted mt-3">
              Live rate: 1 USD = Rs {Math.round(lkrRate)} ·
              Adjusted for {niche} niche demand
            </p>
          </div>

          <div className="card space-y-2">
            <p className="text-xs text-radar-muted uppercase tracking-wider">Tips for negotiating brand deals in SL</p>
            {[
              'Start with product gifting to build a portfolio before charging',
              'For local brands — quote in LKR, for international — quote in USD',
              'Always ask for usage rights fee on top of the base rate',
              'Micro creators in SL can charge Rs 5,000–25,000 per IG Reel for local brands',
              'International brands via platforms like AspireIQ or Grin pay USD rates',
            ].map((tip, i) => (
              <p key={i} className="text-xs text-white flex items-start gap-2">
                <span className="text-radar-accent flex-shrink-0">→</span> {tip}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── NICHE SEASONALITY ────────────────────────────────────────────────────────
function NicheSeasonality({ cache, loaded, NoCacheMessage }) {
  if (!loaded) return <div className="card animate-pulse h-40" />
  if (!cache?.seasonality) return <NoCacheMessage />

  const niches = Object.entries(cache.seasonality)

  return (
    <div className="space-y-4 animate-fade-in">
      <p className="text-xs text-radar-muted">
        Seasonal signals detected from current trending content — not hardcoded, derived from live data
      </p>
      <div className="grid grid-cols-2 gap-3">
        {niches.map(([n, data]) => (
          <div key={n} className={clsx(
            'card space-y-2 border',
            data.isCurrentlyPeak ? 'border-radar-green/30 bg-radar-green/5' : 'border-radar-border'
          )}>
            <div className="flex items-center justify-between">
              <p className="text-sm text-white capitalize font-medium">{n}</p>
              {data.isCurrentlyPeak && (
                <span className="badge bg-radar-green/10 text-radar-green border border-radar-green/30 text-xs">
                  🔥 Peak now
                </span>
              )}
            </div>
            <p className="text-xs text-radar-muted">
              Current month: <span className="text-white">{data.currentMonth}</span>
            </p>
            <div className="flex flex-wrap gap-1">
              {data.peakMonths.map(m => (
                <span key={m} className="text-xs bg-radar-accent/10 text-radar-accent border border-radar-accent/20 px-2 py-0.5 rounded-full capitalize">
                  {m}
                </span>
              ))}
            </div>
            <div className="h-1.5 bg-radar-border rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-radar-accent transition-all"
                style={{ width: `${data.currentMonthScore}%` }} />
            </div>
            <p className="text-xs text-radar-muted font-mono">
              Viral score: {data.currentMonthScore}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── INSPO FINDER ─────────────────────────────────────────────────────────────
function InspoFinder({ cache, niche, loaded, NoCacheMessage }) {
  const [channelId,  setChannelId]  = useState('')
  const [result,     setResult]     = useState(null)
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState(null)
  const [expanded,   setExpanded]   = useState(null)

  const cachedChannels = cache?.inspo?.[niche] ?? []
  const nicheHooks     = cache?.hooks?.[niche]
  const rankings       = cache?.nicheRankings ?? []
  const currentNiche   = rankings.find(n => n.niche === niche)

  // Build rich inspo cards from cache
  const inspoCards = cachedChannels.map((ch, i) => {
    const hook     = nicheHooks?.templates?.[i % 6]?.template ?? `Discover ${niche} content`
    const platform = ['tiktok','instagram','youtube','pinterest'][i % 4]
    const formats  = {
      tiktok:    ['Short video (15-30s)', 'Trending audio + text overlay', 'POV format'],
      instagram: ['Carousel (5-7 slides)', 'Reel with hook in first 2s',  'Story series'],
      youtube:   ['Long-form (8-15 min)', 'Shorts (under 60s)',            'Tutorial format'],
      pinterest: ['Infographic pin',      'Step-by-step guide pin',        'Product flat lay'],
    }
    const audiences = {
      skincare:   'Skincare enthusiasts aged 18-34, beauty product shoppers',
      movies:     'Film fans, cinephiles, binge-watchers aged 16-45',
      books:      'Readers, students, BookTok community aged 16-40',
      stationery: 'Students, planners, journal enthusiasts aged 14-35',
      fashion:    'Style-conscious individuals aged 16-35',
      fitness:    'Health-conscious adults aged 18-45',
      food:       'Home cooks, food lovers aged 20-45',
      travel:     'Travel enthusiasts aged 22-45',
      tech:       'Tech-savvy professionals aged 18-45',
      wellness:   'Wellness seekers aged 20-45',
    }

    return {
      title:       ch.title,
      channel:     ch.channel,
      videoId:     ch.videoId,
      niche,
      contentIdea: `${ch.title?.split('|')[0]?.trim() ?? `Trending ${niche} content`}`,
      whyRelevant: `This is gaining traction in the ${niche} space with ${currentNiche?.viralScore ?? 0} viral score — ${currentNiche?.emerging ?? 0} emerging hashtags detected`,
      trendingSignals: [
        `${currentNiche?.topTag ? '#' + currentNiche.topTag : `#${niche}`} trending`,
        `${currentNiche?.emerging ?? 0} emerging hashtags this week`,
        `Viral score: ${currentNiche?.viralScore ?? 0}/100`,
      ],
      viralPotential: currentNiche?.viralScore >= 60 ? 'High' : currentNiche?.viralScore >= 40 ? 'Medium' : 'Growing',
      format:        formats[platform][i % 3],
      platform,
      hook,
      hashtags: [
        niche,
        `${niche}creator`,
        `${niche}content`,
        currentNiche?.topTag ?? `${niche}tips`,
        `${niche}2026`,
      ],
      audience:    audiences[niche] ?? `${niche} enthusiasts aged 18-35`,
      trends:      nicheHooks?.fromTitles?.slice(0, 3).map(h => h.hook) ?? [],
      keywords:    [niche, ...(nicheHooks?.templates?.slice(0,3).map(t => t.type) ?? [])],
      postingApproach: platform === 'tiktok'
        ? 'Post between 7-9pm Sri Lanka time. Use trending audio. Hook in first 2 seconds.'
        : platform === 'instagram'
        ? 'Post between 6-8pm. Use carousel for saves. Add CTA in last slide.'
        : platform === 'youtube'
        ? 'Upload Thursday-Saturday. Strong thumbnail. SEO-optimized title.'
        : 'Post multiple times per day. Rich pin description. Vertical format.',
      monetization: niche === 'stationery'
        ? 'Sell digital planners or physical stationery via Etsy/Gumroad'
        : niche === 'skincare'
        ? 'Affiliate links to products. Brand deals. Ko-fi for exclusive routines.'
        : niche === 'books'
        ? 'Amazon affiliate links. Digital reading guides. Payhip e-books.'
        : `Affiliate marketing, brand deals and digital products in the ${niche} space`,
    }
  })

  async function analyze() {
    if (!channelId.trim()) return
    setLoading(true); setError(null)
    try { setResult(await analyzeInspoChannel(channelId.trim())) }
    catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  if (!loaded) return <div className="card animate-pulse h-40" />

  const PLATFORM_COLORS = {
    tiktok: '#ff2d55', instagram: '#e1306c', youtube: '#ef4444', pinterest: '#f97316',
  }
  const VIRAL_COLORS = { High: 'text-radar-green', Medium: 'text-radar-amber', Growing: 'text-radar-accent' }

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Rich inspo cards from cache */}
      {inspoCards.length > 0 && (
        <div className="space-y-4">
          <p className="text-xs text-radar-muted uppercase tracking-wider">
            Content Inspiration — {niche} · from master scan cache · zero API cost
          </p>
          {inspoCards.map((card, i) => {
            const isOpen = expanded === i
            return (
              <div key={i}
                className="card hover:border-radar-accent/30 transition-all cursor-pointer space-y-3"
                onClick={() => setExpanded(isOpen ? null : i)}
              >
                {/* Top row */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono text-radar-muted">#{i+1}</span>
                      <p className="text-sm font-semibold text-white line-clamp-1">{card.contentIdea}</p>
                      <span className="text-xs px-2 py-0.5 rounded-full border capitalize"
                        style={{ color: PLATFORM_COLORS[card.platform], borderColor: PLATFORM_COLORS[card.platform] + '40', background: PLATFORM_COLORS[card.platform] + '10' }}>
                        {card.platform}
                      </span>
                    </div>
                    <p className="text-xs text-radar-muted">{card.whyRelevant}</p>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <p className={`text-sm font-bold ${VIRAL_COLORS[card.viralPotential]}`}>
                      {card.viralPotential}
                    </p>
                    <p className="text-xs text-radar-muted">viral potential</p>
                  </div>
                </div>

                {/* Quick info row */}
                <div className="flex gap-4 text-xs border-t border-radar-border/50 pt-3">
                  <div>
                    <span className="text-radar-muted">Format: </span>
                    <span className="text-white">{card.format}</span>
                  </div>
                  <div>
                    <span className="text-radar-muted">Audience: </span>
                    <span className="text-white">{card.audience.split(' aged')[0]}</span>
                  </div>
                </div>

                {/* Hook preview */}
                <div className="bg-radar-accent/5 border border-radar-accent/20 rounded-xl px-3 py-2">
                  <p className="text-xs text-radar-muted mb-0.5">Suggested hook</p>
                  <p className="text-xs text-white font-medium">{card.hook}</p>
                </div>

                {/* Expanded section */}
                {isOpen && (
                  <div className="space-y-4 pt-2 border-t border-radar-border animate-fade-in">

                    {/* Trending signals */}
                    <div>
                      <p className="text-xs text-radar-muted uppercase tracking-wider mb-2">Trending Signals</p>
                      <div className="flex flex-wrap gap-2">
                        {card.trendingSignals.map((s, j) => (
                          <span key={j} className="text-xs bg-radar-green/10 text-radar-green border border-radar-green/20 px-2.5 py-1 rounded-full">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Hashtags */}
                    <div>
                      <p className="text-xs text-radar-muted uppercase tracking-wider mb-2">Hashtags</p>
                      <div className="flex flex-wrap gap-2">
                        {card.hashtags.map(tag => (
                          <span key={tag}
                            className="text-xs bg-radar-accent/10 text-radar-accent border border-radar-accent/20 rounded-xl px-2.5 py-1 font-mono">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Related keywords */}
                    <div>
                      <p className="text-xs text-radar-muted uppercase tracking-wider mb-2">Related Keywords</p>
                      <div className="flex flex-wrap gap-2">
                        {card.keywords.map(k => (
                          <span key={k} className="text-xs bg-radar-border text-radar-muted rounded-lg px-2.5 py-1 capitalize">
                            {k}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Trending content examples */}
                    {card.trends.length > 0 && (
                      <div>
                        <p className="text-xs text-radar-muted uppercase tracking-wider mb-2">
                          Relevant Trends Right Now
                        </p>
                        <div className="space-y-1.5">
                          {card.trends.map((t, j) => (
                            <p key={j} className="text-xs text-radar-muted flex items-start gap-2">
                              <span className="text-radar-accent flex-shrink-0">·</span>
                              {t}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Posting approach */}
                    <div className="bg-radar-bg border border-radar-border rounded-xl px-3 py-2 space-y-1">
                      <p className="text-xs text-radar-muted uppercase tracking-wider">Posting Approach</p>
                      <p className="text-xs text-white">{card.postingApproach}</p>
                    </div>

                    {/* Monetization */}
                    <div className="bg-radar-green/5 border border-radar-green/20 rounded-xl px-3 py-2 space-y-1">
                      <p className="text-xs text-radar-muted uppercase tracking-wider">💰 Monetization Opportunity</p>
                      <p className="text-xs text-radar-green">{card.monetization}</p>
                    </div>

                    {/* Source video */}
                    {card.videoId && (
                      <a href={`https://www.youtube.com/watch?v=${card.videoId}`}
                        target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 text-xs text-red-400 hover:text-red-300 border border-red-400/20 bg-red-400/5 px-3 py-2 rounded-xl transition-colors"
                        onClick={e => e.stopPropagation()}>
                        <ExternalLink className="w-3 h-3" />
                        View inspiration source on YouTube
                      </a>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* No cache message */}
      {inspoCards.length === 0 && <NoCacheMessage />}

      {/* Manual channel analysis */}
      <div className="card space-y-3 border-radar-border/50">
        <p className="text-xs text-radar-muted uppercase tracking-wider">
          Deep-analyze any YouTube channel — ~50 YouTube units
        </p>
        <div className="flex gap-3">
          <input value={channelId} onChange={e => setChannelId(e.target.value)}
            placeholder="YouTube Channel ID — e.g. UCxxxxxxxxxxxxxx"
            className="flex-1 bg-radar-bg border border-radar-border text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-radar-accent" />
          <button onClick={analyze} disabled={loading || !channelId.trim()} className="btn-primary flex-shrink-0">
            <Compass className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Analyzing...' : 'Analyze'}
          </button>
        </div>
      </div>

      {error && <div className="card border-red-500/30 bg-red-500/5 text-red-400 text-sm">{error}</div>}

      {result && (
        <div className="card space-y-4 animate-fade-in">
          <div className="flex items-start gap-3">
            {result.thumbnail && (
              <img src={result.thumbnail} alt={result.name}
                className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />
            )}
            <div>
              <p className="text-white font-semibold">{result.name}</p>
              <p className="text-xs text-radar-muted mt-0.5 line-clamp-2">{result.description}</p>
              <div className="flex gap-4 mt-2 text-xs">
                <span className="text-radar-muted">
                  Subscribers: <span className="text-white font-mono">
                    {parseInt(result.subscribers ?? 0).toLocaleString()}
                  </span>
                </span>
                <span className="text-radar-muted">
                  Videos: <span className="text-white font-mono">{result.videoCount}</span>
                </span>
              </div>
            </div>
          </div>
          <div>
            <p className="text-xs text-radar-muted mb-2">Top performing videos</p>
            <div className="space-y-2">
              {result.topVideos?.map((v, i) => (
                <a key={i} href={v.url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-3 bg-radar-bg border border-radar-border rounded-xl p-2 hover:border-radar-accent/30 transition-colors">
                  {v.thumbnail && (
                    <img src={v.thumbnail} alt={v.title} className="w-20 h-12 rounded-lg object-cover flex-shrink-0" />
                  )}
                  <p className="text-xs text-white line-clamp-2 flex-1">{v.title}</p>
                  <ExternalLink className="w-3 h-3 text-radar-muted flex-shrink-0" />
                </a>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs text-radar-muted mb-2">Inspo angles for your {niche} content</p>
            {result.inspoAngles?.map((a, i) => (
              <p key={i} className="text-xs text-white flex items-start gap-2 mb-1.5">
                <span className="text-radar-accent flex-shrink-0">→</span> {a}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── REVIEW TEMPLATE ──────────────────────────────────────────────────────────
function ReviewTemplate({ niche }) {
  const [product,  setProduct]  = useState('')
  const [category, setCategory] = useState(niche)
  const [result,   setResult]   = useState(null)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState(null)

  async function generate() {
    if (!product.trim()) return
    setLoading(true); setError(null)
    try { setResult(await generateReviewTemplate(product, category)) }
    catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="card space-y-4">
        <p className="text-xs text-radar-muted">Uses 1 Gemini request — generates complete review script</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-radar-muted block mb-2">Product name</label>
            <input value={product} onChange={e => setProduct(e.target.value)}
              placeholder="e.g. CeraVe Moisturizer"
              className="w-full bg-radar-bg border border-radar-border text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-radar-accent" />
          </div>
          <div>
            <label className="text-xs text-radar-muted block mb-2">Category</label>
            <input value={category} onChange={e => setCategory(e.target.value)}
              placeholder="e.g. skincare"
              className="w-full bg-radar-bg border border-radar-border text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-radar-accent" />
          </div>
        </div>
        <button onClick={generate} disabled={loading || !product.trim()} className="btn-primary w-full justify-center">
          <Star className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Generating...' : 'Generate Review Template — 1 Gemini credit'}
        </button>
      </div>

      {error && (
        <div className="card border-red-500/30 bg-red-500/5 text-red-400 text-sm">{error}</div>
      )}

      {result && (
        <div className="space-y-4 animate-fade-in">
          <div className="card space-y-3">
            <p className="text-xs text-radar-muted uppercase tracking-wider">Hook</p>
            <div className="flex items-start gap-3 bg-radar-bg border border-radar-accent/30 rounded-xl px-4 py-3">
              <p className="text-sm text-white font-medium flex-1">{result.hook}</p>
              <button onClick={() => navigator.clipboard.writeText(result.hook)}
                className="text-xs text-radar-muted hover:text-radar-accent transition-colors">Copy</button>
            </div>
          </div>

          <div className="card space-y-3">
            <p className="text-xs text-radar-muted uppercase tracking-wider">Script Sections</p>
            {result.sections?.map((s, i) => (
              <div key={i} className="bg-radar-bg border border-radar-border rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-white">{s.title}</p>
                  <span className="text-xs text-radar-muted">{s.duration}</span>
                </div>
                {s.points?.map((p, j) => (
                  <p key={j} className="text-xs text-radar-muted flex items-start gap-1.5">
                    <span className="text-radar-accent">·</span> {p}
                  </p>
                ))}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="card space-y-2">
              <p className="text-xs text-radar-muted uppercase tracking-wider">Pros</p>
              {result.pros?.map((p, i) => (
                <p key={i} className="text-xs text-radar-green flex items-start gap-1.5">
                  <CheckCircle2 className="w-3 h-3 flex-shrink-0 mt-0.5" /> {p}
                </p>
              ))}
            </div>
            <div className="card space-y-2">
              <p className="text-xs text-radar-muted uppercase tracking-wider">Cons</p>
              {result.cons?.map((c, i) => (
                <p key={i} className="text-xs text-red-400 flex items-start gap-1.5">
                  <X className="w-3 h-3 flex-shrink-0 mt-0.5" /> {c}
                </p>
              ))}
            </div>
          </div>

          <div className="card space-y-3">
            <p className="text-xs text-radar-muted uppercase tracking-wider">Ready-to-post Caption</p>
            <p className="text-sm text-white whitespace-pre-line leading-relaxed">{result.caption}</p>
            <button onClick={() => navigator.clipboard.writeText(result.caption)}
              className="btn-ghost text-xs w-full justify-center">
              Copy Caption
            </button>
          </div>

          <div className="card space-y-2">
            <p className="text-xs text-radar-muted uppercase tracking-wider">Platform Tips</p>
            {Object.entries(result.platforms ?? {}).map(([p, tip]) => (
              <div key={p} className="flex items-start gap-2">
                <span className="text-xs capitalize font-medium" style={{ color: PLATFORM_COLORS[p] }}>{p}:</span>
                <p className="text-xs text-radar-muted">{tip}</p>
              </div>
            ))}
          </div>

          <div className="card space-y-2">
            <p className="text-xs text-radar-muted uppercase tracking-wider">Hashtags</p>
            <div className="flex flex-wrap gap-2">
              {result.hashtags?.map(tag => (
                <span key={tag} className="text-xs bg-radar-accent/10 text-radar-accent border border-radar-accent/20 rounded-xl px-2.5 py-1 font-mono">
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── THUMBNAIL ANALYZER ───────────────────────────────────────────────────────
function ThumbnailAnalyzer({ niche }) {
  const [file,     setFile]     = useState(null)
  const [preview,  setPreview]  = useState(null)
  const [result,   setResult]   = useState(null)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState(null)
  const fileRef = useRef()

  function handleFile(e) {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    setPreview(URL.createObjectURL(f))
    setResult(null)
  }

  async function analyze() {
    if (!file) return
    setLoading(true); setError(null)
    try {
      // Upload to Cloudinary first if configured
      let url = null
      try {
        const res = await uploadToCloudinary(file, 'thumbnail')
        url = res.url
      } catch (err) {
        console.log('Cloudinary upload skipped or failed, analyzing directly:', err.message)
      }

      // Convert to base64 for Gemini
      const base64 = await new Promise((res, rej) => {
        const reader = new FileReader()
        reader.onload  = () => res(reader.result)
        reader.onerror = rej
        reader.readAsDataURL(file)
      })
      const analysis = await analyzeThumbnail(base64, url, niche)
      setResult(analysis)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const SCORE_COLOR = (s) => s >= 70 ? 'text-radar-green' : s >= 50 ? 'text-radar-amber' : 'text-red-400'

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="card space-y-4">
        <p className="text-xs text-radar-muted">
          Upload to Cloudinary → analyze with Gemini AI · uses 1 Gemini request
        </p>
        <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />

        {!preview ? (
          <button onClick={() => fileRef.current.click()}
            className="w-full border-2 border-dashed border-radar-border hover:border-radar-accent rounded-2xl p-10 text-center transition-colors group">
            <Image className="w-8 h-8 text-radar-muted group-hover:text-radar-accent mx-auto mb-3 transition-colors" />
            <p className="text-white font-medium">Click to upload thumbnail</p>
            <p className="text-radar-muted text-xs mt-1">JPG, PNG, WebP</p>
          </button>
        ) : (
          <div className="space-y-3">
            <img src={preview} alt="thumbnail" className="w-full max-h-48 object-contain rounded-xl bg-black" />
            <div className="flex gap-2">
              <button onClick={analyze} disabled={loading} className="btn-primary flex-1 justify-center">
                <Image className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                {loading ? 'Analyzing...' : 'Analyze with Gemini — 1 credit'}
              </button>
              <button onClick={() => { setFile(null); setPreview(null); setResult(null) }}
                className="btn-ghost">
                Change
              </button>
            </div>
          </div>
        )}
      </div>

      {error && <div className="card border-red-500/30 bg-red-500/5 text-red-400 text-sm">{error}</div>}

      {result && (
        <div className="space-y-4 animate-fade-in">
          {/* Overall score */}
          <div className="card flex items-center gap-6">
            <div className="text-center">
              <p className={`text-5xl font-bold ${SCORE_COLOR(result.overallScore)}`}>
                {result.overallScore}
              </p>
              <p className="text-xs text-radar-muted mt-1">Overall Score</p>
            </div>
            <div className="flex-1 space-y-2">
              <p className="text-sm text-white">{result.verdict}</p>
              <p className="text-xs text-radar-muted">
                Click-through prediction:{' '}
                <span className={clsx(
                  'font-medium capitalize',
                  result.clickThroughPrediction === 'very high' ? 'text-radar-green' :
                  result.clickThroughPrediction === 'high' ? 'text-radar-amber' : 'text-red-400'
                )}>
                  {result.clickThroughPrediction}
                </span>
              </p>
              <div className="flex gap-3 text-xs flex-wrap">
                {result.facePresence !== undefined && (
                  <span className={result.facePresence ? 'text-radar-green' : 'text-radar-muted'}>
                    {result.facePresence ? '✅' : '❌'} Face
                  </span>
                )}
                {result.textPresent !== undefined && (
                  <span className={result.textPresent ? 'text-radar-green' : 'text-radar-muted'}>
                    {result.textPresent ? '✅' : '❌'} Text overlay
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Metric scores */}
          <div className="card space-y-3">
            <p className="text-xs text-radar-muted uppercase tracking-wider">Metrics</p>
            {[
              { label: 'Text Clarity',     value: result.textClarity     },
              { label: 'Color Contrast',   value: result.colorContrast   },
              { label: 'Emotional Impact', value: result.emotionalImpact },
            ].map(m => (
              <div key={m.label} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-radar-muted">{m.label}</span>
                  <span className={SCORE_COLOR(m.value ?? 0)}>{m.value ?? 0}</span>
                </div>
                <div className="h-1.5 bg-radar-border rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all"
                    style={{
                      width:      `${m.value ?? 0}%`,
                      background: (m.value ?? 0) >= 70 ? '#10b981' : (m.value ?? 0) >= 50 ? '#f59e0b' : '#ef4444',
                    }} />
                </div>
              </div>
            ))}
          </div>

          {/* Platform fit */}
          <div className="card space-y-3">
            <p className="text-xs text-radar-muted uppercase tracking-wider">Platform Fit</p>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(result.platformFit ?? {}).map(([p, score]) => (
                <div key={p} className="bg-radar-bg border border-radar-border rounded-xl p-3">
                  <div className="flex justify-between mb-1">
                    <span className="text-xs capitalize" style={{ color: PLATFORM_COLORS[p] }}>{p}</span>
                    <span className={`text-xs font-mono ${SCORE_COLOR(score)}`}>{score}</span>
                  </div>
                  <div className="h-1.5 bg-radar-border rounded-full overflow-hidden">
                    <div className="h-full rounded-full"
                      style={{ width: `${score}%`, background: PLATFORM_COLORS[p] }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Improvements */}
          <div className="card space-y-2">
            <p className="text-xs text-radar-muted uppercase tracking-wider">Improvements</p>
            {result.improvements?.map((imp, i) => (
              <p key={i} className="text-xs text-white flex items-start gap-2">
                <span className="text-radar-amber flex-shrink-0">→</span> {imp}
              </p>
            ))}
          </div>

          {/* Strengths */}
          <div className="card space-y-2">
            <p className="text-xs text-radar-muted uppercase tracking-wider">Strengths</p>
            {result.strengths?.map((s, i) => (
              <p key={i} className="text-xs text-radar-green flex items-start gap-2">
                <CheckCircle2 className="w-3 h-3 flex-shrink-0 mt-0.5" /> {s}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── SRI LANKA CREATOR RESOURCES ──────────────────────────────────────────────
function SriLankaResources() {
  const RESOURCES = [
    {
      category: '💳 Payment Methods',
      items: [
        { name: 'Wise (formerly TransferWise)', status: '✅ Works great', note: 'Best for receiving USD/EUR. Low fees. Get a Wise account and link to local bank.' },
        { name: 'Payoneer', status: '✅ Works great', note: 'Widely used for Fiverr, Upwork, Amazon payouts. Easy to withdraw to BOC or Sampath.' },
        { name: 'PayPal', status: '⚠️ Limited', note: 'Can receive but withdrawal to SL bank is restricted. Use Wise as middleman.' },
        { name: 'Skrill', status: '✅ Works', note: 'Alternative to PayPal. Good for smaller amounts.' },
        { name: 'Direct bank transfer (SWIFT)', status: '✅ Works', note: 'For larger brand deal payments. Requires USD account at BOC, Sampath or Commercial Bank.' },
      ]
    },
    {
      category: '🏦 Best Banks for Creators',
      items: [
        { name: 'Bank of Ceylon (BOC)', status: '⭐ Recommended', note: 'Best for SWIFT/foreign currency accounts. Low fees on incoming transfers.' },
        { name: 'Sampath Bank', status: '⭐ Recommended', note: 'Good online banking. Easy to open USD savings account.' },
        { name: 'Commercial Bank', status: '✅ Good', note: 'Widely used for international transactions.' },
      ]
    },
    {
      category: '📦 Shipping for Stationery',
      items: [
        { name: 'Sri Lanka Post EMS', status: '✅ Cheapest', note: 'Rs 500-2000 for local. International from Rs 1500. Tracked but slow.' },
        { name: 'DHL Express', status: '✅ Fast', note: 'International from Rs 4000. 3-5 days. Best for high-value stationery orders.' },
        { name: 'FedEx SL', status: '✅ Fast', note: 'Similar to DHL. Good for international brand gifting.' },
        { name: 'Kapruka', status: '✅ Local', note: 'Best for local delivery. Island-wide. Cash on delivery available.' },
      ]
    },
    {
      category: '🖨️ Local Printing for Stationery',
      items: [
        { name: 'Vijitha Yapa / Sarasavi', status: '📍 Colombo', note: 'Stationery supplies wholesale. Good for notebooks, pens, washi tape sourcing.' },
        { name: 'Colour Print (Pvt) Ltd', status: '📍 Colombo', note: 'Custom sticker printing. Minimum 100 pcs. Good quality.' },
        { name: 'Ananda Press', status: '📍 Colombo', note: 'Journal and notebook printing. Custom sizes available.' },
        { name: 'Printcare Ceylon', status: '📍 Colombo', note: 'High quality packaging and label printing for product branding.' },
      ]
    },
    {
      category: '🤝 SL Creator Communities',
      items: [
        { name: 'Sri Lanka Creators Hub', status: '📱 Facebook Group', note: 'Largest creator community. Brand deal leads shared regularly.' },
        { name: 'Digital Nomads Sri Lanka', status: '📱 Facebook Group', note: 'Good for freelance and creator economy discussions.' },
        { name: 'Sinhala YouTubers Network', status: '📱 WhatsApp/Telegram', note: 'Collaboration and cross-promotion opportunities.' },
      ]
    },
    {
      category: '📊 Tax & Legal',
      items: [
        { name: 'Income threshold', status: 'ℹ️ Important', note: 'Individual income tax applies above Rs 1.8M/year (2024). Keep records of all brand deal payments.' },
        { name: 'Register as sole trader', status: '✅ Recommended', note: 'Register with Divisional Secretariat for Rs 500. Allows official invoicing to brands.' },
        { name: 'Foreign income', status: 'ℹ️ Important', note: 'Income from foreign brands brought into SL via bank transfer is subject to standard income tax.' },
      ]
    },
  ]

  return (
    <div className="space-y-5 animate-fade-in">
      <p className="text-xs text-radar-muted">
        Practical resources for Sri Lanka based content creators — updated manually · no API cost
      </p>
      {RESOURCES.map(section => (
        <div key={section.category} className="card space-y-3">
          <p className="text-sm font-medium text-white">{section.category}</p>
          <div className="space-y-2">
            {section.items.map((item, i) => (
              <div key={i} className="bg-radar-bg border border-radar-border rounded-xl p-3 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium text-white">{item.name}</p>
                  <span className="text-xs text-radar-muted flex-shrink-0">{item.status}</span>
                </div>
                <p className="text-xs text-radar-muted leading-relaxed">{item.note}</p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
