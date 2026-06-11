import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { lapMsToString } from '@/lib/formatters'

interface DataPoint {
  x: number
  y: number
  label: string
}

interface ParameterCorrelationChartProps {
  data: DataPoint[]
  xLabel: string
  height?: number
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: DataPoint }> }) {
  if (!active || !payload?.[0]) return null
  const { x, y, label } = payload[0].payload
  return (
    <div className="bg-bg-card border border-border-color rounded px-3 py-2 text-xs font-mono text-text-primary">
      <div className="text-text-muted mb-1">{label}</div>
      <div>x: {x}</div>
      <div>Best lap: {lapMsToString(y)}</div>
    </div>
  )
}

export function ParameterCorrelationChart({ data, xLabel, height = 200 }: ParameterCorrelationChartProps) {
  if (data.length === 0) return (
    <div className="flex items-center justify-center h-32 text-text-muted text-sm">
      Not enough data
    </div>
  )

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ScatterChart margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#2A2A3A" />
        <XAxis
          dataKey="x"
          name={xLabel}
          tick={{ fill: '#6B7A99', fontSize: 11, fontFamily: 'JetBrains Mono' }}
          stroke="#2A2A3A"
          label={{ value: xLabel, position: 'insideBottom', fill: '#6B7A99', fontSize: 11, offset: -4 }}
        />
        <YAxis
          dataKey="y"
          name="Best Lap"
          tickFormatter={lapMsToString}
          tick={{ fill: '#6B7A99', fontSize: 11, fontFamily: 'JetBrains Mono' }}
          stroke="#2A2A3A"
          width={72}
        />
        <Tooltip content={<CustomTooltip />} />
        <Scatter data={data} fill="#E8FF00" opacity={0.8} />
      </ScatterChart>
    </ResponsiveContainer>
  )
}
