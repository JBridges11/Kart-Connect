import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, ArrowLeftRight, Clock, Check, Trash2 } from 'lucide-react'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { Badge, Button } from '@/components/ui'
import { supabase } from '@/lib/supabase'
import { lapMsToString, formatDate } from '@/lib/formatters'
import type { Session } from '@/types'

const TOTAL_SLOTS = 8

const conditionVariant: Record<string, 'info' | 'positive' | 'neutral'> = {
  dry: 'positive', wet: 'info', damp: 'neutral',
}

export function EventDetailPage() {
  const { eventId } = useParams<{ eventId: string }>()
  const navigate = useNavigate()

  const [sessions, setSessions]     = useState<Session[]>([])
  const [loading, setLoading]       = useState(true)
  const [selected, setSelected]     = useState<string[]>([])
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting]     = useState(false)

  async function deleteSelected() {
    setDeleting(true)
    await supabase.from('sessions').delete().in('id', selected)
    setSessions(prev => prev.filter(s => !selected.includes(s.id)))
    setSelected([])
    setConfirmDelete(false)
    setDeleting(false)
  }

  useEffect(() => {
    if (!eventId) return
    supabase
      .from('sessions')
      .select('*, track:tracks(name, country), kart:karts(nickname, chassis_type)')
      .eq('event_id', eventId)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        setSessions((data ?? []) as Session[])
        setLoading(false)
      })
  }, [eventId])


  function toggleSelect(id: string) {
    setSelected(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id)
      if (prev.length < 2)   return [...prev, id]
      return [prev[1], id]   // replace oldest selection
    })
  }

  const trackName  = sessions[0]?.track?.name ?? 'Event'
  const eventDate  = sessions[0]?.session_date ?? null
  const emptyCount = Math.max(0, TOTAL_SLOTS - sessions.length)
  const selA       = sessions.find(s => s.id === selected[0])
  const selB       = sessions.find(s => s.id === selected[1])

  return (
    <PageWrapper
      title="Event"
      action={
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft size={14} /> Back
        </Button>
      }
    >
      {/* Event header */}
      <div className="mb-5">
        <h2 className="font-heading text-2xl font-bold text-text-primary">{trackName}</h2>
        <p className="text-text-muted text-sm font-mono mt-0.5">{eventDate ? formatDate(eventDate) : ''}</p>
      </div>

      {/* Action bar — appears when sessions are selected */}
      {selected.length > 0 && (
        <div className="mb-5 p-3 bg-accent-primary/10 border border-accent-primary/20 rounded-card space-y-2">
          <div className="flex items-center gap-3">
            {selected.length === 2 ? (
              <>
                <ArrowLeftRight size={14} className="text-accent-primary flex-shrink-0" />
                <span className="text-sm text-text-primary flex-1">
                  <span className="font-semibold">{selA?.session_name ?? selA?.session_type}</span>
                  {' vs '}
                  <span className="font-semibold">{selB?.session_name ?? selB?.session_type}</span>
                </span>
                <Button size="sm" onClick={() => navigate(`/compare?a=${selected[0]}&b=${selected[1]}`)}>
                  <ArrowLeftRight size={12} /> Compare
                </Button>
              </>
            ) : (
              <>
                <span className="text-sm text-text-primary flex-1">
                  <span className="font-semibold">{selected.length} selected</span>
                  {selected.length === 1 && ' — select one more to compare'}
                </span>
              </>
            )}

            {/* Delete */}
            {!confirmDelete ? (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-400 cursor-pointer transition-colors flex-shrink-0"
              >
                <Trash2 size={12} /> Delete
              </button>
            ) : (
              <div className="flex items-center gap-2 flex-shrink-0">
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

            <Button size="sm" variant="ghost" onClick={() => { setSelected([]); setConfirmDelete(false) }}>
              Clear
            </Button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-2 border-accent-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Filled session slots */}
          {sessions.map((s, i) => {
            const isSelected = selected.includes(s.id)
            return (
              <div
                key={s.id}
                onClick={() => toggleSelect(s.id)}
                className={[
                  'relative flex flex-col gap-3 p-4 rounded-card border cursor-pointer transition-all',
                  'bg-bg-card hover:bg-bg-elevated',
                  isSelected
                    ? 'border-accent-primary ring-1 ring-accent-primary'
                    : 'border-border-color',
                ].join(' ')}
              >
                {/* Select indicator */}
                <div className={[
                  'absolute top-3 right-3 w-5 h-5 rounded-full border-2 flex items-center justify-center',
                  isSelected
                    ? 'bg-accent-primary border-accent-primary'
                    : 'border-border-color bg-bg-elevated',
                ].join(' ')}>
                  {isSelected && <Check size={10} className="text-bg-primary" strokeWidth={3} />}
                </div>

                {/* Session number + name */}
                <div className="pr-6">
                  <p className="font-heading font-bold text-sm text-text-primary leading-tight">Test {i + 1}</p>
                  <p className="text-xs text-text-muted mt-0.5">{s.kart?.nickname ?? '—'}</p>
                </div>

                {/* Badges */}
                <div className="flex flex-wrap gap-1">
                  <Badge label={s.session_type} variant="neutral" />
                  {s.conditions && (
                    <Badge label={s.conditions} variant={conditionVariant[s.conditions] ?? 'neutral'} />
                  )}
                </div>

                {/* Best lap + laps */}
                <div className="flex items-center gap-2 mt-auto">
                  <Clock size={11} className="text-text-muted flex-shrink-0" />
                  <span className="font-mono text-sm text-accent-primary">
                    {s.best_lap_time_ms ? lapMsToString(s.best_lap_time_ms) : '—'}
                  </span>
                  {s.total_laps !== null && (
                    <span className="text-xs text-text-muted ml-auto">{s.total_laps} laps</span>
                  )}
                </div>

                {/* Open button */}
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); navigate(`/sessions/${s.id}`) }}
                  className="w-full py-1.5 text-xs font-semibold text-text-primary bg-bg-elevated hover:bg-accent-primary hover:text-bg-primary rounded transition-colors cursor-pointer border border-border-color"
                >
                  Open Session →
                </button>
              </div>
            )
          })}

          {/* Empty slots */}
          {Array.from({ length: emptyCount }, (_, i) => {
            const kartId = sessions[0]?.kart_id ?? ''
            const params = new URLSearchParams({
              trackId: sessions[0]?.track_id ?? '',
              date:    eventDate ?? '',
              kartId,
              eventId: eventId ?? '',
            })
            return (
              <div
                key={`empty-${i}`}
                className="flex flex-col items-center justify-center gap-3 p-4 rounded-card border border-dashed border-border-color bg-bg-card min-h-[180px] opacity-50 hover:opacity-100 transition-opacity"
              >
                <p className="font-heading text-xs uppercase tracking-wider text-text-muted">
                  Test {sessions.length + i + 1}
                </p>
                <button
                  type="button"
                  onClick={() => navigate(`/sessions/new?${params.toString()}`)}
                  className="flex items-center gap-1.5 text-xs text-text-muted hover:text-accent-primary transition-colors cursor-pointer"
                >
                  <Plus size={12} /> Add Test
                </button>
              </div>
            )
          })}
        </div>
      )}
    </PageWrapper>
  )
}
