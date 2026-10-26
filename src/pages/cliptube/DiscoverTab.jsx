import { useState } from 'react'
import {
  TrendingUp, Play, ExternalLink, Sparkles, Hash,
  Tv, Users, Check, AlertCircle, Clock, Zap
} from 'lucide-react'
import clsx from 'clsx'
import { saveSeed } from './api'

export default function DiscoverTab({ scan, onSeedSaved }) {
  const [savedSeeds, setSavedSeeds] = useState({})
  const [savingId, setSavingId] = useState(null)
  const [saveError, setSaveError] = useState(null)

  const facts = scan?.facts

  const handleSaveSeed = async (text, itemType, metadata = {}, seedKey) => {
    if (savedSeeds[seedKey]) return
    setSavingId(seedKey)
    setSaveError(null)
    try {
      await saveSeed({
        text,
        source: 'discover',
        itemType,
        metadata,
      })
      setSavedSeeds(prev => ({ ...prev, [seedKey]: true }))
      if (onSeedSaved) onSeedSaved()
    } catch (err) {
      setSaveError(err.message || 'Failed to save seed')
    } finally {
      setSavingId(null)
    }
  }

  if (!facts) {
    return (
      <div className="card text-center py-16 space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-radar-border flex items-center justify-center mx-auto text-radar-muted">
          <Zap className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-white font-medium text-base">No Scan Facts Available</h3>
          <p className="text-radar-muted text-sm max-w-md mx-auto mt-1">
            Run a ClipTube Scan from the header above to collect YouTube trend signals, breakout velocity, and series data.
          </p>
        </div>
      </div>
    )
  }

  const topics = facts.topics || []
  const series = facts.series || []
  const hashtags = facts.hashtags || []
  const breakoutChannels = facts.breakoutChannels || []
  const globalInspiration = facts.globalInspiration || []

  return (
    <div className="space-y-8 animate-fade-in">
      {saveError && (
        <div className="card border-red-500/30 bg-red-500/5 flex items-center gap-3 py-3 px-4">
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <p className="text-red-400 text-xs">{saveError}</p>
        </div>
      )}

      {/* Summary Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card py-4 px-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-radar-accent/10 text-radar-accent">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-bold text-white">{topics.length}</div>
              <div className="text-xs text-radar-muted">English Clusters</div>
            </div>
          </div>
        </div>

        <div className="card py-4 px-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-radar-accent2/10 text-radar-accent2">
              <Tv className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-bold text-white">{series.length}</div>
              <div className="text-xs text-radar-muted">Active Series</div>
            </div>
          </div>
        </div>

        <div className="card py-4 px-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-radar-green/10 text-radar-green">
              <Hash className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-bold text-white">{hashtags.length}</div>
              <div className="text-xs text-radar-muted">Content Hashtags</div>
            </div>
          </div>
        </div>

        <div className="card py-4 px-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-radar-amber/10 text-radar-amber">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-bold text-white">{breakoutChannels.length}</div>
              <div className="text-xs text-radar-muted">Breakout Creators</div>
            </div>
          </div>
        </div>
      </div>

      {/* Hidden Global Inspiration Indicator */}
      {globalInspiration.length > 0 && (
        <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-radar-card/60 border border-radar-border/80 text-xs text-radar-muted">
          <Sparkles className="w-3.5 h-3.5 text-radar-accent flex-shrink-0" />
          <span>
            <strong className="text-white font-medium">{globalInspiration.length}</strong> non-English viral videos used as hidden inspiration for AI ideas.
          </span>
        </div>
      )}

      {/* ── 1. Trending Topics ────────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-radar-accent" />
            <h2 className="text-base font-semibold text-white">Trending Topic Clusters</h2>
          </div>
          <span className="text-xs text-radar-muted font-mono">{topics.length} clusters (English only)</span>
        </div>

        {topics.length === 0 ? (
          <div className="card text-center py-8 text-radar-muted text-sm">
            No clusters with ≥3 videos and ≥2 distinct channels found in English data.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {topics.map((item, idx) => {
              const seedKey = `topic-${idx}-${item.topic}`
              const isSaved = savedSeeds[seedKey]
              const isSaving = savingId === seedKey
              const velocity = item.medianVelocity || item.avgVelocity || 0

              return (
                <div
                  key={seedKey}
                  className="card p-5 flex flex-col justify-between hover:border-radar-accent/50 transition-all duration-200 group"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-mono text-radar-muted uppercase tracking-wider">
                        Rank #{idx + 1}
                      </span>
                      <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-radar-accent/10 border border-radar-accent/30 text-radar-accent text-xs font-mono">
                        <Zap className="w-3 h-3" />
                        <span>{velocity.toLocaleString()} median vph</span>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-base font-semibold text-white capitalize group-hover:text-radar-accent transition-colors">
                        {item.topic}
                      </h3>
                      <p className="text-xs text-radar-muted mt-0.5">
                        {item.count} videos · {item.channelCount} creators · {(item.totalViews || 0).toLocaleString()} views
                      </p>
                    </div>

                    {item.sampleTitles?.length > 0 && (
                      <div className="space-y-1.5 pt-2 border-t border-radar-border/40">
                        <p className="text-[11px] text-radar-muted font-medium uppercase tracking-wider">Sample Titles:</p>
                        {item.sampleTitles.slice(0, 2).map((title, tIdx) => (
                          <p key={tIdx} className="text-xs text-radar-text/80 line-clamp-1 italic">
                            "{title}"
                          </p>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-4 mt-3 border-t border-radar-border/40">
                    <a
                      href={`https://www.youtube.com/results?search_query=${encodeURIComponent(item.topic)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-radar-muted hover:text-white flex items-center gap-1.5 transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      View on YouTube
                    </a>

                    <button
                      onClick={() => handleSaveSeed(item.topic, 'topic', { medianVelocity: velocity, count: item.count }, seedKey)}
                      disabled={isSaved || isSaving}
                      className={clsx(
                        'text-xs px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-all',
                        isSaved
                          ? 'bg-radar-green/10 text-radar-green border border-radar-green/30 cursor-default'
                          : 'bg-radar-border/50 text-radar-text hover:bg-radar-accent hover:text-white'
                      )}
                    >
                      {isSaved ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          Seed saved
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5 text-radar-accent" />
                          {isSaving ? 'Saving…' : 'Use as idea seed'}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── 2. Trending Series ─────────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-radar-accent2" />
            <h2 className="text-base font-semibold text-white">Trending Series Stems</h2>
          </div>
          <span className="text-xs text-radar-muted font-mono">{series.length} series stems</span>
        </div>

        {series.length === 0 ? (
          <div className="card text-center py-8 text-radar-muted text-sm">
            No active multi-episode series detected in this batch.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {series.map((s, idx) => {
              const seedKey = `series-${idx}-${s.stem}`
              const isSaved = savedSeeds[seedKey]
              const isSaving = savingId === seedKey
              const velocity = s.medianVelocity || s.avgVelocity || 0

              return (
                <div key={seedKey} className="card p-5 space-y-4 hover:border-radar-accent2/50 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="badge bg-radar-accent2/10 text-radar-accent2 border border-radar-accent2/30">
                          {s.badgeText || `${s.videoCount} Episode${s.videoCount > 1 ? 's' : ''}`}
                        </span>
                        <span className="text-xs text-radar-muted">{s.channelTitle}</span>
                      </div>
                      <h3 className="text-base font-semibold text-white mt-1">
                        {s.stem}
                      </h3>
                    </div>

                    <div className="text-right">
                      <div className="text-sm font-mono text-white font-medium">
                        {velocity.toLocaleString()} <span className="text-[10px] text-radar-muted">vph</span>
                      </div>
                      <div className="text-[11px] text-radar-muted">
                        {(s.totalViews || 0).toLocaleString()} views
                      </div>
                    </div>
                  </div>

                  {s.sampleVideos?.length > 0 && (
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-radar-border/40">
                      {s.sampleVideos.slice(0, 2).map(vid => (
                        <a
                          key={vid.id}
                          href={`https://www.youtube.com/watch?v=${vid.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 p-1.5 rounded-lg bg-radar-bg/60 hover:bg-radar-bg border border-radar-border/30 group/vid"
                        >
                          {vid.thumbnail && (
                            <img
                              src={vid.thumbnail}
                              alt=""
                              className="w-12 h-8 object-cover rounded flex-shrink-0"
                            />
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="text-xs text-radar-text group-hover/vid:text-radar-accent2 truncate">
                              {vid.title}
                            </p>
                            <p className="text-[10px] text-radar-muted">
                              {(vid.views || 0).toLocaleString()} views
                            </p>
                          </div>
                        </a>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-2 pt-3 border-t border-radar-border/40">
                    <a
                      href={`https://www.youtube.com/channel/${s.channelId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-radar-muted hover:text-white flex items-center gap-1.5 transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Visit Channel
                    </a>

                    <button
                      onClick={() => handleSaveSeed(s.stem, 'series', { channelTitle: s.channelTitle, videoCount: s.videoCount, medianVelocity: velocity }, seedKey)}
                      disabled={isSaved || isSaving}
                      className={clsx(
                        'text-xs px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-all',
                        isSaved
                          ? 'bg-radar-green/10 text-radar-green border border-radar-green/30 cursor-default'
                          : 'bg-radar-border/50 text-radar-text hover:bg-radar-accent2 hover:text-white'
                      )}
                    >
                      {isSaved ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          Seed saved
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5 text-radar-accent2" />
                          {isSaving ? 'Saving…' : 'Use as idea seed'}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── 3. Trending Hashtags (Content tags only) ───────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-radar-green" />
            <h2 className="text-base font-semibold text-white">Trending Content Hashtags</h2>
          </div>
          <span className="text-xs text-radar-muted font-mono">{hashtags.length} hashtags (platform tags filtered)</span>
        </div>

        {hashtags.length === 0 ? (
          <div className="card text-center py-8 text-radar-muted text-sm">
            No content hashtags extracted from the English videos.
          </div>
        ) : (
          <div className="card p-0 overflow-hidden">
            <div className="grid grid-cols-12 px-5 py-3 border-b border-radar-border text-xs text-radar-muted uppercase tracking-wider font-mono">
              <span className="col-span-4">Hashtag</span>
              <span className="col-span-2 text-center">Frequency</span>
              <span className="col-span-3 text-right">Median Velocity</span>
              <span className="col-span-3 text-right">Action</span>
            </div>
            <div className="divide-y divide-radar-border/40">
              {hashtags.slice(0, 15).map((h, idx) => {
                const seedKey = `tag-${idx}-${h.tag}`
                const isSaved = savedSeeds[seedKey]
                const isSaving = savingId === seedKey
                const velocity = h.medianVelocity || h.avgVelocity || 0

                return (
                  <div
                    key={seedKey}
                    className="grid grid-cols-12 px-5 py-3 items-center hover:bg-radar-bg/40 transition-colors"
                  >
                    <div className="col-span-4 flex items-center gap-2">
                      <span className="text-xs font-mono text-radar-muted w-5">{idx + 1}</span>
                      <a
                        href={`https://www.youtube.com/hashtag/${encodeURIComponent(h.tag)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-mono text-white hover:text-radar-green flex items-center gap-1.5 transition-colors"
                      >
                        #{h.tag}
                        <ExternalLink className="w-3 h-3 text-radar-muted" />
                      </a>
                    </div>

                    <div className="col-span-2 text-center">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-radar-border text-radar-text font-mono">
                        {h.count} videos
                      </span>
                    </div>

                    <div className="col-span-3 text-right">
                      <span className="text-sm font-mono font-medium text-radar-green">
                        {velocity.toLocaleString()} <span className="text-xs text-radar-muted">vph</span>
                      </span>
                    </div>

                    <div className="col-span-3 flex justify-end">
                      <button
                        onClick={() => handleSaveSeed(`#${h.tag}`, 'hashtag', { medianVelocity: velocity, count: h.count }, seedKey)}
                        disabled={isSaved || isSaving}
                        className={clsx(
                          'text-xs px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-all',
                          isSaved
                            ? 'bg-radar-green/10 text-radar-green border border-radar-green/30 cursor-default'
                            : 'bg-radar-border/40 text-radar-text hover:bg-radar-green hover:text-white'
                        )}
                      >
                        {isSaved ? (
                          <>
                            <Check className="w-3 h-3" />
                            Saved
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3 h-3 text-radar-green" />
                            {isSaving ? '…' : 'Seed'}
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── 4. Breakout Channels (English only) ────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-radar-amber" />
            <h2 className="text-base font-semibold text-white">Breakout Channels (English)</h2>
          </div>
          <span className="text-xs text-radar-muted font-mono">High view-to-sub ratio</span>
        </div>

        {breakoutChannels.length === 0 ? (
          <div className="card text-center py-8 text-radar-muted text-sm">
            No breakout channels detected in this scan.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {breakoutChannels.map((ch, idx) => {
              const seedKey = `channel-${idx}-${ch.channelId}`
              const isSaved = savedSeeds[seedKey]
              const isSaving = savingId === seedKey
              const velocity = ch.medianVelocity || ch.avgVelocity || 0

              return (
                <div key={seedKey} className="card p-5 space-y-4 hover:border-radar-amber/50 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {ch.thumbnail ? (
                        <img
                          src={ch.thumbnail}
                          alt=""
                          className="w-10 h-10 rounded-full border border-radar-border object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-radar-border flex items-center justify-center text-radar-muted font-bold">
                          {ch.channelTitle?.[0] || 'C'}
                        </div>
                      )}
                      <div>
                        <h3 className="text-sm font-semibold text-white">
                          {ch.channelTitle}
                        </h3>
                        <p className="text-xs text-radar-muted font-mono">
                          {(ch.subscriberCount || 0).toLocaleString()} subscribers
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="badge bg-radar-amber/10 text-radar-amber border border-radar-amber/30 font-mono">
                        {ch.breakoutRatio}x breakout
                      </span>
                      <div className="text-[11px] text-radar-muted mt-0.5">
                        {velocity.toLocaleString()} vph median
                      </div>
                    </div>
                  </div>

                  {ch.topVideo && (
                    <div className="p-3 rounded-xl bg-radar-bg/60 border border-radar-border/30 space-y-2">
                      <div className="flex items-center justify-between text-[11px] text-radar-muted uppercase tracking-wider">
                        <span>Top Breakout Video</span>
                        <span className="text-radar-green font-mono">{(ch.topVideo.velocity || 0).toLocaleString()} vph</span>
                      </div>
                      <p className="text-xs text-white line-clamp-1 font-medium">
                        "{ch.topVideo.title}"
                      </p>
                      <div className="flex items-center justify-between text-xs text-radar-muted">
                        <span>{(ch.topVideo.views || ch.topVideo.viewCount || 0).toLocaleString()} views</span>
                        <a
                          href={`https://www.youtube.com/watch?v=${ch.topVideo.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-radar-accent hover:underline flex items-center gap-1 text-[11px]"
                        >
                          <Play className="w-3 h-3" />
                          Watch
                        </a>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-radar-border/40">
                    <a
                      href={`https://www.youtube.com/channel/${ch.channelId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-radar-muted hover:text-white flex items-center gap-1.5 transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      View Channel
                    </a>

                    <button
                      onClick={() => handleSaveSeed(ch.channelTitle, 'channel', { channelId: ch.channelId, subscriberCount: ch.subscriberCount, breakoutRatio: ch.breakoutRatio }, seedKey)}
                      disabled={isSaved || isSaving}
                      className={clsx(
                        'text-xs px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-all',
                        isSaved
                          ? 'bg-radar-green/10 text-radar-green border border-radar-green/30 cursor-default'
                          : 'bg-radar-border/50 text-radar-text hover:bg-radar-amber hover:text-white'
                      )}
                    >
                      {isSaved ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          Seed saved
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5 text-radar-amber" />
                          {isSaving ? 'Saving…' : 'Use as idea seed'}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
