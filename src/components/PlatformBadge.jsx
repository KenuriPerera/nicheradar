import clsx from 'clsx'

const PLATFORMS = {
  tiktok:    { label: 'TikTok',    bg: 'bg-radar-tiktok/10', text: 'text-radar-tiktok', border: 'border-radar-tiktok/30' },
  instagram: { label: 'Instagram', bg: 'bg-radar-ig/10',     text: 'text-radar-ig',     border: 'border-radar-ig/30'     },
  both:      { label: 'Both',      bg: 'bg-radar-accent/10', text: 'text-radar-accent', border: 'border-radar-accent/30' },
}

export default function PlatformBadge({ platform }) {
  const p = PLATFORMS[platform?.toLowerCase()] || PLATFORMS.both
  return (
    <span className={clsx('badge border', p.bg, p.text, p.border)}>
      {p.label}
    </span>
  )
}
