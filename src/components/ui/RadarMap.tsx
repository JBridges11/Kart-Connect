import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Play, Pause, Maximize2, Minimize2 } from 'lucide-react'

interface Frame { time: number; path: string | null; isNowcast: boolean; isPlaceholder?: boolean }
interface Props  { lat: number; lng: number }

export function RadarMap({ lat, lng }: Props) {
  const containerRef  = useRef<HTMLDivElement>(null)
  const wrapperRef    = useRef<HTMLDivElement>(null)
  const mapRef        = useRef<L.Map | null>(null)
  const radarRef      = useRef<L.TileLayer | null>(null)
  const markerRef     = useRef<L.CircleMarker | null>(null)
  const hostRef       = useRef('https://tilecache.rainviewer.com')
  const framesRef     = useRef<Frame[]>([])
  const activeIdxRef  = useRef(0)

  const [frames, setFrames]           = useState<Frame[]>([])
  const [activeIdx, setActiveIdx]     = useState(0)
  const [isPlaying, setIsPlaying]     = useState(false)
  const [loading, setLoading]         = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [hasForecast, setHasForecast] = useState(true)
  const [showPlaceholder, setShowPlaceholder] = useState(false)

  // Swap to a specific frame directly — pure Leaflet, no React effects
  function swapFrame(idx: number) {
    const map = mapRef.current
    const frm = framesRef.current[idx]
    if (!map || !frm) return
    if (!frm.isPlaceholder && frm.path) {
      radarRef.current?.remove()
      radarRef.current = L.tileLayer(
        `${hostRef.current}${frm.path}/256/{z}/{x}/{y}/6/1_0.png`,
        { opacity: 0.8, zIndex: 200, maxNativeZoom: 7 }
      ).addTo(map)
      setShowPlaceholder(false)
    } else {
      // Keep last known tile visible, show overlay
      setShowPlaceholder(true)
    }
    activeIdxRef.current = idx
    setActiveIdx(idx)
  }

  // Init Leaflet map — runs once on mount
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    const map = L.map(containerRef.current, {
      center: [lat, lng],
      zoom: 9,
      minZoom: 3,
      maxZoom: 12,
    })
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map)
    mapRef.current = map
    return () => { map.remove(); mapRef.current = null }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Keep blue dot on current location
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    markerRef.current?.remove()
    markerRef.current = L.circleMarker([lat, lng], {
      radius: 9, fillColor: '#3B82F6', fillOpacity: 1, color: '#fff', weight: 2.5,
    }).addTo(map)
    map.panTo([lat, lng])
  }, [lat, lng])

  // Fetch radar frames from RainViewer every 10 minutes
  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const res  = await fetch('https://api.rainviewer.com/public/weather-maps.json')
        const data = await res.json() as {
          host: string
          radar: {
            past:    Array<{ time: number; path: string }>
            nowcast: Array<{ time: number; path: string }>
          }
        }
        hostRef.current = data.host
        const past    = data.radar.past.map(f => ({ ...f, isNowcast: false, isPlaceholder: false }))
        const nowcast = (data.radar.nowcast ?? []).map(f => ({ ...f, isNowcast: true, isPlaceholder: false }))
        setHasForecast(nowcast.length > 0)

        // Always build 3 future slots (+10, +20, +30 min) from current time.
        // If RainViewer has a nowcast frame close to that time, use it — otherwise placeholder.
        const nowUnix = Math.floor(Date.now() / 1000)
        const futureSlots: Frame[] = [600, 1200, 1800].map(offset => {
          const t = nowUnix + offset
          const match = nowcast.find(f => Math.abs(f.time - t) < 400)
          return match ?? { time: t, path: null, isNowcast: true, isPlaceholder: true }
        })

        // Last 6 past frames (60 min history) + 3 future slots
        const recentPast = past.slice(-6)
        const all = [...recentPast, ...futureSlots]
        framesRef.current = all
        setFrames(all)
        // Land on last past frame (most recent observed, just before now)
        const lastPastIdx = recentPast.length - 1
        swapFrame(Math.max(0, Math.min(lastPastIdx, all.length - 1)))
      } catch { /* silent */ }
      finally { setLoading(false) }
    }
    void load()
    const id = setInterval(() => void load(), 10 * 60 * 1000)
    return () => clearInterval(id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Animation playback
  useEffect(() => {
    if (!isPlaying || !frames.length) return
    const id = setInterval(() => {
      const next = activeIdxRef.current + 1
      if (next >= framesRef.current.length) {
        setIsPlaying(false)
      } else {
        swapFrame(next)
      }
    }, 600)
    return () => clearInterval(id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, frames.length])

  // Fullscreen: listen for browser fullscreen changes and resize map
  useEffect(() => {
    function onFsChange() {
      const nowFs = !!document.fullscreenElement
      setIsFullscreen(nowFs)
      setTimeout(() => mapRef.current?.invalidateSize(), 150)
    }
    document.addEventListener('fullscreenchange', onFsChange)
    return () => document.removeEventListener('fullscreenchange', onFsChange)
  }, [])

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      wrapperRef.current?.requestFullscreen()
    } else {
      document.exitFullscreen()
    }
  }

  function handlePlay() {
    if (isPlaying) {
      setIsPlaying(false)
    } else {
      // If at the last frame, rewind to start before playing
      if (activeIdxRef.current >= framesRef.current.length - 1) {
        swapFrame(0)
      }
      setIsPlaying(true)
    }
  }

  function hhmm(unix: number) {
    return new Date(unix * 1000).toLocaleTimeString([], {
      hour: '2-digit', minute: '2-digit',
    })
  }

  const activeFrame = frames[activeIdx]

  return (
    <div
      ref={wrapperRef}
      className={isFullscreen
        ? 'fixed inset-0 z-[9999] bg-[#12121A] flex flex-col p-3 gap-3'
        : ''}
    >
      {/* Map container — taller in fullscreen */}
      <div className="relative flex-1 min-h-0">
        <div
          ref={containerRef}
          className="w-full h-full rounded-card overflow-hidden"
          style={isFullscreen ? {} : { height: 'clamp(280px, 55vw, 420px)' }}
        />

        {/* Placeholder overlay when no tile exists for this future slot */}
        {showPlaceholder && (
          <div className="absolute inset-0 z-[500] flex items-center justify-center rounded-card pointer-events-none"
            style={{ background: 'rgba(0,0,0,0.45)' }}>
            <p className="text-white/70 text-xs text-center px-4">No radar data for this time<br/>Showing last known observation</p>
          </div>
        )}

        {/* Fullscreen toggle — overlaid top-right of map */}
        <button
          type="button"
          onClick={toggleFullscreen}
          title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          className="absolute top-2 right-2 z-[1000] w-8 h-8 flex items-center justify-center rounded bg-black/60 text-white hover:bg-black/80 transition-colors"
        >
          {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
        </button>
      </div>

      {/* Timeline controls */}
      {!loading && frames.length > 0 && (
        <div className="space-y-2">

          <div className="flex items-center justify-between text-xs">
            <span className="font-mono text-text-primary font-semibold">
              {activeFrame ? hhmm(activeFrame.time) : ''}
            </span>
            <span className={`font-semibold ${activeFrame?.isNowcast ? 'text-sky-400' : 'text-text-muted'}`}>
              {activeFrame?.isNowcast ? 'Forecast' : 'Observed'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handlePlay}
              className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-full bg-accent-primary text-black"
            >
              {isPlaying ? <Pause size={14} /> : <Play size={14} />}
            </button>
            <input
              type="range"
              min={0}
              max={frames.length - 1}
              value={activeIdx}
              onChange={e => {
                setIsPlaying(false)
                swapFrame(Number(e.target.value))
              }}
              className="flex-1"
              style={{ accentColor: '#E8FF00' }}
            />
          </div>

          <div className="flex justify-between pl-11 relative">
            {frames.map((f, i) => {
              // Insert a NOW marker before the first nowcast frame
              const isFirstNowcast = f.isNowcast && (i === 0 || !frames[i - 1].isNowcast)
              return (
                <div key={f.time} className="flex items-end gap-0.5">
                  {isFirstNowcast && (
                    <span className="text-[8px] text-accent-primary font-bold leading-none mb-px mr-0.5">NOW</span>
                  )}
                  <button
                    type="button"
                    onClick={() => { setIsPlaying(false); swapFrame(i) }}
                    className={`text-[9px] font-mono transition-colors ${
                      i === activeIdx
                        ? 'text-accent-primary font-bold'
                        : f.isNowcast
                        ? 'text-sky-500/50'
                        : 'text-text-muted/40'
                    }`}
                  >
                    {hhmm(f.time)}
                  </button>
                </div>
              )
            })}
          </div>

          {/* Legend — classic meteorological radar scale */}
          <div className="flex items-center gap-2 pt-1">
            <span className="text-[9px] text-text-muted uppercase tracking-wider flex-shrink-0">Light</span>
            <div className="flex-1 h-2 rounded-full" style={{
              background: 'linear-gradient(to right, #87CEEB, #00C800, #FFFF00, #FF8C00, #FF0000, #B300B3)',
            }} />
            <span className="text-[9px] text-text-muted uppercase tracking-wider flex-shrink-0">Heavy</span>
          </div>
          <div className="flex justify-between text-[8px] text-text-muted/50">
            <span>Drizzle</span><span>Moderate</span><span>Heavy</span><span>Severe</span>
          </div>
          {!hasForecast && (
            <p className="text-[10px] text-text-muted/60 text-center pt-1">
              Live forecast tiles unavailable — future slots show last known observation. Updates every 10 min.
            </p>
          )}
        </div>
      )}

      {loading && (
        <div className="flex items-center gap-2 mt-3 text-text-muted text-xs">
          <span className="w-3 h-3 border-2 border-text-muted border-t-transparent rounded-full animate-spin flex-shrink-0" />
          Loading radar data…
        </div>
      )}
    </div>
  )
}
