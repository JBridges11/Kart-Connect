import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, ArrowRight, MapPin, Search, X, Check, Trash2, Flag, Radio, ArrowLeftRight } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useTeamBranding } from '@/hooks/useTeamBranding'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { Card, Button } from '@/components/ui'
import { useSessions } from '@/hooks/useSessions'
import { useRaceWeekends } from '@/hooks/useRaceWeekends'
import { useSubscription } from '@/hooks/useSubscription'
import { supabase } from '@/lib/supabase'
import { lapMsToString, formatDate } from '@/lib/formatters'

function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

export function DashboardPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user } = useAuth()
  const { branding } = useTeamBranding()
  const { subscription } = useSubscription()
  const displayName = branding.team_name?.trim()
    || (user?.user_metadata?.full_name as string | undefined)?.trim()
    || user?.email?.split('@')[0]
    || 'there'
  const { data: sessions, loading, refetch } = useSessions()
  const { data: raceWeekends, loading: rwLoading, refetch: refetchRW } = useRaceWeekends()
  const [query, setQuery] = useState('')
  const [selectedSessions, setSelectedSessions] = useState<string[]>([])
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [rwSelecting, setRwSelecting] = useState(false)
  const [selectedRW, setSelectedRW] = useState<string[]>([])
  const [confirmDeleteRW, setConfirmDeleteRW] = useState(false)
  const [deletingRW, setDeletingRW] = useState(false)

  const trackCount = new Set(sessions.map(s => (s as typeof s & { track_id?: string }).track_id).filter(Boolean)).size

  // Rain forecast banner
  const [rainAlert, setRainAlert] = useState<string | null>(null)
  useEffect(() => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(async ({ coords }) => {
      try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.latitude}&longitude=${coords.longitude}&hourly=precipitation_probability&current=precipitation,weather_code&forecast_days=1&timezone=auto`
        const res = await fetch(url)
        const data = await res.json()
        // Check if it's currently raining using actual precipitation + weather code
        const currentPrecip: number = data.current?.precipitation ?? 0
        const currentCode: number = data.current?.weather_code ?? 0
        if (currentPrecip > 0.1 || currentCode >= 51) {
          setRainAlert('Raining now')
          return
        }
        const times: string[] = data.hourly?.time ?? []
        const probs: number[] = data.hourly?.precipitation_probability ?? []
        const now = new Date()
        // Include current hour (up to 60 min in the past) + next 6 hours
        let found = false
        for (let i = 0; i < times.length; i++) {
          const t = new Date(times[i])
          const diffMs = t.getTime() - now.getTime()
          if (diffMs < -60 * 60 * 1000 || diffMs > 6 * 60 * 60 * 1000) continue
          if (probs[i] >= 40) {
            const diffMins = Math.max(0, Math.round(diffMs / 60000))
            if (diffMins < 60) {
              setRainAlert(diffMins <= 5 ? 'Rain expected very soon' : `Rain expected in ${diffMins} minutes`)
            } else {
              const timeStr = t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              setRainAlert(`Rain expected at ${timeStr}`)
            }
            found = true
            break
          }
        }
        if (!found) setRainAlert('No rain expected in the next 6 hours')
      } catch {}
    }, () => {}, { timeout: 8000 })
  }, [])

  // Post-checkout welcome banner
  const [showBanner, setShowBanner] = useState(() => searchParams.get('subscription') === 'success')
  useEffect(() => {
    if (!showBanner) return
    navigate('/dashboard', { replace: true })
    const t = setTimeout(() => setShowBanner(false), 6000)
    return () => clearTimeout(t)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const bannerMessage = subscription?.status === 'trialing'
    ? 'Your 30-day free trial has started 🎉'
    : subscription?.status === 'active'
      ? 'Welcome! Your subscription is now active 🎉'
      : 'Welcome! You\'re all set 🎉'

  function toggleSession(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    setSelectedSessions(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
    setConfirmDelete(false)
  }

  async function deleteSelected() {
    setDeleting(true)
    await supabase.from('sessions').delete().in('id', selectedSessions)
    setSelectedSessions([])
    setConfirmDelete(false)
    setDeleting(false)
    void refetch()
  }

  async function deleteSelectedRW() {
    setDeletingRW(true)
    await supabase.from('race_weekends').delete().in('id', selectedRW)
    setSelectedRW([])
    setConfirmDeleteRW(false)
    setRwSelecting(false)
    setDeletingRW(false)
    void refetchRW()
  }

  const filtered = (() => {
    const q = query.toLowerCase().trim()
    if (!q) return sessions
    return sessions.filter(s =>
      (s.track?.name ?? '').toLowerCase().includes(q) ||
      s.session_type.toLowerCase().includes(q) ||
      formatDate(s.session_date).toLowerCase().includes(q) ||
      s.session_date.includes(q)
    )
  })()

  // Group filtered sessions by event_id (each wizard run = one event)
  const eventGroups = (() => {
    const map = new Map<string, { eventId: string; date: string; trackName: string; eventName: string | null; sessions: typeof sessions }>()
    for (const s of filtered) {
      const key = s.event_id ?? `${s.session_date}_${s.track_id}`
      if (!map.has(key)) {
        map.set(key, { eventId: key, date: s.session_date, trackName: s.track?.name ?? 'Unknown Track', eventName: (s as typeof s & { event_name?: string | null }).event_name ?? null, sessions: [] })
      }
      map.get(key)!.sessions.push(s)
    }
    return Array.from(map.values())
  })()


  const isRainingNow = rainAlert === 'Raining now'
  const isClear = rainAlert?.startsWith('No rain') ?? true
  const dotColour = isRainingNow ? 'bg-red-400' : isClear ? 'bg-green-400' : 'bg-blue-400'
  const textColour = isRainingNow ? 'text-red-400' : isClear ? 'text-green-400' : 'text-blue-400'
  const rainBadge = rainAlert ? (
    <div className="flex items-center gap-2">
      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dotColour}`} />
      <span className={`text-xs font-semibold ${textColour}`}>{rainAlert}</span>
    </div>
  ) : undefined

  return (
    <PageWrapper title="" leftContent={rainBadge}>

      {/* Post-checkout welcome banner */}
      {showBanner && (
        <div className="mb-6 flex items-center justify-between gap-4 rounded-xl border border-green-500/25 bg-green-500/10 px-5 py-4 animate-fade-in">
          <div className="flex items-center gap-3">
            <span className="text-2xl leading-none">🎉</span>
            <div>
              <p className="text-sm font-semibold text-green-700 dark:text-green-400">{bannerMessage}</p>
              <p className="mt-0.5 text-xs text-green-600/70 dark:text-green-500/70">Your dashboard is ready — log your first session below.</p>
            </div>
          </div>
          <button
            onClick={() => setShowBanner(false)}
            aria-label="Dismiss"
            className="flex-shrink-0 text-green-600/50 transition-colors hover:text-green-700 dark:text-green-500/50 dark:hover:text-green-400"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <p className="text-text-muted text-sm mb-0.5">{getGreeting()}</p>
          <h1 className="font-heading text-2xl font-bold text-text-primary leading-tight">{displayName}</h1>
          {!loading && (
            <p className="text-text-muted text-xs font-mono mt-1.5">
              {sessions.length} session{sessions.length !== 1 ? 's' : ''} · {trackCount} track{trackCount !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 pt-1">
          <Button variant="secondary" size="sm" onClick={() => navigate('/race-weekend/new')}>
            <Flag size={14} /> Race Weekend
          </Button>
          <Button onClick={() => navigate('/sessions/new')} size="sm">
            <Plus size={14} /> New Session
          </Button>
        </div>
      </div>

      {/* Race Weekends */}
      {(rwLoading || raceWeekends.length > 0) && (
        <Card className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading text-base font-semibold text-text-primary flex items-center gap-2">
              <Flag size={14} className="text-accent-primary" /> Race Weekends
            </h2>
            <div className="flex items-center gap-2">
              {rwSelecting ? (
                <>
                  {selectedRW.length > 0 && (
                    confirmDeleteRW ? (
                      <Button variant="danger" size="sm" onClick={deleteSelectedRW} disabled={deletingRW}>
                        <Trash2 size={14} /> {deletingRW ? 'Deleting…' : `Delete ${selectedRW.length}`}
                      </Button>
                    ) : (
                      <Button variant="danger" size="sm" onClick={() => setConfirmDeleteRW(true)}>
                        <Trash2 size={14} /> Delete {selectedRW.length}
                      </Button>
                    )
                  )}
                  <Button variant="secondary" size="sm" onClick={() => { setRwSelecting(false); setSelectedRW([]); setConfirmDeleteRW(false) }}>
                    <X size={14} /> Cancel
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="secondary" size="sm" onClick={() => setRwSelecting(true)}>
                    <Check size={14} /> Select
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => navigate('/race-weekend/new')}>
                    <Plus size={14} /> New
                  </Button>
                </>
              )}
            </div>
          </div>
          {rwLoading ? (
            <div className="text-text-muted text-sm">Loading…</div>
          ) : (
            <div className="space-y-2">
              {raceWeekends.map(rw => {
                const isLive = rw.is_live && !rw.ended_at
                const isEnded = !!rw.ended_at
                const isSelected = selectedRW.includes(rw.id)
                return (
                  <div
                    key={rw.id}
                    onClick={() => {
                      if (rwSelecting) {
                        setSelectedRW(prev => prev.includes(rw.id) ? prev.filter(x => x !== rw.id) : [...prev, rw.id])
                        setConfirmDeleteRW(false)
                      } else {
                        navigate(`/race-weekend/${rw.id}`)
                      }
                    }}
                    className={[
                      'flex items-center gap-3 pl-0 pr-3 py-2.5 rounded-card border cursor-pointer transition-colors group overflow-hidden',
                      isSelected ? 'border-accent-secondary/60 bg-accent-secondary/10' : 'border-border-color hover:border-accent-primary/30 hover:bg-bg-elevated',
                    ].join(' ')}
                  >
                    {/* Left accent bar */}
                    <div className={[
                      'w-1 self-stretch flex-shrink-0 rounded-l-card',
                      isLive ? 'bg-green-400' : isEnded ? 'bg-border-color' : 'bg-accent-primary',
                    ].join(' ')} />

                    {rwSelecting && (
                      <div className={[
                        'w-4 h-4 rounded border flex items-center justify-center flex-shrink-0',
                        isSelected ? 'bg-accent-secondary border-accent-secondary' : 'border-border-color',
                      ].join(' ')}>
                        {isSelected && <Check size={10} className="text-white" />}
                      </div>
                    )}

                    <div className="flex-1 min-w-0 pl-2">
                      <p className="font-heading font-semibold text-sm text-text-primary leading-snug truncate">
                        {rw.session_name}
                      </p>
                      <p className="text-xs text-text-muted mt-0.5">
                        {rw.track?.name ?? '—'} · {formatDate(rw.session_date)}
                      </p>
                    </div>

                    {isLive && (
                      <span className="flex items-center gap-1 text-xs font-semibold text-green-400 flex-shrink-0">
                        <Radio size={10} className="animate-pulse" /> Live
                      </span>
                    )}
                    {!rwSelecting && <ArrowRight size={12} className="text-text-muted opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />}
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      )}

      <Card className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading text-base font-semibold text-text-primary">
            Sessions
          </h2>
          <Button size="sm" onClick={() => navigate('/sessions/new')}>
            <Plus size={14} /> New Session
          </Button>
        </div>

        {/* Search bar */}
        {!loading && sessions.length > 0 && (
          <div className="relative mb-4">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search by track, event type or date…"
              className="w-full bg-bg-elevated border border-border-color rounded-card pl-9 pr-8 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-primary/50 transition-colors"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary cursor-pointer"
              >
                <X size={14} />
              </button>
            )}
          </div>
        )}

        {/* Selection action bar */}
        {selectedSessions.length > 0 && (() => {
          const selA = sessions.find(s => s.id === selectedSessions[0])
          const selB = sessions.find(s => s.id === selectedSessions[1])
          const canCompare = selectedSessions.length === 2 &&
            !!selA && !!selB &&
            selA.track_id === selB.track_id
          return (
            <div className={[
              'mb-4 p-3 rounded-card border flex items-center gap-3 flex-wrap',
              canCompare
                ? 'bg-accent-primary/10 border-accent-primary/30'
                : 'bg-red-500/10 border-red-500/20',
            ].join(' ')}>
              <span className="text-sm text-text-primary flex-1 min-w-0">
                <span className="font-semibold">{selectedSessions.length} selected</span>
                {canCompare && selA && (
                  <span className="text-xs text-text-muted ml-2">{selA.track?.name}</span>
                )}
              </span>
              {canCompare && (
                <button
                  type="button"
                  onClick={() => navigate(`/compare?a=${selectedSessions[0]}&b=${selectedSessions[1]}`)}
                  className="flex items-center gap-1.5 text-xs text-accent-primary hover:opacity-80 font-semibold cursor-pointer transition-opacity"
                >
                  <ArrowLeftRight size={12} /> Compare Setups
                </button>
              )}
              {!confirmDelete ? (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-400 cursor-pointer transition-colors"
                >
                  <Trash2 size={12} /> Delete
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-red-500 font-semibold">Are you sure?</span>
                  <button
                    type="button"
                    onClick={deleteSelected}
                    disabled={deleting}
                    className="text-xs bg-red-500 hover:bg-red-600 text-white rounded px-2 py-1 cursor-pointer transition-colors disabled:opacity-50"
                  >
                    {deleting ? 'Deleting…' : 'Yes, delete'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="text-xs text-text-muted hover:text-text-primary cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              )}
              <button
                type="button"
                onClick={() => { setSelectedSessions([]); setConfirmDelete(false) }}
                className="text-xs text-text-muted hover:text-text-primary cursor-pointer transition-colors"
              >
                Clear
              </button>
            </div>
          )
        })()}

        {loading ? (
          <div className="text-text-muted text-sm">Loading…</div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-text-muted text-sm mb-4">No sessions yet.</p>
            <Button onClick={() => navigate('/sessions/new')} size="sm">
              <Plus size={14} /> Log your first session
            </Button>
          </div>
        ) : eventGroups.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-text-muted text-sm">No sessions match <span className="text-text-primary">"{query}"</span></p>
          </div>
        ) : (
          <div className="space-y-1">
            {eventGroups.map((group, gi) => (
              <div key={group.eventId} className={gi > 0 ? 'pt-4' : ''}>
                {/* Event sub-header — clickable → Event Detail */}
                <button
                  type="button"
                  onClick={() => navigate(`/events/${group.eventId}`)}
                  className="w-full flex items-center gap-2 mb-1 group cursor-pointer text-left"
                >
                  <MapPin size={12} className="text-accent-primary flex-shrink-0" />
                  <span className="font-heading font-bold text-xs uppercase tracking-wider text-text-primary group-hover:text-accent-primary transition-colors">
                    {group.eventName ?? group.trackName}
                  </span>
                  <span className="text-text-muted font-mono text-xs">{formatDate(group.date)}</span>
                  <div className="flex-1 h-px bg-border-color ml-1" />
                  <ArrowRight size={11} className="text-text-muted opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                </button>

                {/* Sessions in this event */}
                {group.sessions.map((s, si) => {
                  const isSelected = selectedSessions.includes(s.id)
                  return (
                    <div
                      key={s.id}
                      onClick={() => navigate(`/sessions/${s.id}`)}
                      className={[
                        'flex items-start gap-3 px-2 py-2 rounded cursor-pointer transition-colors group',
                        isSelected ? 'bg-red-500/10 hover:bg-red-500/15' : 'hover:bg-bg-elevated',
                      ].join(' ')}
                    >
                      {/* Tick button */}
                      <button
                        type="button"
                        onClick={e => toggleSession(s.id, e)}
                        className={[
                          'w-4 h-4 mt-0.5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors',
                          isSelected
                            ? 'bg-red-500 border-red-500'
                            : 'border-border-color bg-bg-elevated hover:border-red-400',
                        ].join(' ')}
                      >
                        {isSelected && <Check size={9} className="text-white" strokeWidth={3} />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-heading font-semibold text-sm text-text-primary leading-snug flex-shrink-0">
                            {s.session_name ?? `Test ${si + 1}`}
                          </span>
                          {s.kart?.driver_name && (
                            <span className="text-sm text-text-muted truncate">— {s.kart.driver_name}</span>
                          )}
                        </div>
                        <p className="text-xs text-text-muted mt-0.5">
                          {[s.kart?.nickname, s.conditions ? s.conditions.charAt(0).toUpperCase() + s.conditions.slice(1) : null, s.weather_description].filter(Boolean).join(' · ')}
                          {s.created_at && (
                            <span className="ml-2 font-mono text-[10px] text-text-muted opacity-60">
                              {new Date(s.created_at).toISOString().slice(11, 16)} UTC
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="font-mono text-base font-bold text-accent-primary">
                          {s.best_lap_time_ms ? lapMsToString(s.best_lap_time_ms) : '—'}
                        </span>
                        <ArrowRight size={12} className="text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Data Logger promo */}
      <div
        onClick={() => navigate('/data-comparison')}
        className="cursor-pointer rounded-card border border-accent-primary/20 bg-gradient-to-br from-accent-primary/10 via-bg-card to-bg-elevated overflow-hidden mb-4 hover:border-accent-primary/50 transition-colors group"
      >
        <div className="px-5 py-4 flex flex-col md:flex-row md:items-center gap-4">
          {/* Text side */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-heading font-bold uppercase tracking-widest text-accent-primary">Data Logger</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-accent-primary/20 text-accent-primary uppercase tracking-wide">New</span>
            </div>
            <h3 className="font-heading font-bold text-text-primary text-base leading-snug mb-1">
              Video comparison with live telemetry overlay
            </h3>
            <p className="text-xs text-text-muted leading-relaxed max-w-md">
              Sync your GoPro or DJI footage to your logger data. Watch both drivers side-by-side with speed, RPM, and a live delta telling you exactly where the time's won and lost.
            </p>
            {/* Feature pills */}
            <div className="flex flex-wrap gap-1.5 mt-3">
              {['GPS UTC sync', 'Live Δ delta', 'Speed & RPM overlay', 'GoPro Hero 7+', 'DJI Osmo Action'].map(f => (
                <span key={f} className="text-[10px] font-heading font-semibold px-2 py-0.5 rounded-full border border-border-color text-text-muted bg-bg-elevated">
                  {f}
                </span>
              ))}
            </div>
          </div>
          {/* CTA side */}
          <div className="flex-shrink-0 flex items-center gap-2 md:flex-col md:items-end">
            <div className="flex items-center gap-1.5 px-4 py-2 rounded-card bg-accent-primary text-bg-base text-xs font-bold font-heading group-hover:opacity-90 transition-opacity">
              Open Data Logger
              <ArrowRight size={12} />
            </div>
          </div>
        </div>
        {/* Visual strip */}
        <div className="h-1 w-full" style={{ background: 'linear-gradient(to right, #E8FF00, #22C55E, #A855F7)' }} />
      </div>


    </PageWrapper>
  )
}
