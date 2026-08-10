import { defineChart } from '@tanstack/charts'
import { decorative } from '@tanstack/charts/mark/decorative'
import { pie, polar, radialArc, radialText } from '@tanstack/charts/polar'
import { scaleLinear } from '@tanstack/charts/scales/linear'
import { tooltip } from '@tanstack/charts/tooltip'
import { browserRows, browserTotal } from './model'
import type { ChartTooltipOptions } from '@tanstack/charts'
import type { PieDatum } from '@tanstack/charts/polar'
import type { ConformanceInput } from '../../types'
import type { BrowserRow } from './model'

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

export type DonutDatum = PieDatum<BrowserRow> | DonutCenterRow

const tooltipOptions: ChartTooltipOptions<DonutDatum, number, number> = {
  anchor: 'point',
  placement: ['top', 'right', 'left', 'bottom'],
  className: 'active-donut-tooltip',
  format: (point) =>
    'visitors' in point.datum
      ? `${point.datum.label} · ${point.datum.visitors.toLocaleString('en-US')} visitors`
      : point.datum.text,
}

export function activeDonutDefinition(
  input: ConformanceInput,
  activeId: string,
) {
  const rows = browserRows(input.revision)
  const { arcs, active } = activeDonutArcs(rows, activeId)
  const selected = rows.find((row) => row.id === activeId) ?? rows[0]!
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

export function donutSummary(input: ConformanceInput, activeId: string) {
  const rows = browserRows(input.revision)
  const selected = rows.find((row) => row.id === activeId) ?? rows[0]!
  return {
    selected,
    total: browserTotal(rows),
    share: selected.visitors / browserTotal(rows),
  }
}
