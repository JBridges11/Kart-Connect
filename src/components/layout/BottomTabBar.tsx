import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, MapPin, Wrench, BarChart2, Settings, Radio } from 'lucide-react'
import { useSubscription } from '@/hooks/useSubscription'
import { useTeamBranding } from '@/hooks/useTeamBranding'
import { useLanguage } from '@/contexts/LanguageContext'
import { useSessions } from '@/hooks/useSessions'

const LIVE_DAYS = 4

export function BottomTabBar() {
  const { tier } = useSubscription()
  const { branding } = useTeamBranding()
  const { t } = useLanguage()
  const navigate = useNavigate()
  const { data: sessions } = useSessions()
  const accent = branding.primary_color ?? '#E8FF00'
  const garageLabel    = tier === 'privateer' ? t('nav.my_kart') : tier === 'team' || tier === 'pro_team' ? t('nav.my_team') : t('nav.garage')
  const analyticsLabel = tier === 'team' || tier === 'pro_team' ? t('nav.leaderboard') : t('nav.stats')

  const [endedSessions] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('kc_ended_sessions') ?? '[]') } catch { return [] }
  })

  const liveSession = (() => {
    if (!sessions.length) return null
    const latest = [...sessions].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )[0]
    if (endedSessions.includes(latest.id)) return null
    const diffDays = (Date.now() - new Date(latest.created_at).getTime()) / (1000 * 60 * 60 * 24)
    return diffDays <= LIVE_DAYS ? latest : null
  })()

  const navItems = [
    { to: '/',             icon: LayoutDashboard, label: t('nav.home'),        exact: true },
    { to: '/tracks',       icon: MapPin,          label: t('nav.tracks'),      exact: false },
    { to: '/garage',       icon: Wrench,          label: garageLabel,          exact: false },
    { to: '/analytics',    icon: BarChart2,       label: analyticsLabel,       exact: false },
    { to: '/settings',     icon: Settings,        label: t('nav.settings'),    exact: false },
  ]

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40">
      {/* Live session pill — sits above the tab bar */}
      {liveSession && (
        <button
          type="button"
          onClick={() => navigate(`/sessions/${liveSession.id}`)}
          className="w-full flex items-center gap-2 px-4 py-2 bg-green-500/15 border-t border-green-500/30 text-left"
        >
          <span className="relative flex h-2 w-2 flex-shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
          </span>
          <Radio size={11} className="text-green-400 flex-shrink-0" />
          <span className="text-green-400 text-xs font-bold uppercase tracking-widest font-heading">Live Session</span>
          <span className="text-[#F0F0F0] text-xs truncate ml-1">— {liveSession.track?.name ?? ''}</span>
        </button>
      )}
      <nav className="bg-[#1C1C28] border-t border-[#2A2A3A] flex">
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
    </div>
  )
}
