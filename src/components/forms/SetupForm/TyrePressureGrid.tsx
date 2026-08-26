import { Input } from '@/components/ui'
import type { SetupFormData } from '@/types'
import type { PressureUnit } from '@/types'

interface TyrePressureGridProps {
  setup: Partial<SetupFormData>
  onChange: <K extends keyof SetupFormData>(field: K, value: SetupFormData[K] | null) => void
  unit: PressureUnit
  readOnly?: boolean
}

export function TyrePressureGrid({ setup, onChange, unit, readOnly }: TyrePressureGridProps) {
  return (
    <div className="flex flex-col gap-2">
      <span className="font-heading text-xs uppercase tracking-wider text-text-muted">
        Tyre Pressures ({unit})
      </span>
      <div className="grid grid-cols-2 gap-3 max-w-xs">
        <Input
          label="FL"
          type="number"
          step="0.05"
          unit={unit}
          value={setup.tyre_pressure_fl ?? ''}
          onChange={e => onChange('tyre_pressure_fl', e.target.value ? Number(e.target.value) : null)}
          readOnly={readOnly}
          historyKey="tyre_pressure_fl"
        />
        <Input
          label="FR"
          type="number"
          step="0.05"
          unit={unit}
          value={setup.tyre_pressure_fr ?? ''}
          onChange={e => onChange('tyre_pressure_fr', e.target.value ? Number(e.target.value) : null)}
          readOnly={readOnly}
          historyKey="tyre_pressure_fr"
        />
        <Input
          label="RL"
          type="number"
          step="0.05"
          unit={unit}
          value={setup.tyre_pressure_rl ?? ''}
          onChange={e => onChange('tyre_pressure_rl', e.target.value ? Number(e.target.value) : null)}
          readOnly={readOnly}
          historyKey="tyre_pressure_rl"
        />
        <Input
          label="RR"
          type="number"
          step="0.05"
          unit={unit}
          value={setup.tyre_pressure_rr ?? ''}
          onChange={e => onChange('tyre_pressure_rr', e.target.value ? Number(e.target.value) : null)}
          readOnly={readOnly}
          historyKey="tyre_pressure_rr"
        />
      </div>
    </div>
  )
}
