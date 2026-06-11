import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import type { LapTime } from '@/types'
import { lapMsToString } from '@/lib/formatters'

interface LapProgressChartProps {
  lapTimes: LapTime[]
  height?: number
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ value: number }> }) {
  if (!active || !payload?.[0]) return null
  return (
    <div className="bg-bg-card border border-border-color rounded px-3 py-2 font-mono text-sm text-text-primary">
      {lapMsToString(payload[0].value)}
    </div>
  )
}

export function LapProgressChart({ lapTimes, height = 200 }: LapProgressChartProps) {
  if (lapTimes.length === 0) return (
    <div className="flex items-center justify-center h-32 text-text-muted text-sm">
      No lap times recorded
    </div>
  )

  const bestMs = Math.min(...lapTimes.map(l => l.lap_time_ms))
  const domain: [number, number] = [
    Math.min(...lapTimes.map(l => l.lap_time_ms)) - 500,
    Math.max(...lapTimes.map(l => l.lap_time_ms)) + 500,
  ]

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={lapTimes} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E4E4E7" />
        <XAxis
          dataKey="lap_number"
          tick={{ fill: '#71717A', fontSize: 11, fontFamily: 'JetBrains Mono' }}
          label={{ value: 'Lap', position: 'insideBottomRight', fill: '#71717A', fontSize: 11 }}
          stroke="#E4E4E7"
        />
        <YAxis
          domain={domain}
          tickFormatter={lapMsToString}
          tick={{ fill: '#71717A', fontSize: 11, fontFamily: 'JetBrains Mono' }}
          stroke="#E4E4E7"
          width={72}
        />
        <Tooltip content={<CustomTooltip />} />
        <ReferenceLine y={bestMs} stroke="#CA8A04" strokeDasharray="4 4" strokeOpacity={0.6} />
        <Line
          type="monotone"
          dataKey="lap_time_ms"
          stroke="#CA8A04"
          strokeWidth={2}
          dot={{ fill: '#CA8A04', r: 3 }}
          activeDot={{ r: 5, fill: '#CA8A04' }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
