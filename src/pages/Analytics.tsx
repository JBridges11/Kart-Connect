import { useState, useMemo } from 'react'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { Card, Select } from '@/components/ui'
import { LapProgressChart } from '@/components/charts/LapProgressChart'
import { ParameterCorrelationChart } from '@/components/charts/ParameterCorrelationChart'
import { useSessions } from '@/hooks/useSessions'
import { useTracks } from '@/hooks/useTracks'
import { lapMsToString } from '@/lib/formatters'
import type { SetupFormData } from '@/types'

const CORRELATABLE_FIELDS: { key: keyof SetupFormData; label: string }[] = [
  { key: 'rear_width_mm',         label: 'Rear Width (mm)' },
  { key: 'front_width_mm',        label: 'Front Width (mm)' },
  { key: 'rear_sprocket_teeth',   label: 'Rear Sprocket' },
  { key: 'tyre_pressure_fl',      label: 'Tyre Pressure FL' },
  { key: 'tyre_pressure_fr',      label: 'Tyre Pressure FR' },
  { key: 'tyre_pressure_rl',      label: 'Tyre Pressure RL' },
  { key: 'tyre_pressure_rr',      label: 'Tyre Pressure RR' },
]

export function AnalyticsPage() {
  const { data: sessions, loading } = useSessions()
  const { data: tracks } = useTracks()
  const [trackFilter, setTrackFilter] = useState<string>('')
  const [paramField, setParamField]   = useState<keyof SetupFormData>('rear_width_mm')

  const filteredSessions = useMemo(() =>
    trackFilter
      ? sessions.filter(s => s.track_id === trackFilter && s.best_lap_time_ms !== null)
      : sessions.filter(s => s.best_lap_time_ms !== null),
    [sessions, trackFilter]
  )

  const lapChartData = useMemo(() =>
    filteredSessions.map((s, i) => ({
      id: s.id,
      session_id: s.id,
      lap_number: i + 1,
      lap_time_ms: s.best_lap_time_ms!,
      notes: s.track?.name ?? null,
    })),
    [filteredSessions]
  )

  const bestByTrack = useMemo(() => {
    const map: Record<string, { trackName: string; best: number }> = {}
    for (const s of sessions) {
      if (s.best_lap_time_ms === null) continue
      const tid = s.track_id
      if (!map[tid] || s.best_lap_time_ms < map[tid].best) {
        map[tid] = { trackName: s.track?.name ?? tid, best: s.best_lap_time_ms }
      }
    }
    return Object.values(map)
  }, [sessions])

  const trackOptions = tracks.map(t => ({ label: t.name, value: t.id }))

  return (
    <PageWrapper title="Analytics">
      <div className="max-w-4xl mx-auto space-y-5">
        {/* Best lap per track summary */}
        <Card>
          <h3 className="font-heading text-sm uppercase tracking-wider text-text-primary mb-4">
            Personal Best by Track
          </h3>
          {loading ? (
            <p className="text-text-muted text-sm">Loading…</p>
          ) : bestByTrack.length === 0 ? (
            <p className="text-text-muted text-sm">No lap data yet.</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {bestByTrack.map(({ trackName, best }) => (
                <div key={trackName} className="bg-bg-elevated rounded-card p-3">
                  <p className="text-xs text-text-muted font-heading uppercase tracking-wider truncate">{trackName}</p>
                  <p className="font-mono text-lg text-accent-primary mt-1">{lapMsToString(best)}</p>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Lap progression */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading text-sm uppercase tracking-wider text-text-primary">
              Best Lap Progression
            </h3>
            <div className="w-48">
              <Select
                value={trackFilter}
                onChange={e => setTrackFilter(e.target.value)}
                options={trackOptions}
                placeholder="All tracks"
              />
            </div>
          </div>
          <LapProgressChart lapTimes={lapChartData} height={220} />
        </Card>

        {/* Parameter correlation */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading text-sm uppercase tracking-wider text-text-primary">
              Parameter vs Lap Time
            </h3>
            <div className="w-56">
              <Select
                value={paramField as string}
                onChange={e => setParamField(e.target.value as keyof SetupFormData)}
                options={CORRELATABLE_FIELDS.map(f => ({ label: f.label, value: f.key as string }))}
              />
            </div>
          </div>
          <ParameterCorrelationChart
            data={[]}
            xLabel={CORRELATABLE_FIELDS.find(f => f.key === paramField)?.label ?? ''}
            height={200}
          />
          <p className="text-xs text-text-muted mt-2">
            Correlation chart requires setup data linked to sessions (available after logging setups).
          </p>
        </Card>
      </div>
    </PageWrapper>
  )
}
