import { useState, useEffect } from 'react'

interface UtcClockProps {
  size?: 'sm' | 'lg'
}

export function UtcClock({ size = 'sm' }: UtcClockProps) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  const h  = String(now.getHours()).padStart(2, '0')
  const m  = String(now.getMinutes()).padStart(2, '0')
  const s  = String(now.getSeconds()).padStart(2, '0')
  // Short timezone abbreviation e.g. "BST", "GMT", "EST"
  const tz = now.toLocaleTimeString('en-GB', { timeZoneName: 'short' }).split(' ').pop() ?? ''

  if (size === 'lg') {
    return (
      <div className="flex flex-col items-end">
        <span className="font-mono text-2xl font-bold text-text-primary tabular-nums leading-none">{h}:{m}:{s}</span>
        <span className="text-xs text-text-muted mt-0.5">{tz}</span>
      </div>
    )
  }

  return (
    <div className="flex items-baseline gap-1 flex-shrink-0">
      <span className="font-mono text-sm font-semibold text-text-primary tabular-nums">{h}:{m}:{s}</span>
      <span className="text-xs text-text-muted">{tz}</span>
    </div>
  )
}
