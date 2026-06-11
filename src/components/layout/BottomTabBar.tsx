import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Plus, MapPin, Wrench, BarChart2, Settings } from 'lucide-react'

const navItems = [
  { to: '/',             icon: LayoutDashboard, label: 'Home',     exact: true },
  { to: '/sessions/new', icon: Plus,            label: 'New',      exact: false },
  { to: '/tracks',       icon: MapPin,          label: 'Tracks',   exact: false },
  { to: '/garage',       icon: Wrench,          label: 'Garage',   exact: false },
  { to: '/analytics',    icon: BarChart2,        label: 'Stats',    exact: false },
  { to: '/settings',     icon: Settings,        label: 'Settings', exact: false },
]

export function BottomTabBar() {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#1C1C28] border-t border-[#2A2A3A] flex">
      {navItems.map(({ to, icon: Icon, label, exact }) => (
        <NavLink
          key={to}
          to={to}
          end={exact}
          className={({ isActive }) =>
            [
              'flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-[10px] transition-colors',
              isActive ? 'text-[#E8FF00]' : 'text-[#6B7A99]',
            ].join(' ')
          }
        >
          <Icon size={20} />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
