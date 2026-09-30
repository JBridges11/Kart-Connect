import { useState } from 'react'
import { Users, Check, ChevronRight } from 'lucide-react'
import { Input, SegmentedControl } from '@/components/ui'
import { useSetupForm } from './SetupFormContext'
import { useKarts } from '@/hooks/useKarts'
import type { Kart } from '@/types'

export function TheKartTab() {
  const { setup, onChange, readOnly, engines } = useSetupForm()
  const { data: karts } = useKarts()
  const [pickerOpen, setPickerOpen] = useState(false)

  function applyDriver(k: Kart) {
    onChange('driver_name',    k.driver_name ?? null)
    onChange('chassis_type',   k.chassis_type)
    onChange('chassis_make',   k.kart_make ?? null)
    onChange('chassis_number', k.chassis_number ?? null)
    onChange('engine_type',    k.engine_type)
    onChange('engine_make',    k.engine_make ?? null)
    onChange('engine_number',  k.engine_number ?? null)
    setPickerOpen(false)
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-5">

      {/* Driver & Kart Identity */}
      <div className="md:col-span-2 pb-4 border-b border-border-color">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-heading text-xs uppercase tracking-wider text-text-muted">Driver &amp; Kart</h3>
          {!readOnly && (
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="flex items-center gap-1.5 text-xs font-heading font-bold uppercase tracking-wider text-accent-primary hover:opacity-80 transition-opacity cursor-pointer"
            >
              <Users size={13} />
              Select from My Team
            </button>
          )}
        </div>

        {/* Driver picker modal */}
        {pickerOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setPickerOpen(false)} />
            <div className="relative bg-bg-primary border border-border-color rounded-card w-full max-w-md max-h-[80vh] flex flex-col shadow-xl">
              <div className="flex items-center justify-between px-5 py-4 border-b border-border-color">
                <h2 className="font-heading text-base font-semibold tracking-wide text-text-primary">Select Driver</h2>
                <button type="button" onClick={() => setPickerOpen(false)} className="text-text-muted hover:text-text-primary transition-colors p-1 rounded cursor-pointer text-lg leading-none">×</button>
              </div>
              <div className="overflow-y-auto p-4 space-y-2">
                {karts.length === 0 && (
                  <p className="text-sm text-text-muted text-center py-6">No drivers in My Team yet.</p>
                )}
                {karts.map(k => {
                  const driverLabel = k.driver_name?.trim() || k.nickname
                  const initials = driverLabel.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
                  const isCurrentDriver = setup.driver_name === k.driver_name && !!k.driver_name
                  const engineCount = k.engines?.length ?? 0
                  const engineLabel = engineCount === 1 ? '1 engine registered' : engineCount > 1 ? `${engineCount} engines registered` : 'No engines registered'
                  return (
                    <button
                      key={k.id}
                      type="button"
                      onClick={() => applyDriver(k)}
                      className={[
                        'w-full flex items-center gap-3 p-3 rounded-card border text-left transition-colors cursor-pointer',
                        isCurrentDriver
                          ? 'border-accent-primary bg-accent-primary/5'
                          : 'border-border-color hover:border-accent-primary/40 hover:bg-bg-elevated',
                      ].join(' ')}
                    >
                      {/* Avatar */}
                      <div className={`w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center font-heading font-bold text-xs ${isCurrentDriver ? 'bg-accent-primary text-bg-primary' : 'bg-bg-elevated text-text-muted'}`}>
                        {initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-heading font-semibold text-sm text-text-primary leading-tight">{driverLabel}</p>
                          {k.kart_class && (
                            <span className="text-xs px-1.5 py-0.5 rounded-full bg-accent-primary/15 text-accent-primary font-medium">{k.kart_class}</span>
                          )}
                        </div>
                        <p className="text-xs text-text-muted mt-0.5">{[k.kart_make, k.kart_model].filter(Boolean).join(' ') || k.chassis_type}</p>
                        <div className="flex flex-wrap gap-x-3 mt-0.5">
                          {k.chassis_number && <p className="text-xs text-text-muted/60 font-mono">Chassis #{k.chassis_number}</p>}
                          {k.engine_number  && <p className="text-xs text-text-muted/60 font-mono">Engine #{k.engine_number}</p>}
                        </div>
                        <p className={`text-xs mt-1 font-medium ${engineCount > 0 ? 'text-accent-primary/80' : 'text-text-muted/50'}`}>
                          {engineLabel}
                          {engineCount > 0 && (
                            <span className="font-normal text-text-muted/60 ml-1.5">
                              ({k.engines.map(e => `#${e.rank}: ${e.number}`).join(', ')})
                            </span>
                          )}
                        </p>
                      </div>
                      {isCurrentDriver
                        ? <Check size={14} className="text-accent-primary flex-shrink-0" />
                        : <ChevronRight size={14} className="text-text-muted flex-shrink-0" />
                      }
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Driver Name"
            value={setup.driver_name ?? ''}
            onChange={e => onChange('driver_name', e.target.value || null)}
            placeholder="e.g. Jack Smith"
            readOnly={readOnly}
            historyKey="driver_name"
          />
          <Input
            label="Chassis Number"
            value={setup.chassis_number ?? ''}
            onChange={e => onChange('chassis_number', e.target.value || null)}
            placeholder="e.g. TK-2024-001"
            readOnly={readOnly}
            historyKey="chassis_number"
          />
          <Input
            label="Engine Make"
            value={setup.engine_make ?? ''}
            onChange={e => onChange('engine_make', e.target.value || null)}
            placeholder="e.g. TM Racing, IAME, Vortex"
            readOnly={readOnly}
            historyKey="engine_make"
          />
          <Input
            label="Engine Number"
            value={setup.engine_number ?? ''}
            onChange={e => onChange('engine_number', e.target.value || null)}
            placeholder="e.g. TM-KZ-88421"
            readOnly={readOnly}
            historyKey="engine_number"
          />
        </div>
      </div>

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
