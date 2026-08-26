import { SegmentedControl, Toggle } from '@/components/ui'
import { useSetupForm } from './SetupFormContext'

export function ChassisTab() {
  const { setup, onChange } = useSetupForm()

  return (
    <div className="pt-5 space-y-6">
      {/* Seat */}
      <div>
        <h3 className="font-heading text-sm uppercase tracking-wider text-text-muted mb-4">Seat</h3>
        <SegmentedControl
          label="Seat Hardness"
          options={[
            { label: 'V.Soft', value: 'Very Soft' },
            { label: 'Soft',   value: 'Soft' },
            { label: 'Medium', value: 'Medium' },
            { label: 'Hard',   value: 'Hard' },
          ]}
          value={setup.seat_hardness ?? null}
          onChange={v => onChange('seat_hardness', v as 'Very Soft' | 'Soft' | 'Medium' | 'Hard')}
        />
      </div>

      {/* Torsion Bar */}
      <div className="border-t border-border-color pt-5">
        <h3 className="font-heading text-sm uppercase tracking-wider text-text-muted mb-4">Torsion Bar</h3>
        <SegmentedControl
          label="Torsion Bar"
          options={[
            { label: 'None', value: 'None' },
            { label: 'Soft', value: 'Soft' },
            { label: 'Med',  value: 'Med' },
            { label: 'Hard', value: 'Hard' },
          ]}
          value={setup.torsion_bar ?? null}
          onChange={v => onChange('torsion_bar', v as 'None' | 'Soft' | 'Med' | 'Hard')}
        />
      </div>

      {/* Seat Stays */}
      <div className="border-t border-border-color pt-5">
        <h3 className="font-heading text-sm uppercase tracking-wider text-text-muted mb-4">Seat Stays</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Toggle
            label="Seat Bolts Front"
            optionA="Loose"
            optionB="Tight"
            value={setup.seat_bolts_front ?? null}
            onChange={v => onChange('seat_bolts_front', v as 'Loose' | 'Tight')}
          />
          <Toggle
            label="Seat Bolts Back"
            optionA="Loose"
            optionB="Tight"
            value={setup.seat_bolts_back ?? null}
            onChange={v => onChange('seat_bolts_back', v as 'Loose' | 'Tight')}
          />
          <SegmentedControl
            label="Left Seat Stay"
            options={[
              { label: 'None', value: 'None' },
              { label: '1',    value: '1' },
              { label: '2',    value: '2' },
            ]}
            value={setup.seat_stay_left ?? null}
            onChange={v => onChange('seat_stay_left', v as 'None' | '1' | '2')}
          />
          <SegmentedControl
            label="Right Seat Stay"
            options={[
              { label: 'None', value: 'None' },
              { label: '1',    value: '1' },
              { label: '2',    value: '2' },
            ]}
            value={setup.seat_stay_right ?? null}
            onChange={v => onChange('seat_stay_right', v as 'None' | '1' | '2')}
          />
        </div>
      </div>
    </div>
  )
}
