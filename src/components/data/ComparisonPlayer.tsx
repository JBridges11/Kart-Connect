import { useState, useRef, useEffect } from 'react'
import { Play, Pause } from 'lucide-react'
import type { GpsPoint } from '@/lib/dataLoggerImport'
import type { DriverSlot } from '@/pages/DataComparison'
import { usePlayerSync } from '@/hooks/usePlayerSync'

// ─── Canvas overlay ───────────────────────────────────────────────────────────

const OVERLAY_FONT = `'DM Sans', system-ui, sans-serif`
const LANE_COLORS  = ['#E8FF00', '#3B82F6']

interface DrawArgs {
  canvas: HTMLCanvasElement
  point: GpsPoint | null
  deltaMs: number | null
  trackPoints: GpsPoint[]
  color: string
}

function drawOverlay({ canvas, point, deltaMs, trackPoints, color }: DrawArgs) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const W = canvas.width, H = canvas.height
  ctx.clearRect(0, 0, W, H)
  if (!point) return
  const s = W / 640

  // Speed card top-left
  if (point.speedKmh != null) {
    const bx = 12*s, by = 12*s, bw = 110*s, bh = 64*s
    ctx.fillStyle = 'rgba(18,18,26,0.75)'; roundRect(ctx, bx, by, bw, bh, 8*s)
    ctx.fillStyle = color
    ctx.font = `bold ${42*s}px ${OVERLAY_FONT}`; ctx.textAlign = 'right'
    ctx.fillText(Math.round(point.speedKmh).toString(), bx+bw-8*s, by+46*s)
    ctx.fillStyle = 'rgba(255,255,255,0.5)'
    ctx.font = `${11*s}px ${OVERLAY_FONT}`; ctx.fillText('km/h', bx+bw-8*s, by+bh-6*s)
  }

  // RPM card top-right
  if (point.rpm != null) {
    const bx = W-130*s, by = 12*s, bw = 118*s, bh = 64*s
    ctx.fillStyle = 'rgba(18,18,26,0.75)'; roundRect(ctx, bx, by, bw, bh, 8*s)
    ctx.fillStyle = 'rgba(255,255,255,0.85)'
    ctx.font = `bold ${28*s}px ${OVERLAY_FONT}`; ctx.textAlign = 'right'
    ctx.fillText(Math.round(point.rpm).toLocaleString(), bx+bw-8*s, by+36*s)
    ctx.fillStyle = 'rgba(255,255,255,0.4)'
    ctx.font = `${11*s}px ${OVERLAY_FONT}`; ctx.fillText('RPM', bx+bw-8*s, by+bh-6*s)
    const fill = Math.min(point.rpm / 16000, 1)
    const barX = bx+8*s, barY = by+bh-4*s, barW = bw-16*s
    ctx.fillStyle = 'rgba(255,255,255,0.15)'; roundRect(ctx, barX, barY-6*s, barW, 4*s, 2*s)
    ctx.fillStyle = color; roundRect(ctx, barX, barY-6*s, barW*fill, 4*s, 2*s)
  }

  // Delta centre-bottom
  if (deltaMs != null) {
    const sign = deltaMs <= 0 ? '-' : '+'
    const text = `${sign}${(Math.abs(deltaMs)/1000).toFixed(3)}`
    const dColor = deltaMs <= 0 ? '#22C55E' : '#EF4444'
    const bw = 130*s, bh = 44*s, bx = (W-bw)/2, by = H-80*s
    ctx.fillStyle = 'rgba(18,18,26,0.75)'; roundRect(ctx, bx, by, bw, bh, 8*s)
    ctx.fillStyle = dColor; ctx.font = `bold ${28*s}px ${OVERLAY_FONT}`; ctx.textAlign = 'center'
    ctx.fillText(text, bx+bw/2, by+30*s)
    ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.font = `${10*s}px ${OVERLAY_FONT}`
    ctx.fillText('DELTA', bx+bw/2, by+bh-4*s)
  }

  // Mini track map bottom-right
  if (trackPoints.length > 1) {
    const mapW = 120*s, mapH = 90*s, mapX = W-mapW-10*s, mapY = H-mapH-10*s, pad = 10*s
    ctx.fillStyle = 'rgba(18,18,26,0.80)'; roundRect(ctx, mapX, mapY, mapW, mapH, 8*s)
    let minLat=Infinity, maxLat=-Infinity, minLon=Infinity, maxLon=-Infinity
    for (const p of trackPoints) {
      if (p.lat<minLat) minLat=p.lat; if (p.lat>maxLat) maxLat=p.lat
      if (p.lon<minLon) minLon=p.lon; if (p.lon>maxLon) maxLon=p.lon
    }
    const cosLat = Math.cos(((minLat+maxLat)/2)*Math.PI/180)
    const latSpan = (maxLat-minLat)*111000||1, lonSpan = (maxLon-minLon)*111000*cosLat||1
    const scale = Math.min((mapW-pad*2)/lonSpan,(mapH-pad*2)/latSpan)
    const cx=mapX+mapW/2, cy=mapY+mapH/2
    function toXY(lat:number,lon:number):[number,number]{
      return [cx+(lon-(minLon+maxLon)/2)*111000*cosLat*scale, cy-(lat-(minLat+maxLat)/2)*111000*scale]
    }
    ctx.strokeStyle='rgba(255,255,255,0.25)'; ctx.lineWidth=1.5*s
    ctx.lineCap='round'; ctx.lineJoin='round'; ctx.beginPath()
    trackPoints.forEach((p,i)=>{ const [x,y]=toXY(p.lat,p.lon); i===0?ctx.moveTo(x,y):ctx.lineTo(x,y) })
    ctx.stroke()
    const [dotX,dotY]=toXY(point.lat,point.lon)
    ctx.fillStyle=color; ctx.beginPath(); ctx.arc(dotX,dotY,4*s,0,Math.PI*2); ctx.fill()
  }
  ctx.textAlign='left'
}

function roundRect(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,r:number){
  ctx.beginPath(); ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y)
  ctx.quadraticCurveTo(x+w,y,x+w,y+r); ctx.lineTo(x+w,y+h-r)
  ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h); ctx.lineTo(x+r,y+h)
  ctx.quadraticCurveTo(x,y+h,x,y+h-r); ctx.lineTo(x,y+r)
  ctx.quadraticCurveTo(x,y,x+r,y); ctx.closePath(); ctx.fill()
}

// ─── Single video lane ────────────────────────────────────────────────────────

interface LaneViewProps {
  slot: DriverSlot
  idx: 0 | 1
  videoRef: React.RefObject<HTMLVideoElement | null>
}

function LaneView({ slot, idx, videoRef }: LaneViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapRef   = useRef<HTMLDivElement>(null)
  const color = LANE_COLORS[idx]
  const loggerPoints = slot.session?.type === 'gps' ? slot.session.session.points : []
  const telemetry = usePlayerSync(videoRef, loggerPoints, slot.videoOffsetMs)

  useEffect(() => {
    const wrap=wrapRef.current, canvas=canvasRef.current
    if (!wrap||!canvas||!slot.videoUrl) return
    const obs=new ResizeObserver(()=>{ canvas.width=wrap.clientWidth; canvas.height=wrap.clientHeight })
    obs.observe(wrap); return ()=>obs.disconnect()
  }, [slot.videoUrl])

  useEffect(() => {
    const canvas=canvasRef.current
    if (!canvas) return
    drawOverlay({ canvas, point: telemetry?.point??null, deltaMs: telemetry?.lapDeltaMs??null, trackPoints: loggerPoints, color })
  }, [telemetry, loggerPoints, color])

  if (!slot.videoUrl) return null

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
        <span className="text-xs font-heading font-bold text-text-muted uppercase tracking-wide">
          {idx === 0 ? 'Driver A' : 'Driver B'}
        </span>
        {slot.goproData && (
          <span className="ml-auto text-[10px] text-green-400">GPS sync · {(slot.videoOffsetMs/1000).toFixed(1)}s</span>
        )}
      </div>
      <div ref={wrapRef} className="relative rounded-card overflow-hidden bg-black" style={{ aspectRatio: '16/9' }}>
        <video
          ref={videoRef}
          src={slot.videoUrl}
          className="w-full h-full object-contain"
          playsInline
          preload="metadata"
        />
        <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" style={{ width: '100%', height: '100%' }} />
      </div>
      {telemetry?.point && (
        <div className="grid grid-cols-3 gap-1">
          {[
            { label: 'Speed', value: telemetry.point.speedKmh!=null ? `${Math.round(telemetry.point.speedKmh)} km/h` : '—' },
            { label: 'RPM',   value: telemetry.point.rpm!=null ? Math.round(telemetry.point.rpm).toLocaleString() : '—' },
            { label: 'EGT',   value: '—' },
          ].map(({ label, value }) => (
            <div key={label} className="bg-bg-card border border-border-color rounded-card px-2 py-1.5 text-center">
              <p className="text-[10px] text-text-muted font-heading">{label}</p>
              <p className="text-xs font-mono font-bold text-text-primary">{value}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  slotA: DriverSlot
  slotB: DriverSlot
}

export function ComparisonPlayer({ slotA, slotB }: Props) {
  const [playing, setPlaying]   = useState(false)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCt]    = useState(0)

  const videoARef = useRef<HTMLVideoElement>(null)
  const videoBRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const video = videoARef.current
    if (!video) return
    const onTime = () => setCt(video.currentTime)
    const onMeta = () => setDuration(video.duration)
    video.addEventListener('timeupdate', onTime)
    video.addEventListener('loadedmetadata', onMeta)
    return () => { video.removeEventListener('timeupdate', onTime); video.removeEventListener('loadedmetadata', onMeta) }
  }, [slotA.videoUrl])

  function togglePlay() {
    const a = videoARef.current, b = videoBRef.current
    if (!a) return
    if (playing) {
      a.pause(); b?.pause(); setPlaying(false)
    } else {
      void a.play()
      if (b && slotB.videoUrl) {
        const aLoggerTime = (a.currentTime * 1000 - slotA.videoOffsetMs) / 1000
        b.currentTime = Math.max(0, (aLoggerTime * 1000 + slotB.videoOffsetMs) / 1000)
        void b.play()
      }
      setPlaying(true)
    }
  }

  function seek(timeS: number) {
    const a = videoARef.current, b = videoBRef.current
    if (!a) return
    a.currentTime = timeS
    if (b && slotB.videoUrl) {
      const aLoggerTime = (timeS * 1000 - slotA.videoOffsetMs) / 1000
      b.currentTime = Math.max(0, (aLoggerTime * 1000 + slotB.videoOffsetMs) / 1000)
    }
    setCt(timeS)
  }

  function fmtTime(s: number) {
    const m = Math.floor(s / 60); const ss = Math.floor(s % 60)
    return `${m}:${String(ss).padStart(2,'0')}`
  }

  const hasA = !!slotA.videoUrl
  const hasB = !!slotB.videoUrl

  return (
    <div className="space-y-4">
      <div className={`grid gap-4 ${hasA && hasB ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 max-w-2xl mx-auto'}`}>
        <LaneView slot={slotA} idx={0} videoRef={videoARef} />
        {hasB && <LaneView slot={slotB} idx={1} videoRef={videoBRef} />}
      </div>

      {hasA && (
        <div className="bg-bg-card border border-border-color rounded-card px-4 py-3 space-y-2">
          <input
            type="range" min={0} max={duration || 1} step={0.1} value={currentTime}
            onChange={e => seek(Number(e.target.value))}
            className="w-full accent-accent-primary"
          />
          <div className="flex items-center gap-4">
            <button type="button" onClick={togglePlay}
              className="flex items-center justify-center w-8 h-8 rounded-full bg-accent-primary/10 border border-accent-primary/20 text-accent-primary hover:bg-accent-primary/20 transition-colors">
              {playing ? <Pause size={14} /> : <Play size={14} />}
            </button>
            <span className="text-xs font-mono text-text-muted">{fmtTime(currentTime)} / {fmtTime(duration)}</span>
          </div>
        </div>
      )}
    </div>
  )
}
