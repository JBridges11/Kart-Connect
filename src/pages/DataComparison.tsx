import { useState, useCallback, useRef, useMemo } from 'react'
import { Upload, X, AlertCircle, ChevronDown, ChevronUp, Download, Map } from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { Card } from '@/components/ui'
import { TrackMapCanvas } from '@/components/TrackMapCanvas'
import {
  parseCSVAny,
  type ImportedDataSession,
  type ImportedGPSSession,
  type DataLoggerBrand,
  BRAND_COLORS,
  BRAND_LABELS,
} from '@/lib/dataLoggerImport'
import { exportGPX, exportKML, exportNormalizedCSV } from '@/lib/dataLoggerExport'
import { lapMsToString } from '@/lib/formatters'

const SESSION_COLORS = [
  '#CA8A04', '#60A5FA', '#34D399', '#F472B6',
  '#A78BFA', '#FB923C', '#38BDF8', '#4ADE80',
]

function getBestLap(laps: ImportedDataSession['laps']) {
  return laps.reduce((b, l) => l.lapTimeMs < b.lapTimeMs ? l : b)
}

function getAvgLap(laps: ImportedDataSession['laps']) {
  return Math.round(laps.reduce((s, l) => s + l.lapTimeMs, 0) / laps.length)
}

function BrandBadge({ brand }: { brand: DataLoggerBrand }) {
  return (
    <span
      className="text-[10px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded flex-shrink-0"
      style={{ backgroundColor: BRAND_COLORS[brand] + '28', color: BRAND_COLORS[brand], border: `1px solid ${BRAND_COLORS[brand]}55` }}
    >
      {BRAND_LABELS[brand]}
    </span>
  )
}

// Downsample GPS points for charts (max 600 points per session)
function downsampleGPS(session: ImportedGPSSession, target = 600) {
  const { points } = session
  if (points.length <= target) return points
  const step = points.length / target
  return Array.from({ length: target }, (_, i) => points[Math.floor(i * step)])
}

function LapTimeTooltip({ active, payload, label, sessions }: {
  active?: boolean
  payload?: Array<{ dataKey: string; value: number | null; color: string }>
  label?: number
  sessions: ImportedDataSession[]
}) {
  if (!active || !payload?.length) return null
  const items = payload.filter(p => p.value != null)
  if (!items.length) return null
  return (
    <div className="bg-[#1C1C28] border border-[#2A2A3A] rounded px-3 py-2 space-y-1">
      <p className="text-xs text-[#6B7A99] font-mono mb-1">Lap {label}</p>
      {items.map(p => {
        const s = sessions.find(s => s.id === p.dataKey)
        return (
          <div key={p.dataKey} className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
            <span className="text-xs text-[#6B7A99] font-mono truncate max-w-[120px]">{s?.driverLabel ?? p.dataKey}</span>
            <span className="font-mono text-sm font-semibold ml-auto" style={{ color: p.color }}>{lapMsToString(p.value!)}</span>
          </div>
        )
      })}
    </div>
  )
}

function SpeedTooltip({ active, payload, label, sessions }: {
  active?: boolean
  payload?: Array<{ dataKey: string; value: number | null; color: string }>
  label?: number
  sessions: ImportedGPSSession[]
}) {
  if (!active || !payload?.length) return null
  const items = payload.filter(p => p.value != null)
  if (!items.length) return null
  return (
    <div className="bg-[#1C1C28] border border-[#2A2A3A] rounded px-3 py-2 space-y-1">
      <p className="text-xs text-[#6B7A99] font-mono mb-1">{(label ?? 0).toFixed(0)} m</p>
      {items.map(p => {
        const s = sessions.find(s => s.id === p.dataKey)
        return (
          <div key={p.dataKey} className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
            <span className="text-xs text-[#6B7A99] font-mono truncate max-w-[120px]">{s?.driverLabel}</span>
            <span className="font-mono text-sm font-semibold ml-auto" style={{ color: p.color }}>{p.value!.toFixed(1)} km/h</span>
          </div>
        )
      })}
    </div>
  )
}

export function DataComparisonPage() {
  const [lapSessions,  setLapSessions]  = useState<ImportedDataSession[]>([])
  const [gpsSessions,  setGpsSessions]  = useState<ImportedGPSSession[]>([])
  const [errors,       setErrors]       = useState<string[]>([])
  const [isDragging,   setIsDragging]   = useState(false)
  const [showAllLaps,  setShowAllLaps]  = useState(false)
  const [activeGpsLap, setActiveGpsLap] = useState<number | null>(null) // null = all laps
  const fileRef = useRef<HTMLInputElement>(null)

  // Offset index so GPS and lap sessions share a consistent color palette
  const lapColor  = (i: number) => SESSION_COLORS[i % SESSION_COLORS.length]
  const gpsColor  = (i: number) => SESSION_COLORS[(i + lapSessions.length) % SESSION_COLORS.length]

  const processFiles = useCallback(async (files: FileList | File[]) => {
    const newErrors: string[] = []
    const newLap: ImportedDataSession[] = []
    const newGps: ImportedGPSSession[]  = []

    for (const file of Array.from(files)) {
      if (!file.name.toLowerCase().endsWith('.csv')) {
        newErrors.push(`${file.name}: Not a CSV file`)
        continue
      }
      const text = await file.text()
      const result = parseCSVAny(file.name, text)
      if (result.type === 'lap') newLap.push(result.session)
      else if (result.type === 'gps') newGps.push(result.session)
      else newErrors.push(result.error)
    }

    setLapSessions(prev => [...prev, ...newLap])
    setGpsSessions(prev => [...prev, ...newGps])
    setErrors(prev => [...prev, ...newErrors])
  }, [])

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files?.length) void processFiles(e.target.files)
    e.target.value = ''
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files.length) void processFiles(e.dataTransfer.files)
  }

  // ── Lap summary data ──────────────────────────────────────────────────────
  const maxLap = useMemo(
    () => lapSessions.reduce((m, s) => Math.max(m, ...s.laps.map(l => l.lapNumber)), 0),
    [lapSessions],
  )

  const lapChartData = useMemo(() => {
    if (!maxLap) return []
    return Array.from({ length: maxLap }, (_, i) => {
      const lap = i + 1
      const row: Record<string, number | null | undefined> = { lap }
      lapSessions.forEach(s => {
        const l = s.laps.find(l => l.lapNumber === lap)
        row[s.id] = l?.lapTimeMs ?? null
      })
      return row
    })
  }, [lapSessions, maxLap])

  const lapRows = useMemo(() => {
    if (!maxLap) return []
    const rows = Array.from({ length: maxLap }, (_, i) => {
      const lap = i + 1
      return { lap, laps: lapSessions.map(s => s.laps.find(l => l.lapNumber === lap) ?? null) }
    })
    return showAllLaps ? rows : rows.slice(0, 15)
  }, [lapSessions, maxLap, showAllLaps])

  const hasLapSpeed = lapSessions.some(s => s.laps.some(l => l.maxSpeedKmh != null))
  const hasLapRpm   = lapSessions.some(s => s.laps.some(l => l.maxRpm != null))
  const allLapMs    = lapSessions.flatMap(s => s.laps.map(l => l.lapTimeMs))
  const lapChartDomain: [number, number] = allLapMs.length
    ? [Math.min(...allLapMs) - 500, Math.max(...allLapMs) + 500]
    : [0, 120000]

  // ── GPS data ──────────────────────────────────────────────────────────────
  const hasLaps = gpsSessions.some(s => s.lapGroups.length > 0)
  const numGpsLaps = hasLaps
    ? Math.max(...gpsSessions.filter(s => s.lapGroups.length > 0).map(s => s.lapGroups.length))
    : 0

  // Points to show for the currently selected lap (or all points)
  const displayedGpsSessions = useMemo(() => {
    if (activeGpsLap == null || !hasLaps) return gpsSessions
    return gpsSessions.map(s => {
      if (!s.lapGroups.length) return s
      const lapPts = s.lapGroups[activeGpsLap] ?? s.points
      return { ...s, points: lapPts }
    })
  }, [gpsSessions, activeGpsLap, hasLaps])

  const speedChartData = useMemo(() => {
    if (!gpsSessions.length) return []
    const hasSpeeds = gpsSessions.some(s => s.points.some(p => p.speedKmh != null))
    if (!hasSpeeds) return []

    // Normalise all to same distance axis (use densest dataset as reference)
    const maxDist = Math.max(...displayedGpsSessions.map(s => s.totalDistanceM))
    const BINS = 500
    const binW = maxDist / BINS

    return Array.from({ length: BINS }, (_, bi) => {
      const dist = Math.round(bi * binW)
      const row: Record<string, number | null> = { dist }
      displayedGpsSessions.forEach(s => {
        const pts = downsampleGPS(s)
        const closest = pts.reduce<typeof pts[0] | null>((best, p) => {
          if (p.speedKmh == null) return best
          if (!best) return p
          return Math.abs(p.distanceM - dist) < Math.abs(best.distanceM - dist) ? p : best
        }, null)
        row[s.id] = closest?.speedKmh ?? null
      })
      return row
    })
  }, [displayedGpsSessions, gpsSessions])

  const hasGpsSpeed = gpsSessions.some(s => s.points.some(p => p.speedKmh != null))

  const hasAnything = lapSessions.length > 0 || gpsSessions.length > 0

  return (
    <PageWrapper title="Data Logger Comparison">
      <div className="max-w-5xl mx-auto space-y-4">

        {/* Import card */}
        <Card>
          <div className="space-y-3">
            <div>
              <h2 className="text-[#F0F0F0] font-semibold">Import CSV exports</h2>
              <p className="text-[#6B7A99] text-sm mt-0.5">
                Supports AIM · Unipro · Starlane · Alfano — import lap summaries and/or GPS channel exports at the same time
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {(['aim', 'unipro', 'starlane', 'alfano'] as DataLoggerBrand[]).map(b => (
                <BrandBadge key={b} brand={b} />
              ))}
            </div>

            <div
              onClick={() => fileRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={onDrop}
              className={[
                'border-2 border-dashed rounded-xl p-8 flex flex-col items-center gap-3 cursor-pointer transition-colors',
                isDragging
                  ? 'border-accent-primary bg-accent-primary/5'
                  : 'border-[#2A2A3A] hover:border-[#3A3A4A] hover:bg-[#1C1C28]',
              ].join(' ')}
            >
              <Upload size={28} className="text-[#6B7A99]" />
              <div className="text-center">
                <p className="text-[#F0F0F0] text-sm font-medium">Drop CSV files here or click to browse</p>
                <p className="text-[#6B7A99] text-xs mt-1">
                  Lap summary CSV → lap time charts &nbsp;·&nbsp; GPS channel CSV (with Lat/Lon) → track map + speed trace + GPX/KML export
                </p>
              </div>
            </div>
            <input ref={fileRef} type="file" accept=".csv" multiple className="hidden" onChange={onFileChange} />

            {errors.length > 0 && (
              <div className="space-y-1">
                {errors.map((e, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                    <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                    <span className="flex-1">{e}</span>
                    <button onClick={() => setErrors(prev => prev.filter((_, j) => j !== i))}><X size={12} /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        {!hasAnything ? (
          <div className="text-center py-16 text-[#6B7A99] space-y-2">
            <p className="text-sm">Import CSV files above to start comparing</p>
            <p className="text-xs">Tip: for GPS data, export the full "channel data" or "raw data" CSV (not just the lap summary)</p>
          </div>
        ) : (
          <>
            {/* ── LAP SUMMARY SECTION ─────────────────────────────────────── */}
            {lapSessions.length > 0 && (
              <>
                <div className="flex items-center gap-2 flex-wrap">
                  {lapSessions.map((s, i) => (
                    <div key={s.id} className="flex items-center gap-2 px-3 py-1.5 rounded-full border bg-[#1C1C28] text-sm" style={{ borderColor: lapColor(i) + '55' }}>
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: lapColor(i) }} />
                      <BrandBadge brand={s.brand} />
                      <input value={s.driverLabel} onChange={e => setLapSessions(prev => prev.map(x => x.id === s.id ? { ...x, driverLabel: e.target.value } : x))}
                        className="bg-transparent text-[#F0F0F0] font-medium outline-none min-w-0 w-[100px]" />
                      <span className="text-[#6B7A99] text-xs">{s.laps.length} laps</span>
                      <button onClick={() => setLapSessions(prev => prev.filter(x => x.id !== s.id))} className="text-[#6B7A99] hover:text-red-400 transition-colors ml-1"><X size={13} /></button>
                    </div>
                  ))}
                </div>

                <Card>
                  <h3 className="text-[#F0F0F0] font-semibold mb-4">Lap Times</h3>
                  <ResponsiveContainer width="100%" height={240}>
                    <LineChart data={lapChartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#2A2A3A" />
                      <XAxis dataKey="lap" tick={{ fill: '#6B7A99', fontSize: 11 }} label={{ value: 'Lap', position: 'insideBottomRight', fill: '#6B7A99', fontSize: 11 }} stroke="#2A2A3A" />
                      <YAxis domain={lapChartDomain} tickFormatter={lapMsToString} tick={{ fill: '#6B7A99', fontSize: 11 }} stroke="#2A2A3A" width={72} />
                      <Tooltip content={<LapTimeTooltip sessions={lapSessions} />} />
                      <Legend formatter={(v: string) => lapSessions.find(s => s.id === v)?.driverLabel ?? v} wrapperStyle={{ fontSize: 11, color: '#6B7A99', paddingTop: 4 }} />
                      {lapSessions.map((s, i) => (
                        <Line key={s.id} type="monotone" dataKey={s.id} name={s.id} stroke={lapColor(i)} strokeWidth={2}
                          dot={{ fill: lapColor(i), r: 2.5, strokeWidth: 0 }} activeDot={{ r: 5 }} connectNulls={false} />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </Card>

                <Card>
                  <h3 className="text-[#F0F0F0] font-semibold mb-4">Summary</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-[#6B7A99] text-xs uppercase tracking-wide border-b border-[#2A2A3A]">
                          <th className="text-left pb-2 pr-4">Driver</th>
                          <th className="text-left pb-2 pr-4">Brand</th>
                          <th className="text-right pb-2 pr-4">Laps</th>
                          <th className="text-right pb-2 pr-4">Best Lap</th>
                          <th className="text-right pb-2 pr-4">Avg Lap</th>
                          {hasLapSpeed && <th className="text-right pb-2 pr-4">Top Speed</th>}
                          {hasLapRpm   && <th className="text-right pb-2">Max RPM</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#2A2A3A]">
                        {lapSessions.map((s, i) => {
                          const best   = getBestLap(s.laps)
                          const avg    = getAvgLap(s.laps)
                          const topSpd = s.laps.reduce<number | null>((mx, l) => l.maxSpeedKmh != null ? Math.max(mx ?? 0, l.maxSpeedKmh) : mx, null)
                          const maxRpm = s.laps.reduce<number | null>((mx, l) => l.maxRpm != null ? Math.max(mx ?? 0, l.maxRpm) : mx, null)
                          return (
                            <tr key={s.id} className="text-[#F0F0F0]">
                              <td className="py-2.5 pr-4">
                                <div className="flex items-center gap-2">
                                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: lapColor(i) }} />
                                  <span className="font-medium truncate max-w-[140px]">{s.driverLabel}</span>
                                </div>
                              </td>
                              <td className="py-2.5 pr-4"><BrandBadge brand={s.brand} /></td>
                              <td className="py-2.5 pr-4 text-right font-mono text-[#6B7A99]">{s.laps.length}</td>
                              <td className="py-2.5 pr-4 text-right font-mono font-semibold" style={{ color: lapColor(i) }}>{lapMsToString(best.lapTimeMs)}</td>
                              <td className="py-2.5 pr-4 text-right font-mono text-[#6B7A99]">{lapMsToString(avg)}</td>
                              {hasLapSpeed && <td className="py-2.5 pr-4 text-right font-mono text-[#6B7A99]">{topSpd != null ? `${topSpd.toFixed(1)} km/h` : '—'}</td>}
                              {hasLapRpm   && <td className="py-2.5 text-right font-mono text-[#6B7A99]">{maxRpm != null ? maxRpm.toLocaleString() : '—'}</td>}
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </Card>

                <Card>
                  <h3 className="text-[#F0F0F0] font-semibold mb-4">Lap by Lap</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-[#6B7A99] text-xs uppercase tracking-wide border-b border-[#2A2A3A]">
                          <th className="text-left pb-2 pr-4 w-12">Lap</th>
                          {lapSessions.map((s, i) => (
                            <th key={s.id} className="text-right pb-2 pr-4" style={{ color: lapColor(i) }}>{s.driverLabel}</th>
                          ))}
                          {lapSessions.length > 1 && <th className="text-right pb-2">Delta</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#2A2A3A]">
                        {lapRows.map(({ lap, laps }) => {
                          const times = laps.map(l => l?.lapTimeMs ?? null).filter((t): t is number => t != null)
                          const minTime = times.length ? Math.min(...times) : null
                          const maxTime = times.length ? Math.max(...times) : null
                          const delta   = minTime != null && maxTime != null && times.length > 1 ? maxTime - minTime : null
                          return (
                            <tr key={lap} className="hover:bg-[#1C1C28] transition-colors">
                              <td className="py-2 pr-4 font-mono text-[#6B7A99] text-xs">{lap}</td>
                              {laps.map((l, i) => {
                                const isBest = l?.lapTimeMs === minTime && times.length > 1
                                return (
                                  <td key={i} className="py-2 pr-4 text-right font-mono">
                                    {l ? (
                                      <span className={isBest ? 'font-bold' : ''} style={{ color: isBest ? lapColor(i) : '#F0F0F0' }}>
                                        {lapMsToString(l.lapTimeMs)}
                                      </span>
                                    ) : (
                                      <span className="text-[#3A3A4A]">—</span>
                                    )}
                                  </td>
                                )
                              })}
                              {lapSessions.length > 1 && (
                                <td className="py-2 text-right font-mono text-xs text-[#6B7A99]">
                                  {delta != null ? `+${lapMsToString(delta)}` : '—'}
                                </td>
                              )}
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                  {maxLap > 15 && (
                    <button onClick={() => setShowAllLaps(v => !v)} className="mt-3 flex items-center gap-1 text-xs text-[#6B7A99] hover:text-accent-primary transition-colors">
                      {showAllLaps ? <><ChevronUp size={13} /> Show less</> : <><ChevronDown size={13} /> Show all {maxLap} laps</>}
                    </button>
                  )}
                </Card>
              </>
            )}

            {/* ── GPS SECTION ──────────────────────────────────────────────── */}
            {gpsSessions.length > 0 && (
              <>
                <div className="flex items-center gap-3 flex-wrap">
                  {gpsSessions.map((s, i) => (
                    <div key={s.id} className="flex items-center gap-2 px-3 py-1.5 rounded-full border bg-[#1C1C28] text-sm" style={{ borderColor: gpsColor(i) + '55' }}>
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: gpsColor(i) }} />
                      <BrandBadge brand={s.brand} />
                      <input value={s.driverLabel} onChange={e => setGpsSessions(prev => prev.map(x => x.id === s.id ? { ...x, driverLabel: e.target.value } : x))}
                        className="bg-transparent text-[#F0F0F0] font-medium outline-none min-w-0 w-[100px]" />
                      <span className="text-[#6B7A99] text-xs">{s.points.length.toLocaleString()} pts · {(s.totalDistanceM / 1000).toFixed(1)} km</span>
                      <button onClick={() => setGpsSessions(prev => prev.filter(x => x.id !== s.id))} className="text-[#6B7A99] hover:text-red-400 transition-colors ml-1"><X size={13} /></button>
                    </div>
                  ))}
                </div>

                {/* Lap filter (only shown if logger recorded lap numbers) */}
                {hasLaps && numGpsLaps > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-[#6B7A99]">Showing:</span>
                    <button onClick={() => setActiveGpsLap(null)} className={['text-xs px-2.5 py-1 rounded-full border transition-colors', activeGpsLap == null ? 'border-accent-primary text-accent-primary bg-accent-primary/10' : 'border-[#2A2A3A] text-[#6B7A99] hover:border-[#3A3A4A]'].join(' ')}>
                      All laps
                    </button>
                    {Array.from({ length: numGpsLaps }, (_, i) => (
                      <button key={i} onClick={() => setActiveGpsLap(i)} className={['text-xs px-2.5 py-1 rounded-full border transition-colors', activeGpsLap === i ? 'border-accent-primary text-accent-primary bg-accent-primary/10' : 'border-[#2A2A3A] text-[#6B7A99] hover:border-[#3A3A4A]'].join(' ')}>
                        Lap {i + 1}
                      </button>
                    ))}
                  </div>
                )}

                {/* Track map */}
                <Card>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Map size={16} className="text-[#6B7A99]" />
                      <h3 className="text-[#F0F0F0] font-semibold">Track Map</h3>
                    </div>
                    <span className="text-xs text-[#6B7A99]">
                      {gpsSessions.some(s => s.points.some(p => p.speedKmh != null)) ? 'Colour = speed (blue→green→red)' : 'Each driver shown in their colour'}
                    </span>
                  </div>
                  <TrackMapCanvas sessions={displayedGpsSessions} colors={gpsSessions.map((_, i) => gpsColor(i))} height={380} />
                </Card>

                {/* Speed vs distance */}
                {hasGpsSpeed && speedChartData.length > 0 && (
                  <Card>
                    <h3 className="text-[#F0F0F0] font-semibold mb-4">Speed Trace</h3>
                    <ResponsiveContainer width="100%" height={220}>
                      <LineChart data={speedChartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#2A2A3A" />
                        <XAxis dataKey="dist" tick={{ fill: '#6B7A99', fontSize: 10 }} label={{ value: 'Distance (m)', position: 'insideBottomRight', fill: '#6B7A99', fontSize: 11, offset: -4 }} stroke="#2A2A3A" tickFormatter={v => `${v}m`} />
                        <YAxis tick={{ fill: '#6B7A99', fontSize: 10 }} stroke="#2A2A3A" width={52} tickFormatter={v => `${v}k`} unit=" km/h" />
                        <Tooltip content={<SpeedTooltip sessions={displayedGpsSessions} />} />
                        <Legend formatter={(v: string) => gpsSessions.find(s => s.id === v)?.driverLabel ?? v} wrapperStyle={{ fontSize: 11, color: '#6B7A99', paddingTop: 4 }} />
                        {displayedGpsSessions.map((s, i) => (
                          <Line key={s.id} type="monotone" dataKey={s.id} name={s.id} stroke={gpsColor(i)} strokeWidth={1.5}
                            dot={false} activeDot={{ r: 4 }} connectNulls={false} />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  </Card>
                )}

                {/* Export */}
                <Card>
                  <h3 className="text-[#F0F0F0] font-semibold mb-3">Export GPS Data</h3>
                  <p className="text-[#6B7A99] text-sm mb-4">
                    GPX works with Google Earth, Garmin, Strava, GPS Visualizer and most mapping apps. KML opens in Google Earth with all drivers as separate coloured lines.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {gpsSessions.map((s, i) => (
                      <button
                        key={s.id}
                        onClick={() => exportGPX(s)}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[#2A2A3A] hover:border-[#3A3A4A] text-sm text-[#F0F0F0] transition-colors"
                      >
                        <Download size={13} />
                        <span style={{ color: gpsColor(i) }}>{s.driverLabel}</span>
                        <span className="text-[#6B7A99] text-xs">.gpx</span>
                      </button>
                    ))}
                    {gpsSessions.length > 1 && (
                      <button
                        onClick={() => exportKML(gpsSessions, gpsSessions.map((_, i) => gpsColor(i)))}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg border border-accent-primary/40 hover:border-accent-primary text-sm text-accent-primary transition-colors"
                      >
                        <Download size={13} />
                        All drivers — Google Earth (.kml)
                      </button>
                    )}
                    <button
                      onClick={() => exportNormalizedCSV(gpsSessions)}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[#2A2A3A] hover:border-[#3A3A4A] text-sm text-[#6B7A99] transition-colors"
                    >
                      <Download size={13} />
                      Normalized CSV (all drivers)
                    </button>
                  </div>
                </Card>
              </>
            )}
          </>
        )}
      </div>
    </PageWrapper>
  )
}
