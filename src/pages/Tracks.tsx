import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, MapPin } from 'lucide-react'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { Card, Badge, Button, Modal, Input, Select, Textarea } from '@/components/ui'
import { useTracks } from '@/hooks/useTracks'
import { useSessions } from '@/hooks/useSessions'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { lapMsToString } from '@/lib/formatters'
import type { Track } from '@/types'

export function TracksPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { data: tracks, loading, refetch } = useTracks()
  const { data: sessions } = useSessions()
  const [open, setOpen]   = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm]   = useState<Partial<Omit<Track, 'id' | 'user_id' | 'created_at'>>>({
    name: '', country: '', circuit_type: 'outdoor', layout_notes: '',
  })

  async function save() {
    if (!form.name?.trim()) return
    setSaving(true)
    await supabase.from('tracks').insert({
      user_id:      user!.id,
      name:         form.name.trim(),
      country:      form.country?.trim() || null,
      circuit_type: form.circuit_type ?? 'outdoor',
      layout_notes: form.layout_notes?.trim() || null,
    })
    await refetch()
    setOpen(false)
    setSaving(false)
    setForm({ name: '', country: '', circuit_type: 'outdoor', layout_notes: '' })
  }

  function sessionsForTrack(trackId: string) {
    return sessions.filter(s => s.track_id === trackId)
  }

  function bestLapForTrack(trackId: string) {
    const laps = sessionsForTrack(trackId).filter(s => s.best_lap_time_ms !== null)
    if (laps.length === 0) return null
    return Math.min(...laps.map(s => s.best_lap_time_ms!))
  }

  return (
    <PageWrapper
      title="Tracks"
      action={
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus size={14} /> Add Track
        </Button>
      }
    >
      {loading ? (
        <div className="text-text-muted text-sm">Loading…</div>
      ) : tracks.length === 0 ? (
        <div className="text-center py-16">
          <MapPin size={40} className="text-text-muted mx-auto mb-4 opacity-40" />
          <p className="text-text-muted text-sm mb-4">No tracks yet.</p>
          <Button onClick={() => setOpen(true)}><Plus size={14} /> Add your first track</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tracks.map(track => {
            const trackSessions = sessionsForTrack(track.id)
            const bestLap       = bestLapForTrack(track.id)
            return (
              <Card
                key={track.id}
                onClick={() => navigate(`/tracks/${track.id}`)}
                className="hover:border-accent-primary/30 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-heading font-semibold text-lg text-text-primary">{track.name}</h3>
                    {track.country && <p className="text-text-muted text-xs">{track.country}</p>}
                  </div>
                  {track.circuit_type && (
                    <Badge label={track.circuit_type} variant="neutral" />
                  )}
                </div>
                <div className="flex gap-4 mt-3 text-xs text-text-muted">
                  <span>{trackSessions.length} session{trackSessions.length !== 1 ? 's' : ''}</span>
                  {bestLap && (
                    <span className="text-accent-primary font-mono">Best: {lapMsToString(bestLap)}</span>
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <Modal isOpen={open} onClose={() => setOpen(false)} title="Add Track">
        <div className="space-y-4">
          <Input
            label="Track Name *"
            value={form.name ?? ''}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="e.g. Whilton Mill"
          />
          <Input
            label="Country"
            value={form.country ?? ''}
            onChange={e => setForm(f => ({ ...f, country: e.target.value }))}
            placeholder="e.g. United Kingdom"
          />
          <Select
            label="Circuit Type"
            value={form.circuit_type ?? 'outdoor'}
            onChange={e => setForm(f => ({ ...f, circuit_type: e.target.value as 'indoor' | 'outdoor' }))}
            options={[
              { label: 'Outdoor', value: 'outdoor' },
              { label: 'Indoor',  value: 'indoor' },
            ]}
          />
          <Textarea
            label="Layout Notes"
            value={form.layout_notes ?? ''}
            onChange={e => setForm(f => ({ ...f, layout_notes: e.target.value }))}
            placeholder="Any notes about the circuit layout…"
          />
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
            <Button size="sm" loading={saving} onClick={() => void save()} disabled={!form.name?.trim()}>
              Save Track
            </Button>
          </div>
        </div>
      </Modal>
    </PageWrapper>
  )
}
