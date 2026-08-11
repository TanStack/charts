import {
  areaY,
  crosshair,
  d3Curve,
  defineChart,
  dot,
  lineY,
} from '@tanstack/charts'
import { focusGroupX } from '@tanstack/charts/focus'
import { decorative } from '@tanstack/charts/mark/decorative'
import { scaleLinear, scaleUtc } from 'd3-scale'
import { curveMonotoneX } from 'd3-shape'
import { formatThemedAreaTick } from './model'
import type { ChartMotionSpringTransition } from '@tanstack/charts'
import type { ThemedAreaRow } from './model'

export interface ThemedAreaChartInput {
  width: number
  height: number
  preview?: boolean
}

export const themedAreaSpring = {
  type: 'spring',
  stiffness: 190,
  damping: 24,
  mass: 0.82,
  restDelta: 0.02,
  restSpeed: 0.02,
} satisfies ChartMotionSpringTransition

const smooth = d3Curve(curveMonotoneX)
const accent = 'var(--themed-area-accent, #3b82f6)'
const surface = 'var(--themed-area-surface, Canvas)'
const foreground = 'var(--themed-area-foreground, CanvasText)'
const muted = 'var(--themed-area-muted, GrayText)'
const grid = 'var(--themed-area-grid, CanvasText)'

export function themedInteractiveAreaDefinition(
  rows: readonly ThemedAreaRow[],
  input: ThemedAreaChartInput,
) {
  const first = rows[0]
  const last = rows.at(-1)
  if (!first || !last) throw new TypeError('The themed area needs data')

  const maximum = Math.max(...rows.map((row) => row.visitors))
  const yMaximum = Math.max(500, Math.ceil((maximum * 1.08) / 100) * 100)
  const preview = input.preview === true
  const dateTicks = evenlySpacedDates(first.date, last.date, preview ? 3 : 5)

  return defineChart({
    motion: { transition: themedAreaSpring },
    marks: [
      decorative(
        areaY(rows, {
          id: 'visitor-area',
          x: 'date',
          y: 'visitors',
          key: 'id',
          fill: 'url(#themed-area-fill)',
          fillOpacity: 1,
          curve: smooth,
        }),
      ),
      decorative(
        lineY(rows, {
          id: 'visitor-line',
          x: 'date',
          y: 'visitors',
          key: 'id',
          stroke: accent,
          strokeWidth: preview ? 2 : 2.4,
          curve: smooth,
        }),
      ),
      dot(rows, {
        id: 'visitor-points',
        x: 'date',
        y: 'visitors',
        key: 'id',
        r: 3,
        fill: accent,
        fillOpacity: 0,
        stroke: surface,
        strokeOpacity: 0,
        strokeWidth: 2,
        states: [
          {
            when: { focus: 'group' },
            style: {
              fillOpacity: 1,
              strokeOpacity: 1,
              r: preview ? 3.75 : 4.5,
            },
            transition: {
              type: 'tween',
              duration: 140,
              easing: 'ease-out',
            },
          },
          {
            when: { focus: 'primary' },
            style: {
              fillOpacity: 1,
              strokeOpacity: 1,
              r: preview ? 4.25 : 5,
            },
            transition: {
              type: 'tween',
              duration: 140,
              easing: 'ease-out',
            },
          },
        ],
      }),
      crosshair<Date, number>({
        id: 'visitor-crosshair',
        x: {
          stroke: grid,
          strokeOpacity: 0.34,
          strokeWidth: 1,
          strokeDasharray: '3 4',
        },
        y: false,
        motion: { transition: themedAreaSpring },
      }),
    ],
    x: {
      scale: scaleUtc().domain([first.date, last.date]),
      axis: {
        line: false,
        ticks: {
          values: dateTicks,
          size: 0,
          padding: preview ? 5 : 8,
          format: formatThemedAreaTick,
        },
        tickLabels: {
          fontSize: preview ? 8 : 10,
          opacity: 0.62,
          thin: { minGap: preview ? 5 : 12, priority: 'ends' },
        },
      },
    },
    y: {
      scale: scaleLinear().domain([0, yMaximum]),
      grid: true,
      axis: {
        line: false,
        ticks: {
          values: [0, yMaximum / 3, (yMaximum * 2) / 3, yMaximum],
          size: 0,
        },
        tickLabels: false,
      },
    },
    gradients: [
      {
        id: 'themed-area-fill',
        x1: 0,
        y1: 0,
        x2: 0,
        y2: 1,
        stops: [
          { offset: 0, color: accent, opacity: 0.34 },
          { offset: 0.58, color: accent, opacity: 0.13 },
          { offset: 1, color: accent, opacity: 0.015 },
        ],
      },
    ],
    theme: {
      background: 'transparent',
      foreground,
      muted,
      grid,
      palette: [accent],
    },
    focus: focusGroupX,
    focusRing: false,
    maxFocusDistance: Number.POSITIVE_INFINITY,
    tooltip: false,
    keyboard: true,
    clip: true,
    margin: preview
      ? { top: 10, right: 18, bottom: 22, left: 18 }
      : { top: 12, right: 18, bottom: 28, left: 18 },
  })
}

function evenlySpacedDates(first: Date, last: Date, count: number) {
  const start = first.getTime()
  const span = last.getTime() - start
  return Array.from(
    { length: count },
    (_value, index) => new Date(start + (span * index) / (count - 1)),
  )
}
