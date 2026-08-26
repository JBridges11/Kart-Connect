import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, MapPin, Search, Trash2, Check, Pencil } from 'lucide-react'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { Card, Badge, Button, Modal, Input, Textarea } from '@/components/ui'
import { useTracks } from '@/hooks/useTracks'
import { useSessions } from '@/hooks/useSessions'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { lapMsToString } from '@/lib/formatters'
import { fetchWeatherForTrack, weatherEmoji, weatherLabel, type CurrentWeather } from '@/lib/weather'
import type { Track } from '@/types'

export function TrackWeather({ lat, lng, location, name }: { lat: number | null; lng: number | null; location: string | null; name: string }) {
  const [weather, setWeather] = useState<CurrentWeather | null>(null)
  const tempUnit = (localStorage.getItem('kc_temp_unit') ?? 'c') as 'c' | 'f'

  useEffect(() => {
    void fetchWeatherForTrack(lat, lng, location ?? name).then(w => { if (w) setWeather(w) })
  }, [lat, lng, location, name])

  if (!weather) return null

  const temp = tempUnit === 'f'
    ? `${Math.round(weather.temp_c * 9 / 5 + 32)}°F`
    : `${Math.round(weather.temp_c)}°C`

  return (
    <p className="text-xs text-text-muted mt-1 flex items-center gap-1">
      <span>{weatherEmoji(weather.code)}</span>
      <span>{weatherLabel(weather.code)} · {temp} · {Math.round(weather.wind_mph)} mph</span>
    </p>
  )
}

export function shortLocation(full: string): string {
  const parts = full.split(',').map(p => p.trim())
  if (parts.length <= 2) return full
  const meaningful = parts.filter(p => !/\d/.test(p))
  if (meaningful.length < 2) return parts[parts.length - 1]
  const townIdx = meaningful.length > 3 ? 2 : 1
  return [meaningful[Math.min(townIdx, meaningful.length - 2)], meaningful[meaningful.length - 1]].join(', ')
}

type TrackForm = Partial<Omit<Track, 'id' | 'user_id' | 'created_at'>>

const blankForm = (): TrackForm => ({ name: '', country: '', location: null, layout_notes: '', lat: null, lng: null })

export function TracksPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { data: tracks, loading, refetch } = useTracks()
  const { data: sessions } = useSessions()

  const [open, setOpen]     = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm]     = useState<TrackForm>(blankForm())

  const [locationQuery, setLocationQuery]     = useState('')
  const [searching, setSearching]             = useState(false)
  const [locationResults, setLocationResults] = useState<Array<{ label: string; lat: number; lng: number }>>([])
  const [locationPicked, setLocationPicked]   = useState<string | null>(null)

  // Delete selection
  const [selecting, setSelecting]           = useState(false)
  const [selectedTracks, setSelectedTracks] = useState<string[]>([])
  const [confirmDelete, setConfirmDelete]   = useState(false)
  const [deleting, setDeleting]             = useState(false)
  const [deleteError, setDeleteError]       = useState<string | null>(null)

  async function searchLocation() {
    if (!locationQuery.trim()) return
    setSearching(true)
    setLocationResults([])
    setLocationPicked(null)
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(locationQuery.trim())}&format=json&limit=5`,
        { headers: { 'User-Agent': 'KartConnect/1.0' } }
      )
      const data = await res.json() as Array<{ lat: string; lon: string; display_name: string }>
      setLocationResults(data.map(r => ({
        label: r.display_name,
        lat: parseFloat(r.lat),
        lng: parseFloat(r.lon),
      })))
    } catch {
      setLocationResults([])
    } finally {
      setSearching(false)
    }
  }

  function pickLocation(result: { label: string; lat: number; lng: number }) {
    setForm(f => ({ ...f, lat: result.lat, lng: result.lng, location: result.label }))
    setLocationPicked(result.label)
    setLocationResults([])
  }

  function openAdd() {
    setEditingId(null)
    setForm(blankForm())
    setLocationQuery('')
    setLocationResults([])
    setLocationPicked(null)
    setOpen(true)
  }

  function openEdit(track: Track, e: React.MouseEvent) {
    e.stopPropagation()
    setEditingId(track.id)
    setForm({
      name:         track.name,
      country:      track.country ?? '',
      location:     track.location ?? null,
      layout_notes: track.layout_notes ?? '',
      lat:          track.lat,
      lng:          track.lng,
    })
    setLocationQuery('')
    setLocationResults([])
    setLocationPicked(track.location ? shortLocation(track.location) : null)
    setOpen(true)
  }

  function resetModal() {
    setOpen(false)
    setEditingId(null)
    setForm(blankForm())
    setLocationQuery('')
    setLocationResults([])
    setLocationPicked(null)
  }

  async function save() {
    if (!form.name?.trim()) return
    setSaving(true)
    const payload = {
      name:         form.name.trim(),
      country:      form.country?.trim() || null,
      location:     form.location ?? null,
      circuit_type: null as null,
      layout_notes: form.layout_notes?.trim() || null,
      lat:          form.lat ?? null,
      lng:          form.lng ?? null,
    }
    if (editingId) {
      await supabase.from('tracks').update(payload).eq('id', editingId)
    } else {
      await supabase.from('tracks').insert({ user_id: user!.id, ...payload })
    }
    await refetch()
    resetModal()
    setSaving(false)
  }

  function toggleSelect(id: string) {
    setSelectedTracks(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
    setConfirmDelete(false)
  }

  function cancelSelect() {
    setSelecting(false)
    setSelectedTracks([])
    setConfirmDelete(false)
    setDeleteError(null)
  }

  async function deleteSelected() {
    setDeleting(true)
    setDeleteError(null)
    const { error } = await supabase.from('tracks').delete().in('id', selectedTracks)
    if (error) {
      setDeleteError('Could not delete — try again.')
      setDeleting(false)
      setConfirmDelete(false)
      return
    }
    await refetch()
    setSelectedTracks([])
    setConfirmDelete(false)
    setDeleting(false)
    setSelecting(false)
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
        <div className="flex items-center gap-2">
          {tracks.length > 0 && !selecting && (
            <Button variant="secondary" size="sm" onClick={() => setSelecting(true)}>
              Select
            </Button>
          )}
          {selecting && (
            <Button variant="ghost" size="sm" onClick={cancelSelect}>
              Cancel
            </Button>
          )}
          <Button size="sm" onClick={openAdd}>
            <Plus size={14} /> Add Track
          </Button>
        </div>
      }
    >
      {loading ? (
        <div className="text-text-muted text-sm">Loading…</div>
      ) : tracks.length === 0 ? (
        <div className="text-center py-16">
          <MapPin size={40} className="text-text-muted mx-auto mb-4 opacity-40" />
          <p className="text-text-muted text-sm mb-4">No tracks yet.</p>
          <Button onClick={openAdd}><Plus size={14} /> Add your first track</Button>
        </div>
      ) : (
        <>
          {/* Delete action bar */}
          {selecting && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-card flex items-center gap-3">
              <span className="text-sm text-text-primary flex-1">
                {deleteError
                  ? <span className="text-red-500">{deleteError}</span>
                  : selectedTracks.length > 0
                  ? <><span className="font-semibold">{selectedTracks.length}</span> selected</>
                  : <span className="text-text-muted">Tap tracks to select</span>
                }
              </span>
              {selectedTracks.length > 0 && (
                !confirmDelete ? (
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
                      onClick={() => void deleteSelected()}
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
                )
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tracks.map(track => {
              const trackSessions = sessionsForTrack(track.id)
              const bestLap       = bestLapForTrack(track.id)
              const isSelected    = selectedTracks.includes(track.id)
              const subtitle      = track.location ? shortLocation(track.location) : track.country
              return (
                <Card
                  key={track.id}
                  onClick={() => selecting ? toggleSelect(track.id) : navigate(`/tracks/${track.id}`)}
                  className={[
                    'transition-colors cursor-pointer',
                    selecting && isSelected
                      ? 'border-red-400 bg-red-500/5'
                      : selecting
                      ? 'hover:border-red-300'
                      : 'hover:border-accent-primary/30',
                  ].join(' ')}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-start gap-2 flex-1 min-w-0">
                      {selecting && (
                        <div className={[
                          'w-4 h-4 mt-1 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors',
                          isSelected ? 'bg-red-500 border-red-500' : 'border-border-color',
                        ].join(' ')}>
                          {isSelected && <Check size={9} className="text-white" strokeWidth={3} />}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <h3 className="font-heading font-semibold text-lg text-text-primary leading-tight">{track.name}</h3>
                        {subtitle && (
                          <p className="text-text-muted text-sm mt-0.5">{subtitle}</p>
                        )}
                        <TrackWeather lat={track.lat} lng={track.lng} location={track.location} name={track.name} />
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                      {track.circuit_type && (
                        <Badge label={track.circuit_type} variant="neutral" />
                      )}
                      {!selecting && (
                        <button
                          type="button"
                          onClick={e => openEdit(track, e)}
                          className="p-1.5 text-text-muted hover:text-text-primary hover:bg-bg-elevated rounded transition-colors cursor-pointer"
                        >
                          <Pencil size={13} />
                        </button>
                      )}
                    </div>
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
        </>
      )}

      <Modal isOpen={open} onClose={resetModal} title={editingId ? 'Edit Track' : 'Add Track'}>
        <div className="space-y-4">
          <Input
            label="Track Name *"
            value={form.name ?? ''}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder=""
          />
          <Input
            label="Country"
            value={form.country ?? ''}
            onChange={e => setForm(f => ({ ...f, country: e.target.value }))}
            placeholder=""
          />

          {/* Location search */}
          <div>
            <p className="font-heading text-xs uppercase tracking-wider text-text-muted mb-1.5">
              Location <span className="normal-case font-normal">(for accurate weather)</span>
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={locationQuery}
                onChange={e => { setLocationQuery(e.target.value); setLocationPicked(null); setLocationResults([]) }}
                onKeyDown={e => { if (e.key === 'Enter') void searchLocation() }}
                placeholder=""
                className="flex-1 bg-bg-elevated border border-border-color rounded-card px-3 py-2 text-sm text-text-primary placeholder-text-muted outline-none focus:border-accent-primary/50 transition-colors"
              />
              <button
                type="button"
                disabled={searching || !locationQuery.trim()}
                onClick={() => void searchLocation()}
                className="flex items-center gap-1.5 px-3 py-2 rounded-card border border-border-color text-text-primary hover:border-accent-primary/50 text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {searching
                  ? <span className="w-3.5 h-3.5 border-2 border-text-muted border-t-transparent rounded-full animate-spin" />
                  : <Search size={14} />
                }
              </button>
            </div>

            {/* Results list */}
            {locationResults.length > 0 && (
              <ul className="mt-2 border border-border-color rounded-card overflow-hidden">
                {locationResults.map((r, i) => (
                  <li key={i}>
                    <button
                      type="button"
                      onClick={() => pickLocation(r)}
                      className="w-full text-left px-3 py-2 text-xs text-text-primary hover:bg-accent-primary/10 hover:text-accent-primary transition-colors border-b border-border-color last:border-b-0"
                    >
                      {r.label}
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {/* Confirmed pick */}
            {locationPicked && (
              <div className="flex items-start gap-1.5 mt-2 text-xs text-green-500">
                <MapPin size={12} className="flex-shrink-0 mt-0.5" />
                <span className="text-text-muted">{locationPicked}</span>
              </div>
            )}

            {!searching && locationQuery && locationResults.length === 0 && locationPicked === null && (
              <p className="mt-1.5 text-xs text-text-muted">Press Search to find a location</p>
            )}
          </div>

          <Textarea
            label="Layout Notes"
            value={form.layout_notes ?? ''}
            onChange={e => setForm(f => ({ ...f, layout_notes: e.target.value }))}
            placeholder="Any notes about the circuit layout…"
          />
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" size="sm" onClick={resetModal}>Cancel</Button>
            <Button size="sm" loading={saving} onClick={() => void save()} disabled={!form.name?.trim()}>
              {editingId ? 'Save Changes' : 'Save Track'}
            </Button>
          </div>
        </div>
      </Modal>
    </PageWrapper>
  )
}
