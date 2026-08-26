import { Input, Toggle, SegmentedControl } from '@/components/ui'
import { useSetupForm } from './SetupFormContext'

export function EngineTab() {
  const { setup, onChange, readOnly } = useSetupForm()

  const rear   = setup.rear_sprocket_teeth ?? 0
  const engine = setup.engine_sprocket_teeth ?? 0
  const ratio  = engine > 0 ? (rear / engine).toFixed(2) : '—'

  return (
    <div className="pt-5 space-y-6">
      {/* Drivetrain */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Input
          label="Rear Sprocket"
          type="number"
          unit="teeth"
          value={setup.rear_sprocket_teeth ?? ''}
          onChange={e => onChange('rear_sprocket_teeth', e.target.value ? Number(e.target.value) : null)}
          readOnly={readOnly}
          historyKey="rear_sprocket_teeth"
        />
        <Input
          label="Engine Sprocket"
          type="number"
          unit="teeth"
          value={setup.engine_sprocket_teeth ?? ''}
          onChange={e => onChange('engine_sprocket_teeth', e.target.value ? Number(e.target.value) : null)}
          readOnly={readOnly}
          historyKey="engine_sprocket_teeth"
        />
        <div className="flex flex-col gap-1">
          <span className="font-heading text-xs uppercase tracking-wider text-text-muted">Gear Ratio</span>
          <span className="font-mono text-lg text-accent-primary">{ratio}</span>
        </div>
        <Toggle
          label="Sprocket Carrier"
          optionA="Fixed"
          optionB="Floating"
          value={setup.sprocket_carrier_type ?? null}
          onChange={v => onChange('sprocket_carrier_type', v as 'Fixed' | 'Floating')}
        />
        <Input
          label="Chain"
          value={setup.chain_measurement ?? ''}
          onChange={e => onChange('chain_measurement', e.target.value || null)}
          placeholder="e.g. 219 / 104 links"
          readOnly={readOnly}
          historyKey="chain_measurement"
        />
        <Input
          label="Spark Plug"
          value={setup.spark_plug ?? ''}
          onChange={e => onChange('spark_plug', e.target.value || null)}
          placeholder="e.g. NGK BR9EG"
          readOnly={readOnly}
          historyKey="spark_plug"
        />
        <div className="flex flex-col gap-1">
          <span className="font-heading text-xs uppercase tracking-wider text-text-muted">Tape Over Rad</span>
          <SegmentedControl
            options={[
              { label: '0', value: '0' },
              { label: '1', value: '1' },
              { label: '2', value: '2' },
              { label: '3', value: '3' },
              { label: '4', value: '4' },
            ]}
            value={setup.tape_over_rad !== null && setup.tape_over_rad !== undefined ? String(setup.tape_over_rad) : null}
            onChange={v => onChange('tape_over_rad', Number(v))}
          />
        </div>
      </div>

      {/* Carburettor */}
      <div className="border-t border-border-color pt-5">
        <h3 className="font-heading text-sm uppercase tracking-wider text-text-muted mb-4">Carburettor</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <Input
            label="Main Jet"
            value={setup.main_jet ?? ''}
            onChange={e => onChange('main_jet', e.target.value || null)}
            placeholder="e.g. 108"
            readOnly={readOnly}
            historyKey="main_jet"
          />
          <Input
            label="Air Screw"
            value={setup.air_screw ?? ''}
            onChange={e => onChange('air_screw', e.target.value || null)}
            placeholder="e.g. 1.5 turns out"
            readOnly={readOnly}
            historyKey="air_screw"
          />
          <Input
            label="Needle Position"
            value={setup.needle_position ?? ''}
            onChange={e => onChange('needle_position', e.target.value || null)}
            placeholder="e.g. Clip 3 from top"
            readOnly={readOnly}
            historyKey="needle_position"
          />
          <Input
            label="Float Height"
            value={setup.float_height ?? ''}
            onChange={e => onChange('float_height', e.target.value || null)}
            placeholder="e.g. 14mm"
            readOnly={readOnly}
            historyKey="float_height"
          />
          <Input
            label="Carb Year"
            value={setup.carb_year ?? ''}
            onChange={e => onChange('carb_year', e.target.value || null)}
            placeholder="e.g. 2023"
            readOnly={readOnly}
            historyKey="carb_year"
          />
        </div>
      </div>

    </div>
  )
}
