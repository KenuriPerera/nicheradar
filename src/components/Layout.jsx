import { useState } from 'react'
import { NavLink, useLocation, Outlet } from 'react-router-dom'
import {
  Radio, LayoutDashboard, Compass, Flame, Hash,
  Search, BarChart2, Brain, Sparkles, Clock, Palette,
  PenTool, DollarSign, RefreshCw, History,
  ChevronDown, ChevronRight,
} from 'lucide-react'
import clsx from 'clsx'


const NAV_GROUPS = [
  {
    label: 'Overview',
    items: [
      { to: '/home',      icon: Radio,           label: 'Home'       },
      { to: '/',          icon: LayoutDashboard, label: 'Dashboard'  },
    ],
  },
  {
    label: 'Discover',
    items: [
      { to: '/discover',       icon: Compass, label: 'Discover'       },
      { to: '/trending-posts', icon: Flame,   label: 'Trending Posts' },
      { to: '/hashtags',       icon: Hash,    label: 'Hashtags'       },
    ],
  },
  {
    label: 'Analytics',
    items: [
      { to: '/analyze',      icon: Search,    label: 'Analyze'      },
      { to: '/compare',      icon: BarChart2, label: 'Compare'      },
      { to: '/intelligence', icon: Brain,    label: 'Intelligence' },
    ],
  },
  {
    label: 'Optimize',
    items: [
      { to: '/improv',        icon: Sparkles, label: 'Improv'        },
      { to: '/posting-times', icon: Clock,    label: 'Posting Times' },
      { to: '/color-palette', icon: Palette,  label: 'Color Palette' },
    ],
  },
  {
    label: 'Growth & Revenue',
    items: [
      { to: '/stationery', icon: PenTool,    label: 'Stationery Market' },
      { to: '/monetize',   icon: DollarSign, label: 'Monetize'          },
      { to: '/currency',   icon: RefreshCw,  label: 'Currency'          },
    ],
  },
  {
    label: 'History',
    items: [
      { to: '/history', icon: History, label: 'History' },
    ],
  },
]

export default function Layout({ children }) {
  const location = useLocation()

  return (
    <div className="flex h-screen overflow-hidden bg-radar-bg">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 bg-radar-surface border-r border-radar-border flex flex-col">
        {/* Logo */}
        <div className="px-4 py-5 border-b border-radar-border">
          <NavLink to="/home" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-radar-accent flex items-center justify-center glow-accent">
              <Radio className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-white font-semibold text-sm leading-none">NicheRadar</p>
              <p className="text-radar-muted text-xs mt-0.5">Trend Intelligence</p>
            </div>
          </NavLink>
        </div>

        {/* Nav groups */}
        <nav className="flex-1 overflow-y-auto py-3 space-y-1">
          {NAV_GROUPS.map(group => (
            <div key={group.label} className="px-3">
              {/* Group label */}
              <p className="text-xs font-medium text-radar-muted uppercase tracking-wider px-3 py-2 mt-2">
                {group.label}
              </p>
              {/* Group items */}
              <div className="space-y-0.5">
                {group.items.map(({ to, icon: Icon, label }) => {
                  const isActive = to === '/'
                    ? location.pathname === '/'
                    : location.pathname.startsWith(to)
                  return (
                    <NavLink
                      key={to}
                      to={to}
                      className={clsx(
                        'flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all duration-200',
                        isActive
                          ? 'bg-radar-accent text-white font-medium'
                          : 'text-radar-muted hover:text-white hover:bg-radar-card'
                      )}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      {label}
                    </NavLink>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Bottom of sidebar */}
        <div className="border-t border-radar-border px-4 py-3">
          <p className="text-xs text-radar-muted">100% free · no AI cost</p>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto bg-radar-bg">
        {children ?? <Outlet />}
      </main>
    </div>
  )
}
