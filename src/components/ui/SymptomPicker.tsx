import { useState } from 'react'
import { ChevronDown, X } from 'lucide-react'
import { SYMPTOM_SECTIONS } from '@/data/setupSymptoms'

interface Props {
  selected: string[]
  onChange: (selected: string[]) => void
}

export function SymptomPicker({ selected, onChange }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  function toggleSection(id: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

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
    <div className="space-y-2">
      {SYMPTOM_SECTIONS.map(section => {
        const isOpen = expanded.has(section.id)
        const sectionSelected = section.scenarios.filter(s => selected.includes(s))

        return (
          <div key={section.id} className="border border-border-color rounded-card overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection(section.id)}
              className="w-full flex items-center justify-between px-3 py-2.5 bg-bg-elevated hover:bg-bg-elevated/80 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <span className="font-heading font-bold text-sm text-text-primary">{section.label}</span>
                {sectionSelected.length > 0 && (
                  <span className="bg-accent-primary text-bg-primary text-xs font-heading font-bold rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">
                    {sectionSelected.length}
                  </span>
                )}
              </div>
              <ChevronDown
                size={14}
                className={`text-text-muted transition-transform duration-200 flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {isOpen && (
              <div className="px-3 py-3 flex flex-wrap gap-2 bg-bg-card">
                {section.scenarios.map(scenario => {
                  const isSelected = selected.includes(scenario)
                  return (
                    <button
                      key={scenario}
                      type="button"
                      onClick={() => toggleScenario(scenario)}
                      className={[
                        'text-xs px-2.5 py-1.5 rounded-card border transition-all cursor-pointer text-left',
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
            )}
          </div>
        )
      })}

      {/* Selected Issues Summary */}
      {selected.length > 0 && (
        <div className="mt-3 border border-accent-primary/30 rounded-card p-3 bg-accent-primary/5">
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
