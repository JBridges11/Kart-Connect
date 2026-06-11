import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Check, Plus } from 'lucide-react'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { Button, Card, Input, Select, SegmentedControl, Textarea } from '@/components/ui'
import { SetupForm } from '@/components/forms/SetupForm'
import { SessionSlotCard } from '@/components/forms/SessionSlotCard'
import { useTracks } from '@/hooks/useTracks'
import { useKarts } from '@/hooks/useKarts'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { setupDefaults } from '@/lib/setupDefaults'
import { lapMsToString, formatDate } from '@/lib/formatters'
import type { WizardState, SessionSlot, SetupFormData, PressureUnit, Session } from '@/types'

const STORAGE_KEY = 'kc_wizard_state'
const TOTAL_STEPS = 7

function makeDefaultSlots(): SessionSlot[] {
  return Array.from({ length: 8 }, (_, i) => ({
    slotId: `slot_${i + 1}`,
    label: `Test ${i + 1}`,
    session_type: 'practice' as const,
    enabled: i === 0,
    setupOverrides: {},
    weatherOverrides: {},
    lapTimes: [],
  }))
}

function makeDefaultWizard(): WizardState {
  const today = new Date().toISOString().slice(0, 10)
  return {
    step: 1,
    trackId: null,
    newTrack: null,
    kartId: null,
    newKart: null,
    sessionMeta: {
      session_date: today,
      conditions: 'dry',
      weather_description: null,
      altitude_m: null,
      air_temp_c: null,
      track_temp_c: null,
      humidity_pct: null,
      wind_description: null,
      notes: null,
    },
    baseSetup: { ...setupDefaults },
    slots: makeDefaultSlots(),
    loadedFromSession: false,
  }
}

function loadState(): WizardState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as WizardState
      // If old format (pre-slots), start fresh
      if (!parsed.slots) return makeDefaultWizard()
      return parsed
    }
  } catch { /* ignore */ }
  return makeDefaultWizard()
}

function StepIndicator({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex items-center gap-1 mb-6">
      {Array.from({ length: total }, (_, i) => {
        const n = i + 1
        const done = n < step
        const active = n === step
        return (
          <div key={n} className="flex items-center">
            <div
              className={[
                'w-7 h-7 rounded-full flex items-center justify-center text-xs font-mono font-semibold border',
                done   ? 'bg-accent-primary border-accent-primary text-bg-primary' :
                active ? 'border-accent-primary text-accent-primary' :
                         'border-border-color text-text-muted',
              ].join(' ')}
            >
              {done ? <Check size={12} /> : n}
            </div>
            {n < total && (
              <div className={['h-px w-6 mx-0.5', n < step ? 'bg-accent-primary' : 'bg-border-color'].join(' ')} />
            )}
          </div>
        )
      })}
      <span className="ml-3 text-xs text-text-muted font-mono">Step {step} of {total}</span>
    </div>
  )
}

export function NewSessionPage() {
  const navigate    = useNavigate()
  const { user }    = useAuth()
  const [state, setState] = useState<WizardState>(loadState)
  const [saving, setSaving]     = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const { data: tracks, refetch: refetchTracks } = useTracks()
  const { data: karts,  refetch: refetchKarts  } = useKarts()
  const [addingTrack, setAddingTrack] = useState(false)
  const [addingKart,  setAddingKart]  = useState(false)
  const [newTrackName,    setNewTrackName]    = useState('')
  const [newTrackCountry, setNewTrackCountry] = useState('')
  const [newKartNickname, setNewKartNickname] = useState('')
  const [newKartChassis,  setNewKartChassis]  = useState('')
  const [newKartEngine,   setNewKartEngine]   = useState('')
  const pressureUnit: PressureUnit = (localStorage.getItem('kc_pressure_unit') as PressureUnit) ?? 'bar'

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state])

  function update(patch: Partial<WizardState>) {
    setState(prev => ({ ...prev, ...patch }))
  }

  function nextStep() { update({ step: Math.min(state.step + 1, TOTAL_STEPS) }) }
  function prevStep() { update({ step: Math.max(state.step - 1, 1) }) }

  async function createTrack() {
    if (!newTrackName.trim()) return
    const { data, error } = await supabase.from('tracks').insert({
      user_id: user!.id,
      name: newTrackName.trim(),
      country: newTrackCountry.trim() || null,
      circuit_type: 'outdoor',
    }).select().single()
    if (!error && data) {
      await refetchTracks()
      update({ trackId: data.id })
      setAddingTrack(false)
      setNewTrackName('')
      setNewTrackCountry('')
    }
  }

  async function createKart() {
    if (!newKartNickname.trim() || !newKartChassis.trim() || !newKartEngine.trim()) return
    const { data, error } = await supabase.from('karts').insert({
      user_id: user!.id,
      nickname: newKartNickname.trim(),
      chassis_type: newKartChassis.trim(),
      engine_type: newKartEngine.trim(),
    }).select().single()
    if (!error && data) {
      await refetchKarts()
      update({ kartId: data.id })
      setAddingKart(false)
      setNewKartNickname('')
      setNewKartChassis('')
      setNewKartEngine('')
    }
  }

  const loadLastSetup = useCallback(async () => {
    if (!state.trackId || !state.kartId) return
    const { data } = await supabase
      .from('sessions')
      .select('id, best_lap_time_ms, session_date, setups(*)')
      .eq('track_id', state.trackId)
      .eq('kart_id', state.kartId)
      .order('session_date', { ascending: false })
      .limit(1)
      .single()

    if (data?.setups) {
      const s = Array.isArray(data.setups) ? data.setups[0] : data.setups
      if (s) {
        const { id: _id, session_id: _sid, created_at: _ca, ...rest } = s as Record<string, unknown>
        update({ baseSetup: rest as Partial<SetupFormData>, loadedFromSession: true })
      }
    }
  }, [state.trackId, state.kartId])

  async function handleSave() {
    const enabledSlots = state.slots.filter(s => s.enabled)
    if (enabledSlots.length === 0) return
    setSaving(true)
    setSaveError(null)
    try {
      const baseMeta = {
        user_id:             user!.id,
        track_id:            state.trackId!,
        kart_id:             state.kartId!,
        session_date:        state.sessionMeta.session_date,
        conditions:          state.sessionMeta.conditions,
        weather_description: state.sessionMeta.weather_description,
        altitude_m:          state.sessionMeta.altitude_m,
        air_temp_c:          state.sessionMeta.air_temp_c,
        track_temp_c:        state.sessionMeta.track_temp_c,
        humidity_pct:        state.sessionMeta.humidity_pct,
        wind_description:    state.sessionMeta.wind_description,
        notes:               state.sessionMeta.notes,
      }

      // Insert all session rows
      const sessionInserts = enabledSlots.map(slot => {
        // Only spread weather overrides that are explicitly set (not undefined)
        const weatherPatch = Object.fromEntries(
          Object.entries(slot.weatherOverrides ?? {}).filter(([, v]) => v !== undefined)
        )
        return {
          ...baseMeta,
          ...weatherPatch,
          session_name: slot.label,
          session_type: slot.session_type,
          best_lap_time_ms: slot.lapTimes.length > 0
            ? Math.min(...slot.lapTimes.map(l => l.lap_time_ms))
            : null,
          total_laps: slot.lapTimes.length || null,
        }
      })

      const { data: sessionRows, error: sessionErr } = await supabase
        .from('sessions')
        .insert(sessionInserts)
        .select()

      if (sessionErr) throw sessionErr

      // Insert setups and lap times for each session
      await Promise.all((sessionRows ?? []).map(async (row, i) => {
        const slot     = enabledSlots[i]
        const mergedSetup = { ...state.baseSetup, ...slot.setupOverrides }
        const sessionId   = row.id as string

        if (mergedSetup.chassis_type && mergedSetup.engine_type) {
          const { error: setupErr } = await supabase.from('setups').insert({
            session_id: sessionId,
            ...mergedSetup,
          })
          if (setupErr) throw setupErr
        }

        if (slot.lapTimes.length > 0) {
          const { error: lapErr } = await supabase.from('lap_times').insert(
            slot.lapTimes.map(l => ({ ...l, session_id: sessionId }))
          )
          if (lapErr) throw lapErr
        }
      }))

      localStorage.removeItem(STORAGE_KEY)
      // Navigate to the first saved session if only one, else dashboard
      if (sessionRows && sessionRows.length === 1) {
        navigate(`/sessions/${(sessionRows[0] as Record<string, unknown>).id}`)
      } else {
        navigate('/')
      }
    } catch (e) {
      const msg =
        e instanceof Error
          ? e.message
          : typeof e === 'object' && e !== null && 'message' in e
            ? String((e as { message: unknown }).message)
            : JSON.stringify(e)
      setSaveError(msg)
      setSaving(false)
    }
  }

  const canProceed = (() => {
    if (state.step === 1) return !!state.trackId
    if (state.step === 2) return !!state.kartId
    if (state.step === 5) return !!(state.baseSetup.chassis_type?.trim() && state.baseSetup.engine_type?.trim())
    if (state.step === 6) return state.slots.some(s => s.enabled)
    return true
  })()

  const stepTitles = [
    'Choose Track', 'Choose Kart', 'Event Info',
    'Load Setup', 'Base Setup', 'Test Sessions', 'Review & Save',
  ]

  return (
    <PageWrapper title="New Session">
      <div className="max-w-2xl mx-auto">
        <StepIndicator step={state.step} total={TOTAL_STEPS} />

        <h2 className="font-heading text-lg font-bold uppercase tracking-wide text-text-primary mb-4">
          {stepTitles[state.step - 1]}
        </h2>

        {/* Step 1 — Track */}
        {state.step === 1 && (
          <div className="space-y-3">
            {tracks.map(t => (
              <Card
                key={t.id}
                onClick={() => update({ trackId: t.id })}
                highlight={state.trackId === t.id}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-text-primary">{t.name}</p>
                    <p className="text-xs text-text-muted">{t.country ?? 'Unknown location'}</p>
                  </div>
                  {state.trackId === t.id && <Check size={16} className="text-accent-primary" />}
                </div>
              </Card>
            ))}
            {!addingTrack ? (
              <button
                type="button"
                onClick={() => setAddingTrack(true)}
                className="w-full flex items-center justify-center gap-2 py-3 border border-dashed border-border-color rounded-card text-sm text-text-muted hover:text-text-primary hover:border-accent-primary/40 transition-colors cursor-pointer"
              >
                <Plus size={14} /> Add new track
              </button>
            ) : (
              <Card>
                <div className="space-y-3">
                  <Input label="Track Name *" value={newTrackName} onChange={e => setNewTrackName(e.target.value)} />
                  <Input label="Country" value={newTrackCountry} onChange={e => setNewTrackCountry(e.target.value)} />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => void createTrack()} disabled={!newTrackName.trim()}>Save</Button>
                    <Button size="sm" variant="ghost" onClick={() => setAddingTrack(false)}>Cancel</Button>
                  </div>
                </div>
              </Card>
            )}
          </div>
        )}

        {/* Step 2 — Kart */}
        {state.step === 2 && (
          <div className="space-y-3">
            {karts.map(k => (
              <Card
                key={k.id}
                onClick={() => update({ kartId: k.id })}
                highlight={state.kartId === k.id}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-text-primary">{k.nickname}</p>
                    <p className="text-xs text-text-muted">{k.chassis_type} / {k.engine_type}</p>
                  </div>
                  {state.kartId === k.id && <Check size={16} className="text-accent-primary" />}
                </div>
              </Card>
            ))}
            {!addingKart ? (
              <button
                type="button"
                onClick={() => setAddingKart(true)}
                className="w-full flex items-center justify-center gap-2 py-3 border border-dashed border-border-color rounded-card text-sm text-text-muted hover:text-text-primary hover:border-accent-primary/40 transition-colors cursor-pointer"
              >
                <Plus size={14} /> Add new kart
              </button>
            ) : (
              <Card>
                <div className="space-y-3">
                  <Input label="Nickname *" value={newKartNickname} onChange={e => setNewKartNickname(e.target.value)} />
                  <Input label="Chassis Type *" value={newKartChassis} onChange={e => setNewKartChassis(e.target.value)} />
                  <Input label="Engine Type *" value={newKartEngine} onChange={e => setNewKartEngine(e.target.value)} />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => void createKart()} disabled={!newKartNickname.trim() || !newKartChassis.trim() || !newKartEngine.trim()}>Save</Button>
                    <Button size="sm" variant="ghost" onClick={() => setAddingKart(false)}>Cancel</Button>
                  </div>
                </div>
              </Card>
            )}
          </div>
        )}

        {/* Step 3 — Session Info */}
        {state.step === 3 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Date"
              type="date"
              value={state.sessionMeta.session_date}
              onChange={e => update({ sessionMeta: { ...state.sessionMeta, session_date: e.target.value } })}
            />
            <div className="md:col-span-2">
              <SegmentedControl
                label="Conditions"
                options={[
                  { label: 'Dry',  value: 'dry' },
                  { label: 'Damp', value: 'damp' },
                  { label: 'Wet',  value: 'wet' },
                ]}
                value={state.sessionMeta.conditions ?? null}
                onChange={v => update({ sessionMeta: { ...state.sessionMeta, conditions: v as Session['conditions'] } })}
              />
            </div>
            <Select
              label="Weather"
              value={state.sessionMeta.weather_description ?? ''}
              onChange={e => update({ sessionMeta: { ...state.sessionMeta, weather_description: (e.target.value || null) as Session['weather_description'] } })}
              options={[
                { label: 'Select weather…', value: '' },
                { label: 'Sunny',       value: 'Sunny' },
                { label: 'Light Sun',   value: 'Light Sun' },
                { label: 'Cloudy',      value: 'Cloudy' },
                { label: 'Light Rain',  value: 'Light Rain' },
                { label: 'Rain',        value: 'Rain' },
                { label: 'Heavy Rain',  value: 'Heavy Rain' },
                { label: 'Snow',        value: 'Snow' },
              ]}
            />
            <Input
              label="Altitude"
              type="number"
              unit="m"
              value={state.sessionMeta.altitude_m ?? ''}
              onChange={e => update({ sessionMeta: { ...state.sessionMeta, altitude_m: e.target.value ? Number(e.target.value) : null } })}
              placeholder="e.g. 120"
            />
            <Input
              label="Air Temp"
              type="number"
              unit="°C"
              value={state.sessionMeta.air_temp_c ?? ''}
              onChange={e => update({ sessionMeta: { ...state.sessionMeta, air_temp_c: e.target.value ? Number(e.target.value) : null } })}
            />
            <Input
              label="Track Temp"
              type="number"
              unit="°C"
              value={state.sessionMeta.track_temp_c ?? ''}
              onChange={e => update({ sessionMeta: { ...state.sessionMeta, track_temp_c: e.target.value ? Number(e.target.value) : null } })}
            />
            <Input
              label="Humidity"
              type="number"
              unit="%"
              value={state.sessionMeta.humidity_pct ?? ''}
              onChange={e => update({ sessionMeta: { ...state.sessionMeta, humidity_pct: e.target.value ? Number(e.target.value) : null } })}
            />
            <Input
              label="Wind"
              value={state.sessionMeta.wind_description ?? ''}
              onChange={e => update({ sessionMeta: { ...state.sessionMeta, wind_description: e.target.value || null } })}
              placeholder="e.g. Light SW breeze"
            />
            <div className="md:col-span-2">
              <Textarea
                label="Session Notes"
                value={state.sessionMeta.notes ?? ''}
                onChange={e => update({ sessionMeta: { ...state.sessionMeta, notes: e.target.value || null } })}
                placeholder="Any pre-session notes…"
              />
            </div>
          </div>
        )}

        {/* Step 4 — Load Setup */}
        {state.step === 4 && (
          <div className="space-y-4">
            <p className="text-text-muted text-sm">
              Load the last setup for this track + kart as a starting point, or begin with defaults.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button onClick={() => void loadLastSetup().then(nextStep)} className="flex-1">
                Load Last Setup
              </Button>
              <Button variant="secondary" onClick={nextStep} className="flex-1">
                Start from Defaults
              </Button>
            </div>
            {state.loadedFromSession && (
              <p className="text-xs text-green-400">✓ Last setup loaded successfully</p>
            )}
          </div>
        )}

        {/* Step 5 — Base Setup */}
        {state.step === 5 && (
          <SetupForm
            initialSetup={state.baseSetup}
            onChange={baseSetup => update({ baseSetup })}
            pressureUnit={pressureUnit}
          />
        )}

        {/* Step 6 — Test Sessions */}
        {state.step === 6 && (
          <div className="space-y-3">
            <p className="text-text-muted text-sm">
              Enable tests for this event. Each inherits the base setup — tweak individual fields between runs.
            </p>
            {state.slots.map(slot => (
              <SessionSlotCard
                key={slot.slotId}
                slot={slot}
                baseSetup={state.baseSetup}
                baseWeather={{
                  conditions:          state.sessionMeta.conditions,
                  weather_description: state.sessionMeta.weather_description,
                  air_temp_c:          state.sessionMeta.air_temp_c,
                  track_temp_c:        state.sessionMeta.track_temp_c,
                  humidity_pct:        state.sessionMeta.humidity_pct,
                  wind_description:    state.sessionMeta.wind_description,
                }}
                onChange={updated => update({
                  slots: state.slots.map(s => s.slotId === slot.slotId ? updated : s),
                })}
              />
            ))}
          </div>
        )}

        {/* Step 7 — Review */}
        {state.step === 7 && (() => {
          const enabledSlots = state.slots.filter(s => s.enabled)
          const trackName    = tracks.find(t => t.id === state.trackId)?.name ?? '—'
          const kartName     = karts.find(k => k.id === state.kartId)?.nickname ?? '—'
          return (
            <div className="space-y-4">
              <Card>
                <h3 className="font-heading text-sm uppercase tracking-wider text-text-muted mb-3">Event Summary</h3>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm mb-4">
                  <dt className="text-text-muted">Track</dt>
                  <dd className="text-text-primary font-medium">{trackName}</dd>
                  <dt className="text-text-muted">Kart</dt>
                  <dd className="text-text-primary font-medium">{kartName}</dd>
                  <dt className="text-text-muted">Date</dt>
                  <dd className="text-text-primary font-mono text-xs">{formatDate(state.sessionMeta.session_date)}</dd>
                  <dt className="text-text-muted">Conditions</dt>
                  <dd className="text-text-primary">{state.sessionMeta.conditions ?? '—'}</dd>
                  <dt className="text-text-muted">Chassis</dt>
                  <dd className="text-text-primary">{state.baseSetup.chassis_type ?? '—'}</dd>
                  <dt className="text-text-muted">Engine</dt>
                  <dd className="text-text-primary">{state.baseSetup.engine_type ?? '—'}</dd>
                </dl>

                <h3 className="font-heading text-sm uppercase tracking-wider text-text-muted mb-3 border-t border-border-color pt-3">
                  Sessions ({enabledSlots.length})
                </h3>
                <div className="space-y-2">
                  {enabledSlots.map(slot => {
                    const bestMs = slot.lapTimes.length > 0
                      ? Math.min(...slot.lapTimes.map(l => l.lap_time_ms))
                      : null
                    const tweakCount = Object.keys(slot.setupOverrides).length
                    return (
                      <div key={slot.slotId} className="flex items-center gap-3 text-sm py-1.5 border-b border-border-color last:border-0">
                        <span className="font-heading font-bold text-text-primary w-24">{slot.label}</span>
                        <span className="text-text-muted capitalize">{slot.session_type}</span>
                        <span className="font-mono text-xs text-text-muted">{slot.lapTimes.length} lap{slot.lapTimes.length !== 1 ? 's' : ''}</span>
                        {bestMs && <span className="font-mono text-accent-primary ml-auto">{lapMsToString(bestMs)}</span>}
                        {tweakCount > 0 && <span className="text-xs text-text-muted">{tweakCount} tweak{tweakCount > 1 ? 's' : ''}</span>}
                      </div>
                    )
                  })}
                </div>
              </Card>

              {saveError && (
                <p className="text-sm text-accent-secondary bg-accent-secondary/10 border border-accent-secondary/20 rounded-card px-3 py-2">
                  {saveError}
                </p>
              )}

              <Button onClick={() => void handleSave()} loading={saving} className="w-full" size="lg">
                Save {enabledSlots.length} Session{enabledSlots.length !== 1 ? 's' : ''}
              </Button>
            </div>
          )
        })()}

        {/* Navigation */}
        <div className="flex justify-between mt-8">
          <Button
            variant="ghost"
            onClick={prevStep}
            disabled={state.step === 1}
            size="sm"
          >
            <ChevronLeft size={14} /> Back
          </Button>
          {state.step < TOTAL_STEPS && state.step !== 4 && (
            <Button onClick={nextStep} size="sm" disabled={!canProceed}>
              Next <ChevronRight size={14} />
            </Button>
          )}
        </div>
      </div>
    </PageWrapper>
  )
}
