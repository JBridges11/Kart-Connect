import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

interface AuthContextValue {
  user: User | null
  session: Session | null
  loading: boolean
  /**
   * Force a server-authoritative refresh of the user object in context.
   * Call this after operations that change the user's email (or other
   * fields) when you need the context to reflect the new value immediately,
   * rather than waiting for the next onAuthStateChange event to resolve.
   */
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  session: null,
  loading: true,
  refreshUser: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setUser(data.session?.user ?? null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, s) => {
      if (event === 'USER_UPDATED') {
        // USER_UPDATED fires for any user attribute change (email, password, metadata).
        // The session JWT may still carry the old email claim until the token is
        // refreshed server-side, so call getUser() which always fetches the
        // authoritative record from Supabase — this ensures the new email shows
        // immediately after the confirmation link is clicked.
        const { data } = await supabase.auth.getUser()
        setSession(s)
        setUser(data.user ?? s?.user ?? null)
      } else {
        setSession(s)
        setUser(s?.user ?? null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function refreshUser() {
    const { data } = await supabase.auth.getUser()
    setUser(data.user ?? null)
  }

  return (
    <AuthContext.Provider value={{ user, session, loading, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
