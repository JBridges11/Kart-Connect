import { Input, SegmentedControl } from '@/components/ui'
import { useSetupForm } from './SetupFormContext'

export function TheKartTab() {
  const { setup, onChange, readOnly, hideIdentifiers, engines } = useSetupForm()

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-5">
      {!hideIdentifiers && (
        <Input
          label="Chassis Type *"
          value={setup.chassis_type ?? ''}
          onChange={e => onChange('chassis_type', e.target.value)}
          placeholder="e.g. Tony Kart 401R"
          readOnly={readOnly}
          required
          historyKey="chassis_type"
        />
      )}
      {!hideIdentifiers && (
        <Input
          label="Chassis Make"
          value={setup.chassis_make ?? ''}
          onChange={e => onChange('chassis_make', e.target.value || null)}
          placeholder="e.g. Tony Kart"
          readOnly={readOnly}
          historyKey="chassis_make"
        />
      )}
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
        {(() => {
          if (!engines?.length || setup.engine_rank == null) return null
          const matched = engines.find(e => e.rank === setup.engine_rank)
          return matched ? (
            <p className="mt-2 text-xs text-accent-primary flex items-center gap-1.5">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent-primary" />
              Engine #{matched.rank}: <span className="font-mono">{matched.number}</span>
              {matched.make && <span className="text-text-muted">· {matched.make}</span>}
            </p>
          ) : (
            <p className="mt-2 text-xs text-text-muted">No engine assigned to rank #{setup.engine_rank}</p>
          )
        })()}
      </div>
      <div className="md:col-span-2">
        <SegmentedControl
          label="Carb Rank"
          options={[
            { label: '#1', value: '1' },
            { label: '#2', value: '2' },
            { label: '#3', value: '3' },
            { label: '#4', value: '4' },
            { label: '#5', value: '5' },
          ]}
          value={setup.carb_rank !== null && setup.carb_rank !== undefined ? String(setup.carb_rank) : null}
          onChange={v => onChange('carb_rank', Number(v))}
        />
      </div>
      <div className="md:col-span-2">
        <SegmentedControl
          label="Exhaust Rank"
          options={[
            { label: '#1', value: '1' },
            { label: '#2', value: '2' },
            { label: '#3', value: '3' },
            { label: '#4', value: '4' },
            { label: '#5', value: '5' },
          ]}
          value={setup.exhaust_rank !== null && setup.exhaust_rank !== undefined ? String(setup.exhaust_rank) : null}
          onChange={v => onChange('exhaust_rank', Number(v))}
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
        historyKey="kart_driver_weight_kg"
      />
    </div>
  )
}
