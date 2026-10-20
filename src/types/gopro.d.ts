declare module 'gpmf-extract' {
  interface GpmfTiming {
    start: Date
    frameDuration: number
    frames?: number
    samples: Array<{ cts: number; duration: number }>
  }
  interface GpmfExtracted {
    rawData: Uint8Array
    timing: GpmfTiming
  }
  interface GpmfOptions {
    browserMode?: boolean
    useWorker?: boolean
    progress?: (percent: number) => void
    cancellationToken?: { cancelled: boolean }
  }
  function gpmfExtract(input: File | Buffer | ArrayBuffer, options?: GpmfOptions): Promise<GpmfExtracted>
  export = gpmfExtract
}

declare module 'gopro-telemetry' {
  interface GPS5Sample {
    value: [number, number, number, number, number]  // lat, lon, alt, speed2d_m/s, speed3d_m/s
    cts: number       // composition timestamp — ms from video start
    date?: string     // ISO UTC string, present on Hero7+ with GPS fix
    sticky?: { fix?: number; precision?: number }
  }
  interface TelemetryStream {
    samples: GPS5Sample[]
  }
  interface TelemetryDevice {
    streams: Record<string, TelemetryStream>
  }
  interface GoProTelemetryOptions {
    stream?: string[]
    tolerant?: boolean
    debug?: boolean
  }
  export function goProTelemetry(
    input: { rawData: Uint8Array | Buffer; timing: unknown },
    options?: GoProTelemetryOptions
  ): Promise<Record<string, TelemetryDevice>>
}
