import { useMemo } from 'react'
import {
  barY,
  defineChart,
  type ChartPoint,
  type ChartValue,
  type DomChartDefinition,
} from '@tanstack/charts'
import { RendererChart } from '@tanstack/charts/react/tooltip'
import { tooltip } from '@tanstack/charts/tooltip'
import { motion } from '@tanstack/charts/motion'
import { scaleBand, scaleLinear } from 'd3-scale'
import { shadcnBrowsers, shadcnColors } from '@charts-poc/demo-data/shadcn'
import './styles.css'
const browserNames = shadcnBrowsers.map((row) => row.browser)
function createDefinition() {
  const rows = shadcnBrowsers.map((row) =>
    row.browser === 'chrome'
      ? { ...row, visitors: 187 }
      : row.browser === 'firefox'
        ? { ...row, visitors: 275 }
        : row,
  )
  return defineChart({
    marks: [
      barY(rows, {
        id: 'visitor-bars',
        x: 'browser',
        y: 'visitors',
        color: 'browser',
        fill: (row) =>
          row.browser === 'firefox'
            ? `color-mix(in srgb, ${shadcnColors[2]} 80%, transparent)`
            : shadcnColors[browserNames.indexOf(row.browser)]!,
        stroke: (row) => (row.browser === 'firefox' ? shadcnColors[2] : 'none'),
        strokeWidth: 2,
        strokeDasharray: (row) => (row.browser === 'firefox' ? '4 4' : 'none'),
        radius: 8,
      }),
    ],
    x: shadcnBrowserXAxis(),
    y: { scale: scaleLinear, grid: true, axis: false },
    color: { domain: browserNames, range: shadcnColors },
    margin: { top: 5, right: 5, bottom: 35, left: 5 },
    theme: shadcnTheme(),
  })
}
function shadcnBrowserXAxis() {
  return {
    scale: () => scaleBand<string>().paddingInner(0.2).paddingOuter(0.1),
    axis: {
      line: false,
      ticks: {
        size: 0,
        padding: 10,
        format: titleCase,
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
export function createExampleChart() {
  return defineChart(createDefinition(), {
    svgAnimation: false,
    focus: 'group-x',
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
  const chartWidth = contentWidth
  const chartHeight = (contentWidth * 9) / 16
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
            <h2>Bar Chart - Active</h2>
            <p>January - June 2024</p>
          </div>
          {headerAction ? (
            <div className="sc-card-action">{headerAction}</div>
          ) : null}
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
              ariaLabel="Bar Chart - Active"
            />
          </div>
          {legend ? <div className="sc-chart-footer">{legend}</div> : null}
        </div>
        {footer ? <footer className="sc-card-footer">{footer}</footer> : null}
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
