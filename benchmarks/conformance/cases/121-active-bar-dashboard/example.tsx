import { useMemo, useRef, useState } from 'react'
import { motion } from '@tanstack/charts/motion'
import { Chart } from '@tanstack/charts/react/core'
import { dashboardRows, metricTotal } from './model'
import type { CSSProperties } from 'react'
import type { DashboardMetric, DashboardRow } from './model'
import { barY, crosshair, defineChart } from '@tanstack/charts'
import { scaleBand } from '@tanstack/charts/scales/band'
import { scaleLinear } from '@tanstack/charts/scales/linear'
import { tooltip } from '@tanstack/charts/tooltip'
import type { ChartTooltipOptions } from '@tanstack/charts'
const metricLabels: Record<DashboardMetric, string> = {
  desktop: 'Desktop',
  mobile: 'Mobile',
}

const cardStyle: CSSProperties & Record<`--${string}`, string> = {
  '--ts-chart-1': '#7c3aed',
  '--ts-chart-tooltip-background':
    'color-mix(in srgb, Canvas 94%, transparent)',
  '--ts-chart-tooltip-color': 'CanvasText',
  '--ts-chart-tooltip-border':
    '1px solid color-mix(in srgb, CanvasText 12%, transparent)',
  '--ts-chart-tooltip-border-radius': '10px',
  '--ts-chart-tooltip-shadow':
    '0 12px 34px color-mix(in srgb, CanvasText 14%, transparent)',
  '--ts-chart-tooltip-font':
    '600 12px/1.35 Inter, ui-sans-serif, system-ui, sans-serif',
  boxSizing: 'border-box',
  width: '100%',
  height: '100%',
  overflow: 'hidden',
  border: '1px solid color-mix(in srgb, currentColor 12%, transparent)',
  borderRadius: 18,
  color: 'CanvasText',
  background: 'Canvas',
  fontFamily:
    "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  boxShadow: '0 18px 55px color-mix(in srgb, CanvasText 7%, transparent)',
}

export interface ExampleProps {
  width?: number
  height?: number
  revision?: number
}

export const dashboardSpring = {
  type: 'spring' as const,
  stiffness: 210,
  damping: 24,
  mass: 0.78,
}

const tickIds = ['01', '06', '12', '18', '24']

const tooltipOptions: ChartTooltipOptions<DashboardRow> = {
  anchor: 'point',
  placement: ['top', 'right', 'left'],
  className: 'active-bar-tooltip',
}

export function activeBarDashboardDefinition(
  input: ExampleChartInput,
  metric: DashboardMetric,
) {
  const rows = dashboardRows(input.revision)
  const maximum = Math.max(...rows.map((row) => row[metric]))

  return defineChart(
    {
      marks: [
        barY(rows, {
          id: 'daily-visitors',
          x: 'id',
          y: metric,
          key: 'id',
          fill: 'url(#visitor-bars)',
          radius: 4,
          inset: input.preview ? 1.5 : 2.5,
          states: [
            {
              when: { focus: 'unmatched' },
              style: { opacity: 0.26 },
              transition: dashboardSpring,
            },
            {
              when: { focus: 'primary' },
              style: { opacity: 1, inset: input.preview ? 0.5 : 1.5 },
              transition: dashboardSpring,
            },
          ],
        }),
        crosshair<string, number>({
          id: 'active-bar-ring',
          x: {
            band: {
              inset: -2,
              radius: 6,
              fill: 'transparent',
              stroke: 'var(--ts-chart-1)',
              strokeOpacity: 0.92,
              strokeWidth: 1.5,
            },
          },
          y: false,
          motion: { transition: dashboardSpring },
        }),
      ],
      x: {
        scale: scaleBand<string>()
          .domain(rows.map((row) => row.id))
          .paddingInner(0.18)
          .paddingOuter(0.08),
        axis: {
          line: false,
          ticks: {
            values: tickIds,
            size: 0,
            padding: input.preview ? 4 : 8,
            format: (value) => rows.find((row) => row.id === value)?.day ?? '',
          },
          tickLabels: {
            fontSize: input.preview ? 8 : 10,
            opacity: 0.52,
          },
        },
      },
      y: {
        scale: scaleLinear().domain([0, Math.ceil(maximum * 1.12)]),
        grid: true,
        axis: false,
      },
      gradients: [
        {
          id: 'visitor-bars',
          x1: 0,
          y1: 1,
          x2: 0,
          y2: 0,
          stops: [
            { offset: 0, color: 'var(--ts-chart-1)', opacity: 0.42 },
            { offset: 1, color: 'var(--ts-chart-1)', opacity: 0.96 },
          ],
        },
      ],
      motion: { transition: dashboardSpring },
      margin: input.preview
        ? { top: 8, right: 18, bottom: 22, left: 18 }
        : { top: 12, right: 8, bottom: 34, left: 8 },
    },
    {
      focus: 'nearest',
      keyboard: input.interactive,
      tooltip: input.interactive
        ? {
            use: tooltip,
            ...tooltipOptions,
            format: ({ datum }) =>
              `${datum.day} · ${datum[metric].toLocaleString('en-US')} ${metric} visitors`,
          }
        : false,
    },
  )
}

export interface ExampleChartInput {
  width: number
  height: number
  revision: number
  preview?: boolean
  interactive?: boolean
}

export default function ActiveBarDashboard({
  width = 640,
  height = 480,
  revision = 0,
}: ExampleProps = {}) {
  const input = { width, height, revision, preview: false, interactive: true }
  const idPrefix = '121-active-bar-dashboard'
  const [metric, setMetric] = useState<DashboardMetric>('desktop')

  const root = useRef<HTMLElement>(null)

  const chartHost = useRef<HTMLElement | null>(null)

  const desktopButton = useRef<HTMLButtonElement>(null)

  const mobileButton = useRef<HTMLButtonElement>(null)

  const focusedId = useRef<string | null>(null)

  const renderer = useMemo(() => motion({ initial: !false }), [false])

  const rows = dashboardRows(input.revision)

  const definition = useMemo(
    () => activeBarDashboardDefinition(input, metric),
    [input, metric],
  )

  const chartWidth = Math.max(180, input.width - 32)

  const chartHeight = Math.max(150, input.height - 132)

  return (
    <section
      ref={root}
      data-conformance-view="main"
      aria-label="Visitor analytics"
      style={{ ...cardStyle, width: input.width, height: input.height }}
    >
      <header
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) auto',
          alignItems: 'stretch',
          borderBottom:
            '1px solid color-mix(in srgb, currentColor 10%, transparent)',
        }}
      >
        <div style={{ padding: '20px 22px' }}>
          <div style={{ fontSize: 13, fontWeight: 650, opacity: 0.64 }}>
            Total visitors
          </div>
          <div
            style={{
              marginTop: 3,
              fontSize: 24,
              fontWeight: 720,
              letterSpacing: '-0.04em',
            }}
          >
            {metricTotal(rows, metric).toLocaleString('en-US')}
          </div>
        </div>
        <div style={{ display: 'flex' }}>
          {(['desktop', 'mobile'] as const).map((id) => (
            <button
              key={id}
              ref={id === 'desktop' ? desktopButton : mobileButton}
              type="button"
              aria-pressed={metric === id}
              onClick={() => setMetric(id)}
              style={{
                minWidth: 104,
                padding: '14px 18px',
                border: 0,
                borderLeft:
                  '1px solid color-mix(in srgb, currentColor 10%, transparent)',
                color: 'inherit',
                background:
                  metric === id
                    ? 'color-mix(in srgb, currentColor 7%, Canvas)'
                    : 'transparent',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <span style={{ display: 'block', fontSize: 11, opacity: 0.58 }}>
                {metricLabels[id]}
              </span>
              <span
                style={{
                  display: 'block',
                  marginTop: 3,
                  fontSize: 16,
                  fontWeight: 680,
                }}
              >
                {metricTotal(rows, id).toLocaleString('en-US')}
              </span>
            </button>
          ))}
        </div>
      </header>
      <div style={{ padding: '14px 16px 16px' }}>
        <Chart<DashboardRow, string, number>
          idPrefix={idPrefix}
          definition={definition}
          renderer={renderer}
          width={chartWidth}
          height={chartHeight}
          ariaLabel={`Daily ${metricLabels[metric].toLowerCase()} visitors`}
          onRender={({ container }) => {
            chartHost.current = container
          }}
          onFocusChange={(point) => {
            focusedId.current = point?.datum.id ?? null
          }}
        />
      </div>
    </section>
  )
}
