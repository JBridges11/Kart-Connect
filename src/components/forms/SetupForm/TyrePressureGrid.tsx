import { Input } from '@/components/ui'
import type { SetupFormData } from '@/types'
import type { PressureUnit } from '@/types'

interface TyrePressureGridProps {
  setup: Partial<SetupFormData>
  onChange: <K extends keyof SetupFormData>(field: K, value: SetupFormData[K] | null) => void
  unit: PressureUnit
  readOnly?: boolean
  prevPressureRec?: { fl: number | null; fr: number | null; rl: number | null; rr: number | null; sessionLabel: string } | null
}

const CORNERS = [
  { label: 'FL', recKey: 'fl' as const, field: 'tyre_pressure_fl' as const },
  { label: 'FR', recKey: 'fr' as const, field: 'tyre_pressure_fr' as const },
  { label: 'RL', recKey: 'rl' as const, field: 'tyre_pressure_rl' as const },
  { label: 'RR', recKey: 'rr' as const, field: 'tyre_pressure_rr' as const },
]

export function TyrePressureGrid({ setup, onChange, unit, readOnly, prevPressureRec }: TyrePressureGridProps) {
  const hasRec = prevPressureRec && (
    prevPressureRec.fl != null || prevPressureRec.fr != null ||
    prevPressureRec.rl != null || prevPressureRec.rr != null
  )

  function applyRec() {
    if (!prevPressureRec) return
    if (prevPressureRec.fl != null) onChange('tyre_pressure_fl', prevPressureRec.fl)
    if (prevPressureRec.fr != null) onChange('tyre_pressure_fr', prevPressureRec.fr)
    if (prevPressureRec.rl != null) onChange('tyre_pressure_rl', prevPressureRec.rl)
    if (prevPressureRec.rr != null) onChange('tyre_pressure_rr', prevPressureRec.rr)
  }

  return (
    <div className="flex flex-col gap-2">

      {/* Column headers */}
      <div className={`grid gap-3 items-center ${hasRec ? 'grid-cols-[2rem_1fr_1fr]' : 'grid-cols-[2rem_1fr]'}`}>
        <div />
        {hasRec && (
          <div className="flex items-center justify-between gap-2">
            <span className="font-heading text-xs uppercase tracking-wider text-accent-primary">
              Recommended — {prevPressureRec!.sessionLabel}
            </span>
            {!readOnly && (
              <button
                type="button"
                onClick={applyRec}
                className="flex-shrink-0 text-xs font-heading font-bold uppercase tracking-wider text-bg-primary bg-accent-primary hover:opacity-90 transition-opacity px-2.5 py-1 rounded cursor-pointer"
              >
                Apply →
              </button>
            )}
          </div>
        )}
        <span className="font-heading text-xs uppercase tracking-wider text-text-muted">
          Tyre Pressures ({unit})
        </span>
      </div>

      {/* One row per corner */}
      {CORNERS.map(({ label, recKey, field }) => (
        <div
          key={label}
          className={`grid gap-3 items-center ${hasRec ? 'grid-cols-[2rem_1fr_1fr]' : 'grid-cols-[2rem_1fr]'}`}
        >
          {/* Corner label */}
          <span className="font-heading text-xs uppercase tracking-wider text-text-muted">{label}</span>

          {/* Recommended value */}
          {hasRec && (
            <div className="rounded-card border border-accent-primary/20 bg-accent-primary/5 px-3 py-2 flex items-center justify-between">
              <span className="font-mono text-sm text-accent-primary font-semibold">
                {prevPressureRec![recKey] != null
                  ? prevPressureRec![recKey]!.toFixed(2)
                  : '—'}
              </span>
              {prevPressureRec![recKey] != null && (
                <span className="text-xs text-text-muted ml-1">{unit}</span>
              )}
            </div>
          )}

          {/* Input */}
          <Input
            label=""
            type="number"
            step="0.05"
            unit={unit}
            value={setup[field] ?? ''}
            onChange={e => onChange(field, e.target.value ? Number(e.target.value) : null)}
            readOnly={readOnly}
            historyKey={field}
          />
        </div>
      ))}

    </div>
  )
}
