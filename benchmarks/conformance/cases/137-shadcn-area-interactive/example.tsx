import { useMemo, useState } from 'react'
import {
  areaY,
  d3Curve,
  defineChart,
  stack,
  type ChartPoint,
} from '@tanstack/charts'
import { RendererChart } from '@tanstack/charts/react/tooltip'
import { tooltip } from '@tanstack/charts/tooltip'
import { motion } from '@tanstack/charts/motion'
import { scaleLinear, scalePoint } from 'd3-scale'
import { curveNatural } from 'd3-shape'
import {
  shadcnColors,
  type ShadcnSeriesDatum,
} from '@tanstack/charts-data/shadcn'
import interactiveAreaData from '@tanstack/charts-data/shadcn-area-interactive-data'
import './styles.css'
type InteractiveTimeRange = '90d' | '30d' | '7d'
const twoSeries = ['desktop', 'mobile'] as const
const interactiveAreaRows = interactiveAreaData as readonly {
  date: string
  desktop: number
  mobile: number
}[]
export function createExampleChart(timeRange: InteractiveTimeRange = '90d') {
  const filteredRows = filterInteractiveAreaRows(timeRange)
  const rows: ShadcnSeriesDatum[] = filteredRows.flatMap((row) => [
    { month: row.date, series: 'mobile', value: row.mobile },
    { month: row.date, series: 'desktop', value: row.desktop },
  ])
  return defineChart(
    ({ width }) => ({
      marks: [
        areaY(rows, {
          id: 'visitor-areas',
          x: 'month',
          y: 'value',
          z: 'series',
          color: 'series',
          key: (row) => `${row.month}:${row.series}`,
          layout: stack({ order: ['mobile', 'desktop'] }),
          curve: d3Curve(curveNatural),
          fill: (row) => `url(#shadcn-interactive-${row.series})`,
          fillOpacity: 1,
          stroke: (row) =>
            row.series === 'mobile' ? shadcnColors[1] : shadcnColors[0],
          strokeWidth: 1,
        }),
      ],
      x: {
        scale: scalePoint,
        axis: {
          line: false,
          ticks: {
            values: interactiveDateTicks(timeRange),
            size: 0,
            padding: 10,
            format: formatMonthDay,
          },
        },
      },
      y: {
        scale: scaleLinear().domain([0, 1200]),
        grid: true,
        axis: {
          line: false,
          ticks: { values: [0, 300, 600, 900, 1200], size: 0 },
          tickLabels: false,
        },
      },
      color: { domain: twoSeries, range: shadcnColors.slice(0, 2) },
      gradients: twoSeries.map((series, index) => ({
        id: `shadcn-interactive-${series}`,
        x1: 0,
        y1: 1,
        x2: 0,
        y2: 0,
        stops: [
          { offset: 0.05, color: shadcnColors[index], opacity: 0.1 },
          { offset: 0.95, color: shadcnColors[index], opacity: 0.8 },
        ],
      })),
      margin: {
        top: 32,
        right: width < 400 ? 14 : 5,
        bottom: 35,
        left: 5,
      },
      theme: shadcnTheme(),
    }),
    {
      svgAnimation: false,
      focus: 'group-x',
      tooltip: {
        use: tooltip,
        className: 'sc-chart-tooltip',
        anchor: 'group-center',
        placement: 'auto',
        sort: 'color-domain',
        content: (points) => shadcnTooltipContent(points),
      },
    },
  )
}
function filterInteractiveAreaRows(timeRange: InteractiveTimeRange) {
  const days = timeRange === '30d' ? 30 : timeRange === '7d' ? 7 : 90
  const start = new Date('2024-06-30T00:00:00Z')
  start.setUTCDate(start.getUTCDate() - days)
  const firstDate = start.toISOString().slice(0, 10)
  return interactiveAreaRows.filter((row) => row.date >= firstDate)
}
function interactiveDateTicks(timeRange: InteractiveTimeRange) {
  if (timeRange === '7d') {
    return ['2024-06-23', '2024-06-25', '2024-06-27', '2024-06-29']
  }
  if (timeRange === '30d') {
    return [
      '2024-06-01',
      '2024-06-08',
      '2024-06-15',
      '2024-06-22',
      '2024-06-29',
    ]
  }
  return [
    '2024-04-10',
    '2024-04-21',
    '2024-05-02',
    '2024-05-13',
    '2024-05-25',
    '2024-06-05',
    '2024-06-16',
    '2024-06-29',
  ]
}
function formatMonthDay(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(value))
}
function shadcnTheme() {
  return {
    foreground: 'var(--muted-foreground, var(--muted))',
    grid: 'var(--border)',
    background: 'transparent',
  }
}
function shadcnTooltipContent<TDatum>(points: readonly ChartPoint<TDatum>[]) {
  return {
    title: String(points[0]?.xValue ?? ''),
    rows: points.map((point) => ({
      label: titleCase(
        String(
          point.group ??
            point.markId.replace(
              /-?(bars|lines|areas|slices|values|radar)$/u,
              '',
            ),
        ),
      ),
      value: Number(point.yValue ?? point.xValue ?? 0).toLocaleString('en-US'),
      color: point.color,
    })),
  }
}
function titleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}
export const definition = createExampleChart()
const renderer = motion({
  initial: 'always',
  transition: { type: 'spring', stiffness: 170, damping: 18, mass: 1 },
})
export interface ExampleProps {
  width?: number
  height?: number
}
export default function Example({ width = 640, height = 600 }: ExampleProps) {
  const [timeRange, setTimeRange] = useState<InteractiveTimeRange>('90d')
  const chartDefinition = useMemo(
    () => createExampleChart(timeRange),
    [timeRange],
  )
  const contentWidth = Math.max(1, width - 50)
  const chartWidth = contentWidth
  const chartHeight = 250
  return (
    <div className="sc-example" style={{ width, height }}>
      <article className="sc-card sc-interactive-area" style={{ width }}>
        <header className="sc-card-header">
          <div className="sc-card-heading">
            <h2>Area Chart - Interactive</h2>
            <p>Showing total visitors for the last 3 months</p>
          </div>
          <div className="sc-card-action">
            <SelectControl
              value={timeRange}
              onChange={(value) => setTimeRange(value as InteractiveTimeRange)}
              options={[
                { value: '90d', label: 'Last 3 months' },
                { value: '30d', label: 'Last 30 days' },
                { value: '7d', label: 'Last 7 days' },
              ]}
            />
          </div>
        </header>
        <div className="sc-card-content">
          <div
            className="sc-chart"
            style={{ width: chartWidth, height: chartHeight }}
          >
            <RendererChart
              definition={chartDefinition}
              renderer={renderer}
              initialWidth={chartWidth}
              height={chartHeight}
              ariaLabel="Area Chart - Interactive"
            />
          </div>
          <div className="sc-chart-footer">
            <Legend />
          </div>
        </div>
      </article>
    </div>
  )
}
function Legend() {
  return (
    <>
      {['desktop', 'mobile'].map((label, index) => (
        <span className="sc-legend-item" key={label}>
          <span
            className="sc-legend-dot"
            style={{ background: shadcnColors[index] }}
          />
          {titleCase(label)}
        </span>
      ))}
    </>
  )
}
function SelectControl({
  value,
  options,
  onChange,
}: {
  value: string
  options: readonly {
    value: string
    label: string
    swatch?: string
  }[]
  onChange: (value: string) => void
}) {
  const selected = options.find((option) => option.value === value)
  return (
    <label className="sc-select-display">
      {selected?.swatch ? (
        <span
          className="sc-select-swatch"
          style={{ background: selected.swatch }}
        />
      ) : null}
      <select
        aria-label="Select a value"
        value={value}
        onChange={(event) => onChange(event.currentTarget.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="m6 9 6 6 6-6"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        />
      </svg>
    </label>
  )
}
