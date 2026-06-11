import { createContext, useContext, type ReactNode } from 'react'
import type { SetupFormData } from '@/types'

interface SetupFormContextValue {
  setup: Partial<SetupFormData>
  onChange: <K extends keyof SetupFormData>(field: K, value: SetupFormData[K] | null) => void
  readOnly?: boolean
}

const SetupFormContext = createContext<SetupFormContextValue>({
  setup: {},
  onChange: () => undefined,
  readOnly: false,
})

export function SetupFormProvider({
  setup,
  onChange,
  readOnly,
  children,
}: SetupFormContextValue & { children: ReactNode }) {
  return (
    <SetupFormContext.Provider value={{ setup, onChange, readOnly }}>
      {children}
    </SetupFormContext.Provider>
  )
}

export function useSetupForm() {
  return useContext(SetupFormContext)
}
