import { pdf } from '@react-pdf/renderer'
import { createElement } from 'react'
import { SetupPDFDocument } from '@/components/pdf/SetupPDFDocument'
import { supabase } from '@/lib/supabase'
import { lapMsToString } from '@/lib/formatters'
import type { Session, Setup, Kart } from '@/types'

interface Branding {
  team_name?: string | null
  logo_url?: string | null
  primary_color?: string | null
}

export async function generateSetupPDF(sessionId: string, branding?: Branding) {
  const [{ data: session }, { data: setup }] = await Promise.all([
    supabase.from('sessions').select('*, track:tracks(name, country), kart:karts(*)').eq('id', sessionId).single(),
    supabase.from('setups').select('*').eq('session_id', sessionId).single(),
  ])

  if (!session) return

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const blob = await pdf(createElement(SetupPDFDocument, {
    session: session as Session & { kart: Kart | null },
    setup: (setup ?? null) as Setup | null,
    bestLap: session.best_lap_time_ms ? lapMsToString(session.best_lap_time_ms) : null,
    teamName: branding?.team_name,
    teamLogoUrl: branding?.logo_url,
    teamPrimaryColor: branding?.primary_color,
  }) as any).toBlob()

  const url          = URL.createObjectURL(blob)
  const driverName   = (session as Session & { kart?: Kart }).kart?.driver_name ?? 'Driver'
  const trackName    = (session as Session & { track?: { name: string } }).track?.name ?? 'Session'
  const filename     = `${driverName} — ${trackName} — ${session.session_date}.pdf`
  return { url, filename }
}
