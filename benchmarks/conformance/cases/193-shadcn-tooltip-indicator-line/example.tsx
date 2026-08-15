import { useRef } from 'react'
import { barY, defineChart, stack, type ChartPoint } from '@tanstack/charts'
import { RendererChart } from '@tanstack/charts/react/tooltip'
import { tooltip } from '@tanstack/charts/tooltip'
import { motion } from '@tanstack/charts/motion'
import { scaleBand, scaleLinear } from 'd3-scale'
import {
  shadcnActivities,
  shadcnColors,
  type ShadcnActivityDatum,
} from '@tanstack/charts-data/shadcn'
import './styles.css'
const activityNames = ['running', 'swimming'] as const
export function createExampleChart() {
  return defineChart(
    {
      marks: [
        barY(shadcnActivities, {
          id: 'activity-bars',
          x: 'date',
          y: 'value',
          z: 'activity',
          color: 'activity',
          key: (row) => `${row.date}:${row.activity}`,
          layout: stack({ order: activityNames }),
          radius: 4,
        }),
      ],
      x: {
        scale: () => scaleBand<string>().paddingInner(0.2).paddingOuter(0.1),
        axis: {
          line: false,
          ticks: { size: 0, padding: 10, format: formatWeekday },
        },
      },
      y: { scale: scaleLinear().domain([0, 1000]), axis: false },
      color: { domain: activityNames, range: shadcnColors.slice(0, 2) },
      margin: { top: 0, right: 7, bottom: 32, left: 7 },
      theme: shadcnTheme(),
    },
    {
      svgAnimation: false,
      focus: 'group-x',
      tooltip: {
        use: tooltip,
        className: 'sc-chart-tooltip',
        anchor: (_points, context) => ({
          x: context.surface.width * 0.271,
          y: context.surface.height * 0.554,
        }),
        placement: 'bottom-right',
        offset: 0,
        sort: 'color-domain',
        content: () => ({ rows: [] }),
      },
    },
  )
}
function formatWeekday(value: string) {
  return new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(
    new Date(value),
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
function ShadcnTooltipBody({
  variant,
  points,
}: {
  variant: string
  points: readonly ChartPoint<ShadcnActivityDatum>[]
}) {
  const ordered = [...points].sort(
    (left, right) =>
      activityNames.indexOf(left.datum.activity) -
      activityNames.indexOf(right.datum.activity),
  )
  const noLabel =
    variant === 'label-none' ||
    variant === 'formatter' ||
    variant === 'icons' ||
    variant === 'advanced'
  const noIndicator =
    variant === 'indicator-none' ||
    variant === 'label-none' ||
    variant === 'formatter' ||
    variant === 'icons'
  const lineIndicator = variant === 'indicator-line'
  const formatted = variant === 'formatter' || variant === 'advanced'
  const label =
    variant === 'label-formatter'
      ? 'July 15, 2024'
      : variant === 'label-custom'
        ? 'Activities'
        : '2024-07-16'
  return (
    <div
      className={`sc-shadcn-tooltip${variant === 'advanced' ? ' sc-advanced-tooltip' : ''}${noIndicator ? ' sc-tooltip-no-indicator' : ''}`}
    >
      {noLabel ? null : <strong className="sc-tooltip-label">{label}</strong>}
      {ordered.map((point, index) => (
        <div className="sc-shadcn-tooltip-row" key={point.datum.activity}>
          {variant === 'icons' ? (
            <ShadcnActivityIcon activity={point.datum.activity} />
          ) : noIndicator ? null : (
            <span
              className={lineIndicator ? 'sc-tooltip-line' : 'sc-tooltip-dot'}
              style={{ background: shadcnColors[index] }}
            />
          )}
          <span>{titleCase(point.datum.activity)}</span>
          <b className="sc-tooltip-value">
            {point.datum.value}
            {formatted ? <span>kcal</span> : null}
          </b>
        </div>
      ))}
      {variant === 'advanced' ? (
        <div className="sc-tooltip-total">
          <span>Total</span>
          <b className="sc-tooltip-value">
            {ordered.reduce((total, point) => total + point.datum.value, 0)}
            <span>kcal</span>
          </b>
        </div>
      ) : null}
    </div>
  )
}
function ShadcnActivityIcon({ activity }: { activity: string }) {
  return (
    <svg className="sc-tooltip-icon" viewBox="0 0 24 24" aria-hidden>
      {activity === 'running' ? (
        <>
          <path d="M4 17c3-1 4-4 4-7l3 2 2-4 3 1" />
          <path d="m9 13 4 5M14 5h.01" />
        </>
      ) : (
        <>
          <path d="M2 16c2-2 4 2 6 0s4 2 6 0 4 2 8 0" />
          <path d="M2 20c2-2 4 2 6 0s4 2 6 0 4 2 8 0M5 12l3-3 4 3 3-4 4 4" />
        </>
      )}
    </svg>
  )
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
  const seededTooltip = useRef(false)
  const contentWidth = Math.max(1, width - 50)
  const chartWidth = contentWidth
  const chartHeight = (contentWidth * 9) / 16
  return (
    <div className="sc-example" style={{ width, height }}>
      <article className="sc-card sc-default" style={{ width }}>
        <header className="sc-card-header">
          <div className="sc-card-heading">
            <h2>Tooltip - Line Indicator</h2>
            <p>Tooltip with line indicator.</p>
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
              ariaLabel="Tooltip - Line Indicator"
              onRender={({ scene, interaction }) => {
                if (seededTooltip.current) return
                const point = scene.points.find(
                  (candidate) =>
                    (candidate.datum as ShadcnActivityDatum).date ===
                    '2024-07-16',
                )
                if (!point) return
                seededTooltip.current = true
                interaction.setControlledFocus(point, {
                  source: 'programmatic',
                })
              }}
              renderTooltipBody={({ points }) => (
                <ShadcnTooltipBody
                  points={points as readonly ChartPoint<ShadcnActivityDatum>[]}
                  variant="indicator-line"
                />
              )}
            />
          </div>
        </div>
      </article>
    </div>
  )
}
