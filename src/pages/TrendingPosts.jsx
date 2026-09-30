import { useState, useEffect } from 'react'
import { Flame, ExternalLink, Music, Youtube, MessageSquare, ChevronDown, AlertCircle, ThumbsUp } from 'lucide-react'
import { getTrendingPosts, incrementQuota } from '../utils/api'
import { useNiches } from '../hooks/useNiches'
import { SkeletonCard } from '../components/Skeleton'
import clsx from 'clsx'
import { usePageCache } from '../hooks/usePageCache'

const FEED_STYLE = {
  hot:    { label: '🔥 Hot',    bg: 'bg-radar-amber/10',  text: 'text-radar-amber',  border: 'border-radar-amber/30'  },
  rising: { label: '📈 Rising', bg: 'bg-radar-green/10',  text: 'text-radar-green',  border: 'border-radar-green/30'  },
  new:    { label: '✨ New',    bg: 'bg-radar-accent/10', text: 'text-radar-accent', border: 'border-radar-accent/30' },
}

export default function TrendingPosts() {
  const { niches }  = useNiches()
  const [niche,     setNiche]   = useState('skincare')
  const { data, set: setData } = usePageCache('trending-' + niche)
  const [loading,   setLoading] = useState(false)
  const [error,     setError]   = useState(null)
  const [tab,       setTab]     = useState('reddit')

  async function run(force = false) {
    if (data && !force) return
    setLoading(true); setError(null)
    try {
      const res = await getTrendingPosts(niche)
      setData(res)
      incrementQuota('youtube', 200).catch(() => {})
      incrementQuota('newsapi', 1).catch(() => {})
    }
    catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  useEffect(() => { run() }, [niche])

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold text-white flex items-center gap-2">
          <Flame className="w-6 h-6 text-radar-amber" />
          Trending Posts
        </h1>
        <p className="text-radar-muted text-sm mt-1">
          Niche-matched content from YouTube, NewsAPI{' '}
          {niche === 'tech' && '+ Dev.to'}
          {niche === 'gaming' && '+ 4chan /v/'}
          {niche === 'movies' && '+ TMDB'}
          {niche === 'books' && '+ Open Library'}
          {['wellness','fitness'].includes(niche) && '+ iTunes Podcasts'}
          {niche === 'stationery' && '+ 4chan /diy/'}
          {['finance','tech'].includes(niche) && ' + Hacker News'}
        </p>
      </div>

      {/* Controls */}
      <div className="card flex flex-wrap items-end gap-4">
        <div className="flex-1 min-w-40">
          <label className="text-xs text-radar-muted block mb-2">Niche</label>
          <div className="relative">
            <select value={niche} onChange={e => setNiche(e.target.value)}
              className="w-full bg-radar-bg border border-radar-border text-white rounded-xl px-4 py-2.5 text-sm appearance-none pr-8 focus:outline-none focus:border-radar-accent">
              {niches.map(n => (
                <option key={n.key} value={n.key}>{n.icon} {n.label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-radar-muted pointer-events-none" />
          </div>
        </div>
        <button onClick={() => run(true)} disabled={loading} className="btn-primary">
          <Flame className="w-4 h-4" />
          {loading ? 'Fetching...' : 'Get Trending'}
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
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {data && !loading && (
        <div className="space-y-6 animate-slide-up">

          {/* Summary row */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Top post score',   value: (data.summary?.topPostScore ?? 0).toLocaleString(),  icon: ThumbsUp,      color: 'text-radar-amber'  },
              { label: 'Videos found',     value: (data.topYouTubeVideos ?? []).length,                icon: Youtube,       color: 'text-red-400'      },
              { label: 'Audio signals',    value: (data.trendingAudio ?? []).length,                   icon: Music,         color: 'text-radar-accent' },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="card flex items-center gap-3">
                <div className={`p-2.5 rounded-xl bg-radar-border ${color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xl font-semibold text-white">{value}</div>
                  <div className="text-xs text-radar-muted">{label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Source breakdown */}
          {data.sourceBreakdown && (
            <div className="card flex flex-wrap gap-3 py-3 items-center">
              <p className="text-xs text-radar-muted">Sources:</p>
              {Object.entries(data.sourceBreakdown)
                .filter(([, v]) => v)
                .map(([k, v]) => (
                  <span key={k} className="text-xs text-white bg-radar-bg border border-radar-border rounded-full px-2.5 py-1">
                    {v}
                  </span>
                ))}
              {data.fromCache && (
                <span className="text-xs text-radar-amber border border-radar-amber/30 bg-radar-amber/10 rounded-full px-2.5 py-1">
                  ⚡ YouTube from cache
                </span>
              )}
            </div>
          )}

          {/* Tab switcher */}
          <div className="flex gap-2 border-b border-radar-border">
            {[
              { key: 'reddit',  label: '💬 Reddit Posts'    },
              { key: 'youtube', label: '▶️ YouTube Videos'  },
              { key: 'audio',   label: '🎵 Trending Audio'  },
            ].map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={clsx(
                  'px-4 py-2.5 text-sm font-medium border-b-2 transition-all duration-200 -mb-px',
                  tab === t.key
                    ? 'border-radar-accent text-white'
                    : 'border-transparent text-radar-muted hover:text-white'
                )}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Reddit Posts tab */}
          {tab === 'reddit' && (
            <div className="space-y-3 animate-fade-in">
              <p className="text-xs text-radar-muted">
                Sorted by engagement score — upvotes × ratio + comments × 3 × recency decay
              </p>
              {(data.topPosts ?? data.topRedditPosts ?? []).map((post, i) => {
                const fs = FEED_STYLE[post.feed] ?? FEED_STYLE.hot
                return (
                  <a key={post.url} href={post.url} target="_blank" rel="noopener noreferrer"
                    className="card flex items-start gap-4 hover:border-radar-accent/40 transition-all group cursor-pointer block">
                    <div className="text-2xl font-bold text-radar-border group-hover:text-radar-accent transition-colors w-8 flex-shrink-0 text-right">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-start gap-2 flex-wrap">
                        <p className="text-sm text-white font-medium leading-snug flex-1">
                          {post.title}
                        </p>
                        <ExternalLink className="w-3.5 h-3.5 text-radar-muted group-hover:text-radar-accent flex-shrink-0 mt-0.5 transition-colors" />
                      </div>
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="text-xs text-radar-muted">{post.subreddit}</span>
                        <span className={clsx('badge border text-xs', fs.bg, fs.text, fs.border)}>
                          {fs.label}
                        </span>
                        {post.flair && (
                          <span className="text-xs bg-radar-border text-radar-muted px-2 py-0.5 rounded-full">
                            {post.flair}
                          </span>
                        )}
                        <span className="text-xs text-radar-muted">{post.ageHours}h ago</span>
                      </div>
                      <div className="flex gap-4 text-xs">
                        <span className="text-radar-amber flex items-center gap-1">
                          <ThumbsUp className="w-3 h-3" />
                          {post.score.toLocaleString()}
                        </span>
                        <span className="text-radar-accent flex items-center gap-1">
                          <MessageSquare className="w-3 h-3" />
                          {post.comments.toLocaleString()} comments
                        </span>
                        <span className="text-radar-green">
                          {post.upvoteRatio}% upvoted
                        </span>
                        <span className="text-radar-muted font-mono">
                          eng: {post.engScore.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </a>
                )
              })}
            </div>
          )}

          {/* YouTube Videos tab */}
          {tab === 'youtube' && (
            <div className="space-y-3 animate-fade-in">
              <p className="text-xs text-radar-muted">
                Most viewed recent videos in your niche — these signal what's working on video platforms right now
              </p>
              <div className="grid grid-cols-2 gap-4">
                {data.topYouTubeVideos.map((v, i) => (
                  <a key={v.videoId} href={v.url} target="_blank" rel="noopener noreferrer"
                    className="card p-0 overflow-hidden hover:border-radar-accent/40 transition-all group block">
                    {/* Thumbnail */}
                    <div className="relative">
                      <img
                        src={v.thumbnail}
                        alt={v.title}
                        className="w-full h-36 object-cover"
                        onError={e => { e.target.style.display = 'none' }}
                      />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center">
                          <Youtube className="w-5 h-5 text-white" />
                        </div>
                      </div>
                      <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-0.5 rounded-full font-mono">
                        #{i + 1}
                      </div>
                      <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-0.5 rounded-full">
                        {v.ageLabel}
                      </div>
                    </div>
                    {/* Info */}
                    <div className="p-3 space-y-1">
                      <p className="text-sm text-white font-medium line-clamp-2 leading-snug">
                        {v.title}
                      </p>
                      <p className="text-xs text-radar-muted">{v.channel}</p>
                      <div className="flex items-center gap-1 text-xs text-red-400">
                        <ExternalLink className="w-3 h-3" />
                        Watch on YouTube
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Trending Audio tab */}
          {tab === 'audio' && (
            <div className="space-y-4 animate-fade-in">
              <p className="text-xs text-radar-muted">
                Audio signals extracted from trending videos — search these names on TikTok to find and use the trending sounds
              </p>
              {data.trendingAudio.length === 0 ? (
                <div className="card text-center py-8 text-radar-muted text-sm">
                  No specific audio signals detected for this niche. Try a music or entertainment niche for stronger audio signals.
                </div>
              ) : (
                <div className="space-y-3">
                  {data.trendingAudio.map((audio, i) => (
                    <div key={audio.videoId} className="card flex items-center gap-4 hover:border-radar-accent/30 transition-colors">
                      <div className="w-8 h-8 rounded-lg bg-radar-accent/10 border border-radar-accent/20 flex items-center justify-center flex-shrink-0">
                        <Music className="w-4 h-4 text-radar-accent" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white font-medium truncate">{audio.name}</p>
                        <p className="text-xs text-radar-muted">{audio.channel}</p>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <a href={audio.youtubeUrl} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 border border-red-400/20 bg-red-400/10 px-3 py-1.5 rounded-xl transition-colors">
                          <Youtube className="w-3 h-3" />
                          YouTube
                        </a>
                        <a href={`https://www.tiktok.com/search?q=${encodeURIComponent(audio.name)}`}
                          target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-xs text-radar-tiktok hover:text-pink-300 border border-radar-tiktok/20 bg-radar-tiktok/10 px-3 py-1.5 rounded-xl transition-colors">
                          🎵 Find on TikTok
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Manual search tip */}
              <div className="card border-radar-accent/20 bg-radar-accent/5 space-y-2">
                <p className="text-xs text-radar-accent font-medium">💡 How to use trending audio</p>
                <p className="text-sm text-radar-muted leading-relaxed">
                  Copy any audio name above and search it directly in TikTok's sound library or Reels audio search.
                  Using a trending sound gets your video placed in that sound's discovery feed — significantly boosting reach.
                </p>
              </div>
            </div>
          )}

          <p className="text-xs text-radar-muted text-right">
            {data.totalSources} sources scanned · {new Date(data.fetchedAt).toLocaleTimeString()}
          </p>
        </div>
      )}
    </div>
  )
}
