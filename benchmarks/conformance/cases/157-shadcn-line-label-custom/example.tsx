import {
  d3Curve,
  defineChart,
  lineY,
  text,
  type ChartPoint,
} from '@tanstack/charts'
import { RendererChart } from '@tanstack/charts/react/tooltip'
import { tooltip } from '@tanstack/charts/tooltip'
import { motion } from '@tanstack/charts/motion'
import { scaleLinear, scalePoint } from 'd3-scale'
import { curveNatural } from 'd3-shape'
import {
  shadcnBrowsers,
  shadcnColors,
  type ShadcnBrowserDatum,
} from '@tanstack/charts-data/shadcn'
import './styles.css'
const browserNames = shadcnBrowsers.map((row) => row.browser)
export function createExampleChart() {
  const rows = shadcnBrowsers
  const curve = curveNatural
  const labelMarks = [
    text(shadcnBrowsers, {
      id: 'visitor-labels',
      x: 'browser',
      y: 'visitors',
      text: (row) => titleCase(row.browser),
      dy: -12,
      fill: 'var(--foreground)',
      fontSize: 12,
    }),
  ]
  return defineChart(
    ({ width }) => ({
      marks: [
        lineY(rows as readonly ShadcnBrowserDatum[], {
          id: 'visitor-line',
          x: 'browser',
          y: 'visitors',
          curve: d3Curve(curve),
          stroke: shadcnColors[1],
          strokeWidth: 2,
        }),
        ...labelMarks,
      ],
      x: { scale: scalePoint, axis: false },
      y: {
        scale: scaleLinear().domain([0, 300]),
        grid: true,
        axis: {
          line: false,
          ticks: {
            values: [0, 75, 150, 225, 300],
            size: 0,
          },
          tickLabels: false,
        },
      },
      color: {
        domain: browserNames,
        range: shadcnColors,
      },
      margin: { top: 24, right: 24, bottom: 5, left: 24 },
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
  const chartHeight = (contentWidth * 9) / 16
  return (
    <div className="sc-example" style={{ width, height }}>
      <article className="sc-card sc-default" style={{ width }}>
        <header className="sc-card-header">
          <div className="sc-card-heading">
            <h2>Line Chart - Custom Label</h2>
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
              ariaLabel="Line Chart - Custom Label"
            />
          </div>
        </div>
        <footer className="sc-card-footer">
          <TrendFooter note="Showing total visitors for the last 6 months" />
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
