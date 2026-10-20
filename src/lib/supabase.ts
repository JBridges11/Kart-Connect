import { createClient } from '@supabase/supabase-js'
import { Preferences } from '@capacitor/preferences'
import { Capacitor } from '@capacitor/core'

const url = import.meta.env.VITE_SUPABASE_URL as string
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string

// On native platforms use @capacitor/preferences so the session survives
// app restarts and OS-level storage clears. On web, fall back to the
// default localStorage adapter.
const storage = Capacitor.isNativePlatform()
  ? {
      getItem:    (k: string) => Preferences.get({ key: k }).then(r => r.value),
      setItem:    (k: string, v: string) => Preferences.set({ key: k, value: v }).then(() => undefined),
      removeItem: (k: string) => Preferences.remove({ key: k }).then(() => undefined),
    }
  : undefined

export const supabase = createClient(url, key, storage ? { auth: { storage } } : undefined)
