import { defineChart, type ChartPoint } from '@tanstack/charts'
import {
  focusGroupAngle,
  polar,
  radialBarAngle,
  radialText,
} from '@tanstack/charts/polar'
import { RendererChart } from '@tanstack/charts/react/tooltip'
import { tooltip } from '@tanstack/charts/tooltip'
import { motion } from '@tanstack/charts/motion'
import { scaleBand, scaleLinear } from 'd3-scale'
import { shadcnColors } from '@tanstack/charts-data/shadcn'
import './styles.css'
const twoSeries = ['desktop', 'mobile'] as const
export function createExampleChart() {
  const rows = [
    {
      id: 'mobile',
      ring: 'visitors',
      start: 0,
      end: 570,
      fill: shadcnColors[1],
    },
    {
      id: 'desktop',
      ring: 'visitors',
      start: 570,
      end: 1260,
      fill: shadcnColors[0],
    },
  ]
  return defineChart(
    {
      marks: [
        polar({
          startAngle: rechartsPolarAngle(0),
          endAngle: rechartsPolarAngle(180),
          angle: { scale: scaleLinear().domain([0, 1260]) },
          radius: {
            scale: scaleBand<string>().domain(['visitors']),
            range: [80, 110],
          },
          marks: [
            radialBarAngle(rows, {
              id: 'stacked-values',
              angle1: 'start',
              angle2: 'end',
              angle: 'end',
              radius: 'ring',
              key: 'id',
              fill: (row) => row.fill,
              cornerRadius: 5,
              stroke: 'transparent',
              strokeWidth: 2,
            }),
          ],
        }),
        radialCenterLabels('1,830', 24, -16, 4),
      ],
      color: { domain: twoSeries, range: shadcnColors.slice(0, 2) },
      margin: 0,
    },
    {
      svgAnimation: false,
      focus: focusGroupAngle,
      keyboard: false,
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
function radialCenterLabels(
  total: string,
  fontSize: number,
  totalDy: number,
  labelDy: number,
) {
  return polar({
    angle: { scale: scaleLinear().domain([0, 1]) },
    radius: { scale: scaleLinear().domain([0, 1]) },
    marks: [
      radialText([{ id: 'total', angle: 0, radius: 0, text: total }], {
        id: `radial-total-${total}`,
        angle: 'angle',
        radius: 'radius',
        key: 'id',
        text: 'text',
        dy: totalDy,
        fill: 'var(--foreground)',
        fontSize,
        fontWeight: 700,
      }),
      radialText([{ id: 'label', angle: 0, radius: 0, text: 'Visitors' }], {
        id: `radial-label-${total}`,
        angle: 'angle',
        radius: 'radius',
        key: 'id',
        text: 'text',
        dy: labelDy,
        fill: 'var(--muted-foreground)',
        fontSize: 14,
      }),
    ],
  })
}
function rechartsPolarAngle(degrees: number) {
  return ((90 - degrees) * Math.PI) / 180
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
            <h2>Radial Chart - Stacked</h2>
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
              ariaLabel="Radial Chart - Stacked"
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
