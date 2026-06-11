import { Input, SegmentedControl } from '@/components/ui'
import { useSetupForm } from './SetupFormContext'
import { TyrePressureGrid } from './TyrePressureGrid'
import type { PressureUnit } from '@/types'

interface WheelsTyresTabProps {
  pressureUnit: PressureUnit
}

export function WheelsTyresTab({ pressureUnit }: WheelsTyresTabProps) {
  const { setup, onChange, readOnly } = useSetupForm()

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-5">
      <div className="md:col-span-2">
        <SegmentedControl
          label="Wheel Type"
          options={[
            { label: 'Summer', value: 'Summer' },
            { label: 'Winter', value: 'Winter' },
            { label: 'Wet',    value: 'Wet' },
          ]}
          value={setup.wheel_type ?? null}
          onChange={v => onChange('wheel_type', v as 'Summer' | 'Winter' | 'Wet')}
        />
      </div>
      <Input
        label="Tyre Make"
        value={setup.tyre_make ?? ''}
        onChange={e => onChange('tyre_make', e.target.value || null)}
        placeholder="e.g. Bridgestone, Mojo, Vega"
        readOnly={readOnly}
      />
      <Input
        label="Tyre Model"
        value={setup.tyre_model ?? ''}
        onChange={e => onChange('tyre_model', e.target.value || null)}
        placeholder="e.g. YLC, D5, W5"
        readOnly={readOnly}
      />
      <div className="md:col-span-2">
        <TyrePressureGrid
          setup={setup}
          onChange={onChange}
          unit={pressureUnit}
          readOnly={readOnly}
        />
      </div>
    </div>
  )
}
