import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, ArrowRight, Clock, Activity, Layers, CalendarDays, MapPin, Search, X } from 'lucide-react'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { Card, Button, Badge } from '@/components/ui'
import { useSessions } from '@/hooks/useSessions'
import { lapMsToString, formatDate } from '@/lib/formatters'

function StatCard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <Card>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-text-muted text-xs font-heading uppercase tracking-wider">{label}</p>
          <p className="font-mono text-2xl text-accent-primary mt-1">{value}</p>
        </div>
        <Icon size={20} className="text-text-muted" />
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
  const { data: sessions, loading } = useSessions()
  const [query, setQuery] = useState('')

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

  const allBestLaps = sessions.filter(s => s.best_lap_time_ms !== null)
  const overallBest = allBestLaps.length > 0
    ? allBestLaps.reduce((b, s) => (s.best_lap_time_ms! < b.best_lap_time_ms! ? s : b), allBestLaps[0])
    : null

  // Group filtered sessions by track + date (each unique combination = one event day)
  const eventGroups = (() => {
    const map = new Map<string, { date: string; trackId: string; trackName: string; sessions: typeof sessions }>()
    for (const s of filtered) {
      const key = `${s.session_date}_${s.track_id}`
      if (!map.has(key)) {
        map.set(key, { date: s.session_date, trackId: s.track_id, trackName: s.track?.name ?? 'Unknown Track', sessions: [] })
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
    <PageWrapper
      title="Dashboard"
      action={
        <Button onClick={() => navigate('/sessions/new')} size="sm">
          <Plus size={14} />
          New Session
        </Button>
      }
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard
          icon={Layers}
          label="Total Sessions"
          value={loading ? '—' : String(sessions.length)}
        />
        <StatCard
          icon={Clock}
          label="Best Lap Ever"
          value={overallBest?.best_lap_time_ms ? lapMsToString(overallBest.best_lap_time_ms) : '—'}
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
              <div key={group.date + group.trackName} className={gi > 0 ? 'pt-4' : ''}>
                {/* Event sub-header — clickable → Event Detail */}
                <button
                  type="button"
                  onClick={() => navigate(`/events/${group.trackId}/${group.date}`)}
                  className="w-full flex items-center gap-2 mb-1 group cursor-pointer text-left"
                >
                  <MapPin size={12} className="text-accent-primary flex-shrink-0" />
                  <span className="font-heading font-bold text-xs uppercase tracking-wider text-text-primary group-hover:text-accent-primary transition-colors">
                    {group.trackName}
                  </span>
                  <span className="text-text-muted font-mono text-xs">{formatDate(group.date)}</span>
                  <div className="flex-1 h-px bg-border-color ml-1" />
                  <ArrowRight size={11} className="text-text-muted opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                </button>

                {/* Sessions in this event */}
                {group.sessions.map(s => (
                  <div
                    key={s.id}
                    onClick={() => navigate(`/sessions/${s.id}`)}
                    className="flex items-center gap-3 px-2 py-2 rounded cursor-pointer hover:bg-bg-elevated transition-colors group"
                  >
                    <span className="font-heading font-semibold text-xs text-text-primary w-20 flex-shrink-0">
                      {s.session_name ?? s.session_type}
                    </span>
                    <Badge label={s.session_type} variant="neutral" />
                    <span className="text-text-muted text-xs truncate">{s.kart?.nickname ?? '—'}</span>
                    <span className="font-mono text-sm text-accent-primary ml-auto">
                      {s.best_lap_time_ms ? lapMsToString(s.best_lap_time_ms) : '—'}
                    </span>
                    {s.conditions && (
                      <Badge label={s.conditions} variant={conditionVariant[s.conditions] ?? 'neutral'} />
                    )}
                    {s.weather_description && (
                      <span className="text-xs text-text-muted hidden sm:inline">{s.weather_description}</span>
                    )}
                    <ArrowRight size={12} className="text-text-muted opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                  </div>
                ))}
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
