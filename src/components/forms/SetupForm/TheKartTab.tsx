import { Input, SegmentedControl } from '@/components/ui'
import { useSetupForm } from './SetupFormContext'

export function TheKartTab() {
  const { setup, onChange, readOnly } = useSetupForm()

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-5">
      <Input
        label="Chassis Type *"
        value={setup.chassis_type ?? ''}
        onChange={e => onChange('chassis_type', e.target.value)}
        placeholder="e.g. Tony Kart 401R"
        readOnly={readOnly}
        required
      />
      <Input
        label="Chassis Make"
        value={setup.chassis_make ?? ''}
        onChange={e => onChange('chassis_make', e.target.value || null)}
        placeholder="e.g. Tony Kart"
        readOnly={readOnly}
      />
      <Input
        label="Engine Type *"
        value={setup.engine_type ?? ''}
        onChange={e => onChange('engine_type', e.target.value)}
        placeholder="e.g. Rotax Max Senior"
        readOnly={readOnly}
        required
      />
      <Input
        label="Engine Number"
        value={setup.engine_number ?? ''}
        onChange={e => onChange('engine_number', e.target.value || null)}
        placeholder="e.g. RX230045"
        readOnly={readOnly}
      />
      <div className="md:col-span-2">
        <SegmentedControl
          label="Engine Rank"
          options={[
            { label: '#1', value: '1' },
            { label: '#2', value: '2' },
            { label: '#3', value: '3' },
            { label: '#4', value: '4' },
            { label: '#5', value: '5' },
          ]}
          value={setup.engine_rank !== null && setup.engine_rank !== undefined ? String(setup.engine_rank) : null}
          onChange={v => onChange('engine_rank', Number(v))}
        />
      </div>
      <Input
        label="Kart &amp; Driver Weight"
        type="number"
        unit="kg"
        value={setup.kart_driver_weight_kg ?? ''}
        onChange={e => onChange('kart_driver_weight_kg', e.target.value ? Number(e.target.value) : null)}
        placeholder="e.g. 182.5"
        readOnly={readOnly}
      />
    </div>
  )
}
