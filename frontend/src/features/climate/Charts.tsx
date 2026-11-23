import {
  Bar, BarChart, CartesianGrid, Legend, Line, LineChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { formatDay, formatMonth, formatShortDay, number } from './format'

export const chartColors = ['#1c795b', '#26679d', '#aa5725']
const dashes = ['0', '7 4', '2 4']

export type ChartRow = { date: string } & Record<string, number | string | null>
export type ChartSeries = { key: string; label: string; color: string }

export function ClimateChart({ title, description, data, series, kind, monthly, unit }: {
  title: string
  description: string
  data: ChartRow[]
  series: ChartSeries[]
  kind: 'line' | 'bar'
  monthly?: boolean
  unit: string
}) {
  const format = monthly ? formatMonth : formatShortDay
  const hasValues = data.some(row => series.some(item => typeof row[item.key] === 'number'))
  const Chart = kind === 'line' ? LineChart : BarChart
  return (
    <section className="panel chart-card" aria-label={title}>
      <header className="card-heading chart-heading">
        <div><h3>{title}</h3><p>{description}</p></div>
        <span className="chart-unit">{unit}</span>
      </header>
      {hasValues ? (
        <div className="chart-box">
          <ResponsiveContainer width="100%" height="100%" minWidth={0} debounce={60}>
            <Chart data={data} margin={{ top: 10, right: 10, bottom: 2, left: 0 }} accessibilityLayer>
              <CartesianGrid vertical={false} stroke="#e1e9e3" strokeDasharray="4 4" />
              <XAxis dataKey="date" tickFormatter={format} minTickGap={24} tickMargin={10}
                tick={{ fill: '#52645b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis width={40} domain={kind === 'line' ? ['auto', 'auto'] : [0, 'auto']}
                tick={{ fill: '#52645b', fontSize: 11 }} tickFormatter={(value: number) => number(value)}
                axisLine={false} tickLine={false} />
              <Tooltip labelFormatter={(label) => (monthly ? formatMonth : formatDay)(String(label))}
                formatter={(value) => typeof value === 'number' ? [number(value) + ' ' + unit] : []}
                contentStyle={{ borderRadius: 10, borderColor: '#cfdfd4', fontSize: 13 }} />
              {series.length > 1 && <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />}
              {series.map((item, index) => kind === 'line' ? (
                <Line key={item.key} dataKey={item.key} name={item.label} stroke={item.color}
                  strokeWidth={2.2} strokeDasharray={dashes[index]} connectNulls={false}
                  dot={data.length <= 36 ? { r: 2.6 } : false} isAnimationActive={false} />
              ) : (
                <Bar key={item.key} dataKey={item.key} name={item.label} fill={item.color}
                  maxBarSize={26} radius={[3, 3, 0, 0]} isAnimationActive={false} />
              ))}
            </Chart>
          </ResponsiveContainer>
        </div>
      ) : <p className="chart-empty">Sin observaciones válidas para este gráfico.</p>}
    </section>
  )
}
