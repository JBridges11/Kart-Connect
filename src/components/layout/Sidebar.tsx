import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Plus,
  MapPin,
  Wrench,
  BarChart2,
  Settings,
  Zap,
} from 'lucide-react'

const navItems = [
  { to: '/',             icon: LayoutDashboard, label: 'Dashboard',   exact: true },
  { to: '/sessions/new', icon: Plus,            label: 'New Session', exact: false },
  { to: '/tracks',       icon: MapPin,          label: 'Tracks',      exact: false },
  { to: '/garage',       icon: Wrench,          label: 'Garage',      exact: false },
  { to: '/analytics',    icon: BarChart2,        label: 'Analytics',   exact: false },
  { to: '/settings',     icon: Settings,        label: 'Settings',    exact: false },
]

export function Sidebar() {
  return (
    <aside className="hidden md:flex flex-col w-60 bg-[#12121A] border-r border-[#2A2A3A] flex-shrink-0">
      <div className="flex items-center gap-2 px-5 py-5 border-b border-[#2A2A3A]">
        <Zap size={20} className="text-[#E8FF00] fill-[#E8FF00]" />
        <span className="font-heading text-xl font-bold tracking-widest text-[#F0F0F0] uppercase">
          Kart Connect
        </span>
      </div>
      <nav className="flex-1 py-4">
        {navItems.map(({ to, icon: Icon, label, exact }) => (
          <NavLink
            key={to}
            to={to}
            end={exact}
            className={({ isActive }) =>
              [
                'flex items-center gap-3 px-5 py-3 text-sm transition-colors duration-150',
                isActive
                  ? 'border-l-[3px] border-[#E8FF00] text-[#E8FF00] bg-[#E8FF00]/5 font-semibold'
                  : 'border-l-[3px] border-transparent text-[#6B7A99] hover:text-[#F0F0F0] hover:bg-[#1C1C28]',
              ].join(' ')
            }
          >
            <Icon size={16} />
            <span className="font-body">{label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
