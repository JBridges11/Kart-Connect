import { useState, useMemo, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { Card, Select } from '@/components/ui'
import { useSetup } from '@/hooks/useSetup'
import { useSessions } from '@/hooks/useSessions'
import { lapMsToString, formatDate } from '@/lib/formatters'
import type { SetupFormData } from '@/types'

const SETUP_FIELDS: { key: keyof SetupFormData; label: string }[] = [
  { key: 'chassis_type',           label: 'Chassis' },
  { key: 'engine_type',            label: 'Engine' },
  { key: 'rear_bumper',            label: 'Rear Bumper' },
  { key: 'rear_width_mm',          label: 'Rear Width (mm)' },
  { key: 'rear_hub_length_mm',     label: 'Rear Hub Length (mm)' },
  { key: 'third_bearing',          label: 'Third Bearing' },
  { key: 'axle_height',            label: 'Axle Height' },
  { key: 'brake_pads',             label: 'Brake Pads' },
  { key: 'rear_sprocket_teeth',    label: 'Rear Sprocket' },
  { key: 'engine_sprocket_teeth',  label: 'Engine Sprocket' },
  { key: 'sprocket_carrier_type',  label: 'Sprocket Carrier' },
  { key: 'chain_measurement',      label: 'Chain' },
  { key: 'spark_plug',             label: 'Spark Plug' },
  { key: 'main_jet',               label: 'Main Jet' },
  { key: 'air_screw',              label: 'Air Screw' },
  { key: 'needle_position',        label: 'Needle Position' },
  { key: 'front_width_mm',         label: 'Front Width (mm)' },
  { key: 'front_hub_length_mm',    label: 'Front Hub Length (mm)' },
  { key: 'right_height',           label: 'Right Height' },
  { key: 'camber',                 label: 'Camber (°)' },
  { key: 'caster',                 label: 'Caster (°)' },
  { key: 'toe',                    label: 'Toe (mm)' },
  { key: 'stub_axle',              label: 'Stub Axle' },
  { key: 'wheel_type',             label: 'Wheels' },
  { key: 'tyre_make',              label: 'Tyre Make' },
  { key: 'tyre_model',             label: 'Tyre Model' },
  { key: 'tyre_pressure_fl',       label: 'Pressure FL' },
  { key: 'tyre_pressure_fr',       label: 'Pressure FR' },
  { key: 'tyre_pressure_rl',       label: 'Pressure RL' },
  { key: 'tyre_pressure_rr',       label: 'Pressure RR' },
]

function formatValue(v: unknown): string {
  if (v === null || v === undefined) return '—'
  if (typeof v === 'boolean') return v ? 'Yes' : 'No'
  return String(v)
}

export function ComparePage() {
  const [searchParams] = useSearchParams()
  const { data: sessions, loading } = useSessions()
  const [idA, setIdA] = useState<string>(searchParams.get('a') ?? '')
  const [idB, setIdB] = useState<string>(searchParams.get('b') ?? '')

  // Re-apply URL params when sessions load (they may not be ready on first render)
  useEffect(() => {
    const a = searchParams.get('a')
    const b = searchParams.get('b')
    if (a) setIdA(a)
    if (b) setIdB(b)
  }, [sessions, searchParams])

  const { data: setupA } = useSetup(idA || null)
  const { data: setupB } = useSetup(idB || null)

  const sessionA = sessions.find(s => s.id === idA)
  const sessionB = sessions.find(s => s.id === idB)

  const sessionOptions = sessions.map(s => ({
    label: `${s.track?.name ?? '?'} — ${formatDate(s.session_date)} — ${s.session_name ?? s.session_type}`,
    value: s.id,
  }))

  const diffFields = useMemo(() => {
    if (!setupA || !setupB) return new Set<keyof SetupFormData>()
    const diffs = new Set<keyof SetupFormData>()
    for (const { key } of SETUP_FIELDS) {
      if (String(setupA[key as keyof typeof setupA]) !== String(setupB[key as keyof typeof setupB])) {
        diffs.add(key)
      }
    }
    return diffs
  }, [setupA, setupB])

  return (
    <PageWrapper title="Compare Setups">
      <div className="max-w-4xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
          <Select
            label="Session A"
            value={idA}
            onChange={e => setIdA(e.target.value)}
            options={sessionOptions}
            placeholder="Choose session A…"
          />
          <Select
            label="Session B"
            value={idB}
            onChange={e => setIdB(e.target.value)}
            options={sessionOptions}
            placeholder="Choose session B…"
          />
        </div>

        {loading && <p className="text-text-muted text-sm">Loading sessions…</p>}

        {idA && idB && (
          <Card>
            {/* Header row */}
            <div className="grid grid-cols-[200px_1fr_1fr] gap-2 pb-3 mb-3 border-b border-border-color">
              <div />
              <div>
                <p className="font-heading text-xs uppercase tracking-wider text-text-muted">Session A</p>
                <p className="text-sm font-semibold text-text-primary mt-0.5">
                  {sessionA?.track?.name ?? '—'}
                </p>
                <p className="text-xs text-text-muted font-mono">
                  {sessionA ? formatDate(sessionA.session_date) : ''}
                </p>
                {sessionA?.best_lap_time_ms && (
                  <p className="text-accent-primary font-mono text-sm">
                    {lapMsToString(sessionA.best_lap_time_ms)}
                  </p>
                )}
              </div>
              <div>
                <p className="font-heading text-xs uppercase tracking-wider text-text-muted">Session B</p>
                <p className="text-sm font-semibold text-text-primary mt-0.5">
                  {sessionB?.track?.name ?? '—'}
                </p>
                <p className="text-xs text-text-muted font-mono">
                  {sessionB ? formatDate(sessionB.session_date) : ''}
                </p>
                {sessionB?.best_lap_time_ms && (
                  <p className="text-accent-primary font-mono text-sm">
                    {lapMsToString(sessionB.best_lap_time_ms)}
                  </p>
                )}
              </div>
            </div>

            {/* Rows */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <tbody>
                  {SETUP_FIELDS.map(({ key, label }) => {
                    const vA = setupA ? formatValue(setupA[key as keyof typeof setupA]) : '—'
                    const vB = setupB ? formatValue(setupB[key as keyof typeof setupB]) : '—'
                    const differs = diffFields.has(key)
                    return (
                      <tr
                        key={key}
                        className={[
                          'border-b border-border-color last:border-0',
                          differs ? 'bg-accent-secondary/5' : '',
                        ].join(' ')}
                      >
                        <td className="py-2 pr-4 text-text-muted font-heading uppercase tracking-wider w-48 whitespace-nowrap">
                          {label}
                        </td>
                        <td className={['py-2 pr-4 font-mono', differs ? 'text-accent-primary' : 'text-text-primary'].join(' ')}>
                          {vA}
                        </td>
                        <td className={['py-2 font-mono', differs ? 'text-accent-primary' : 'text-text-primary'].join(' ')}>
                          {vB}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {diffFields.size > 0 && (
              <p className="mt-3 text-xs text-text-muted">
                <span className="text-accent-secondary">{diffFields.size}</span> field{diffFields.size !== 1 ? 's' : ''} differ between the two setups.
              </p>
            )}
          </Card>
        )}

        {idA && !idB && (
          <p className="text-text-muted text-sm text-center py-8">Select Session B to compare.</p>
        )}
        {!idA && (
          <p className="text-text-muted text-sm text-center py-8">
            Select two sessions to compare their setups side-by-side.
          </p>
        )}
      </div>
    </PageWrapper>
  )
}
