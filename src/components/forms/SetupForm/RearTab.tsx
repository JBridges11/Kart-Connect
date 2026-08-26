import { Input, Toggle, SegmentedControl } from '@/components/ui'
import { useSetupForm } from './SetupFormContext'

export function RearTab() {
  const { setup, onChange, readOnly } = useSetupForm()

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-5">
      <SegmentedControl
        label="Wheel Base"
        options={[
          { label: 'Standard', value: 'Standard' },
          { label: 'Short',    value: 'Short' },
          { label: 'Long',     value: 'Long' },
        ]}
        value={setup.wheel_base ?? null}
        onChange={v => onChange('wheel_base', v as 'Standard' | 'Short' | 'Long')}
      />
      <Toggle
        label="Rear Bumper"
        optionA="Loose"
        optionB="Tight"
        value={setup.rear_bumper ?? null}
        onChange={v => onChange('rear_bumper', v as 'Loose' | 'Tight')}
      />
      <Input
        label="Rear Width"
        type="number"
        unit="mm"
        value={setup.rear_width_mm ?? ''}
        onChange={e => onChange('rear_width_mm', e.target.value ? Number(e.target.value) : null)}
        readOnly={readOnly}
        historyKey="rear_width_mm"
      />
      <Input
        label="Rear Hub Length"
        type="number"
        unit="mm"
        value={setup.rear_hub_length_mm ?? ''}
        onChange={e => onChange('rear_hub_length_mm', e.target.value ? Number(e.target.value) : null)}
        readOnly={readOnly}
        historyKey="rear_hub_length_mm"
      />
      <Toggle
        label="Third Bearing"
        optionA="No"
        optionB="Yes"
        value={setup.third_bearing === null || setup.third_bearing === undefined ? null : setup.third_bearing ? 'Yes' : 'No'}
        onChange={v => {
          onChange('third_bearing', v === 'Yes')
          if (v !== 'Yes') onChange('third_bearing_type', null)
        }}
      />
      {setup.third_bearing && (
        <Toggle
          label="Third Bearing — Loose or Tight?"
          optionA="Loose"
          optionB="Tight"
          value={setup.third_bearing_type ?? null}
          onChange={v => onChange('third_bearing_type', v as 'Loose' | 'Tight')}
        />
      )}
      <SegmentedControl
        label="Axle Carrier Height"
        options={[
          { label: 'Low',    value: 'Low' },
          { label: 'Medium', value: 'Med' },
          { label: 'High',   value: 'High' },
        ]}
        value={setup.axle_height ?? null}
        onChange={v => onChange('axle_height', v as 'Low' | 'Med' | 'High')}
      />
      <SegmentedControl
        label="Axle Hardness"
        options={[
          { label: 'Soft',   value: 'Soft' },
          { label: 'Medium', value: 'Med' },
          { label: 'Hard',   value: 'Hard' },
        ]}
        value={setup.axle_hardness ?? null}
        onChange={v => onChange('axle_hardness', v as 'Soft' | 'Med' | 'Hard')}
      />
      <Toggle
        label="Axle Length"
        optionA="Short"
        optionB="Long"
        value={setup.axle_length ?? null}
        onChange={v => onChange('axle_length', v as 'Long' | 'Short')}
      />
      <SegmentedControl
        label="Brake Pads"
        options={[
          { label: 'Soft',   value: 'Soft' },
          { label: 'Medium', value: 'Med' },
          { label: 'Hard',   value: 'Hard' },
        ]}
        value={setup.brake_pads ?? null}
        onChange={v => onChange('brake_pads', v as 'Soft' | 'Med' | 'Hard')}
      />
      <Input
        label="Brake Bias"
        type="number"
        unit="%"
        step="0.5"
        min="0"
        max="100"
        value={setup.brake_bias_pct ?? ''}
        onChange={e => onChange('brake_bias_pct', e.target.value ? Number(e.target.value) : null)}
        placeholder="e.g. 55"
        readOnly={readOnly}
        historyKey="brake_bias_pct"
      />
    </div>
  )
}
