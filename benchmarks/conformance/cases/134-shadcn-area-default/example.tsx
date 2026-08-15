import { areaY, d3Curve, defineChart, type ChartPoint } from '@tanstack/charts'
import { RendererChart } from '@tanstack/charts/react/tooltip'
import { tooltip } from '@tanstack/charts/tooltip'
import { motion } from '@tanstack/charts/motion'
import { scaleLinear, scalePoint } from 'd3-scale'
import { curveNatural } from 'd3-shape'
import {
  shadcnColors,
  shadcnMonths,
  type ShadcnMonthDatum,
} from '@tanstack/charts-data/shadcn'
import './styles.css'
const monthSeries = ['desktop', 'mobile', 'tablet'] as const
export function createExampleChart() {
  const rows = shadcnMonths
  const curve = curveNatural
  return defineChart(
    {
      marks: [
        areaY(rows as readonly ShadcnMonthDatum[], {
          id: 'visitor-area',
          x: 'month',
          y: 'desktop',
          curve: d3Curve(curve),
          fill: shadcnColors[0],
          fillOpacity: 0.4,
          stroke: shadcnColors[0],
          strokeWidth: 1.5,
        }),
      ],
      x: shadcnPointXAxis(),
      y: {
        scale: scaleLinear,
        grid: true,
        axis: { line: false, ticks: false, tickLabels: false },
      },
      color: {
        domain: monthSeries,
        range: shadcnColors.slice(0, 3),
      },
      gradients: undefined,
      margin: { top: 5, right: 12, bottom: 35, left: 12 },
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
function shadcnPointXAxis() {
  return {
    scale: scalePoint,
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
  const contentWidth = Math.max(1, width - 50)
  const chartWidth = contentWidth
  const chartHeight = (contentWidth * 9) / 16
  return (
    <div className="sc-example" style={{ width, height }}>
      <article className="sc-card sc-default" style={{ width }}>
        <header className="sc-card-header">
          <div className="sc-card-heading">
            <h2>Area Chart</h2>
            <p>Showing total visitors for the last 6 months</p>
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
              ariaLabel="Area Chart"
            />
          </div>
        </div>
        <footer className="sc-card-footer">
          <TrendFooter note="January - June 2024" />
        </footer>
      </article>
    </div>
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
