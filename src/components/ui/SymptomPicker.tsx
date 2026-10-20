import { useState } from 'react'
import { SYMPTOM_SECTIONS } from '@/data/setupSymptoms'

interface Props {
  selected: string[]
  onChange: (selected: string[]) => void
}

export function SymptomPicker({ selected, onChange }: Props) {
  const [activeSection, setActiveSection] = useState(SYMPTOM_SECTIONS[0].id)

  const current = SYMPTOM_SECTIONS.find(s => s.id === activeSection)!

  function toggleScenario(scenario: string) {
    if (selected.includes(scenario)) {
      onChange([])
    } else {
      onChange([scenario])
    }
  }

  return (
    <div className="space-y-3">
      {/* Section tab bar — horizontal scroll */}
      <div className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
        {SYMPTOM_SECTIONS.map(section => {
          const count = section.scenarios.filter(s => selected.includes(s)).length
          const isActive = section.id === activeSection
          return (
            <button
              key={section.id}
              type="button"
              onClick={() => setActiveSection(section.id)}
              className={[
                'flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-card border text-xs font-heading font-bold whitespace-nowrap transition-all cursor-pointer',
                isActive
                  ? 'bg-accent-primary text-bg-primary border-accent-primary'
                  : 'bg-bg-elevated text-text-muted border-border-color hover:text-text-primary hover:border-accent-primary/30',
              ].join(' ')}
            >
              {section.label}
              {count > 0 && (
                <span className={[
                  'w-4 h-4 rounded-full text-[10px] flex items-center justify-center font-bold',
                  isActive ? 'bg-bg-primary text-accent-primary' : 'bg-accent-primary text-bg-primary',
                ].join(' ')}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Scenarios for active section */}
      <div className="flex flex-col gap-2">
        {current.scenarios.map(scenario => {
          const isSelected = selected.includes(scenario)
          return (
            <button
              key={scenario}
              type="button"
              onClick={() => toggleScenario(scenario)}
              className={[
                'w-full text-sm px-4 py-3 rounded-card border transition-all cursor-pointer text-left flex items-center justify-between gap-2',
                isSelected
                  ? 'bg-accent-primary/10 text-accent-primary border-accent-primary/50 font-semibold'
                  : 'bg-bg-elevated text-text-muted border-border-color hover:text-text-primary hover:border-accent-primary/30',
              ].join(' ')}
            >
              <span>{scenario}</span>
              {current.tags?.[scenario] && (
                <span className="flex-shrink-0 text-[10px] font-heading font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border border-current opacity-60">
                  {current.tags[scenario]}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {selected.length > 0 && (
        <div className="border border-accent-primary/30 rounded-card p-3 bg-accent-primary/5">
          <p className="text-xs font-heading font-bold text-accent-primary uppercase tracking-wider mb-1">Selected</p>
          <p className="text-sm text-text-primary">{selected[0]}</p>
        </div>
      )}
    </div>
  )
}
