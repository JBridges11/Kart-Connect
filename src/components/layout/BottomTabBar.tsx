import { NavLink } from 'react-router-dom'
import { LayoutDashboard, MapPin, Wrench, BarChart2, Settings } from 'lucide-react'
import { useSubscription } from '@/hooks/useSubscription'
import { useTeamBranding } from '@/hooks/useTeamBranding'
import { useLanguage } from '@/contexts/LanguageContext'

export function BottomTabBar() {
  const { tier } = useSubscription()
  const { branding } = useTeamBranding()
  const { t } = useLanguage()
  const accent = branding.primary_color ?? '#E8FF00'
  const garageLabel    = tier === 'privateer' ? t('nav.my_kart') : tier === 'team' || tier === 'pro_team' ? t('nav.my_team') : t('nav.garage')
  const analyticsLabel = tier === 'team' || tier === 'pro_team' ? t('nav.leaderboard') : t('nav.stats')

  const navItems = [
    { to: '/',             icon: LayoutDashboard, label: t('nav.home'),        exact: true },
    { to: '/tracks',       icon: MapPin,          label: t('nav.tracks'),      exact: false },
    { to: '/garage',       icon: Wrench,          label: garageLabel,          exact: false },
    { to: '/analytics',    icon: BarChart2,       label: analyticsLabel,       exact: false },
    { to: '/settings',     icon: Settings,        label: t('nav.settings'),    exact: false },
  ]

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
              isActive ? '' : 'text-[#6B7A99]',
            ].join(' ')
          }
          style={({ isActive }) => isActive ? { color: accent } : {}}
        >
          <Icon size={20} />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
