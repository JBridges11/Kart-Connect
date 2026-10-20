import { useState, useEffect, useRef, type RefObject } from 'react'
import type { GpsPoint } from '@/lib/dataLoggerImport'
import { findLoggerPoint } from '@/lib/gopro/sync'

export interface PlayerTelemetry {
  videoTimeMs: number
  loggerTimeS: number     // logger-relative time corresponding to this video frame
  point: GpsPoint | null  // nearest logger point (null when outside logger range)
  lapDeltaMs: number | null // +/- ms vs the reference lap at the same track distance
}

/**
 * Subscribes to a video element's timeupdate (60fps via rAF) and returns the
 * logger data point that corresponds to the current playback position.
 *
 * videoOffsetMs:  videoMs - videoOffsetMs = loggerMs
 * refLapPoints:   optional reference lap for delta calculation
 */
export function usePlayerSync(
  videoRef: RefObject<HTMLVideoElement | null>,
  loggerPoints: GpsPoint[],
  videoOffsetMs: number,
  refLapPoints?: GpsPoint[],
): PlayerTelemetry | null {
  const [telemetry, setTelemetry] = useState<PlayerTelemetry | null>(null)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    const video = videoRef.current
    if (!video || !loggerPoints.length) {
      setTelemetry(null)
      return
    }

    function tick() {
      if (!video) return
      const videoMs  = video.currentTime * 1000
      const loggerMs = videoMs - videoOffsetMs
      const loggerTimeS = loggerMs / 1000

      const lastS = loggerPoints[loggerPoints.length - 1].timeS
      if (loggerTimeS < 0 || loggerTimeS > lastS) {
        setTelemetry(null)
        rafRef.current = requestAnimationFrame(tick)
        return
      }

      const point = findLoggerPoint(loggerPoints, loggerTimeS)

      // Delta vs reference lap at the same cumulative distance
      let lapDeltaMs: number | null = null
      if (point && refLapPoints && refLapPoints.length > 1) {
        const totalRefDist = refLapPoints[refLapPoints.length - 1].distanceM
        const currentDist  = point.distanceM

        if (totalRefDist > 0) {
          const frac   = Math.min(currentDist / totalRefDist, 1)
          const refIdx = Math.min(
            Math.round(frac * (refLapPoints.length - 1)),
            refLapPoints.length - 1,
          )
          const refPoint = refLapPoints[refIdx]
          lapDeltaMs = (loggerTimeS - refPoint.timeS) * 1000
        }
      }

      setTelemetry({ videoTimeMs: videoMs, loggerTimeS, point, lapDeltaMs })
      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [videoRef, loggerPoints, videoOffsetMs, refLapPoints])

  return telemetry
}
