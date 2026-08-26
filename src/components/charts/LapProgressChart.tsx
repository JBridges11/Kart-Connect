import {
  LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend,
} from 'recharts'
import type { LapTime } from '@/types'
import { lapMsToString } from '@/lib/formatters'

interface SiblingLapSeries {
  label: string
  laps: Array<{ lap_number: number; lap_time_ms: number }>
}

interface LapProgressChartProps {
  lapTimes: LapTime[]
  height?: number
  siblingLapSeries?: SiblingLapSeries[]
}

const SIBLING_COLORS = ['#60A5FA', '#34D399', '#F472B6', '#A78BFA', '#FB923C', '#38BDF8', '#4ADE80']

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: number }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-bg-card border border-border-color rounded px-3 py-2 space-y-1">
      <p className="text-xs text-text-muted font-mono mb-1">Lap {label}</p>
      {payload.map(p => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
          <span className="text-xs text-text-muted font-mono">{p.name}</span>
          <span className="font-mono text-sm font-semibold" style={{ color: p.color }}>{lapMsToString(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

export function LapProgressChart({ lapTimes, height = 200, siblingLapSeries = [] }: LapProgressChartProps) {
  if (lapTimes.length === 0) return (
    <div className="flex items-center justify-center h-32 text-text-muted text-sm">
      No lap times recorded
    </div>
  )

  const hasSiblings = siblingLapSeries.length > 0

  // Build unified chart data keyed by lap number
  const maxLap = Math.max(
    ...lapTimes.map(l => l.lap_number),
    ...siblingLapSeries.flatMap(s => s.laps.map(l => l.lap_number)),
  )

  const chartData = Array.from({ length: maxLap }, (_, i) => {
    const lap = i + 1
    const row: Record<string, number | null> = { lap }
    const own = lapTimes.find(l => l.lap_number === lap)
    row['This session'] = own ? own.lap_time_ms : null
    siblingLapSeries.forEach(s => {
      const match = s.laps.find(l => l.lap_number === lap)
      row[s.label] = match ? match.lap_time_ms : null
    })
    return row
  })

  const bestMs = Math.min(...lapTimes.map(l => l.lap_time_ms))
  const allMs = [
    ...lapTimes.map(l => l.lap_time_ms),
    ...siblingLapSeries.flatMap(s => s.laps.map(l => l.lap_time_ms)),
  ]
  const domain: [number, number] = [Math.min(...allMs) - 500, Math.max(...allMs) + 500]

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#2A2A3A" />
        <XAxis
          dataKey="lap"
          tick={{ fill: '#71717A', fontSize: 11, fontFamily: 'JetBrains Mono' }}
          label={{ value: 'Lap', position: 'insideBottomRight', fill: '#71717A', fontSize: 11 }}
          stroke="#2A2A3A"
        />
        <YAxis
          domain={domain}
          tickFormatter={lapMsToString}
          tick={{ fill: '#71717A', fontSize: 11, fontFamily: 'JetBrains Mono' }}
          stroke="#2A2A3A"
          width={72}
        />
        <Tooltip content={<CustomTooltip />} />
        {hasSiblings && (
          <Legend
            wrapperStyle={{ fontSize: 11, fontFamily: 'JetBrains Mono', color: '#71717A', paddingTop: 4 }}
          />
        )}
        <ReferenceLine y={bestMs} stroke="#CA8A04" strokeDasharray="4 4" strokeOpacity={0.5} />

        {/* Sibling session lines */}
        {siblingLapSeries.map((s, i) => (
          <Line
            key={s.label}
            type="monotone"
            dataKey={s.label}
            stroke={SIBLING_COLORS[i % SIBLING_COLORS.length]}
            strokeWidth={1.5}
            dot={{ fill: SIBLING_COLORS[i % SIBLING_COLORS.length], r: 2, strokeWidth: 0 }}
            activeDot={{ r: 4 }}
            connectNulls={false}
          />
        ))}

        {/* This session — gold, on top */}
        <Line
          type="monotone"
          dataKey="This session"
          stroke="#CA8A04"
          strokeWidth={2}
          dot={{ fill: '#CA8A04', r: 3, strokeWidth: 0 }}
          activeDot={{ r: 5, fill: '#CA8A04' }}
          connectNulls={false}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
