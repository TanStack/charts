import { useMemo, useState } from 'react'
import { barY, defineChart, type ChartPoint } from '@tanstack/charts'
import { RendererChart } from '@tanstack/charts/react/tooltip'
import { tooltip } from '@tanstack/charts/tooltip'
import { motion } from '@tanstack/charts/motion'
import { scaleBand, scaleLinear } from 'd3-scale'
import {
  shadcnColors,
  type ShadcnMonthDatum,
} from '@tanstack/charts-data/shadcn'
import interactiveAreaData from '@tanstack/charts-data/shadcn-area-interactive-data'
import './styles.css'
type InteractiveSeries = 'desktop' | 'mobile'
const twoSeries = ['desktop', 'mobile'] as const
const interactiveAreaRows = interactiveAreaData as readonly {
  date: string
  desktop: number
  mobile: number
}[]
const interactiveBarRows: readonly ShadcnMonthDatum[] = interactiveAreaRows.map(
  (row) => ({
    month: row.date,
    desktop: row.desktop,
    mobile: row.mobile,
    tablet: 0,
  }),
)
export function createExampleChart(
  activeSeries: InteractiveSeries = 'desktop',
) {
  return defineChart(
    {
      marks: [
        barY(interactiveBarRows, {
          id: 'daily-bars',
          x: 'month',
          y: (row) => row[activeSeries],
          z: () => activeSeries,
          key: 'month',
          fill: activeSeries === 'desktop' ? shadcnColors[1] : shadcnColors[0],
        }),
      ],
      x: {
        scale: () => scaleBand<string>().paddingInner(0.2).paddingOuter(0.1),
        axis: {
          line: false,
          ticks: {
            values: [
              '2024-04-01',
              '2024-04-11',
              '2024-04-22',
              '2024-05-03',
              '2024-05-14',
              '2024-05-26',
              '2024-06-06',
              '2024-06-17',
              '2024-06-29',
            ],
            size: 0,
            padding: 10,
            format: formatMonthDay,
          },
        },
      },
      y: { scale: scaleLinear, grid: true, axis: false },
      color: { domain: twoSeries, range: shadcnColors.slice(0, 2) },
      margin: { top: 5, right: 12, bottom: 25, left: 12 },
      theme: shadcnTheme(),
    },
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
  const [activeSeries, setActiveSeries] = useState<InteractiveSeries>('desktop')
  const chartDefinition = useMemo(
    () => createExampleChart(activeSeries),
    [activeSeries],
  )
  const contentWidth = Math.max(1, width - 50)
  const chartWidth = contentWidth
  const chartHeight = 250
  return (
    <div className="sc-example" style={{ width, height }}>
      <article className="sc-card sc-interactive-bar" style={{ width }}>
        <header className="sc-card-header">
          <div className="sc-card-heading">
            <h2>Bar Chart - Interactive</h2>
            <p>Showing total visitors for the last 3 months</p>
          </div>
          <div className="sc-card-action">
            <BarMetrics active={activeSeries} onChange={setActiveSeries} />
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
              ariaLabel="Bar Chart - Interactive"
            />
          </div>
        </div>
      </article>
    </div>
  )
}
function BarMetrics({
  active,
  onChange,
}: {
  active: InteractiveSeries
  onChange: (series: InteractiveSeries) => void
}) {
  const totals = {
    desktop: interactiveBarRows.reduce((sum, row) => sum + row.desktop, 0),
    mobile: interactiveBarRows.reduce((sum, row) => sum + row.mobile, 0),
  }
  return (
    <>
      {twoSeries.map((series) => (
        <button
          key={series}
          type="button"
          className="sc-bar-metric"
          data-active={active === series}
          aria-pressed={active === series}
          onClick={() => onChange(series)}
        >
          <span>{titleCase(series)}</span>
          <strong>{totals[series].toLocaleString('en-US')}</strong>
        </button>
      ))}
    </>
  )
}
