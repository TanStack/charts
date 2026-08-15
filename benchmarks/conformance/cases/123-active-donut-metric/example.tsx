import { useMemo, useRef, useState } from 'react'
import { motion } from '@tanstack/charts/motion'
import { Chart } from '@tanstack/charts/react/core'
import { activeDonutLayout } from './layout'
import { browserRows } from './model'
import type { CSSProperties } from 'react'
import type { ChartPoint } from '@tanstack/charts'
import { defineChart } from '@tanstack/charts'
import { decorative } from '@tanstack/charts/mark/decorative'
import { pie, polar, radialArc, radialText } from '@tanstack/charts/polar'
import { scaleLinear } from '@tanstack/charts/scales/linear'
import { tooltip } from '@tanstack/charts/tooltip'
import { browserTotal } from './model'
import type { ChartTooltipOptions } from '@tanstack/charts'
import type { PieDatum } from '@tanstack/charts/polar'
import type { BrowserRow } from './model'
const palette = ['#7c3aed', '#06b6d4', '#f97316', '#ec4899', '#84cc16']

export interface ExampleProps {
  width?: number
  height?: number
  revision?: number
}

const tau = Math.PI * 2

const gapAngle = (Math.PI / 180) * 2.8

export const donutSpring = {
  type: 'spring' as const,
  stiffness: 190,
  damping: 21,
  mass: 0.82,
}

export interface DonutCenterRow {
  id: string
  angle: number
  radius: number
  text: string
  dy: number
}

export type DonutDatum = PieDatum<BrowserRow>

const tooltipOptions: ChartTooltipOptions<DonutDatum, number, number> = {
  anchor: 'point',
  placement: ['top', 'right', 'left', 'bottom'],
  className: 'active-donut-tooltip',
  format: (point) =>
    `${point.datum.label} · ${point.datum.visitors.toLocaleString('en-US')} visitors`,
}

export function activeDonutDefinition(
  input: ExampleChartInput,
  activeId: string,
) {
  const rows = browserRows(input.revision)
  const selected = rows.find((row) => row.id === activeId) ?? rows[0]!
  const { arcs, active } = activeDonutArcs(rows, selected.id)
  const centerRows: readonly DonutCenterRow[] = [
    {
      id: `${selected.id}:value`,
      angle: 0,
      radius: 0,
      text: selected.visitors.toLocaleString('en-US'),
      dy: -8,
    },
    {
      id: `${selected.id}:label`,
      angle: 0,
      radius: 0,
      text: selected.label,
      dy: input.preview ? 12 : 15,
    },
  ]

  return defineChart(
    {
      marks: [
        polar({
          id: 'browser-donut',
          radiusRatio: input.preview ? 0.76 : 0.74,
          marks: [
            radialArc(arcs, {
              id: 'browser-arcs',
              key: 'id',
              color: 'id',
              innerRadius: ({ radius }) => radius * 0.6,
              cornerRadius: 7,
              motion: { transition: donutSpring },
            }),
          ],
        }),
        decorative(
          polar({
            id: 'selected-browser',
            radiusRatio: input.preview ? 0.84 : 0.83,
            marks: [
              radialArc(active, {
                id: 'selected-browser-wedge',
                key: 'id',
                color: 'id',
                innerRadius: ({ radius }) => radius * 0.59,
                cornerRadius: 8,
                stroke: 'Canvas',
                strokeWidth: input.preview ? 1.5 : 2.5,
                motion: { transition: donutSpring },
              }),
              radialArc(active, {
                id: 'selected-browser-ring',
                key: 'id',
                color: 'id',
                innerRadius: ({ radius }) => radius * 0.94,
                outerRadius: ({ radius }) => radius,
                cornerRadius: 4,
                fillOpacity: 0.78,
                motion: {
                  delay: 70,
                  transition: donutSpring,
                },
              }),
            ],
          }),
        ),
        decorative(
          polar({
            id: 'donut-center',
            radiusRatio: 0.8,
            angle: { scale: scaleLinear().domain([0, tau]) },
            radius: { scale: scaleLinear().domain([0, 1]) },
            marks: [
              radialText(centerRows.slice(0, 1), {
                id: 'donut-center-value',
                angle: 'angle',
                radius: 'radius',
                key: 'id',
                text: 'text',
                dy: (row) => row.dy,
                fill: 'currentColor',
                fontSize: input.preview ? 19 : 26,
                fontWeight: 760,
                motion: { transition: donutSpring },
              }),
              radialText(centerRows.slice(1), {
                id: 'donut-center-label',
                angle: 'angle',
                radius: 'radius',
                key: 'id',
                text: 'text',
                dy: (row) => row.dy,
                fill: 'color-mix(in srgb, currentColor 56%, transparent)',
                fontSize: input.preview ? 8 : 11,
                fontWeight: 620,
                motion: { transition: donutSpring },
              }),
            ],
          }),
        ),
      ],
      color: {
        domain: rows.map((row) => row.id),
        range: [
          'var(--ts-chart-1)',
          'var(--ts-chart-2)',
          'var(--ts-chart-3)',
          'var(--ts-chart-4)',
          'var(--ts-chart-5)',
        ],
      },
      guides: false,
      margin: 0,
      motion: { transition: donutSpring },
    },
    {
      focus: 'nearest',
      focusRing: false,
      keyboard: input.interactive,
      tooltip: input.interactive ? { use: tooltip, ...tooltipOptions } : false,
    },
  )
}

export function activeDonutArcs(rows: readonly BrowserRow[], activeId: string) {
  const arcs = pie(rows, { value: 'visitors', gapAngle })
  return {
    arcs,
    active: arcs.filter((row) => row.id === activeId),
  }
}

export function donutSummary(input: ExampleChartInput, activeId: string) {
  const rows = browserRows(input.revision)
  const selected = rows.find((row) => row.id === activeId) ?? rows[0]!
  return {
    selected,
    total: browserTotal(rows),
    share: selected.visitors / browserTotal(rows),
  }
}

export interface ExampleChartInput {
  width: number
  height: number
  revision: number
  preview?: boolean
  interactive?: boolean
}

export default function ActiveDonutMetric({
  width = 640,
  height = 480,
  revision = 0,
}: ExampleProps = {}) {
  const input = { width, height, revision, preview: false, interactive: true }
  const idPrefix = '123-active-donut-metric'
  const [activeId, setActiveId] = useState('chrome')

  const root = useRef<HTMLElement>(null)

  const chartHost = useRef<HTMLElement | null>(null)

  const buttonRefs = useRef(new Map<string, HTMLButtonElement>())

  const focusedId = useRef<string | null>(null)

  const renderer = useMemo(() => motion({ initial: !false }), [false])

  const definition = useMemo(
    () => activeDonutDefinition(input, activeId),
    [activeId, input],
  )

  const rows = browserRows(input.revision)

  const summary = donutSummary(input, activeId)

  const selectPoint = (
    point: ChartPoint<DonutDatum, number, number> | null,
  ) => {
    const row = point && 'visitors' in point.datum ? point.datum : null
    focusedId.current = row?.id ?? null
    if (row) setActiveId(row.id)
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
}
