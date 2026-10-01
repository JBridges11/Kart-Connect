import { useState, useMemo, useRef } from 'react'
import { Search, X, Download } from 'lucide-react'
import { Document, Page } from 'react-pdf'
import { generateSessionReportUrl } from '@/components/SessionReportPDF'
import { supabase } from '@/lib/supabase'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { Card, Select } from '@/components/ui'
import { LapProgressChart } from '@/components/charts/LapProgressChart'
import { useSessions } from '@/hooks/useSessions'
import { useSubscription } from '@/hooks/useSubscription'
import { useTeamBranding } from '@/hooks/useTeamBranding'
import { lapMsToString } from '@/lib/formatters'

const MEDALS = ['🥇', '🥈', '🥉']

export function AnalyticsPage() {
  const [downloadingId, setDownloadingId]   = useState<string | null>(null)
  const [previewUrl, setPreviewUrl]         = useState<string | null>(null)
  const [previewFilename, setPreviewFilename] = useState<string>('')
  const [numPages, setNumPages]             = useState(1)
  const { branding } = useTeamBranding()

  async function getOrBuildPdf(sessionId: string) {
    setDownloadingId(sessionId)
    const [{ data: session }, { data: setup }, { data: lapTimes }] = await Promise.all([
      supabase.from('sessions').select('*, track:tracks(name, country), kart:karts(*)').eq('id', sessionId).single(),
      supabase.from('setups').select('*').eq('session_id', sessionId).single(),
      supabase.from('lap_times').select('*').eq('session_id', sessionId).order('lap_number'),
    ])
    setDownloadingId(null)
    if (!session) return null
    return generateSessionReportUrl({
      session: session as any,
      setup: setup ?? null,
      lapTimes: lapTimes ?? [],
      teamName: branding.team_name,
      teamLogoUrl: branding.logo_url,
    })
  }

  async function handlePreview(sessionId: string) {
    const result = await getOrBuildPdf(sessionId)
    if (result) { setPreviewUrl(result.url); setPreviewFilename(result.filename) }
  }

  async function handleViewPdf(sessionId: string) {
    const result = await getOrBuildPdf(sessionId)
    if (result) {
      const a = document.createElement('a')
      a.href = result.url
      a.download = result.filename
      a.click()
      setTimeout(() => URL.revokeObjectURL(result.url), 5_000)
    }
  }

  function closePreview() {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
  }

  function handleSave() {
    if (!previewUrl) return
    const a = document.createElement('a')
    a.href = previewUrl
    a.download = previewFilename
    a.click()
  }

  const { data: sessions, loading } = useSessions()
  const { tier } = useSubscription()
  const isTeam = tier === 'team' || tier === 'pro_team'

  const [trackSearch, setTrackSearch] = useState('')
  const [trackOpen, setTrackOpen]     = useState(false)
  const [dateFilter, setDateFilter]   = useState<string>('')
  const searchRef = useRef<HTMLDivElement>(null)

  // Sessions grouped by event_id (each event = one day at a track)
  const sessionsByEvent = useMemo(() => {
    const map: Record<string, { eventId: string; date: string; label: string; trackName: string; sessions: typeof sessions }> = {}
    for (const s of sessions) {
      if (s.best_lap_time_ms === null) continue
      const key = s.event_id ?? `${s.session_date}_${s.track_id}`
      if (!map[key]) {
        const trackName = s.track?.name ?? 'Unknown Track'
        const eventName = (s as typeof s & { event_name?: string | null }).event_name
        map[key] = {
          eventId: key,
          date: s.session_date,
          label: eventName ? `${eventName} — ${trackName}` : trackName,
          trackName,
          sessions: [],
        }
      }
      map[key].sessions.push(s)
    }
    return Object.values(map)
      .map(g => ({ ...g, sessions: [...g.sessions].sort((a, b) => a.created_at.localeCompare(b.created_at)) }))
      .sort((a, b) => b.date.localeCompare(a.date))
  }, [sessions])

  const filteredEventGroups = useMemo(() => {
    let groups = dateFilter ? sessionsByEvent.filter(g => g.date === dateFilter) : sessionsByEvent
    if (trackSearch.trim()) {
      const q = trackSearch.trim().toLowerCase()
      groups = groups.filter(g => g.trackName.toLowerCase().includes(q))
    }
    return groups
  }, [sessionsByEvent, dateFilter, trackSearch])

  // Leaderboard: every session ranked by best lap per track+class (team tiers only)
  const leaderboard = useMemo(() => {
    if (!isTeam) return []
    const groups: Record<string, Record<string, { driverName: string; bestMs: number; sessionId: string }[]>> = {}
    for (const s of sessions) {
      if (!s.best_lap_time_ms || !s.kart) continue
      const driverName = s.kart.driver_name ?? s.kart.nickname
      const kartClass  = s.kart.kart_class ?? 'Unassigned'
      const trackName  = s.track?.name ?? 'Unknown Track'
      if (!groups[trackName]) groups[trackName] = {}
      if (!groups[trackName][kartClass]) groups[trackName][kartClass] = []
      groups[trackName][kartClass].push({ driverName, bestMs: s.best_lap_time_ms, sessionId: s.id })
    }
    for (const track of Object.values(groups)) {
      for (const cls of Object.values(track)) {
        cls.sort((a, b) => a.bestMs - b.bestMs)
      }
    }
    return Object.entries(groups).map(([trackName, classes]) => ({
      trackName,
      classes: Object.entries(classes).map(([className, drivers]) => ({ className, drivers: drivers.slice(0, 5) }))
        .sort((a, b) => a.className.localeCompare(b.className)),
    })).sort((a, b) => a.trackName.localeCompare(b.trackName))
  }, [sessions, isTeam])

  const filteredLeaderboard = useMemo(() => {
    if (!trackSearch.trim()) return leaderboard
    const q = trackSearch.trim().toLowerCase()
    return leaderboard.filter(g => g.trackName.toLowerCase().includes(q))
  }, [leaderboard, trackSearch])

  // All unique track names for the combobox suggestions
  const allTrackNames = useMemo(() => {
    const seen = new Set<string>()
    for (const s of sessions) {
      const name = s.track?.name
      if (name) seen.add(name)
    }
    return Array.from(seen).sort()
  }, [sessions])

  const trackSuggestions = useMemo(() => {
    if (!trackSearch.trim()) return allTrackNames
    const q = trackSearch.trim().toLowerCase()
    return allTrackNames.filter(n => n.toLowerCase().includes(q))
  }, [allTrackNames, trackSearch])

  // Unique dates for the filter dropdown (Privateer only)
  const dateOptions = useMemo(() => {
    const seen = new Set<string>()
    const opts: { label: string; value: string }[] = []
    for (const g of sessionsByEvent) {
      if (!seen.has(g.date)) {
        seen.add(g.date)
        opts.push({ label: new Date(g.date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }), value: g.date })
      }
    }
    return opts
  }, [sessionsByEvent])

  return (
    <>
    <PageWrapper title={isTeam ? 'Leaderboard' : 'Analytics'}>
      <div className="max-w-4xl mx-auto space-y-5">

        {/* Track search combobox */}
        <div ref={searchRef} className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none z-10" />
          <input
            type="text"
            value={trackSearch}
            onChange={e => { setTrackSearch(e.target.value); setTrackOpen(true) }}
            onFocus={() => setTrackOpen(true)}
            onBlur={() => setTimeout(() => setTrackOpen(false), 150)}
            placeholder="Search or select a track…"
            className="w-full bg-bg-card border border-border-color rounded-card pl-9 pr-8 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-primary transition-colors"
          />
          {trackSearch && (
            <button
              type="button"
              onClick={() => { setTrackSearch(''); setTrackOpen(false) }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary cursor-pointer"
            >
              <X size={13} />
            </button>
          )}
          {trackOpen && trackSuggestions.length > 0 && (
            <div className="absolute z-50 mt-1 w-full bg-bg-elevated border border-border-color rounded-card shadow-lg overflow-hidden">
              {trackSuggestions.map(name => (
                <button
                  key={name}
                  type="button"
                  onMouseDown={() => { setTrackSearch(name); setTrackOpen(false) }}
                  className={`w-full text-left px-4 py-2 text-sm transition-colors cursor-pointer hover:bg-accent-primary/10 hover:text-accent-primary ${trackSearch === name ? 'text-accent-primary bg-accent-primary/5' : 'text-text-primary'}`}
                >
                  {name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Team leaderboard by track + class */}
        {isTeam && (
          <div>
            <h3 className="font-heading text-sm uppercase tracking-wider text-text-primary mb-3">
              Driver Leaderboard
            </h3>
            {loading ? (
              <Card><p className="text-text-muted text-sm">Loading…</p></Card>
            ) : filteredLeaderboard.length === 0 ? (
              <Card><p className="text-text-muted text-sm">{trackSearch ? 'No results for that track.' : 'No lap data yet.'}</p></Card>
            ) : (
              <div className="space-y-4">
                {filteredLeaderboard.map(({ trackName, classes }) => (
                  <Card key={trackName}>
                    <h4 className="font-heading text-xs uppercase tracking-widest text-accent-primary mb-3">
                      {trackName}
                    </h4>
                    <div className="space-y-4">
                      {classes.map(({ className, drivers }) => (
                        <div key={className}>
                          <p className="text-xs font-heading font-bold text-text-muted uppercase mb-2">{className}</p>
                          <div className="space-y-1">
                            {drivers.map(({ driverName, bestMs, sessionId }, i) => (
                              <div key={driverName} className="flex items-center justify-between py-1.5 px-2 rounded bg-bg-elevated">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm w-5 text-center">
                                    {i < 3 ? MEDALS[i] : <span className="text-text-muted font-mono text-xs">#{i + 1}</span>}
                                  </span>
                                  <span className="text-sm text-text-primary">{driverName}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                  <button
                                    type="button"
                                    onClick={() => void handlePreview(sessionId)}
                                    disabled={downloadingId === sessionId}
                                    className="text-xs text-text-muted hover:text-accent-primary transition-colors cursor-pointer disabled:opacity-40 border border-border-color hover:border-accent-primary/40 rounded px-2 py-0.5"
                                  >
                                    {downloadingId === sessionId ? '…' : 'Preview PDF'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => void handleViewPdf(sessionId)}
                                    disabled={downloadingId === sessionId}
                                    className="text-xs text-text-muted hover:text-accent-primary transition-colors cursor-pointer disabled:opacity-40 border border-border-color hover:border-accent-primary/40 rounded px-2 py-0.5"
                                  >
                                    Save PDF
                                  </button>
                                  <span className="font-mono text-sm text-accent-primary">{lapMsToString(bestMs)}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Lap progression by date — Privateer only */}
        {tier === 'privateer' && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-heading text-sm uppercase tracking-wider text-text-primary">
                Best Lap Progression
              </h3>
              <div className="w-52">
                <Select
                  value={dateFilter}
                  onChange={e => setDateFilter(e.target.value)}
                  options={dateOptions}
                  placeholder="All dates"
                />
              </div>
            </div>
            {loading ? (
              <Card><p className="text-text-muted text-sm">Loading…</p></Card>
            ) : filteredEventGroups.length === 0 ? (
              <Card><p className="text-text-muted text-sm">{trackSearch ? 'No results for that track.' : 'No lap data yet.'}</p></Card>
            ) : (
              <div className="space-y-4">
                {filteredEventGroups.map(({ eventId, date, label, sessions: eventSessions }) => (
                  <Card key={eventId}>
                    <div className="flex items-baseline gap-3 mb-3">
                      <p className="font-heading text-xs uppercase tracking-wider text-text-muted">{label}</p>
                      <p className="font-mono text-xs text-text-muted">
                        {new Date(date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                    <LapProgressChart
                      lapTimes={eventSessions.map((s, i) => ({
                        id: s.id,
                        session_id: s.id,
                        lap_number: i + 1,
                        lap_time_ms: s.best_lap_time_ms!,
                        notes: s.session_name ?? `Test ${i + 1}`,
                      }))}
                      height={200}
                    />
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </PageWrapper>

    {/* PDF Preview modal */}
    {previewUrl && (
      <div className="fixed inset-0 z-50 flex flex-col bg-black/80">
        <div className="flex items-center justify-between px-4 py-2 bg-bg-card border-b border-border-color flex-shrink-0">
          <span className="text-sm font-semibold text-text-primary">Setup PDF Preview</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-1.5 text-xs text-text-muted hover:text-accent-primary transition-colors cursor-pointer"
            >
              <Download size={13} /> Save PDF
            </button>
            <button
              type="button"
              onClick={closePreview}
              className="p-1.5 rounded hover:bg-bg-elevated text-text-muted hover:text-text-primary transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto bg-gray-700 flex flex-col items-center py-6 gap-4">
          <Document
            file={previewUrl}
            onLoadSuccess={({ numPages: n }) => setNumPages(n)}
            loading={<p className="text-white text-sm">Loading…</p>}
          >
            {Array.from({ length: numPages }, (_, i) => (
              <Page key={i + 1} pageNumber={i + 1} width={Math.min(window.innerWidth - 48, 800)} className="shadow-2xl mb-4" />
            ))}
          </Document>
        </div>
      </div>
    )}
    </>
  )
}
