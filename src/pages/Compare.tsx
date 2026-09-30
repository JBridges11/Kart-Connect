import { useState, useMemo, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { FileDown, Download, X } from 'lucide-react'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()
import { PageWrapper } from '@/components/layout/PageWrapper'
import { Card, Select, Button } from '@/components/ui'
import { useSetup } from '@/hooks/useSetup'
import { useSessions } from '@/hooks/useSessions'
import { useLapTimes } from '@/hooks/useLapTimes'
import { useTeamBranding } from '@/hooks/useTeamBranding'
import { lapMsToString, formatDate } from '@/lib/formatters'
import type { SetupFormData } from '@/types'

const SETUP_FIELDS: { key: keyof SetupFormData; label: string; section?: string }[] = [
  // Kart
  { key: 'engine_type',            label: 'Engine',                   section: 'Kart' },
  { key: 'engine_number',          label: 'Engine Number' },
  { key: 'engine_rank',            label: 'Engine Rank' },
  { key: 'carb_rank',              label: 'Carb Rank' },
  { key: 'exhaust_rank',           label: 'Exhaust Rank' },
  { key: 'kart_driver_weight_kg',  label: 'Driver Weight (kg)' },
  // Rear
  { key: 'rear_bumper',            label: 'Rear Bumper',              section: 'Rear' },
  { key: 'rear_width_mm',          label: 'Rear Width (mm)' },
  { key: 'rear_hub_length_mm',     label: 'Rear Hub Length (mm)' },
  { key: 'third_bearing',          label: 'Third Bearing' },
  { key: 'third_bearing_type',     label: 'Third Bearing Type' },
  { key: 'axle_height',            label: 'Axle Carrier Height' },
  { key: 'axle_hardness',          label: 'Axle Hardness' },
  { key: 'axle_length',            label: 'Axle Length' },
  { key: 'brake_pads',             label: 'Brake Pads' },
  { key: 'brake_bias_pct',         label: 'Brake Bias (%)' },
  // Engine
  { key: 'rear_sprocket_teeth',    label: 'Rear Sprocket (T)',        section: 'Engine' },
  { key: 'engine_sprocket_teeth',  label: 'Engine Sprocket (T)' },
  { key: 'sprocket_carrier_type',  label: 'Sprocket Carrier' },
  { key: 'chain_measurement',      label: 'Chain' },
  { key: 'spark_plug',             label: 'Spark Plug' },
  { key: 'tape_over_rad',          label: 'Tape Over Rad (%)' },
  // Carburettor
  { key: 'main_jet',               label: 'Main Jet',                 section: 'Carburettor' },
  { key: 'air_screw',              label: 'Air Screw' },
  { key: 'needle_position',        label: 'Needle Position' },
  { key: 'float_height',           label: 'Float Height' },
  { key: 'carb_year',              label: 'Carb Year' },
  // Front End
  { key: 'front_width_mm',         label: 'Front Width (mm)',         section: 'Front End' },
  { key: 'front_hub_length_mm',    label: 'Front Hub Length (mm)' },
  { key: 'right_height',           label: 'Right Height' },
  { key: 'camber',                 label: 'Camber (°)' },
  { key: 'caster',                 label: 'Caster (°)' },
  { key: 'toe',                    label: 'Toe (mm)' },
  { key: 'stub_axle',              label: 'Stub Axle' },
  // Wheels & Tyres
  { key: 'wheel_type',             label: 'Wheels',                   section: 'Wheels & Tyres' },
  { key: 'tyre_make',              label: 'Tyre Make' },
  { key: 'tyre_model',             label: 'Tyre Model' },
  { key: 'tyre_condition',         label: 'Tyre Condition' },
  { key: 'tyre_pressure_fl',       label: 'Pressure FL' },
  { key: 'tyre_pressure_fr',       label: 'Pressure FR' },
  { key: 'tyre_pressure_rl',       label: 'Pressure RL' },
  { key: 'tyre_pressure_rr',       label: 'Pressure RR' },
  // Chassis / Seat
  { key: 'seat_hardness',          label: 'Seat Hardness',            section: 'Chassis & Seat' },
  { key: 'seat_position',          label: 'Seat Position' },
  { key: 'seat_bolts_front',       label: 'Seat Bolts Front' },
  { key: 'seat_bolts_back',        label: 'Seat Bolts Back' },
  { key: 'seat_stay_left',         label: 'Seat Stay Left' },
  { key: 'seat_stay_right',        label: 'Seat Stay Right' },
]

function formatValue(v: unknown): string {
  if (v === null || v === undefined) return '—'
  if (typeof v === 'boolean') return v ? 'Yes' : 'No'
  return String(v)
}

export function ComparePage() {
  const [searchParams] = useSearchParams()
  const { data: sessions, loading } = useSessions()
  const { branding } = useTeamBranding()
  const [idA, setIdA] = useState<string>(searchParams.get('a') ?? '')
  const [idB, setIdB] = useState<string>(searchParams.get('b') ?? '')

  // Re-apply URL params when sessions load (they may not be ready on first render)
  useEffect(() => {
    const a = searchParams.get('a')
    const b = searchParams.get('b')
    if (a) setIdA(a)
    if (b) setIdB(b)
  }, [sessions, searchParams])

  const { data: setupA } = useSetup(idA || null)
  const { data: setupB } = useSetup(idB || null)
  const { data: lapTimesA } = useLapTimes(idA || null)
  const { data: lapTimesB } = useLapTimes(idB || null)

  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [numPages, setNumPages] = useState(1)

  const sessionA = sessions.find(s => s.id === idA)
  const sessionB = sessions.find(s => s.id === idB)

  async function openPreview() {
    if (!sessionA || !sessionB) return
    setExportError(null)
    setExporting(true)
    try {
      const { generateComparePDF } = await import('@/components/ComparePDF')
      const result = await generateComparePDF({
        sessionA, sessionB,
        setupA: setupA ?? null,
        setupB: setupB ?? null,
        lapTimesA, lapTimesB,
        labelA: sessionTestLabel[idA],
        labelB: sessionTestLabel[idB],
        teamName: branding.team_name,
        teamLogoUrl: branding.logo_url,
        teamPrimaryColor: branding.primary_color,
      })
      if (result) {
        setPreviewUrl(result.url)
        setShowPreview(true)
      }
    } catch (err) {
      setExportError(err instanceof Error ? err.message : String(err))
    } finally {
      setExporting(false)
    }
  }

  async function downloadPDF() {
    if (!sessionA || !sessionB) return
    setExporting(true)
    setExportError(null)
    try {
      const { generateComparePDF } = await import('@/components/ComparePDF')
      const result = await generateComparePDF({
        sessionA, sessionB,
        setupA: setupA ?? null,
        setupB: setupB ?? null,
        lapTimesA,
        lapTimesB,
        labelA: sessionTestLabel[idA],
        labelB: sessionTestLabel[idB],
      })
      if (result) {
        const a = document.createElement('a')
        a.href = result.url
        a.download = result.filename
        a.click()
        setTimeout(() => URL.revokeObjectURL(result.url), 5000)
      }
    } catch (err) {
      setExportError(err instanceof Error ? err.message : String(err))
    } finally {
      setExporting(false)
    }
  }

  // Compute test number per session within its event (ordered by created_at).
  // Sessions with no event_id are all grouped together so they get sequential
  // numbers (Test 1, Test 2 … Test N) rather than every one being "Test 1".
  const sessionTestLabel = useMemo(() => {
    const byEvent: Record<string, typeof sessions> = {}
    for (const s of sessions) {
      const key = s.event_id ?? '__no_event__'
      if (!byEvent[key]) byEvent[key] = []
      byEvent[key].push(s)
    }
    const labels: Record<string, string> = {}
    for (const group of Object.values(byEvent)) {
      const sorted = [...group].sort((a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      )
      sorted.forEach((s, i) => {
        labels[s.id] = `${s.track?.name ?? '?'} — ${formatDate(s.session_date)} — Test ${i + 1}`
      })
    }
    return labels
  }, [sessions])

  // Short label for header display — just "Test N" extracted from the full event-aware label
  const getShortLabel = (id: string) => {
    const full = sessionTestLabel[id]
    if (!full) return null
    const m = full.match(/Test \d+/)
    return m ? m[0] : full
  }

  // Dropdown: always use the event-aware label (track + date + test number) so numbers are correct
  const sessionOptions = sessions.map(s => ({
    label: sessionTestLabel[s.id] ?? `${s.track?.name ?? '?'} — ${formatDate(s.session_date)}`,
    value: s.id,
  }))

  const diffFields = useMemo(() => {
    if (!setupA || !setupB) return new Set<keyof SetupFormData>()
    const diffs = new Set<keyof SetupFormData>()
    for (const { key } of SETUP_FIELDS) {
      if (String(setupA[key as keyof typeof setupA]) !== String(setupB[key as keyof typeof setupB])) {
        diffs.add(key)
      }
    }
    return diffs
  }, [setupA, setupB])

  return (
    <PageWrapper title="Compare Setups">
      <div className="max-w-4xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
          <Select
            label="Session A"
            value={idA}
            onChange={e => setIdA(e.target.value)}
            options={sessionOptions}
            placeholder="Choose session A…"
          />
          <Select
            label="Session B"
            value={idB}
            onChange={e => setIdB(e.target.value)}
            options={sessionOptions}
            placeholder="Choose session B…"
          />
        </div>

        {loading && <p className="text-text-muted text-sm">Loading sessions…</p>}

        {idA && idB && sessionA && sessionB && (
          <div className="flex flex-col items-end gap-2 mb-3">
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={openPreview}>
                <FileDown size={14} /> Preview PDF
              </Button>
              <Button size="sm" variant="secondary" onClick={() => void downloadPDF()} loading={exporting}>
                <Download size={14} /> Save PDF
              </Button>
            </div>
            {exportError && (
              <p className="text-xs text-red-400 max-w-sm text-right">{exportError}</p>
            )}
          </div>
        )}

        {idA && idB && (
          <Card>
            {/* Header row */}
            <div className="grid grid-cols-[200px_1fr_1fr] gap-2 pb-3 mb-3 border-b border-border-color">
              <div />
              <div>
                <p className="font-heading text-xs uppercase tracking-wider text-text-muted">Session A</p>
                <p className="text-sm font-semibold text-text-primary mt-0.5">
                  {sessionA ? (getShortLabel(sessionA.id) ?? sessionA.track?.name ?? '—') : '—'}
                </p>
                <p className="text-xs text-text-muted font-mono">
                  {sessionA ? formatDate(sessionA.session_date) : ''}
                </p>
                {sessionA?.best_lap_time_ms && (
                  <p className="text-accent-primary font-mono text-sm">
                    {lapMsToString(sessionA.best_lap_time_ms)}
                  </p>
                )}
              </div>
              <div>
                <p className="font-heading text-xs uppercase tracking-wider text-text-muted">Session B</p>
                <p className="text-sm font-semibold text-text-primary mt-0.5">
                  {sessionB ? (getShortLabel(sessionB.id) ?? sessionB.track?.name ?? '—') : '—'}
                </p>
                <p className="text-xs text-text-muted font-mono">
                  {sessionB ? formatDate(sessionB.session_date) : ''}
                </p>
                {sessionB?.best_lap_time_ms && (
                  <p className="text-accent-primary font-mono text-sm">
                    {lapMsToString(sessionB.best_lap_time_ms)}
                  </p>
                )}
              </div>
            </div>

            {/* Rows */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <tbody>
                  {SETUP_FIELDS.map(({ key, label, section }) => {
                    const vA = setupA ? formatValue(setupA[key as keyof typeof setupA]) : '—'
                    const vB = setupB ? formatValue(setupB[key as keyof typeof setupB]) : '—'
                    const differs = diffFields.has(key)
                    return (
                      <>
                        {section && (
                          <tr key={`section-${section}`}>
                            <td colSpan={3} className="pt-4 pb-1 text-xs font-heading font-bold uppercase tracking-widest text-accent-primary border-b border-border-color">
                              {section}
                            </td>
                          </tr>
                        )}
                        <tr
                          key={key}
                          className={[
                            'border-b border-border-color last:border-0',
                            differs ? 'bg-accent-secondary/5' : '',
                          ].join(' ')}
                        >
                          <td className="py-2 pr-4 text-text-muted font-heading uppercase tracking-wider w-48 whitespace-nowrap">
                            {label}
                          </td>
                          <td className={['py-2 pr-4 font-mono', differs ? 'text-accent-primary' : 'text-text-primary'].join(' ')}>
                            {vA}
                          </td>
                          <td className={['py-2 font-mono', differs ? 'text-accent-primary' : 'text-text-primary'].join(' ')}>
                            {vB}
                          </td>
                        </tr>
                      </>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {diffFields.size > 0 && (
              <p className="mt-3 text-xs text-text-muted">
                <span className="text-accent-secondary">{diffFields.size}</span> field{diffFields.size !== 1 ? 's' : ''} differ between the two setups.
              </p>
            )}
          </Card>
        )}

        {idA && !idB && (
          <p className="text-text-muted text-sm text-center py-8">Select Session B to compare.</p>
        )}
        {!idA && (
          <p className="text-text-muted text-sm text-center py-8">
            Select two sessions to compare their setups side-by-side.
          </p>
        )}
      </div>

      {/* PDF Preview modal — canvas rendered, no browser PDF plugin needed */}
      {showPreview && previewUrl && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/80">
          <div className="flex items-center justify-between px-4 py-2 bg-bg-card border-b border-border-color flex-shrink-0">
            <span className="text-sm font-semibold text-text-primary">PDF Preview</span>
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={() => void downloadPDF()} loading={exporting}>
                <Download size={13} /> Save PDF
              </Button>
              <button
                onClick={() => { setShowPreview(false); setPreviewUrl(null) }}
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
              onLoadError={e => setExportError(e.message)}
              loading={<p className="text-white text-sm">Loading pages…</p>}
            >
              {Array.from({ length: numPages }, (_, i) => (
                <Page
                  key={i + 1}
                  pageNumber={i + 1}
                  width={Math.min(window.innerWidth - 48, 800)}
                  onRenderSuccess={i === 0 ? undefined : undefined}
                  className="shadow-2xl"
                />
              ))}
            </Document>
          </div>
        </div>
      )}
    </PageWrapper>
  )
}
