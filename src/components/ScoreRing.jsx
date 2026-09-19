import { useEffect, useState } from 'react'

const SIZE = 120
const STROKE = 8
const R = (SIZE - STROKE) / 2
const CIRC = 2 * Math.PI * R

function scoreColor(score) {
  if (score >= 80) return '#10b981'
  if (score >= 60) return '#f59e0b'
  if (score >= 40) return '#7c3aed'
  return '#64748b'
}

export default function ScoreRing({ score = 0, label = 'Viral Score', size = 120 }) {
  const [displayed, setDisplayed] = useState(0)
  const scale = size / SIZE

  useEffect(() => {
    const timer = setTimeout(() => setDisplayed(score), 100)
    return () => clearTimeout(timer)
  }, [score])

  const offset = CIRC - (displayed / 100) * CIRC
  const color  = scoreColor(displayed)

  return (
    <div className="flex flex-col items-center gap-2">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        style={{ transform: 'rotate(-90deg)' }}
      >
        {/* Track */}
        <circle
          cx={SIZE / 2} cy={SIZE / 2} r={R}
          fill="none" stroke="#2a2a3d" strokeWidth={STROKE}
        />
        {/* Fill */}
        <circle
          cx={SIZE / 2} cy={SIZE / 2} r={R}
          fill="none"
          stroke={color}
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={CIRC}
          strokeDashoffset={offset}
          className="score-ring"
          style={{ filter: `drop-shadow(0 0 6px ${color}88)` }}
        />
        {/* Center text — counter-rotate */}
        <text
          x={SIZE / 2} y={SIZE / 2}
          textAnchor="middle"
          dominantBaseline="central"
          fill={color}
          fontSize="22"
          fontWeight="600"
          fontFamily="Inter, sans-serif"
          style={{ transform: 'rotate(90deg)', transformOrigin: '50% 50%' }}
        >
          {displayed}
        </text>
      </svg>
      <span className="text-xs text-radar-muted">{label}</span>
    </div>
  )
}
