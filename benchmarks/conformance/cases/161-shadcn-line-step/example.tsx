import { d3Curve, defineChart, lineY, type ChartPoint } from '@tanstack/charts'
import { RendererChart } from '@tanstack/charts/react/tooltip'
import { tooltip } from '@tanstack/charts/tooltip'
import { motion } from '@tanstack/charts/motion'
import { scaleLinear, scalePoint } from 'd3-scale'
import { curveStep } from 'd3-shape'
import {
  shadcnColors,
  shadcnMonths,
  type ShadcnMonthDatum,
} from '@tanstack/charts-data/shadcn'
import './styles.css'
const twoSeries = ['desktop', 'mobile'] as const
export function createExampleChart() {
  const rows = shadcnMonths
  const curve = curveStep
  return defineChart(
    ({ width }) => ({
      marks: [
        lineY(rows as readonly ShadcnMonthDatum[], {
          id: 'visitor-line',
          x: 'month',
          y: 'desktop',
          curve: d3Curve(curve),
          stroke: shadcnColors[0],
          strokeWidth: 2,
        }),
      ],
      x: shadcnPointXAxis(),
      y: {
        scale: scaleLinear().domain([0, 320]),
        grid: true,
        axis: {
          line: false,
          ticks: {
            values: [0, 80, 160, 240, 320],
            size: 0,
          },
          tickLabels: false,
        },
      },
      color: {
        domain: twoSeries,
        range: shadcnColors.slice(0, 2),
      },
      margin: {
        top: false && width < 400 ? 16 : 8,
        right: 12,
        bottom: 35,
        left: 12,
      },
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
            <h2>Line Chart - Step</h2>
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
              ariaLabel="Line Chart - Step"
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
