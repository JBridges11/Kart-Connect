import { useState, useEffect } from 'react'
import { useNavigate, NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  MapPin,
  Wrench,
  BarChart2,
  Settings,
  Radio,
  XCircle,
  WifiOff,
  Wifi,
  Activity,
} from 'lucide-react'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { useSessions } from '@/hooks/useSessions'
import { useSubscription } from '@/hooks/useSubscription'
import { useTeamBranding } from '@/hooks/useTeamBranding'
import { useLanguage } from '@/contexts/LanguageContext'
import { formatDate } from '@/lib/formatters'

const LIVE_DAYS = 4

export function Sidebar() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const { data: sessions, refetch } = useSessions()
  const { tier } = useSubscription()

  const { t } = useLanguage()
  const { branding } = useTeamBranding()
  const isOnline = useOnlineStatus()

  // Dark-background logo for the sidebar; fall back to light logo if dark not uploaded
  const teamLogoUrl = (() => {
    const dark  = branding.logo_url_dark
    const light = branding.logo_url
    const url   = (dark && !dark.startsWith('data:')) ? dark
                : (light && !light.startsWith('data:')) ? light
                : null
    return url
  })()
  const accent = branding.primary_color ?? '#E8FF00'

  const garageLabel    = tier === 'privateer' ? t('nav.my_kart') : tier === 'team' || tier === 'pro_team' ? t('nav.my_team') : t('nav.garage')
  const analyticsLabel = tier === 'team' || tier === 'pro_team' ? t('nav.leaderboard') : t('nav.analytics')

  const navItems = [
    { to: '/',                  icon: LayoutDashboard, label: t('nav.home'),        exact: true },
    { to: '/tracks',            icon: MapPin,          label: t('nav.tracks'),      exact: false },
    { to: '/garage',            icon: Wrench,          label: garageLabel,          exact: false },
    { to: '/analytics',         icon: BarChart2,       label: analyticsLabel,       exact: false },
    { to: '/data-comparison',   icon: Activity,        label: 'Data Logger',        exact: false },
    { to: '/settings',          icon: Settings,        label: t('nav.settings'),    exact: false },
  ]

  useEffect(() => { void refetch() }, [location.pathname]) // eslint-disable-line react-hooks/exhaustive-deps
  const [endedSessions, setEndedSessions] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('kc_ended_sessions') ?? '[]') } catch { return [] }
  })
  const [confirmingEnd, setConfirmingEnd] = useState(false)

  function endLiveSession(id: string) {
    const updated = [...endedSessions, id]
    setEndedSessions(updated)
    setConfirmingEnd(false)
    localStorage.setItem('kc_ended_sessions', JSON.stringify(updated))
  }

  const liveSession = (() => {
    if (!sessions.length) return null
    const latest = [...sessions].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )[0]
    if (endedSessions.includes(latest.id)) return null
    const diffDays = (Date.now() - new Date(latest.created_at).getTime()) / (1000 * 60 * 60 * 24)
    return diffDays <= LIVE_DAYS ? latest : null
  })()

  return (
    <aside className="hidden md:flex flex-col w-60 bg-[#12121A] border-r border-[#2A2A3A] flex-shrink-0">
      {/* Logo */}
      <div className="border-b border-[#2A2A3A] px-4 py-3 flex items-center justify-center min-h-[60px]">
        {teamLogoUrl ? (
          <img src={teamLogoUrl} alt="Team logo" className="max-h-14 max-w-full object-contain" />
        ) : (
          <img src="/logo.png" alt="Kart Connect" className="w-full object-contain" />
        )}
      </div>

      {/* Live Session banner */}
      {liveSession && (
        <div className="mx-3 mt-3 rounded-lg border border-green-500/30 bg-green-500/10">
          <button
            type="button"
            onClick={() => liveSession.event_id && navigate(`/events/${liveSession.event_id}`)}
            className="w-full px-3 pt-2.5 pb-2 text-left cursor-pointer hover:bg-green-500/10 transition-colors rounded-t-lg"
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
              </span>
              <Radio size={11} className="text-green-400" />
              <span className="font-heading text-xs font-bold uppercase tracking-widest text-green-400">
                {t('sidebar.live_session')}
              </span>
            </div>
            <p className="text-[#F0F0F0] text-xs font-semibold truncate">
              {liveSession.track?.name ?? 'Unknown Track'}
            </p>
            <p className="text-[#6B7A99] text-xs font-mono mt-0.5">
              {formatDate(liveSession.session_date)}
            </p>
          </button>
          <div className="border-t border-green-500/20 px-3 py-2">
            {confirmingEnd ? (
              <div>
                <p className="text-xs text-[#F0F0F0] mb-2">{t('sidebar.are_you_sure')}</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); endLiveSession(liveSession.id) }}
                    className="flex-1 text-xs bg-red-500 hover:bg-red-600 text-white rounded px-2 py-1 cursor-pointer transition-colors"
                  >
                    {t('sidebar.yes_end_it')}
                  </button>
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); setConfirmingEnd(false) }}
                    className="flex-1 text-xs bg-[#2A2A3A] hover:bg-[#3A3A4A] text-[#F0F0F0] rounded px-2 py-1 cursor-pointer transition-colors"
                  >
                    {t('sidebar.cancel')}
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={e => { e.stopPropagation(); setConfirmingEnd(true) }}
                className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 cursor-pointer transition-colors w-full"
              >
                <XCircle size={11} />
                {t('sidebar.end_live_session')}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Connection status */}
      <div className={[
        'mx-3 mt-3 rounded-card px-3 py-2 flex items-center gap-2 text-xs font-semibold',
        isOnline
          ? 'bg-green-500/10 border border-green-500/20 text-green-400'
          : 'bg-red-500/10 border border-red-500/20 text-red-400',
      ].join(' ')}>
        {isOnline
          ? <><Wifi size={11} /> Online</>
          : <><WifiOff size={11} /> Offline — showing cached data</>
        }
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4">
        {navItems.map(({ to, icon: Icon, label, exact }) => (
          <NavLink
            key={to}
            to={to}
            end={exact}
            className={({ isActive }) =>
              [
                'flex items-center gap-3 px-5 py-3 text-sm transition-colors duration-150 border-l-[3px]',
                isActive
                  ? 'font-semibold'
                  : 'border-transparent text-[#6B7A99] hover:text-[#F0F0F0] hover:bg-[#1C1C28]',
              ].join(' ')
            }
            style={({ isActive }) => isActive ? {
              borderLeftColor: accent,
              color: accent,
              backgroundColor: accent + '1A',
            } : {}}
          >
            <Icon size={16} />
            <span className="font-body">{label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
