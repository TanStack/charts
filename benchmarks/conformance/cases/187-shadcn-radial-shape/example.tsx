import { useMemo } from 'react'
import {
  defineChart,
  type ChartPoint,
  type ChartValue,
  type DomChartDefinition,
} from '@tanstack/charts'
import {
  focusGroupAngle,
  pie,
  polar,
  radialArc,
  radialBarAngle,
  radialText,
} from '@tanstack/charts/polar'
import { RendererChart } from '@tanstack/charts/react/tooltip'
import { tooltip } from '@tanstack/charts/tooltip'
import { motion } from '@tanstack/charts/motion'
import { scaleBand, scaleLinear } from 'd3-scale'
import { shadcnColors } from '@charts-poc/demo-data/shadcn'
import './styles.css'
function createDefinition() {
  return buildSingleRadialDefinition({
    id: 'shape',
    visitors: 1260,
    endDegrees: 100,
    innerRadius: 65,
    outerRadius: 95,
    backgroundInnerRadius: 74,
    backgroundOuterRadius: 86,
    cornerRadius: 0,
    total: '1,260',
  })
}
function buildSingleRadialDefinition(options: {
  id: string
  visitors: number
  endDegrees: number
  innerRadius: number
  outerRadius: number
  backgroundInnerRadius: number
  backgroundOuterRadius: number
  cornerRadius: number
  total: string
}) {
  const rows = [
    { browser: 'safari', visitors: options.visitors, ring: 'visitors' },
  ]
  const background = pie([{ id: 'background', value: 1 }], { value: 'value' })
  return defineChart({
    marks: [
      polar({
        marks: [
          radialArc(background, {
            id: `${options.id}-background`,
            key: 'id',
            innerRadius: options.backgroundInnerRadius,
            outerRadius: options.backgroundOuterRadius,
            fill: 'var(--muted)',
          }),
        ],
      }),
      polar({
        startAngle: rechartsPolarAngle(0),
        endAngle: rechartsPolarAngle(options.endDegrees),
        angle: { scale: scaleLinear().domain([0, options.visitors]) },
        radius: {
          scale: scaleBand<string>().domain(['visitors']),
          range: [options.innerRadius, options.outerRadius],
        },
        marks: [
          radialBarAngle(rows, {
            id: `${options.id}-value`,
            angle: 'visitors',
            radius: 'ring',
            key: 'browser',
            fill: shadcnColors[1],
            cornerRadius: options.cornerRadius,
          }),
        ],
      }),
      radialCenterLabels(options.total, 36, 0, 24),
    ],
    margin: 0,
  })
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
export function createExampleChart() {
  return defineChart(createDefinition(), {
    svgAnimation: false,
    focus: focusGroupAngle,
    keyboard: false,
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
            <h2>Radial Chart - Shape</h2>
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
              ariaLabel="Radial Chart - Shape"
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
