import { useState } from 'react'
import { ChevronDown, ChevronUp, CheckCircle2, Circle, Trash2, CloudSun } from 'lucide-react'
import { Card, Input, Badge, SegmentedControl, Select } from '@/components/ui'
import { SetupForm } from '@/components/forms/SetupForm'
import { stringToLapMs, lapMsToString, lapMsDelta } from '@/lib/formatters'
import type { SessionSlot, SetupFormData, SlotWeather, PressureUnit, Session, WeatherDescription } from '@/types'

interface BaseWeather {
  conditions: Session['conditions']
  weather_description: Session['weather_description']
  air_temp_c: number | null
  track_temp_c: number | null
  humidity_pct: number | null
  wind_description: string | null
}

interface Props {
  slot: SessionSlot
  baseSetup: Partial<SetupFormData>
  baseWeather: BaseWeather
  onChange: (updated: SessionSlot) => void
}

const WEATHER_OPTIONS = [
  { label: 'Select…',     value: '' },
  { label: 'Sunny',       value: 'Sunny' },
  { label: 'Light Sun',   value: 'Light Sun' },
  { label: 'Cloudy',      value: 'Cloudy' },
  { label: 'Light Rain',  value: 'Light Rain' },
  { label: 'Rain',        value: 'Rain' },
  { label: 'Heavy Rain',  value: 'Heavy Rain' },
  { label: 'Snow',        value: 'Snow' },
]

export function SessionSlotCard({ slot, baseSetup, baseWeather, onChange }: Props) {
  const [open, setOpen]         = useState(false)
  const [lapInput, setLapInput] = useState('')
  const [lapError, setLapError] = useState(false)

  const pressureUnit: PressureUnit = (localStorage.getItem('kc_pressure_unit') as PressureUnit) ?? 'bar'

  // Effective weather: slot override if set, otherwise fall back to base
  const ew = {
    conditions:          slot.weatherOverrides?.conditions          ?? baseWeather.conditions,
    weather_description: slot.weatherOverrides?.weather_description ?? baseWeather.weather_description,
    air_temp_c:          slot.weatherOverrides?.air_temp_c          ?? baseWeather.air_temp_c,
    track_temp_c:        slot.weatherOverrides?.track_temp_c        ?? baseWeather.track_temp_c,
    humidity_pct:        slot.weatherOverrides?.humidity_pct        ?? baseWeather.humidity_pct,
    wind_description:    slot.weatherOverrides?.wind_description    ?? baseWeather.wind_description,
  }

  function setWeather<K extends keyof SlotWeather>(key: K, value: SlotWeather[K]) {
    onChange({ ...slot, weatherOverrides: { ...(slot.weatherOverrides ?? {}), [key]: value } })
  }

  function toggle() {
    const next = !slot.enabled
    onChange({ ...slot, enabled: next })
    if (next) setOpen(true)
  }

  function handleSetupChange(newSetup: Partial<SetupFormData>) {
    const overrides: Partial<SetupFormData> = {}
    for (const key of Object.keys(newSetup) as (keyof SetupFormData)[]) {
      if (String(newSetup[key]) !== String(baseSetup[key])) {
        ;(overrides as Record<string, unknown>)[key] = newSetup[key]
      }
    }
    onChange({ ...slot, setupOverrides: overrides })
  }

  function addLap() {
    const ms = stringToLapMs(lapInput)
    if (!ms) { setLapError(true); return }
    setLapError(false)
    const nextNum = slot.lapTimes.length > 0
      ? Math.max(...slot.lapTimes.map(l => l.lap_number)) + 1
      : 1
    onChange({ ...slot, lapTimes: [...slot.lapTimes, { lap_number: nextNum, lap_time_ms: ms, notes: null }] })
    setLapInput('')
  }

  const bestMs = slot.lapTimes.length > 0
    ? Math.min(...slot.lapTimes.map(l => l.lap_time_ms))
    : null

  const setupChanges  = Object.keys(slot.setupOverrides ?? {}).length
  const weatherChanges = Object.keys(slot.weatherOverrides ?? {}).filter(k => {
    const key = k as keyof SlotWeather
    return slot.weatherOverrides[key] !== undefined
  }).length

  const mergedSetup = { ...baseSetup, ...slot.setupOverrides }

  return (
    <Card className={!slot.enabled ? 'opacity-50' : ''}>
      {/* ── Header ── */}
      <div className="flex items-center gap-2 flex-wrap">
        <button type="button" onClick={toggle} className="flex-shrink-0 cursor-pointer">
          {slot.enabled
            ? <CheckCircle2 size={18} className="text-accent-primary" />
            : <Circle       size={18} className="text-text-muted" />
          }
        </button>

        <input
          value={slot.label}
          onChange={e => onChange({ ...slot, label: e.target.value })}
          disabled={!slot.enabled}
          className="font-heading font-bold text-sm text-text-primary bg-transparent border-b border-transparent hover:border-border-color focus:border-accent-primary/50 focus:outline-none w-24 disabled:cursor-default"
        />

        {slot.enabled && (
          <select
            value={slot.session_type}
            onChange={e => onChange({ ...slot, session_type: e.target.value as SessionSlot['session_type'] })}
            className="text-xs bg-bg-elevated border border-border-color rounded px-2 py-1 text-text-muted focus:outline-none focus:border-accent-primary/50 cursor-pointer"
          >
            <option value="practice">Practice</option>
            <option value="qualifying">Qualifying</option>
            <option value="race">Race</option>
            <option value="testing">Testing</option>
          </select>
        )}

        <div className="flex items-center gap-2 ml-auto flex-shrink-0 text-xs text-text-muted font-mono">
          {slot.enabled && slot.lapTimes.length > 0 && (
            <span>{slot.lapTimes.length} lap{slot.lapTimes.length !== 1 ? 's' : ''}</span>
          )}
          {slot.enabled && bestMs !== null && (
            <span className="text-accent-primary">{lapMsToString(bestMs)}</span>
          )}
          {slot.enabled && weatherChanges > 0 && (
            <Badge label={`${weatherChanges} weather`} variant="info" />
          )}
          {slot.enabled && setupChanges > 0 && (
            <Badge label={`${setupChanges} change${setupChanges > 1 ? 's' : ''}`} variant="neutral" />
          )}
          {slot.enabled ? (
            <button
              type="button"
              onClick={() => setOpen(o => !o)}
              className="text-text-muted hover:text-text-primary cursor-pointer p-0.5"
            >
              {open ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            </button>
          ) : (
            <span className="text-text-muted italic">tap to enable</span>
          )}
        </div>
      </div>

      {/* ── Expanded body ── */}
      {slot.enabled && open && (
        <div className="mt-4 pt-4 border-t border-border-color space-y-6">

          {/* Weather for this test */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <CloudSun size={13} className="text-accent-primary" />
              <p className="font-heading text-xs uppercase tracking-wider text-text-muted">
                Weather for this test
              </p>
              {weatherChanges > 0 && (
                <button
                  type="button"
                  onClick={() => onChange({ ...slot, weatherOverrides: {} })}
                  className="ml-auto text-xs text-text-muted hover:text-accent-secondary cursor-pointer"
                >
                  Reset to event
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <SegmentedControl
                  label="Conditions"
                  options={[
                    { label: 'Dry',  value: 'dry'  },
                    { label: 'Damp', value: 'damp' },
                    { label: 'Wet',  value: 'wet'  },
                  ]}
                  value={ew.conditions ?? null}
                  onChange={v => setWeather('conditions', v as Session['conditions'])}
                />
              </div>
              <Select
                label="Weather"
                value={ew.weather_description ?? ''}
                onChange={e => setWeather('weather_description', (e.target.value || undefined) as WeatherDescription | undefined)}
                options={WEATHER_OPTIONS}
              />
              <Input
                label="Wind"
                value={ew.wind_description ?? ''}
                onChange={e => setWeather('wind_description', e.target.value || null)}
                placeholder="e.g. Light SW breeze"
              />
              <Input
                label="Air Temp"
                type="number"
                unit="°C"
                value={ew.air_temp_c ?? ''}
                onChange={e => setWeather('air_temp_c', e.target.value ? Number(e.target.value) : null)}
              />
              <Input
                label="Track Temp"
                type="number"
                unit="°C"
                value={ew.track_temp_c ?? ''}
                onChange={e => setWeather('track_temp_c', e.target.value ? Number(e.target.value) : null)}
              />
              <Input
                label="Humidity"
                type="number"
                unit="%"
                value={ew.humidity_pct ?? ''}
                onChange={e => setWeather('humidity_pct', e.target.value ? Number(e.target.value) : null)}
              />
            </div>
          </div>

          {/* Full setup form */}
          <div>
            <p className="font-heading text-xs uppercase tracking-wider text-text-muted mb-3">
              Setup — changes from base are saved per test
            </p>
            <SetupForm
              initialSetup={mergedSetup}
              onChange={handleSetupChange}
              pressureUnit={pressureUnit}
            />
          </div>

          {/* Lap times */}
          <div>
            <p className="font-heading text-xs uppercase tracking-wider text-text-muted mb-3">
              Lap Times
            </p>
            <div className="flex gap-2 mb-3">
              <div className="flex-1">
                <Input
                  value={lapInput}
                  onChange={e => { setLapInput(e.target.value); setLapError(false) }}
                  onKeyDown={(e: React.KeyboardEvent) => e.key === 'Enter' && addLap()}
                  placeholder="M:SS.mmm"
                  error={lapError ? 'Use format 1:23.456' : undefined}
                />
              </div>
              <button
                type="button"
                onClick={addLap}
                className="px-4 bg-accent-primary text-bg-primary font-semibold text-sm rounded-card cursor-pointer flex-shrink-0"
              >
                Add
              </button>
            </div>

            {slot.lapTimes.length > 0 && (
              <div className="space-y-0.5">
                {slot.lapTimes.map(lap => {
                  const isBest = lap.lap_time_ms === bestMs
                  const delta  = bestMs ? lapMsDelta(lap.lap_time_ms, bestMs) : null
                  return (
                    <div
                      key={lap.lap_number}
                      className={[
                        'flex items-center gap-3 text-sm px-2 py-1.5 rounded',
                        isBest ? 'bg-accent-primary/5 border-l-2 border-accent-primary' : '',
                      ].join(' ')}
                    >
                      <span className="text-text-muted font-mono w-6 text-xs">{lap.lap_number}</span>
                      <span className="font-mono text-text-primary">{lapMsToString(lap.lap_time_ms)}</span>
                      <span className="flex-1">
                        {isBest
                          ? <Badge label="BEST" variant="warning" />
                          : delta && !delta.equal
                            ? <Badge label={delta.label} variant={delta.faster ? 'positive' : 'negative'} />
                            : null
                        }
                      </span>
                      <button
                        type="button"
                        onClick={() => onChange({ ...slot, lapTimes: slot.lapTimes.filter(l => l.lap_number !== lap.lap_number) })}
                        className="text-text-muted hover:text-accent-secondary cursor-pointer"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  )
}
