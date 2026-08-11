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
import { activeDonutDefinition, donutSummary } from './chart'
import { activeDonutLayout } from './layout'
import { browserRows } from './model'
import { reactMount } from '../../shared/react-mount'
import type { CSSProperties } from 'react'
import type { ChartPoint } from '@tanstack/charts'
import type { ConformanceTestDriver } from '../../types'
import type { ReactConformanceProps } from '../../shared/react-mount'
import type { DonutDatum } from './chart'

const palette = ['#7c3aed', '#06b6d4', '#f97316', '#ec4899', '#84cc16']

export const ActiveDonutMetric = forwardRef<
  ConformanceTestDriver,
  ReactConformanceProps
>(function ActiveDonutMetric({ input, idPrefix }, ref) {
  const [activeId, setActiveId] = useState('chrome')
  const root = useRef<HTMLElement>(null)
  const chartHost = useRef<HTMLElement | null>(null)
  const buttonRefs = useRef(new Map<string, HTMLButtonElement>())
  const focusedId = useRef<string | null>(null)
  const renderer = useMemo(
    () => motion<DonutDatum, number, number>({ initial: !input.preview }),
    [input.preview],
  )
  const definition = useMemo(
    () => activeDonutDefinition(input, activeId),
    [activeId, input],
  )
  const rows = browserRows(input.revision)
  const summary = donutSummary(input, activeId)

  useImperativeHandle(
    ref,
    () => ({
      resolveTarget(target) {
        if (target.view && target.view !== 'main') return null
        if (target.anchor.startsWith('wedge:')) {
          const id = target.anchor.slice('wedge:'.length)
          const path = root.current?.querySelector<SVGPathElement>(
            `g[data-ts-key="browser-arcs"] > path[data-ts-key$=":${id}"]`,
          )
          return path ? svgPathPoint(path) : null
        }
        if (!target.anchor.startsWith('browser:')) return null
        const element = buttonRefs.current.get(
          target.anchor.slice('browser:'.length),
        )
        return element ? center(element) : null
      },
      readState() {
        const tooltip = root.current?.querySelector<HTMLElement>(
          '.active-donut-tooltip',
        )
        const focused = rows.find((row) => row.id === focusedId.current)
        return {
          activeId,
          activeValue: summary.selected.visitors,
          total: summary.total,
          focusedId: focusedId.current,
          tooltip: {
            visible: Boolean(tooltip && !tooltip.hidden),
            id: focused?.id ?? null,
            label: focused?.label ?? null,
            value: focused?.visitors ?? null,
            text: tooltip?.textContent?.trim() ?? '',
          },
        }
      },
      settle() {
        const host = chartHost.current
        return host ? settleChartMotion(host, 2_500) : undefined
      },
    }),
    [activeId, rows, summary],
  )

  const selectPoint = (
    point: ChartPoint<DonutDatum, number, number> | null,
  ) => {
    const row = point && 'visitors' in point.datum ? point.datum : null
    focusedId.current = row?.id ?? null
    if (row) setActiveId(row.id)
  }

  if (input.preview) {
    return (
      <Chart<DonutDatum, number, number>
        idPrefix={idPrefix}
        definition={definition}
        renderer={renderer}
        initialWidth={input.width}
        aspectRatio={input.width / input.height}
        ariaLabel="Browser visitors donut"
        onRender={({ container }) => {
          chartHost.current = container
        }}
      />
    )
  }

  const layout = activeDonutLayout(input.width, input.height, rows.length)
  const { chartSize, compact } = layout
  const cardStyle: CSSProperties & Record<`--${string}`, string> = {
    '--ts-chart-1': palette[0]!,
    '--ts-chart-2': palette[1]!,
    '--ts-chart-3': palette[2]!,
    '--ts-chart-4': palette[3]!,
    '--ts-chart-5': palette[4]!,
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
    width: input.width,
    height: input.height,
    overflow: 'hidden',
    border: '1px solid color-mix(in srgb, currentColor 12%, transparent)',
    borderRadius: 18,
    color: 'CanvasText',
    background: 'Canvas',
    fontFamily:
      "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    boxShadow: '0 18px 55px color-mix(in srgb, CanvasText 7%, transparent)',
  }

  return (
    <section
      ref={root}
      data-conformance-view="main"
      aria-label="Browser visitors"
      style={cardStyle}
    >
      <header style={{ padding: '18px 20px 0' }}>
        <div style={{ fontSize: 14, fontWeight: 680 }}>Browser visitors</div>
        <div style={{ marginTop: 3, fontSize: 12, opacity: 0.56 }}>
          {summary.total.toLocaleString('en-US')} sessions
        </div>
      </header>
      <div
        data-donut-content=""
        data-chart-size={chartSize}
        style={{
          display: 'flex',
          alignItems: 'center',
          flexDirection: compact ? 'column' : 'row',
          gap: layout.contentGap,
          padding: compact ? '4px 18px 16px' : '2px 24px 20px 8px',
        }}
      >
        <Chart<DonutDatum, number, number>
          idPrefix={idPrefix}
          definition={definition}
          renderer={renderer}
          width={chartSize}
          height={chartSize}
          ariaLabel="Browser visitor share"
          onRender={({ container }) => {
            chartHost.current = container
          }}
          onFocusChange={selectPoint}
        />
        <div
          data-browser-legend=""
          role="group"
          aria-label="Select browser"
          style={{
            display: 'grid',
            gridTemplateColumns: compact
              ? `repeat(${layout.legendColumns}, minmax(0, 1fr))`
              : undefined,
            width: compact ? '100%' : 190,
            gap: 4,
          }}
        >
          {rows.map((row, index) => {
            const selected = row.id === activeId
            return (
              <button
                key={row.id}
                ref={(element) => {
                  if (element) buttonRefs.current.set(row.id, element)
                  else buttonRefs.current.delete(row.id)
                }}
                type="button"
                data-browser={row.id}
                aria-pressed={selected}
                onClick={() => setActiveId(row.id)}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '10px 1fr auto',
                  alignItems: 'center',
                  gap: 9,
                  minHeight: 38,
                  padding: '7px 9px',
                  border: 0,
                  borderRadius: 9,
                  color: 'inherit',
                  background: selected
                    ? 'color-mix(in srgb, currentColor 7%, Canvas)'
                    : 'transparent',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 999,
                    background: palette[index],
                  }}
                />
                <span style={{ fontSize: 12, fontWeight: 620 }}>
                  {row.label}
                </span>
                <span style={{ fontSize: 12, opacity: 0.6 }}>
                  {Math.round((row.visitors / summary.total) * 100)}%
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </section>
  )
})

export const catalogComponent = ActiveDonutMetric
export const mount = reactMount(ActiveDonutMetric)

function center(element: HTMLElement) {
  const bounds = element.getBoundingClientRect()
  return {
    x: bounds.left + bounds.width / 2,
    y: bounds.top + bounds.height / 2,
    focusElement: element,
  }
}

function svgPathPoint(path: SVGPathElement) {
  const svg = path.ownerSVGElement
  const bounds = path.getBBox()
  const matrix = path.getScreenCTM()
  if (!svg || !matrix) return null

  const candidates: Array<{ x: number; y: number; distance: number }> = []
  for (let row = 1; row < 10; row += 1) {
    for (let column = 1; column < 10; column += 1) {
      const x = bounds.x + (bounds.width * column) / 10
      const y = bounds.y + (bounds.height * row) / 10
      const point = svg.createSVGPoint()
      point.x = x
      point.y = y
      if (!path.isPointInFill(point)) continue
      candidates.push({
        x,
        y,
        distance:
          Math.abs(x - (bounds.x + bounds.width / 2)) +
          Math.abs(y - (bounds.y + bounds.height / 2)),
      })
    }
  }

  const candidate = candidates.sort(
    (left, right) => left.distance - right.distance,
  )[0]
  if (!candidate) return null
  const point = svg.createSVGPoint()
  point.x = candidate.x
  point.y = candidate.y
  const screen = point.matrixTransform(matrix)
  return { x: screen.x, y: screen.y, focusElement: path }
}
