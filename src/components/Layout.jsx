import { Outlet, NavLink } from 'react-router-dom'
import { LayoutDashboard, Search, BarChart2, Hash, Clock, Radio, Sparkles } from 'lucide-react'
import clsx from 'clsx'

const nav = [
  { to: '/',         icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/analyze',  icon: Search,          label: 'Analyze'   },
  { to: '/compare',  icon: BarChart2,        label: 'Compare'   },
  { to: '/hashtags', icon: Hash,             label: 'Hashtags'  },
  { to: '/history',  icon: Clock,            label: 'History'   },
]

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
        <nav className="flex-1 p-4 space-y-1">
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
