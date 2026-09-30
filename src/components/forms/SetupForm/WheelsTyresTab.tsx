import { Input, SegmentedControl, Select } from '@/components/ui'
import { useSetupForm } from './SetupFormContext'
import { TyrePressureGrid } from './TyrePressureGrid'
import type { PressureUnit } from '@/types'

interface WheelsTyresTabProps {
  pressureUnit: PressureUnit
  prevPressureRec?: { fl: number | null; fr: number | null; rl: number | null; rr: number | null; sessionLabel: string } | null
}

export function WheelsTyresTab({ pressureUnit, prevPressureRec }: WheelsTyresTabProps) {
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
        historyKey="tyre_make"
      />
      <Input
        label="Tyre Model"
        value={setup.tyre_model ?? ''}
        onChange={e => onChange('tyre_model', e.target.value || null)}
        placeholder="e.g. YLC, D5, W5"
        readOnly={readOnly}
        historyKey="tyre_model"
      />
      <div className="md:col-span-2">
        <Select
          label="Tyre Condition (sessions on tyre)"
          value={setup.tyre_condition ?? ''}
          onChange={e => onChange('tyre_condition', (e.target.value || null) as NonNullable<typeof setup.tyre_condition> | null)}
          options={[
            { label: 'Select…', value: '' },
            { label: 'New',     value: 'New' },
            { label: '1 session',  value: '1' },
            { label: '2 sessions', value: '2' },
            { label: '3 sessions', value: '3' },
            { label: '4 sessions', value: '4' },
            { label: '5 sessions', value: '5' },
            { label: '6 sessions', value: '6' },
            { label: '7 sessions', value: '7' },
            { label: '8 sessions', value: '8' },
            { label: '8+ sessions', value: '8+' },
          ]}
        />
      </div>
      <div className="md:col-span-2">
        <TyrePressureGrid
          setup={setup}
          onChange={onChange}
          unit={pressureUnit}
          readOnly={readOnly}
          prevPressureRec={prevPressureRec}
        />
      </div>
    </div>
  )
}
