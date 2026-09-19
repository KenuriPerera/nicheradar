import clsx from 'clsx'

export default function Skeleton({ className }) {
  return (
    <div
      className={clsx(
        'rounded-lg bg-radar-border animate-pulse',
        className
      )}
    />
  )
}

export function SkeletonCard() {
  return (
    <div className="card space-y-4 animate-fade-in">
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-8 w-1/2" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-4/5" />
    </div>
  )
}
