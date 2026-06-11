import { Input, SegmentedControl, Toggle } from '@/components/ui'
import { useSetupForm } from './SetupFormContext'

export function FrontEndTab() {
  const { setup, onChange, readOnly } = useSetupForm()

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-5">
      <Input
        label="Front Width"
        type="number"
        unit="mm"
        value={setup.front_width_mm ?? ''}
        onChange={e => onChange('front_width_mm', e.target.value ? Number(e.target.value) : null)}
        readOnly={readOnly}
      />
      <Input
        label="Front Hub Length"
        type="number"
        unit="mm"
        value={setup.front_hub_length_mm ?? ''}
        onChange={e => onChange('front_hub_length_mm', e.target.value ? Number(e.target.value) : null)}
        readOnly={readOnly}
      />
      <div className="md:col-span-2">
        <SegmentedControl
          label="Right Height (Ride Height)"
          options={[
            { label: 'Lowest', value: 'Lowest' },
            { label: 'Low',    value: 'Low' },
            { label: 'Medium', value: 'Med' },
            { label: 'High',   value: 'High' },
            { label: 'Highest',value: 'Highest' },
          ]}
          value={setup.right_height ?? null}
          onChange={v => onChange('right_height', v as 'Lowest' | 'Low' | 'Med' | 'High' | 'Highest')}
          className="w-full justify-stretch"
        />
      </div>
      <Input
        label="Camber"
        unit="°"
        value={setup.camber ?? ''}
        onChange={e => onChange('camber', e.target.value || null)}
        placeholder="e.g. -0.5"
        readOnly={readOnly}
      />
      <Input
        label="Caster"
        unit="°"
        value={setup.caster ?? ''}
        onChange={e => onChange('caster', e.target.value || null)}
        placeholder="e.g. 15"
        readOnly={readOnly}
      />
      <Input
        label="Toe In / Out"
        unit="mm"
        value={setup.toe ?? ''}
        onChange={e => onChange('toe', e.target.value || null)}
        placeholder="e.g. +1 toe-in"
        readOnly={readOnly}
      />
      <Toggle
        label="Stub Axle"
        optionA="Soft"
        optionB="Hard"
        value={setup.stub_axle ?? null}
        onChange={v => onChange('stub_axle', v as 'Soft' | 'Hard')}
      />
    </div>
  )
}
