import { useMemo } from 'react'
import {
  defineChart,
  type ChartPoint,
  type ChartValue,
  type DomChartDefinition,
} from '@tanstack/charts'
import { focusGroupAngle, pie, polar, radialArc } from '@tanstack/charts/polar'
import { RendererChart } from '@tanstack/charts/react/tooltip'
import { tooltip } from '@tanstack/charts/tooltip'
import { motion } from '@tanstack/charts/motion'
import { scaleLinear } from 'd3-scale'
import { shadcnBrowsers, shadcnColors } from '@charts-poc/demo-data/shadcn'
import './styles.css'
const browserNames = shadcnBrowsers.map((row) => row.browser)
function createDefinition() {
  const arcs = pie(shadcnBrowsers, {
    value: 'visitors',
    startAngle: Math.PI / 2,
    endAngle: (-Math.PI * 3) / 2,
  })
  const separator = 5
  const marks = [
    radialArc(arcs, {
      id: 'browser-slices',
      key: 'browser',
      innerRadius: 60,
      color: 'browser',
      stroke: 'var(--background)',
      strokeWidth: separator,
    }),
    radialArc(arcs.slice(0, 1), {
      id: 'active-browser-slice',
      key: 'browser',
      innerRadius: 60,
      outerRadius: ({ radius }) => radius + 10,
      color: 'browser',
      stroke: 'var(--background)',
      strokeWidth: 5,
    }),
  ]
  return defineChart({
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
  })
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
export function createExampleChart() {
  return defineChart(createDefinition(), {
    svgAnimation: false,
    focus: focusGroupAngle,
    keyboard: true,
    tooltip: {
      use: tooltip,
      className: 'sc-chart-tooltip',
      anchor: 'group-center',
      placement: 'auto',
      offset: undefined,
      sort: 'color-domain',
      content: (points) => shadcnTooltipContent(points),
    },
  })
}
export const definition = createExampleChart()
type ExampleDefinition = ReturnType<typeof createExampleChart>
type ExampleDatum =
  ExampleDefinition extends DomChartDefinition<
    infer TDatum,
    infer _TXValue,
    infer _TYValue
  >
    ? TDatum
    : never
type ExampleXValue =
  ExampleDefinition extends DomChartDefinition<
    infer _TDatum,
    infer TXValue extends ChartValue,
    infer _TYValue
  >
    ? TXValue
    : never
type ExampleYValue =
  ExampleDefinition extends DomChartDefinition<
    infer _TDatum,
    infer _TXValue,
    infer TYValue extends ChartValue
  >
    ? TYValue
    : never
export interface ExampleProps {
  width?: number
  height?: number
}
export default function Example({ width = 640, height = 600 }: ExampleProps) {
  const chartDefinition = definition
  const renderer = useMemo(
    () =>
      motion<ExampleDatum, ExampleXValue, ExampleYValue>({
        initial: 'always',
        transition: { type: 'spring', stiffness: 170, damping: 18, mass: 1 },
      }),
    [],
  )
  const contentWidth = Math.max(1, width - 50)
  const chartWidth = Math.min(250, contentWidth)
  const chartHeight = chartWidth
  const headerAction = null
  const legend = null
  const footer = (
    <TrendFooter note="Showing total visitors for the last 6 months" />
  )
  return (
    <div className="sc-example" style={{ width, height }}>
      <article className="sc-card sc-default" style={{ width }}>
        <header className="sc-card-header">
          <div className="sc-card-heading">
            <h2>Pie Chart - Donut Active</h2>
            <p>January - June 2024</p>
          </div>
          {headerAction ? (
            <div className="sc-card-action">{headerAction}</div>
          ) : null}
        </header>
        <div className="sc-card-content sc-centered">
          <div
            className="sc-chart"
            style={{ width: chartWidth, height: chartHeight }}
          >
            <RendererChart
              definition={chartDefinition}
              renderer={renderer}
              initialWidth={chartWidth}
              height={chartHeight}
              ariaLabel="Pie Chart - Donut Active"
            />
          </div>
          {legend ? <div className="sc-chart-footer">{legend}</div> : null}
        </div>
        {footer ? (
          <footer className="sc-card-footer sc-centered">{footer}</footer>
        ) : null}
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
