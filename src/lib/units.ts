export type AltUnit  = 'm' | 'ft'
export type TempUnit = 'c' | 'f'
export type SpeedUnit = 'kph' | 'mph'

// Altitude
export const mToFt  = (m: number)  => Math.round(m * 3.28084)
export const ftToM  = (ft: number) => Math.round(ft / 3.28084)

// Temperature
export const cToF = (c: number) => Math.round((c * 9 / 5 + 32) * 10) / 10
export const fToC = (f: number) => Math.round(((f - 32) * 5 / 9) * 10) / 10

// Speed — top_speed/low_speed stored as kph in DB
export const kphToMph = (kph: number) => Math.round(kph * 0.621371 * 10) / 10
export const mphToKph = (mph: number) => Math.round(mph / 0.621371 * 10) / 10

// Wind — wind_speed_mph stored as mph in DB
export const mphToKphWind = (mph: number) => Math.round(mph * 1.60934)
export const kphToMphWind = (kph: number) => Math.round(kph / 1.60934)

// Display helpers
export function displayAlt(m: number | null, unit: AltUnit): number | '' {
  if (m === null) return ''
  return unit === 'ft' ? mToFt(m) : m
}
export function inputAltToM(val: string, unit: AltUnit): number | null {
  if (!val) return null
  const n = Number(val)
  return unit === 'ft' ? ftToM(n) : n
}

export function displayTemp(c: number | null, unit: TempUnit): number | '' {
  if (c === null) return ''
  return unit === 'f' ? cToF(c) : c
}
export function inputTempToC(val: string, unit: TempUnit): number | null {
  if (!val) return null
  const n = Number(val)
  return unit === 'f' ? fToC(n) : n
}

// Wind stored as mph
export function displayWind(mph: number | null, unit: SpeedUnit): number | '' {
  if (mph === null) return ''
  return unit === 'kph' ? mphToKphWind(mph) : mph
}
export function inputWindToMph(val: string, unit: SpeedUnit): number | null {
  if (!val) return null
  const n = Number(val)
  return unit === 'kph' ? kphToMphWind(n) : n
}

// Speed stored as kph
export function displaySpeed(kph: number | null, unit: SpeedUnit): number | '' {
  if (kph === null) return ''
  return unit === 'mph' ? kphToMph(kph) : kph
}
export function inputSpeedToKph(val: string, unit: SpeedUnit): number | null {
  if (!val) return null
  const n = Number(val)
  return unit === 'mph' ? mphToKph(n) : n
}

export const altUnitLabel  = (u: AltUnit)  => u === 'ft' ? 'ft' : 'm'
export const tempUnitLabel = (u: TempUnit) => u === 'f'  ? '°F' : '°C'
export const speedUnitLabel = (u: SpeedUnit) => u
