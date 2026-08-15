import { defineChart, type ChartPoint } from '@tanstack/charts'
import {
  angleGrid,
  focusGroupAngle,
  polar,
  radialArea,
  radialGrid,
} from '@tanstack/charts/polar'
import { RendererChart } from '@tanstack/charts/react/tooltip'
import { tooltip } from '@tanstack/charts/tooltip'
import { motion } from '@tanstack/charts/motion'
import { scaleLinear, scalePoint } from 'd3-scale'
import { curveLinearClosed } from 'd3-shape'
import { shadcnColors, shadcnRadarMultiple } from '@tanstack/charts-data/shadcn'
import './styles.css'
const twoSeries = ['desktop', 'mobile'] as const
export function createExampleChart() {
  const rows = shadcnRadarMultiple
  const months = rows.map((row) => row.month)
  const radiusMax = 320
  const gridValues = Array.from({ length: 4 }, (_, index) =>
    Math.round((radiusMax * (index + 1)) / 4),
  )
  const customLabels = false
  const guides = [
    radialGrid({
      values: gridValues,
      shape: 'polygon',
      stroke: 'var(--border)',
      strokeOpacity: 1,
    }),
    angleGrid({
      values: months,
      labels: !customLabels,
      labelOffset: 10,
      labelFill: 'var(--muted-foreground)',
      labelFontSize: 12,
      stroke: 'var(--border)',
      strokeOpacity: 1,
    }),
  ]
  return defineChart(
    {
      marks: [
        polar({
          radiusRatio: 0.76,
          angle: { scale: scalePoint<string>().domain(months), wrap: true },
          radius: { scale: scaleLinear().domain([0, radiusMax]) },
          guides,
          marks: [
            radialArea(rows, {
              id: 'desktop-radar',
              className: 'ts-chart__radar',
              angle: 'month',
              radius: 'desktop',
              key: 'month',
              z: () => 'desktop',
              curve: curveLinearClosed,
              fill: shadcnColors[0],
              fillOpacity: 0.6,
              stroke: shadcnColors[0],
              strokeOpacity: 1,
              strokeWidth: 1,
            }),
            radialArea(rows, {
              id: 'mobile-radar',
              className: 'ts-chart__radar',
              angle: 'month',
              radius: 'mobile',
              key: 'month',
              z: () => 'mobile',
              curve: curveLinearClosed,
              fill: shadcnColors[1],
              fillOpacity: 1,
              stroke: shadcnColors[1],
              strokeWidth: 1,
            }),
          ],
        }),
      ],
      color: { domain: twoSeries, range: shadcnColors.slice(0, 2) },
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
  const chartWidth = Math.min(250, contentWidth)
  const chartHeight = chartWidth
  return (
    <div className="sc-example" style={{ width, height }}>
      <article className="sc-card sc-default" style={{ width }}>
        <header className="sc-card-header" style={{ paddingBottom: 16 }}>
          <div className="sc-card-heading">
            <h2>Radar Chart - Multiple</h2>
            <p>Showing total visitors for the last 6 months</p>
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
              ariaLabel="Radar Chart - Multiple"
            />
          </div>
        </div>
        <footer className="sc-card-footer sc-centered">
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
