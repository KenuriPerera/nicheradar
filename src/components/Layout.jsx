import { useState, useEffect } from 'react'
import { Outlet, NavLink } from 'react-router-dom'
import { LayoutDashboard, Search, BarChart2, Hash, Clock, DollarSign, Calendar, ArrowRightLeft, Radio, Sparkles, Brain, Video, Flame } from 'lucide-react'
import clsx from 'clsx'
import QuotaPanel from './QuotaPanel'

const nav = [
  { to: '/home',             icon: Radio,            label: 'Home'             },
  { to: '/',                 icon: LayoutDashboard, label: 'Dashboard'        },
  { to: '/analyze',          icon: Search,          label: 'Analyze'          },
  { to: '/compare',          icon: BarChart2,        label: 'Compare'          },
  { to: '/hashtags',         icon: Hash,             label: 'Hashtags'         },
  { to: '/history',          icon: Clock,            label: 'History'          },
  { to: '/intelligence',     icon: Brain,            label: 'Intelligence'     },
  { to: '/content-analyzer', icon: Video,            label: 'Content Analyzer' },
  { to: '/trending-posts',   icon: Flame,            label: 'Trending Posts'   },
  { to: '/monetize',         icon: DollarSign,       label: 'Monetize'         },
  { to: '/posting-times',    icon: Calendar,         label: 'Posting Times'    },
  { to: '/currency',         icon: ArrowRightLeft,   label: 'Currency'         },
]

function QuotaTracker() {
  const quotas = [
    { name: 'YouTube',    used: '?', total: '10,000', unit: 'units/day',  color: 'text-red-400'        },
    { name: 'NewsAPI',    used: '?', total: '100',     unit: 'req/day',    color: 'text-radar-amber'    },
    { name: 'Gemini',     used: '?', total: '15',      unit: 'req/day',    color: 'text-radar-accent2'  },
    { name: 'Supabase',   used: '?', total: '500MB',   unit: 'storage',    color: 'text-radar-green'    },
  ]

  return (
    <div className="px-4 pb-2 space-y-2">
      <p className="text-xs text-radar-muted uppercase tracking-wider">API Quotas</p>
      {quotas.map(q => (
        <div key={q.name} className="flex items-center justify-between">
          <span className={`text-xs ${q.color}`}>{q.name}</span>
          <span className="text-xs text-radar-muted font-mono">{q.total} {q.unit}</span>
        </div>
      ))}
      <p className="text-xs text-radar-muted opacity-50">Resets daily at midnight PT</p>
    </div>
  )
}

export default function Layout() {
  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="w-64 flex-shrink-0 bg-radar-surface border-r border-radar-border flex flex-col">
        <div className="p-6 border-b border-radar-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-radar-accent flex items-center justify-center glow-accent">
              <Radio className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="font-semibold text-white text-sm tracking-wide">NicheRadar</div>
              <div className="text-radar-muted text-xs">Trend Intelligence</div>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {nav.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200',
                  isActive
                    ? 'bg-radar-accent text-white font-medium'
                    : 'text-radar-muted hover:text-white hover:bg-radar-card'
                )
              }
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>
        <QuotaTracker />
        <div className="p-4 border-t border-radar-border">
          <div className="flex items-center gap-2 text-xs text-radar-muted">
            <Sparkles className="w-3 h-3 text-radar-accent" />
            100% free · no AI cost
          </div>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto bg-radar-bg">
        <Outlet />
      </main>
    </div>
  )
}
