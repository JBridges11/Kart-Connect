import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { Tabs, TabPanel } from '@/components/ui'
import { SetupFormProvider } from './SetupFormContext'
import { TheKartTab }    from './TheKartTab'
import { RearTab }       from './RearTab'
import { EngineTab }     from './EngineTab'
import { FrontEndTab }   from './FrontEndTab'
import { WheelsTyresTab } from './WheelsTyresTab'
import { ChassisTab }    from './ChassisTab'
import type { SetupFormData, PressureUnit } from '@/types'

const TABS = [
  { id: 'kart',    label: 'The Kart'      },
  { id: 'rear',    label: 'Rear'          },
  { id: 'engine',  label: 'Engine'        },
  { id: 'front',   label: 'Front End'     },
  { id: 'wheels',  label: 'Wheels & Tyres' },
  { id: 'chassis', label: 'Chassis'       },
]

interface SetupFormProps {
  initialSetup: Partial<SetupFormData>
  onChange?: (setup: Partial<SetupFormData>) => void
  onSave?: (setup: Partial<SetupFormData>) => Promise<void>
  saving?: boolean
  readOnly?: boolean
  pressureUnit?: PressureUnit
  showSaveButton?: boolean
}

export function SetupForm({
  initialSetup,
  onChange,
  onSave,
  saving = false,
  readOnly = false,
  pressureUnit = 'bar',
  showSaveButton = false,
}: SetupFormProps) {
  const [setup, setSetup] = useState<Partial<SetupFormData>>(initialSetup)
  const [activeTab, setActiveTab] = useState('kart')
  const [expandedAccordion, setExpandedAccordion] = useState<string | null>('kart')

  function handleChange<K extends keyof SetupFormData>(field: K, value: SetupFormData[K] | null) {
    const next = { ...setup, [field]: value }
    setSetup(next)
    onChange?.(next)
  }

  function renderTabContent(id: string) {
    switch (id) {
      case 'kart':    return <TheKartTab />
      case 'rear':    return <RearTab />
      case 'engine':  return <EngineTab />
      case 'front':   return <FrontEndTab />
      case 'wheels':  return <WheelsTyresTab pressureUnit={pressureUnit} />
      case 'chassis': return <ChassisTab />
      default:        return null
    }
  }

  return (
    <SetupFormProvider setup={setup} onChange={handleChange} readOnly={readOnly}>
      {/* Desktop: horizontal tabs */}
      <div className="hidden md:block">
        <Tabs tabs={TABS} activeTab={activeTab} onChange={setActiveTab} />
        <div className="pt-2">
          {TABS.map(tab => (
            <TabPanel key={tab.id} id={tab.id} activeTab={activeTab}>
              {renderTabContent(tab.id)}
            </TabPanel>
          ))}
        </div>
      </div>

      {/* Mobile: vertical accordion */}
      <div className="md:hidden space-y-1">
        {TABS.map(tab => {
          const open = expandedAccordion === tab.id
          return (
            <div key={tab.id} className="border border-border-color rounded-card overflow-hidden">
              <button
                type="button"
                onClick={() => setExpandedAccordion(open ? null : tab.id)}
                className="w-full flex items-center justify-between px-4 py-3 bg-bg-elevated text-sm font-semibold text-text-primary cursor-pointer"
              >
                <span className="font-heading uppercase tracking-wider">{tab.label}</span>
                {open
                  ? <ChevronDown size={16} className="text-accent-primary" />
                  : <ChevronRight size={16} className="text-text-muted" />
                }
              </button>
              {open && (
                <div className="px-4 pb-4">
                  {renderTabContent(tab.id)}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {showSaveButton && onSave && !readOnly && (
        <div className="flex justify-end pt-5">
          <button
            type="button"
            disabled={saving}
            onClick={() => void onSave(setup)}
            className="inline-flex items-center gap-2 px-5 py-2 bg-accent-primary text-bg-primary font-semibold text-sm rounded-card disabled:opacity-50 cursor-pointer"
          >
            {saving && <span className="w-4 h-4 border-2 border-bg-primary border-t-transparent rounded-full animate-spin" />}
            Save Setup
          </button>
        </div>
      )}
    </SetupFormProvider>
  )
}
