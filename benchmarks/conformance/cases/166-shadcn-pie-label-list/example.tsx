import { defineChart, type ChartPoint } from '@tanstack/charts'
import {
  focusGroupAngle,
  pie,
  polar,
  radialArc,
  radialText,
} from '@tanstack/charts/polar'
import { RendererChart } from '@tanstack/charts/react/tooltip'
import { tooltip } from '@tanstack/charts/tooltip'
import { motion } from '@tanstack/charts/motion'
import { scaleLinear } from 'd3-scale'
import { shadcnBrowsers, shadcnColors } from '@tanstack/charts-data/shadcn'
import './styles.css'
const browserNames = shadcnBrowsers.map((row) => row.browser)
export function createExampleChart() {
  const arcs = pie(shadcnBrowsers, {
    value: 'visitors',
    startAngle: Math.PI / 2,
    endAngle: (-Math.PI * 3) / 2,
  })
  const separator = 1
  const marks = [
    radialArc(arcs, {
      id: 'browser-slices',
      key: 'browser',
      innerRadius: undefined,
      color: 'browser',
      stroke: 'var(--background)',
      strokeWidth: separator,
    }),
    radialText(arcs, {
      id: 'browser-labels',
      angle: 'angle',
      radius: 0.68,
      radiusOffset: 0,
      text: (row) => titleCase(row.browser),
      key: 'browser',
      anchor: 'middle',
      fill: 'var(--background)',
      fontSize: 12,
      fontWeight: 400,
    }),
  ]
  return defineChart(
    {
      marks: [
        polar({
          radiusRatio: 0.78,
          angle: { scale: scaleLinear().domain([0, Math.PI * 2]) },
          radius: { scale: scaleLinear().domain([0, 1]) },
          marks,
        }),
      ],
      color: { domain: browserNames, range: shadcnColors },
      margin: 0,
    },
    {
      svgAnimation: false,
      focus: focusGroupAngle,
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
function titleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}
function shadcnTooltipContent<TDatum>(points: readonly ChartPoint<TDatum>[]) {
  const point = points.find((candidate) => browserMetric(candidate.datum))
  const metric = point && browserMetric(point.datum)
  return metric
    ? {
        title: titleCase(metric.browser),
        rows: [
          {
            label: 'Visitors',
            value: metric.visitors.toLocaleString('en-US'),
            color: point.color,
          },
        ],
      }
    : { rows: [] }
}
function browserMetric(datum: unknown) {
  if (!datum || typeof datum !== 'object') return undefined
  const browser = Reflect.get(datum, 'browser')
  const visitors = Reflect.get(datum, 'visitors')
  return typeof browser === 'string' &&
    typeof visitors === 'number' &&
    Number.isFinite(visitors)
    ? { browser, visitors }
    : undefined
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
  const chartWidth = Math.min(250, contentWidth)
  const chartHeight = chartWidth
  return (
    <div className="sc-example" style={{ width, height }}>
      <article className="sc-card sc-default" style={{ width }}>
        <header className="sc-card-header">
          <div className="sc-card-heading">
            <h2>Pie Chart - Label List</h2>
            <p>January - June 2024</p>
          </div>
        </header>
        <div className="sc-card-content sc-centered">
          <div
            className="sc-chart"
            style={{ width: chartWidth, height: chartHeight }}
          >
            <RendererChart
              definition={definition}
              renderer={renderer}
              initialWidth={chartWidth}
              height={chartHeight}
              ariaLabel="Pie Chart - Label List"
            />
          </div>
        </div>
        <footer className="sc-card-footer sc-centered">
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
