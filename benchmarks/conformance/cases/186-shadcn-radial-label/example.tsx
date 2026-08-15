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
import { shadcnBrowsers, shadcnColors } from '@tanstack/charts-data/shadcn'
import './styles.css'
const browserNames = shadcnBrowsers.map((row) => row.browser)
export function createExampleChart() {
  const startAngle = rechartsPolarAngle(-90)
  const endAngle = rechartsPolarAngle(380)
  const backgroundRows = shadcnBrowsers.map((row) => ({
    ...row,
    background: 300,
  }))
  return defineChart(
    ({ height }) => ({
      marks: [
        polar({
          radiusRatio: 1,
          startAngle,
          endAngle,
          angle: { scale: scaleLinear().domain([0, 300]) },
          radius: {
            scale: scaleBand<string>().domain(browserNames).paddingInner(0.2),
            range: [
              30 * (height < 220 ? 0.8 : 1),
              110 * (height < 220 ? 0.8 : 1),
            ],
          },
          guides: [],
          marks: [
            radialBarAngle(backgroundRows, {
              id: 'radial-backgrounds',
              angle: 'background',
              radius: 'browser',
              key: 'browser',
              fill: 'var(--muted)',
            }),
            radialBarAngle(shadcnBrowsers, {
              id: 'radial-values',
              angle: 'visitors',
              radius: 'browser',
              key: 'browser',
              fill: (row) => shadcnColors[browserNames.indexOf(row.browser)]!,
            }),
          ],
        }),
        polar({
          startAngle,
          endAngle,
          angle: { scale: scaleLinear().domain([0, 300]) },
          radius: {
            scale: scaleLinear().domain([0, 110]),
            range: [0, 110 * (height < 220 ? 0.8 : 1)],
          },
          marks: [
            radialText(
              shadcnBrowsers.map((row, index) => ({
                ...row,
                angle: 10,
                labelRadius: 38 + index * 16,
              })),
              {
                id: 'radial-labels',
                angle: 'angle',
                radius: 'labelRadius',
                key: 'browser',
                text: (row) => titleCase(row.browser),
                fill: 'white',
                fontSize: 11,
                rotate: -25,
              },
            ),
          ],
        }),
      ],
      color: { domain: browserNames, range: shadcnColors },
      margin: 0,
    }),
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
            <h2>Radial Chart - Label</h2>
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
              ariaLabel="Radial Chart - Label"
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
