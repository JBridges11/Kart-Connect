import { useState } from 'react'
import { X } from 'lucide-react'
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
      onChange(selected.filter(s => s !== scenario))
    } else {
      onChange([...selected, scenario])
    }
  }

  function removeScenario(scenario: string) {
    onChange(selected.filter(s => s !== scenario))
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
      <div className="flex flex-wrap gap-2 min-h-[80px]">
        {current.scenarios.map(scenario => {
          const isSelected = selected.includes(scenario)
          return (
            <button
              key={scenario}
              type="button"
              onClick={() => toggleScenario(scenario)}
              className={[
                'text-xs px-3 py-2 rounded-card border transition-all cursor-pointer text-left',
                isSelected
                  ? 'bg-accent-primary/10 text-accent-primary border-accent-primary/50 font-semibold'
                  : 'bg-bg-elevated text-text-muted border-border-color hover:text-text-primary hover:border-accent-primary/30',
              ].join(' ')}
            >
              {scenario}
            </button>
          )
        })}
      </div>

      {/* Selected Issues Summary */}
      {selected.length > 0 && (
        <div className="border border-accent-primary/30 rounded-card p-3 bg-accent-primary/5">
          <p className="text-xs font-heading font-bold text-accent-primary uppercase tracking-wider mb-2">
            Selected Issues ({selected.length})
          </p>
          <div className="flex flex-wrap gap-1.5">
            {selected.map(scenario => (
              <span
                key={scenario}
                className="flex items-center gap-1 text-xs bg-bg-card border border-accent-primary/30 text-text-primary rounded-card px-2 py-1"
              >
                {scenario}
                <button
                  type="button"
                  onClick={() => removeScenario(scenario)}
                  className="text-text-muted hover:text-accent-primary transition-colors cursor-pointer ml-0.5"
                >
                  <X size={10} />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* PLACEHOLDER: setup recommendations output slots in here beneath the selected issues summary */}
    </div>
  )
}
