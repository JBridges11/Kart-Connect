import { useState, useRef, useEffect } from 'react'
import {
  Upload, X, Download, TrendingUp, Map, BarChart2, GitCompare,
  Layers, Video, FileText, Loader, AlertCircle, Navigation, Camera,
} from 'lucide-react'
import { PageWrapper } from '@/components/layout/PageWrapper'
import {
  parseCSVAny,
  parseOCDBinary,
  type ImportedDataSession,
  type ImportedGPSSession,
  type GpsPoint,
  type DataLoggerBrand,
  BRAND_LABELS,
} from '@/lib/dataLoggerImport'
import { exportGPX, exportKML, exportNormalizedCSV } from '@/lib/dataLoggerExport'
import { TrackMapCanvas } from '@/components/TrackMapCanvas'
import { ComparisonPlayer } from '@/components/data/ComparisonPlayer'
import { extractGPMF, type GoproExtract } from '@/lib/gopro/extractGPMF'
import { extractDJISRT } from '@/lib/dji/extractSRT'
import { computeVideoOffset } from '@/lib/gopro/sync'
import { SessionPicker } from '@/components/data/SessionPicker'
import { useAuth } from '@/contexts/AuthContext'
import { useKarts } from '@/hooks/useKarts'
import type { Kart } from '@/types'

// ─── Types ────────────────────────────────────────────────────────────────────

const SESSION_COLORS = ['#EF4444', '#3B82F6', '#F97316', '#22C55E']

type AnySession = { type: 'lap'; session: ImportedDataSession } | { type: 'gps'; session: ImportedGPSSession }
type Tab = 'laps' | 'speed' | 'map' | 'sectors' | 'export'
export type CameraType = 'gopro' | 'dji'

export interface DriverSlot {
  session: AnySession | null
  csvError: string | null
  driverName: string | null
  cameraType: CameraType
  videoFile: File | null
  videoUrl: string | null
  srtFile: File | null
  goproData: GoproExtract | null
  videoOffsetMs: number
  videoExtracting: boolean
  videoError: string | null
}

export function emptySlot(): DriverSlot {
  return {
    session: null, csvError: null, driverName: null,
    cameraType: 'gopro',
    videoFile: null, videoUrl: null, srtFile: null,
    goproData: null, videoOffsetMs: 0,
    videoExtracting: false, videoError: null,
  }
}

interface LapRow {
  sessionIdx: number
  driverLabel: string
  brand: DataLoggerBrand
  lapNumber: number
  lapTimeMs: number
  maxSpeedKmh: number | null
  avgSpeedKmh: number | null
  maxRpm: number | null
  waterTempC: number | null
  exhaustTempC: number | null
  points: GpsPoint[]
}

interface SectorRow {
  lapLabel: string
  color: string
  lapTimeMs: number
  s1Ms: number
  s2Ms: number
  s3Ms: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(ms: number): string {
  const m = Math.floor(ms / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  const f = Math.floor((ms % 1000) / 10)
  return `${m}:${String(s).padStart(2, '0')}.${String(f).padStart(2, '0')}`
}

function fmtDelta(ms: number): string {
  return (ms > 0 ? '+' : '') + (ms / 1000).toFixed(3)
}

function n1(v: number | null) { return v != null ? v.toFixed(1) : '—' }
function n0(v: number | null) { return v != null ? Math.round(v).toString() : '—' }

function slotLabel(slot: DriverSlot): string {
  if (slot.driverName) return slot.driverName
  if (!slot.session) return ''
  return slot.session.type === 'lap' ? slot.session.session.driverLabel : slot.session.session.driverLabel
}

function slotBrand(slot: DriverSlot): DataLoggerBrand | null {
  if (!slot.session) return null
  return slot.session.type === 'lap' ? slot.session.session.brand : slot.session.session.brand
}

function slotLapCount(slot: DriverSlot): number {
  if (!slot.session) return 0
  return slot.session.type === 'lap'
    ? slot.session.session.laps.length
    : Math.max(1, slot.session.session.lapGroups.length)
}

function buildLapRows(slots: DriverSlot[]): LapRow[] {
  const rows: LapRow[] = []
  const sessions = slots.map(s => s.session).filter(Boolean) as AnySession[]
  sessions.forEach((s, idx) => {
    if (s.type === 'lap') {
      for (const lap of s.session.laps) {
        rows.push({
          sessionIdx: idx, driverLabel: s.session.driverLabel, brand: s.session.brand,
          lapNumber: lap.lapNumber, lapTimeMs: lap.lapTimeMs,
          maxSpeedKmh: lap.maxSpeedKmh, avgSpeedKmh: lap.avgSpeedKmh,
          maxRpm: lap.maxRpm, waterTempC: lap.waterTempC, exhaustTempC: lap.exhaustTempC,
          points: [],
        })
      }
    } else {
      const gps = s.session
      const groups = gps.lapGroups.length > 0 ? gps.lapGroups : [gps.points]
      groups.forEach((group, gi) => {
        if (group.length < 2) return
        const lapTimeMs = Math.round((group[group.length - 1].timeS - group[0].timeS) * 1000)
        if (lapTimeMs < 5000 || lapTimeMs > 600000) return
        const speeds = group.map(p => p.speedKmh).filter((v): v is number => v != null)
        const rpms   = group.map(p => p.rpm).filter((v): v is number => v != null)
        rows.push({
          sessionIdx: idx, driverLabel: gps.driverLabel, brand: gps.brand,
          lapNumber: group[0].lapNumber ?? gi + 1, lapTimeMs,
          maxSpeedKmh: speeds.length ? Math.max(...speeds) : null,
          avgSpeedKmh: speeds.length ? speeds.reduce((a, b) => a + b) / speeds.length : null,
          maxRpm: rpms.length ? Math.max(...rpms) : null,
          waterTempC: null, exhaustTempC: null, points: group,
        })
      })
    }
  })
  return rows
}

function buildSectorRows(laps: LapRow[]): SectorRow[] {
  return laps
    .filter(l => l.points.length >= 4)
    .map(lap => {
      const pts = lap.points
      const lapStartD = pts[0].distanceM
      const span = pts[pts.length - 1].distanceM - lapStartD
      const s1B = lapStartD + span / 3
      const s2B = lapStartD + (span * 2) / 3
      const s1Pt = pts.find(p => p.distanceM >= s1B) ?? pts[Math.floor(pts.length / 3)]
      const s2Pt = pts.find(p => p.distanceM >= s2B) ?? pts[Math.floor((pts.length * 2) / 3)]
      return {
        lapLabel: `${lap.driverLabel} — Lap ${lap.lapNumber}`,
        color: SESSION_COLORS[lap.sessionIdx % SESSION_COLORS.length],
        lapTimeMs: lap.lapTimeMs,
        s1Ms: Math.round((s1Pt.timeS - pts[0].timeS) * 1000),
        s2Ms: Math.round((s2Pt.timeS - s1Pt.timeS) * 1000),
        s3Ms: Math.round((pts[pts.length - 1].timeS - s2Pt.timeS) * 1000),
      }
    })
}

// ─── Speed Trace ──────────────────────────────────────────────────────────────

function SpeedTraceCanvas({ laps, height = 300 }: { laps: LapRow[]; height?: number }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const gpsLaps = laps.filter(l => l.points.length > 1 && l.points.some(p => p.speedKmh != null))
    if (!gpsLaps.length) return
    const dpr = window.devicePixelRatio || 1
    const W = canvas.offsetWidth || 600
    const H = height
    canvas.width = W * dpr; canvas.height = H * dpr
    const ctx = canvas.getContext('2d')!
    ctx.scale(dpr, dpr)
    let maxDist = 0, maxSpd = 0
    for (const lap of gpsLaps) {
      const start = lap.points[0].distanceM
      for (const p of lap.points) {
        if (p.distanceM - start > maxDist) maxDist = p.distanceM - start
        if (p.speedKmh != null && p.speedKmh > maxSpd) maxSpd = p.speedKmh
      }
    }
    if (!maxDist || !maxSpd) return
    const pad = { t: 20, r: 20, b: 40, l: 50 }
    const pw = W - pad.l - pad.r, ph = H - pad.t - pad.b
    ctx.fillStyle = '#12121A'; ctx.fillRect(0, 0, W, H)
    const step = maxSpd > 120 ? 20 : maxSpd > 60 ? 10 : 5
    ctx.font = `10px DM Sans, sans-serif`
    for (let v = 0; v <= maxSpd; v += step) {
      const y = pad.t + ph - (v / maxSpd) * ph
      ctx.strokeStyle = '#2A2A3A'; ctx.lineWidth = 1
      ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(pad.l + pw, y); ctx.stroke()
      ctx.fillStyle = '#6B7A99'; ctx.textAlign = 'right'
      ctx.fillText(`${v}`, pad.l - 4, y + 3)
    }
    ctx.strokeStyle = '#3A3A4A'; ctx.lineWidth = 1; ctx.beginPath()
    ctx.moveTo(pad.l, pad.t); ctx.lineTo(pad.l, pad.t + ph); ctx.lineTo(pad.l + pw, pad.t + ph); ctx.stroke()
    ctx.fillStyle = '#6B7A99'; ctx.textAlign = 'center'
    ctx.fillText('Distance (m)', pad.l + pw / 2, H - 6)
    ctx.save(); ctx.translate(14, pad.t + ph / 2); ctx.rotate(-Math.PI / 2)
    ctx.fillText('Speed km/h', 0, 0); ctx.restore()
    gpsLaps.forEach(lap => {
      const color = SESSION_COLORS[lap.sessionIdx % SESSION_COLORS.length]
      const start = lap.points[0].distanceM
      ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.8; ctx.beginPath()
      let first = true
      for (const p of lap.points) {
        if (p.speedKmh == null) continue
        const x = pad.l + ((p.distanceM - start) / maxDist) * pw
        const y = pad.t + ph - (p.speedKmh / maxSpd) * ph
        if (first) { ctx.moveTo(x, y); first = false } else ctx.lineTo(x, y)
      }
      ctx.stroke()
    })
    ctx.globalAlpha = 1
    let lx = pad.l; const ly = pad.t + 10
    const drawn = new Set<number>()
    ctx.font = '10px DM Sans, sans-serif'; ctx.textAlign = 'left'
    for (const lap of gpsLaps) {
      if (drawn.has(lap.sessionIdx)) continue
      drawn.add(lap.sessionIdx)
      const color = SESSION_COLORS[lap.sessionIdx % SESSION_COLORS.length]
      ctx.fillStyle = color; ctx.fillRect(lx, ly - 5, 16, 3)
      ctx.fillStyle = '#F0F0F0'; ctx.fillText(lap.driverLabel, lx + 20, ly)
      lx += ctx.measureText(lap.driverLabel).width + 40
    }
  }, [laps, height])
  return <canvas ref={ref} style={{ width: '100%', height, display: 'block', borderRadius: '8px' }} />
}

// ─── Driver Import Panel ──────────────────────────────────────────────────────

const DRIVER_COLORS: Record<0 | 1, string> = { 0: '#EF4444', 1: '#3B82F6' }
const DRIVER_LABELS: Record<0 | 1, string> = { 0: 'Driver A', 1: 'Driver B' }

interface DriverPanelProps {
  slot: DriverSlot
  idx: 0 | 1
  otherSlot: DriverSlot
  onUpdate: (fn: (prev: DriverSlot) => DriverSlot) => void
  userId: string | null
  karts: Kart[]
}

function DriverPanel({ slot, idx, otherSlot, onUpdate, userId, karts }: DriverPanelProps) {
  const color = DRIVER_COLORS[idx]
  const label = DRIVER_LABELS[idx]
  const [csvDragging, setCsvDragging] = useState(false)
  const [vidDragging, setVidDragging] = useState(false)

  async function handleCsvFiles(files: FileList | null) {
    if (!files?.length) return
    const file = files[0]
    const nameLow = file.name.toLowerCase()

    let result
    if (nameLow.endsWith('.ocd')) {
      const buffer = await file.arrayBuffer()
      result = parseOCDBinary(file.name, buffer)
    } else if (nameLow.endsWith('.csv')) {
      const text = await file.text()
      result = parseCSVAny(file.name, text)
    } else {
      onUpdate(p => ({ ...p, csvError: 'Unsupported file — drop a .csv or .ocd file' }))
      return
    }

    if (result.type === 'error') {
      onUpdate(p => ({ ...p, csvError: result.error }))
    } else if (result.type === 'lap') {
      onUpdate(p => ({ ...p, session: { type: 'lap', session: result.session }, csvError: null }))
    } else {
      onUpdate(p => ({ ...p, session: { type: 'gps', session: result.session }, csvError: null }))
    }
  }

  async function handleVideoFile(file: File) {
    if (!file.type.startsWith('video/') && !file.name.toLowerCase().endsWith('.mp4')) return
    const videoUrl = URL.createObjectURL(file)

    if (slot.cameraType === 'dji') {
      onUpdate(p => ({ ...p, videoFile: file, videoUrl, videoError: null }))
      return
    }

    onUpdate(p => ({ ...p, videoFile: file, videoUrl, videoExtracting: true, videoError: null }))
    try {
      const goproData = await extractGPMF(file)
      const gpsSess = slot.session?.type === 'gps' ? slot.session.session : null
      const otherGps = otherSlot.session?.type === 'gps' ? otherSlot.session.session : null
      const sess = gpsSess ?? otherGps
      const videoOffsetMs = sess
        ? computeVideoOffset(goproData.gpsPoints, sess.points, sess.startUtcMs)
        : 0
      onUpdate(p => ({ ...p, goproData, videoOffsetMs, videoExtracting: false }))
    } catch (e) {
      onUpdate(p => ({
        ...p, videoExtracting: false,
        videoError: e instanceof Error ? e.message : 'Failed to read GoPro GPS data',
      }))
    }
  }

  async function handleSrtFile(file: File) {
    onUpdate(p => ({ ...p, srtFile: file, videoExtracting: true, videoError: null }))
    try {
      const gpsPoints = await extractDJISRT(file)
      const goproData: GoproExtract = {
        gpsPoints,
        durationMs: gpsPoints[gpsPoints.length - 1].videoTimeMs,
        hasUtc: true,
      }
      const gpsSess = slot.session?.type === 'gps' ? slot.session.session : null
      const videoOffsetMs = gpsSess
        ? computeVideoOffset(goproData.gpsPoints, gpsSess.points, gpsSess.startUtcMs)
        : 0
      onUpdate(p => ({ ...p, goproData, videoOffsetMs, videoExtracting: false }))
    } catch (e) {
      onUpdate(p => ({
        ...p, videoExtracting: false,
        videoError: e instanceof Error ? e.message : 'Failed to read DJI GPS data',
      }))
    }
  }

  function clearVideo() {
    if (slot.videoUrl) URL.revokeObjectURL(slot.videoUrl)
    onUpdate(p => ({ ...p, videoFile: null, videoUrl: null, srtFile: null, goproData: null, videoOffsetMs: 0, videoError: null }))
  }

  function changeCameraType(type: CameraType) {
    clearVideo()
    onUpdate(p => ({ ...p, cameraType: type }))
  }

  const brand = slotBrand(slot)

  // Build driver options from karts: use driver_name if set, else nickname
  const driverOptions = karts
    .map(k => k.driver_name?.trim() || k.nickname?.trim())
    .filter((n): n is string => !!n)
    .filter((n, i, arr) => arr.indexOf(n) === i)  // dedupe
    .sort()

  return (
    <div className="bg-bg-card border border-border-color rounded-card p-4 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />
        <span className="text-xs font-heading font-bold uppercase tracking-widest" style={{ color }}>{label}</span>
      </div>

      {/* ── Driver selector ── */}
      {driverOptions.length > 0 && (
        <div>
          <p className="text-[10px] font-heading font-semibold text-text-muted uppercase tracking-wider mb-1.5">Driver</p>
          <select
            value={slot.driverName ?? ''}
            onChange={e => onUpdate(p => ({ ...p, driverName: e.target.value || null }))}
            className="w-full bg-bg-elevated border border-border-color rounded-card px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-accent-primary"
          >
            <option value=''>— Select driver —</option>
            {driverOptions.map(name => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </div>
      )}

      {/* ── CSV section ── */}
      <div>
        <p className="text-[10px] font-heading font-semibold text-text-muted uppercase tracking-wider mb-2">Logger Data</p>
        {slot.session ? (
          <div className="flex items-center justify-between bg-bg-elevated rounded-card px-3 py-2.5 border border-border-color">
            <div>
              <p className="text-xs font-semibold text-text-primary">{slotLabel(slot)}</p>
              <p className="text-[10px] text-text-muted mt-0.5">
                {brand ? BRAND_LABELS[brand] : ''} · {slotLapCount(slot)} lap{slotLapCount(slot) !== 1 ? 's' : ''}
                {slot.session.type === 'gps' && <span className="ml-1.5 font-bold text-accent-primary">GPS</span>}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onUpdate(p => ({ ...p, session: null, csvError: null }))}
              className="text-text-muted hover:text-text-primary transition-colors ml-2"
            >
              <X size={12} />
            </button>
          </div>
        ) : userId ? (
          <SessionPicker
            userId={userId}
            onSession={result => {
              if (result.type === 'error') {
                onUpdate(p => ({ ...p, csvError: result.error }))
              } else if (result.type === 'lap') {
                onUpdate(p => ({ ...p, session: { type: 'lap', session: result.session }, csvError: null }))
              } else {
                onUpdate(p => ({ ...p, session: { type: 'gps', session: result.session }, csvError: null }))
              }
            }}
          />
        ) : (
          <div
            onDrop={e => { e.preventDefault(); setCsvDragging(false); void handleCsvFiles(e.dataTransfer.files) }}
            onDragOver={e => { e.preventDefault(); setCsvDragging(true) }}
            onDragLeave={() => setCsvDragging(false)}
            className={[
              'border-2 border-dashed rounded-card p-4 text-center transition-colors',
              csvDragging ? 'border-accent-primary bg-accent-primary/5' : 'border-border-color',
            ].join(' ')}
          >
            <Upload size={16} className="mx-auto mb-1.5 text-text-muted" />
            <p className="text-xs text-text-muted mb-2">Drop CSV or OCD file here</p>
            <label className="cursor-pointer inline-flex items-center px-3 py-1 rounded-card bg-accent-primary/10 border border-accent-primary/20 text-accent-primary text-xs font-bold hover:bg-accent-primary/20 transition-colors">
              Browse
              <input type="file" accept=".csv,.ocd" className="hidden" onChange={e => void handleCsvFiles(e.target.files)} />
            </label>
          </div>
        )}
        {slot.csvError && (
          <div className="flex items-center gap-2 mt-2 text-xs text-red-400">
            <AlertCircle size={11} />
            <span>{slot.csvError}</span>
          </div>
        )}
      </div>

      {/* ── Video section ── */}
      <div>
        <p className="text-[10px] font-heading font-semibold text-text-muted uppercase tracking-wider mb-2">Video Footage (MP4)</p>

        {/* Camera type toggle */}
        <div className="flex rounded-card border border-border-color overflow-hidden text-xs mb-2">
          {(['gopro', 'dji'] as const).map(type => (
            <button
              key={type}
              type="button"
              onClick={() => changeCameraType(type)}
              className={[
                'flex-1 px-3 py-1.5 font-bold transition-colors',
                slot.cameraType === type ? 'bg-accent-primary text-bg-base' : 'text-text-muted hover:text-text-primary',
              ].join(' ')}
            >
              {type === 'gopro' ? 'GoPro Hero 7+' : 'DJI Osmo'}
            </button>
          ))}
        </div>

        {/* Drop zone or loaded state */}
        {slot.videoFile ? (
          <div className="flex items-center justify-between bg-bg-elevated rounded-card px-3 py-2.5 border border-border-color">
            <div className="flex items-center gap-2">
              {slot.videoExtracting ? (
                <Loader size={12} className="text-accent-primary animate-spin" />
              ) : slot.goproData ? (
                <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
              ) : (
                <Video size={12} className="text-text-muted" />
              )}
              <div>
                <p className="text-xs font-semibold text-text-primary truncate max-w-[160px]">{slot.videoFile.name}</p>
                {slot.goproData && (
                  <p className="text-[10px] text-green-400">GPS sync active · {(slot.videoOffsetMs / 1000).toFixed(1)}s offset</p>
                )}
                {slot.videoExtracting && (
                  <p className="text-[10px] text-text-muted">Reading GPS data…</p>
                )}
              </div>
            </div>
            <button type="button" onClick={clearVideo} className="text-text-muted hover:text-text-primary ml-2">
              <X size={12} />
            </button>
          </div>
        ) : (
          <div
            onDrop={e => { e.preventDefault(); setVidDragging(false); const f = e.dataTransfer.files[0]; if (f) void handleVideoFile(f) }}
            onDragOver={e => { e.preventDefault(); setVidDragging(true) }}
            onDragLeave={() => setVidDragging(false)}
            className={[
              'border-2 border-dashed rounded-card p-4 text-center transition-colors',
              vidDragging ? 'border-accent-primary bg-accent-primary/5' : 'border-border-color',
            ].join(' ')}
          >
            <Video size={16} className="mx-auto mb-1.5 text-text-muted" />
            <p className="text-xs text-text-muted mb-2">
              {slot.cameraType === 'gopro' ? 'Drop GoPro Hero 7+ MP4' : 'Drop DJI Osmo MP4'}
            </p>
            <label className="cursor-pointer inline-flex items-center px-3 py-1 rounded-card bg-accent-primary/10 border border-accent-primary/20 text-accent-primary text-xs font-bold hover:bg-accent-primary/20 transition-colors">
              Browse
              <input type="file" accept="video/mp4,.mp4,.MP4" className="hidden" onChange={e => { if (e.target.files?.[0]) void handleVideoFile(e.target.files[0]) }} />
            </label>
          </div>
        )}

        {/* DJI SRT picker */}
        {slot.cameraType === 'dji' && slot.videoFile && !slot.goproData && !slot.videoExtracting && (
          <div className="flex items-center gap-2 px-3 py-2 mt-2 bg-bg-elevated border border-border-color rounded-card">
            <FileText size={12} className="text-text-muted flex-shrink-0" />
            <span className="text-xs text-text-muted flex-1">Select the matching .srt file</span>
            <label className="cursor-pointer px-2 py-1 rounded bg-accent-primary/10 border border-accent-primary/20 text-accent-primary text-xs font-bold hover:bg-accent-primary/20 transition-colors">
              Browse
              <input type="file" accept=".srt,.SRT" className="hidden" onChange={e => { if (e.target.files?.[0]) void handleSrtFile(e.target.files[0]) }} />
            </label>
          </div>
        )}

        {/* Video error */}
        {slot.videoError && (
          <div className="flex items-start gap-2 mt-2 bg-red-500/10 border border-red-500/20 rounded-card px-3 py-2 text-xs text-red-400">
            <AlertCircle size={12} className="flex-shrink-0 mt-0.5" />
            <span>{slot.videoError}</span>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function DataComparisonPage() {
  const { user } = useAuth()
  const { data: karts } = useKarts()
  const [slotA, setSlotA] = useState<DriverSlot>(emptySlot)
  const [slotB, setSlotB] = useState<DriverSlot>(emptySlot)
  const [tab, setTab] = useState<Tab>('laps')

  const slots = [slotA, slotB]
  const hasAnyCsv = !!slotA.session || !!slotB.session
  const hasAnyVideo = !!slotA.videoFile || !!slotB.videoFile

  const gpsSlots = [
    { slot: slotA, color: SESSION_COLORS[0] },
    { slot: slotB, color: SESSION_COLORS[1] },
  ].filter(x => x.slot.session?.type === 'gps')
  const gpsSessionList = gpsSlots.map(x => (x.slot.session as { type: 'gps'; session: ImportedGPSSession }).session)
  const gpsColors = gpsSlots.map(x => x.color)
  const hasGPS = gpsSessionList.length > 0

  const allLaps = buildLapRows(slots)
  const sectors = buildSectorRows(allLaps)
  const bestLapMs = allLaps.length ? Math.min(...allLaps.map(l => l.lapTimeMs)) : 0
  const theoBestMs = sectors.length
    ? Math.min(...sectors.map(s => s.s1Ms))
    + Math.min(...sectors.map(s => s.s2Ms))
    + Math.min(...sectors.map(s => s.s3Ms))
    : null

  const TABS: { id: Tab; label: string; gpsOnly?: boolean }[] = [
    { id: 'laps',    label: 'Lap Times' },
    { id: 'speed',   label: 'Speed Trace', gpsOnly: true },
    { id: 'map',     label: 'Track Map',   gpsOnly: true },
    { id: 'sectors', label: 'Sectors',     gpsOnly: true },
    { id: 'export',  label: 'Export' },
  ]

  return (
    <PageWrapper title="Data Logger">

      {/* ── Two-driver import panels ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <DriverPanel slot={slotA} idx={0} otherSlot={slotB} onUpdate={setSlotA} userId={user?.id ?? null} karts={karts} />
        <DriverPanel slot={slotB} idx={1} otherSlot={slotA} onUpdate={setSlotB} userId={user?.id ?? null} karts={karts} />
      </div>

      {/* ── Video comparison player ── */}
      {hasAnyVideo && (
        <div className="mb-6">
          <ComparisonPlayer slotA={slotA} slotB={slotB} />
        </div>
      )}

      {/* ── Feature intro when nothing loaded ── */}
      {!hasAnyCsv && !hasAnyVideo && (
        <div className="space-y-4">
          <div className="bg-bg-card border border-border-color rounded-card p-5">
            <p className="font-heading font-bold text-text-primary text-base mb-2">The first karting tool that compares across all major logger brands</p>
            <p className="text-sm text-text-muted leading-relaxed">
              Drop a CSV from any logger brand into Driver A and Driver B above — AiM, Unipro, Alfano, Starlane — and see both sessions
              compared side by side. Add GoPro or DJI footage and both videos play in sync with live telemetry overlay.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { icon: Video,      label: 'Video Comparison',    title: 'Side-by-side video with live delta', body: 'Both videos play in perfect sync. A live delta counter shows exactly who is ahead — updated frame by frame as the video plays.' },
              { icon: Navigation, label: 'GoPro Hero 7+',       title: 'Automatic UTC sync from GoPro GPS',  body: 'GoPro records a UTC timestamp on every frame. The app reads it and aligns your footage to your logger data automatically.' },
              { icon: Camera,     label: 'DJI Osmo Action',     title: 'DJI Osmo via SRT file',              body: 'Drop the .srt subtitle file your Osmo Action records. GPS coordinates and timestamps pull out automatically.' },
            ].map(({ icon: Icon, label, title, body }) => (
              <div key={label} className="bg-bg-card border border-border-color rounded-card p-4 flex flex-col">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-accent-primary/10 flex items-center justify-center flex-shrink-0">
                    <Icon size={16} className="text-accent-primary" />
                  </div>
                  <span className="text-[10px] font-heading font-bold uppercase tracking-widest text-accent-primary">{label}</span>
                </div>
                <p className="font-heading font-bold text-text-primary text-sm mb-1.5 leading-snug">{title}</p>
                <p className="text-xs text-text-muted leading-relaxed flex-1">{body}</p>
              </div>
            ))}
          </div>
          <div>
            <p className="text-xs font-heading font-bold text-text-muted uppercase tracking-wider mb-3">Data analysis tools</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[
                { icon: Layers,    title: 'Lap Time Comparison',  body: 'All laps ranked in one table. Best lap highlighted, delta to fastest shown, theoretical best from your quickest sectors.' },
                { icon: TrendingUp,title: 'Speed Trace Overlay',  body: 'Speed vs distance for every lap on one chart. See exactly where you gain or lose speed vs another driver.' },
                { icon: Map,       title: 'GPS Track Map',        body: 'Racing lines drawn from GPS and colour-coded slow to fast. Overlay multiple drivers to see where lines diverge.' },
                { icon: BarChart2, title: 'Sector Analysis',      body: 'Track auto-split into three sectors. See which sector costs you time and which you already own.' },
                { icon: GitCompare,title: 'Theoretical Best Lap', body: 'Takes your fastest sectors from any lap — even across sessions — to show what a perfect lap looks like for you.' },
                { icon: Download,  title: 'Export Anywhere',      body: 'GPX for Google Maps, KML for Google Earth, or normalised CSV for Excel and Python analysis.' },
              ].map(({ icon: Icon, title, body }) => (
                <div key={title} className="bg-bg-card border border-border-color rounded-card p-4">
                  <div className="w-8 h-8 rounded-lg bg-accent-primary/10 flex items-center justify-center mb-3">
                    <Icon size={16} className="text-accent-primary" />
                  </div>
                  <p className="font-heading font-bold text-text-primary text-sm mb-1.5">{title}</p>
                  <p className="text-xs text-text-muted leading-relaxed">{body}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="border border-border-color rounded-card p-4 bg-bg-card">
            <p className="text-xs font-heading font-bold text-text-muted uppercase tracking-wider mb-3">Supported logger brands</p>
            <div className="flex flex-wrap gap-2">
              {[
                { brand: 'AiM MyChron 5 / 5S', note: 'GPS + G-force' },
                { brand: 'AiM MyChron 6', note: 'GPS + G-force' },
                { brand: 'Alfano Pro 6 / 7 / 8', note: 'GPS on Pro 6 GPS model' },
                { brand: 'Unipro 6003 / 6004', note: 'GPS + optional steering angle' },
                { brand: 'Starlane Stealth GPS', note: 'GPS' },
                { brand: 'Starlane Davinci', note: 'GPS + G-force' },
              ].map(({ brand, note }) => (
                <div key={brand} className="px-3 py-2 rounded-card border border-border-color bg-bg-elevated">
                  <p className="text-xs font-semibold text-text-primary">{brand}</p>
                  <p className="text-[10px] text-text-muted mt-0.5">{note}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Analysis tabs ── */}
      {hasAnyCsv && (
        <>
          <div className="flex gap-1 border-b border-border-color mb-4">
            {TABS.map(t => {
              const off = !!(t.gpsOnly && !hasGPS)
              return (
                <button key={t.id} type="button" disabled={off}
                  onClick={() => setTab(t.id)}
                  className={[
                    'px-4 py-2 text-xs font-heading font-semibold border-b-2 -mb-px transition-colors',
                    tab === t.id ? 'border-accent-primary text-accent-primary'
                    : off ? 'border-transparent text-text-muted/30 cursor-not-allowed'
                    : 'border-transparent text-text-muted hover:text-text-primary',
                  ].join(' ')}
                >
                  {t.label}
                </button>
              )
            })}
          </div>

          {tab === 'laps' && (
            <div className="overflow-x-auto rounded-card border border-border-color">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border-color text-text-muted bg-bg-card">
                    {['Driver','Brand','Lap','Time','Delta','Max km/h','Avg km/h','Max RPM','H₂O °C','EGT °C'].map(h => (
                      <th key={h} className="text-left px-3 py-2.5 font-heading font-semibold uppercase text-[10px] tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...allLaps].sort((a, b) => a.lapTimeMs - b.lapTimeMs).map((lap, i) => {
                    const isBest = lap.lapTimeMs === bestLapMs
                    const delta  = lap.lapTimeMs - bestLapMs
                    return (
                      <tr key={i} className={['border-b border-border-color/40', isBest ? 'bg-accent-primary/5' : 'hover:bg-bg-elevated'].join(' ')}>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: SESSION_COLORS[lap.sessionIdx % SESSION_COLORS.length] }} />
                            <span className="font-semibold text-text-primary">{lap.driverLabel}</span>
                            {isBest && <span className="text-[9px] font-bold text-accent-primary ml-0.5">▲ BEST</span>}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-text-muted">{BRAND_LABELS[lap.brand]}</td>
                        <td className="px-3 py-2 font-mono text-text-muted">{lap.lapNumber}</td>
                        <td className="px-3 py-2 font-mono font-bold text-text-primary">{fmt(lap.lapTimeMs)}</td>
                        <td className={`px-3 py-2 font-mono ${delta === 0 ? 'text-accent-primary' : 'text-text-muted'}`}>{delta === 0 ? '—' : fmtDelta(delta)}</td>
                        <td className="px-3 py-2 font-mono text-text-muted">{n1(lap.maxSpeedKmh)}</td>
                        <td className="px-3 py-2 font-mono text-text-muted">{n1(lap.avgSpeedKmh)}</td>
                        <td className="px-3 py-2 font-mono text-text-muted">{n0(lap.maxRpm)}</td>
                        <td className="px-3 py-2 font-mono text-text-muted">{n1(lap.waterTempC)}</td>
                        <td className="px-3 py-2 font-mono text-text-muted">{n1(lap.exhaustTempC)}</td>
                      </tr>
                    )
                  })}
                  {theoBestMs != null && (
                    <tr className="bg-purple-500/5 border-t border-purple-500/20">
                      <td className="px-3 py-2 font-semibold text-purple-400">Theoretical Best</td>
                      <td className="px-3 py-2 text-text-muted text-[10px]" colSpan={2}>Best sector combo</td>
                      <td className="px-3 py-2 font-mono font-bold text-purple-400">{fmt(theoBestMs)}</td>
                      <td className="px-3 py-2 font-mono text-purple-400">{fmtDelta(theoBestMs - bestLapMs)}</td>
                      <td colSpan={5} />
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {tab === 'speed' && (
            <div className="bg-bg-card border border-border-color rounded-card p-4">
              <p className="text-xs font-heading font-semibold text-text-muted mb-3 uppercase tracking-wide">Speed vs Distance — all imported laps</p>
              <SpeedTraceCanvas laps={allLaps} height={320} />
            </div>
          )}

          {tab === 'map' && (
            <div className="bg-bg-card border border-border-color rounded-card p-4">
              <p className="text-xs font-heading font-semibold text-text-muted mb-3 uppercase tracking-wide">GPS racing line — colour-coded by speed gradient</p>
              <TrackMapCanvas sessions={gpsSessionList} colors={gpsColors} height={440} />
            </div>
          )}

          {tab === 'sectors' && (() => {
            if (!sectors.length) return (
              <p className="text-sm text-text-muted text-center py-10">No GPS lap data available for sector analysis</p>
            )
            const minS1 = Math.min(...sectors.map(s => s.s1Ms))
            const minS2 = Math.min(...sectors.map(s => s.s2Ms))
            const minS3 = Math.min(...sectors.map(s => s.s3Ms))
            const minTotal = Math.min(...sectors.map(s => s.lapTimeMs))
            return (
              <div>
                <p className="text-xs text-text-muted mb-3">Track auto-split into 3 equal sectors by distance.</p>
                <div className="overflow-x-auto rounded-card border border-border-color">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border-color text-text-muted bg-bg-card">
                        {['Lap','Total','Sector 1','Sector 2','Sector 3'].map(h => (
                          <th key={h} className="text-left px-3 py-2.5 font-heading font-semibold uppercase text-[10px] tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sectors.map((row, i) => (
                        <tr key={i} className="border-b border-border-color/40 hover:bg-bg-elevated">
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: row.color }} />
                              <span className="font-semibold text-text-primary">{row.lapLabel}</span>
                            </div>
                          </td>
                          <td className={`px-3 py-2 font-mono font-bold ${row.lapTimeMs === minTotal ? 'text-accent-primary' : 'text-text-primary'}`}>{fmt(row.lapTimeMs)}</td>
                          <td className={`px-3 py-2 font-mono ${row.s1Ms === minS1 ? 'text-green-400 font-bold' : 'text-text-muted'}`}>{fmt(row.s1Ms)}</td>
                          <td className={`px-3 py-2 font-mono ${row.s2Ms === minS2 ? 'text-green-400 font-bold' : 'text-text-muted'}`}>{fmt(row.s2Ms)}</td>
                          <td className={`px-3 py-2 font-mono ${row.s3Ms === minS3 ? 'text-green-400 font-bold' : 'text-text-muted'}`}>{fmt(row.s3Ms)}</td>
                        </tr>
                      ))}
                      {theoBestMs != null && (
                        <tr className="bg-purple-500/5 border-t border-purple-500/20">
                          <td className="px-3 py-2 font-semibold text-purple-400">Theoretical Best</td>
                          <td className="px-3 py-2 font-mono font-bold text-purple-400">{fmt(theoBestMs)}</td>
                          <td className="px-3 py-2 font-mono text-green-400 font-bold">{fmt(minS1)}</td>
                          <td className="px-3 py-2 font-mono text-green-400 font-bold">{fmt(minS2)}</td>
                          <td className="px-3 py-2 font-mono text-green-400 font-bold">{fmt(minS3)}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          })()}

          {tab === 'export' && (
            <div className="space-y-3">
              {!hasGPS ? (
                <p className="text-sm text-text-muted text-center py-10">Import GPS CSV files to enable export options</p>
              ) : (
                <>
                  <div className="bg-bg-card border border-border-color rounded-card p-4">
                    <p className="font-heading font-bold text-text-primary text-sm mb-1">GPX Export</p>
                    <p className="text-xs text-text-muted mb-3">One file per GPS session — compatible with Google Maps, Garmin, and Strava.</p>
                    <div className="flex flex-wrap gap-2">
                      {gpsSlots.map(({ slot }) => {
                        const sess = (slot.session as { type: 'gps'; session: ImportedGPSSession }).session
                        return (
                          <button key={sess.id} type="button" onClick={() => exportGPX(sess)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-card bg-bg-elevated border border-border-color text-xs text-text-primary hover:border-accent-primary/50 transition-colors">
                            <Download size={11} /> {sess.driverLabel}.gpx
                          </button>
                        )
                      })}
                    </div>
                  </div>
                  {gpsSessionList.length > 1 && (
                    <div className="bg-bg-card border border-border-color rounded-card p-4">
                      <p className="font-heading font-bold text-text-primary text-sm mb-1">KML Export (multi-driver)</p>
                      <p className="text-xs text-text-muted mb-3">Both GPS sessions in one KML — open in Google Earth to overlay racing lines.</p>
                      <button type="button" onClick={() => exportKML(gpsSessionList, gpsColors)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-card bg-accent-primary/10 border border-accent-primary/20 text-accent-primary text-xs font-bold hover:bg-accent-primary/20 transition-colors">
                        <Download size={11} /> Export both as KML
                      </button>
                    </div>
                  )}
                  <div className="bg-bg-card border border-border-color rounded-card p-4">
                    <p className="font-heading font-bold text-text-primary text-sm mb-1">Normalised CSV</p>
                    <p className="text-xs text-text-muted mb-3">Both sessions merged with driver and brand columns — import into Excel, Python, or R.</p>
                    <button type="button" onClick={() => exportNormalizedCSV(gpsSessionList)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-card bg-bg-elevated border border-border-color text-xs text-text-primary hover:border-accent-primary/50 transition-colors">
                      <Download size={11} /> Export normalised CSV
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </>
      )}
    </PageWrapper>
  )
}
