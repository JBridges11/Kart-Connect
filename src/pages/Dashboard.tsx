import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, ArrowRight, Activity, Layers, CalendarDays, MapPin, Search, X, Check, Trash2, Flag, Radio } from 'lucide-react'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { Card, Button, Badge } from '@/components/ui'
import { useSessions } from '@/hooks/useSessions'
import { useRaceWeekends } from '@/hooks/useRaceWeekends'
import { useAuth } from '@/contexts/AuthContext'
import { useTeamBranding } from '@/hooks/useTeamBranding'
import { supabase } from '@/lib/supabase'
import { lapMsToString, formatDate } from '@/lib/formatters'

function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

function StatCard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-text-muted text-xs font-heading">{label}</p>
          <p className="font-mono text-2xl text-accent-primary mt-1">{value}</p>
        </div>
        <Icon size={20} className="text-text-muted flex-shrink-0" />
      </div>
    </Card>
  )
}

const conditionVariant: Record<string, 'info' | 'positive' | 'neutral'> = {
  dry: 'positive',
  wet: 'info',
  damp: 'neutral',
}

export function DashboardPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { branding } = useTeamBranding()
  const { data: sessions, loading, refetch } = useSessions()
  const { data: raceWeekends, loading: rwLoading, refetch: refetchRW } = useRaceWeekends()

  const displayName = branding.team_name?.trim()
    || (user?.user_metadata?.full_name as string | undefined)?.trim()
    || user?.email?.split('@')[0]
    || 'there'
  const [query, setQuery] = useState('')
  const [selectedSessions, setSelectedSessions] = useState<string[]>([])
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [rwSelecting, setRwSelecting] = useState(false)
  const [selectedRW, setSelectedRW] = useState<string[]>([])
  const [confirmDeleteRW, setConfirmDeleteRW] = useState(false)
  const [deletingRW, setDeletingRW] = useState(false)

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

  const currentMonthSessions = sessions.filter(s => {
    const d = new Date(s.session_date)
    const now = new Date()
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  })

  return (
    <PageWrapper title="">
      {/* Greeting + actions */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <p className="font-heading text-sm uppercase tracking-wider text-text-muted mb-0.5">{getGreeting()}</p>
          <h1 className="font-heading text-2xl font-bold text-accent-primary leading-tight">{displayName}</h1>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 pt-1">
          <Button variant="secondary" size="sm" onClick={() => navigate('/race-weekend/new')}>
            <Flag size={14} className="inline mr-1" /> Race Weekend
          </Button>
          <Button onClick={() => navigate('/sessions/new')} size="sm">
            <Plus size={14} />
            New Session
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatCard
          icon={Layers}
          label="Total Sessions"
          value={loading ? '—' : String(sessions.length)}
        />
        <StatCard
          icon={Activity}
          label="Setups Logged"
          value={loading ? '—' : String(sessions.length)}
        />
        <StatCard
          icon={CalendarDays}
          label="This Month"
          value={loading ? '—' : String(currentMonthSessions.length)}
        />
      </div>

      {/* Race Weekends */}
      {(rwLoading || raceWeekends.length > 0) && (
        <Card className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading text-base font-semibold uppercase tracking-wider text-text-primary flex items-center gap-2">
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
                      'flex items-center gap-3 px-3 py-3 rounded-card border cursor-pointer transition-colors group',
                      isSelected ? 'border-accent-secondary/60 bg-accent-secondary/10' : 'border-border-color hover:border-accent-primary/40 hover:bg-bg-elevated',
                    ].join(' ')}
                  >
                    {rwSelecting ? (
                      <div className={[
                        'w-4 h-4 rounded border flex items-center justify-center flex-shrink-0',
                        isSelected ? 'bg-accent-secondary border-accent-secondary' : 'border-border-color',
                      ].join(' ')}>
                        {isSelected && <Check size={10} className="text-white" />}
                      </div>
                    ) : (
                      <div className={[
                        'w-2 h-2 rounded-full flex-shrink-0',
                        isLive ? 'bg-green-400 animate-pulse' : isEnded ? 'bg-text-muted' : 'bg-accent-primary',
                      ].join(' ')} />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-heading font-semibold text-sm text-text-primary leading-snug truncate">
                        {rw.session_name}
                      </p>
                      <p className="text-xs text-text-muted mt-0.5">
                        {rw.track?.name ?? '—'} · {formatDate(rw.session_date)}
                      </p>
                    </div>
                    {isLive ? (
                      <span className="flex items-center gap-1 text-xs font-semibold text-green-400 bg-green-400/10 border border-green-400/20 rounded px-2 py-0.5 flex-shrink-0">
                        <Radio size={10} /> LIVE
                      </span>
                    ) : isEnded ? (
                      <span className="text-xs text-text-muted bg-bg-elevated border border-border-color rounded px-2 py-0.5 flex-shrink-0">Ended</span>
                    ) : (
                      <span className="text-xs font-semibold text-accent-primary bg-accent-primary/10 border border-accent-primary/20 rounded px-2 py-0.5 flex-shrink-0">Ready</span>
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
          <h2 className="font-heading text-base font-semibold uppercase tracking-wider text-text-primary">
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

        {/* Delete action bar */}
        {selectedSessions.length > 0 && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-card flex items-center gap-3">
            <span className="text-sm text-text-primary flex-1">
              <span className="font-semibold">{selectedSessions.length} selected</span>
            </span>
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
        )}

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
                {group.sessions.map(s => {
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
                        <span className="font-heading font-semibold text-xs text-text-primary leading-snug">
                          {s.session_name ?? s.session_type}
                        </span>
                        <div className="flex items-center gap-2 flex-wrap mt-1">
                          <Badge label={s.session_type} variant="neutral" />
                          <span className="text-text-muted text-xs">{s.kart?.nickname ?? '—'}</span>
                          <span className="font-mono text-xs text-accent-primary">
                            {s.best_lap_time_ms ? lapMsToString(s.best_lap_time_ms) : '—'}
                          </span>
                          {s.conditions && (
                            <Badge label={s.conditions} variant={conditionVariant[s.conditions] ?? 'neutral'} />
                          )}
                          {s.weather_description && (
                            <span className="text-xs text-text-muted hidden sm:inline">{s.weather_description}</span>
                          )}
                        </div>
                      </div>
                      <ArrowRight size={12} className="text-text-muted opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-1" />
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'New Session',     to: '/sessions/new', icon: Plus },
          { label: 'Compare Setups',  to: '/compare',      icon: Activity },
          { label: 'View Tracks',     to: '/tracks',       icon: ArrowRight },
        ].map(({ label, to, icon: Icon }) => (
          <Card key={to} onClick={() => navigate(to)} className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-accent-primary/10 flex items-center justify-center flex-shrink-0">
              <Icon size={16} className="text-accent-primary" />
            </div>
            <span className="font-heading font-semibold text-text-primary">{label}</span>
            <ArrowRight size={14} className="ml-auto text-text-muted" />
          </Card>
        ))}
      </div>
    </PageWrapper>
  )
}
