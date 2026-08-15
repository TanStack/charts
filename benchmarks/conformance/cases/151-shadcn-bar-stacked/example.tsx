import { barY, defineChart, stack, type ChartPoint } from '@tanstack/charts'
import { RendererChart } from '@tanstack/charts/react/tooltip'
import { tooltip } from '@tanstack/charts/tooltip'
import { motion } from '@tanstack/charts/motion'
import { scaleBand, scaleLinear } from 'd3-scale'
import { shadcnColors, shadcnSeriesRows } from '@tanstack/charts-data/shadcn'
import './styles.css'
const twoSeries = ['desktop', 'mobile'] as const
export function createExampleChart() {
  const rows = shadcnSeriesRows.filter((row) => row.series !== 'tablet')
  return defineChart(
    {
      marks: [
        barY(rows, {
          id: 'visitor-bars',
          x: 'month',
          y: 'value',
          z: 'series',
          color: 'series',
          key: (row) => `${row.month}:${row.series}`,
          layout: stack({ order: twoSeries }),
          radius: 4,
        }),
      ],
      x: shadcnXAxis(),
      y: { scale: scaleLinear, grid: true, axis: false },
      color: { domain: twoSeries, range: shadcnColors.slice(0, 2) },
      margin: { top: 5, right: 5, bottom: 35, left: 5 },
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
function shadcnXAxis() {
  return {
    scale: () => scaleBand<string>().paddingInner(0.2).paddingOuter(0.1),
    axis: {
      line: false,
      ticks: {
        size: 0,
        padding: 10,
        format: (value: string) => value.slice(0, 3),
      },
    },
  }
}
function shadcnTheme() {
  return {
    foreground: 'var(--muted-foreground, var(--muted))',
    grid: 'var(--border)',
    background: 'transparent',
  }
}
function titleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1)
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
  const contentWidth = Math.max(1, width - 50)
  const chartWidth = contentWidth
  const chartHeight = (contentWidth * 9) / 16 - 27
  return (
    <div className="sc-example" style={{ width, height }}>
      <article className="sc-card sc-default" style={{ width }}>
        <header className="sc-card-header">
          <div className="sc-card-heading">
            <h2>Bar Chart - Stacked + Legend</h2>
            <p>January - June 2024</p>
          </div>
        </header>
        <div className="sc-card-content">
          <div
            className="sc-chart"
            style={{ width: chartWidth, height: chartHeight }}
          >
            <RendererChart
              definition={definition}
              renderer={renderer}
              initialWidth={chartWidth}
              height={chartHeight}
              ariaLabel="Bar Chart - Stacked + Legend"
            />
          </div>
          <div className="sc-chart-footer">
            <Legend />
          </div>
        </div>
        <footer className="sc-card-footer">
          <TrendFooter note="Showing total visitors for the last 6 months" />
        </footer>
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
function TrendFooter({ note }: { note: string }) {
  return (
    <>
      <div className="sc-trend">
        Trending up by 5.2% this month{' '}
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="m3 17 6-6 4 4 8-8" />
          <path d="M14 7h7v7" />
        </svg>
      </div>
      <div className="sc-footer-note">{note}</div>
    </>
  )
}
