import {
  forwardRef,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react'
import { motion } from '@tanstack/charts/motion'
import { Chart } from '@tanstack/charts/react/core'
import { settleChartMotion } from '../../shared/motion'
import { activeBarDashboardDefinition } from './example'
import { dashboardRows, metricTotal } from './model'
import { reactMount } from '../../shared/react-mount'
import type { CSSProperties } from 'react'
import type { ConformanceTestDriver } from '../../types'
import type { ReactConformanceProps } from '../../shared/react-mount'
import type { DashboardMetric, DashboardRow } from './model'

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

export const ActiveBarDashboard = forwardRef<
  ConformanceTestDriver,
  ReactConformanceProps
>(function ActiveBarDashboard({ input, idPrefix }, ref) {
  const [metric, setMetric] = useState<DashboardMetric>('desktop')
  const root = useRef<HTMLElement>(null)
  const chartHost = useRef<HTMLElement | null>(null)
  const desktopButton = useRef<HTMLButtonElement>(null)
  const mobileButton = useRef<HTMLButtonElement>(null)
  const focusedId = useRef<string | null>(null)
  const renderer = useMemo(
    () => motion<DashboardRow, string, number>({ initial: !input.preview }),
    [input.preview],
  )
  const rows = dashboardRows(input.revision)
  const definition = useMemo(
    () => activeBarDashboardDefinition(input, metric),
    [input, metric],
  )

  useImperativeHandle(
    ref,
    () => ({
      resolveTarget(target) {
        if (target.view && target.view !== 'main') return null
        const element =
          target.anchor === 'metric:desktop'
            ? desktopButton.current
            : target.anchor === 'metric:mobile'
              ? mobileButton.current
              : null
        if (element) {
          const bounds = element.getBoundingClientRect()
          return {
            x: bounds.left + bounds.width / 2,
            y: bounds.top + bounds.height / 2,
            focusElement: element,
          }
        }
        const id = target.anchor.startsWith('day:')
          ? target.anchor.slice('day:'.length)
          : null
        const index = id ? rows.findIndex((row) => row.id === id) : -1
        const bar =
          index >= 0
            ? root.current?.querySelectorAll<SVGRectElement>(
                '.ts-chart__bar rect',
              )[index]
            : null
        const svg = root.current?.querySelector<SVGSVGElement>('svg.ts-chart')
        if (!bar || !svg) return null
        const bounds = bar.getBoundingClientRect()
        return {
          x: bounds.left + bounds.width / 2,
          y: bounds.top + bounds.height / 2,
          focusElement: svg,
        }
      },
      readState() {
        const tooltip =
          root.current?.querySelector<HTMLElement>('.ts-chart-tooltip')
        return {
          metric,
          total: metricTotal(rows, metric),
          focusedId: focusedId.current,
          tooltip: {
            visible: Boolean(tooltip && !tooltip.hidden),
            text: tooltip?.textContent?.trim() ?? '',
          },
        }
      },
      settle() {
        const host = chartHost.current
        return host ? settleChartMotion(host, 2_500) : undefined
      },
    }),
    [metric, rows],
  )

  if (input.preview) {
    return (
      <Chart<DashboardRow, string, number>
        idPrefix={idPrefix}
        definition={definition}
        renderer={renderer}
        initialWidth={input.width}
        aspectRatio={input.width / input.height}
        ariaLabel="Daily desktop visitors"
        onRender={({ container }) => {
          chartHost.current = container
        }}
      />
    )
  }

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
})

export const catalogComponent = ActiveBarDashboard
export const mount = reactMount(ActiveBarDashboard)
