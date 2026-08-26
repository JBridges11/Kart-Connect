import { createContext, useContext, type ReactNode } from 'react'
import type { SetupFormData, KartEngine } from '@/types'

interface SetupFormContextValue {
  setup: Partial<SetupFormData>
  onChange: <K extends keyof SetupFormData>(field: K, value: SetupFormData[K] | null) => void
  readOnly?: boolean
  hideIdentifiers?: boolean
  engines?: KartEngine[]
}

const SetupFormContext = createContext<SetupFormContextValue>({
  setup: {},
  onChange: () => undefined,
  readOnly: false,
  hideIdentifiers: false,
  engines: [],
})

export function SetupFormProvider({
  setup,
  onChange,
  readOnly,
  hideIdentifiers,
  engines,
  children,
}: SetupFormContextValue & { children: ReactNode }) {
  return (
    <SetupFormContext.Provider value={{ setup, onChange, readOnly, hideIdentifiers, engines }}>
      {children}
    </SetupFormContext.Provider>
  )
}

export function useSetupForm() {
  return useContext(SetupFormContext)
}
