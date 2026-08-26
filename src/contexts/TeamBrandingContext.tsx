import { createContext, useContext, useEffect, useCallback, useState, type ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

export interface TeamBranding {
  team_name: string | null
  logo_url: string | null        // light / white background
  logo_url_dark: string | null   // dark / black background
  primary_color: string | null
  secondary_color: string | null
}

interface TeamBrandingContextValue {
  branding: TeamBranding
  loading: boolean
  save: (b: TeamBranding) => Promise<string | null>
  uploadLogo: (file: File) => Promise<string | null>
  uploadLogoDark: (file: File) => Promise<string | null>
  refetch: () => Promise<void>
}


const TeamBrandingContext = createContext<TeamBrandingContextValue>({
  branding: { team_name: null, logo_url: null, logo_url_dark: null, primary_color: null, secondary_color: null },
  loading: true,
  save: async () => null,
  uploadLogo: async () => null,
  uploadLogoDark: async () => null,
  refetch: async () => {},
})

export function TeamBrandingProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [branding, setBranding] = useState<TeamBranding>({
    team_name: null,
    logo_url: null,
    logo_url_dark: null,
    primary_color: null,
    secondary_color: null,
  })
  const [loading, setLoading] = useState(true)

  const refetch = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('team_branding')
      .select('team_name, logo_url, logo_url_dark, primary_color, secondary_color')
      .eq('user_id', user.id)
      .maybeSingle()
    if (data) {
      setBranding({
        team_name:       data.team_name,
        logo_url:        data.logo_url,
        logo_url_dark:   data.logo_url_dark ?? null,
        primary_color:   data.primary_color,
        secondary_color: data.secondary_color,
      })
    }
    setLoading(false)
  }, [user])

  useEffect(() => { void refetch() }, [refetch])

  async function save(b: TeamBranding): Promise<string | null> {
    if (!user) return 'Not logged in'
    const { error } = await supabase.from('team_branding').upsert({
      user_id:         user.id,
      team_name:       b.team_name || null,
      logo_url:        b.logo_url,
      logo_url_dark:   b.logo_url_dark,
      primary_color:   b.primary_color,
      secondary_color: b.secondary_color,
      updated_at:      new Date().toISOString(),
    })
    if (error) return error.message
    setBranding(b)

    return null
  }

  async function uploadLogo(file: File): Promise<string | null> {
    if (!user) return null
    const ext  = file.name.split('.').pop() ?? 'png'
    const path = `${user.id}/logo.${ext}`
    const { error } = await supabase.storage.from('team-logos').upload(path, file, { upsert: true })
    if (error) return null
    const { data } = supabase.storage.from('team-logos').getPublicUrl(path)
    return `${data.publicUrl}?t=${Date.now()}`
  }

  async function uploadLogoDark(file: File): Promise<string | null> {
    if (!user) return null
    const ext  = file.name.split('.').pop() ?? 'png'
    const path = `${user.id}/logo-dark.${ext}`
    const { error } = await supabase.storage.from('team-logos').upload(path, file, { upsert: true })
    if (error) return null
    const { data } = supabase.storage.from('team-logos').getPublicUrl(path)
    return `${data.publicUrl}?t=${Date.now()}`
  }

  return (
    <TeamBrandingContext.Provider value={{ branding, loading, save, uploadLogo, uploadLogoDark, refetch }}>
      {children}
    </TeamBrandingContext.Provider>
  )
}

export function useTeamBranding() {
  return useContext(TeamBrandingContext)
}
