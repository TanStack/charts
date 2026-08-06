import {
  barY,
  colorLegend,
  crosshair,
  defineChart,
  stack,
} from '@tanstack/charts'
import { motion } from '@tanstack/charts/motion'
import { scaleBand, scaleLinear } from 'd3-scale'
import {
  stackedCursorBandInset,
  stackedCursorBarInset,
  stackedCursorCauses,
  stackedCursorColors,
  formatStackedCursorEndpoint,
  stackedCursorMaximum,
  stackedCursorPeriods,
} from './model'
import type { StackedCursorRow } from './model'

const cursorTransition = {
  type: 'spring' as const,
  stiffness: 260,
  damping: 26,
  mass: 0.72,
  restDelta: 0.02,
  restSpeed: 0.02,
}

export const createStackedCursorRenderer = () =>
  motion<StackedCursorRow, string, number>({
    initial: false,
    transition: {
      type: 'spring',
      stiffness: 190,
      damping: 22,
      mass: 0.85,
    },
  })

export const stackedCursorDefinition = (rows: readonly StackedCursorRow[]) =>
  defineChart({
    marks: [
      crosshair<string, number>({
        id: 'stacked-cursor-band',
        x: {
          band: {
            fill: '#64748b',
            fillOpacity: 0.26,
            inset: stackedCursorBandInset,
            radius: 3,
          },
          label: {
            format: String,
            fill: 'CanvasText',
            stroke: 'Canvas',
            strokeWidth: 5,
            fontSize: 11,
            fontWeight: 700,
          },
        },
        y: false,
        motion: { transition: cursorTransition },
      }),
      barY(rows, {
        id: 'stacked-cursor-bars',
        x: 'period',
        y: 'deaths',
        z: 'cause',
        color: 'cause',
        key: 'id',
        layout: stack({ order: stackedCursorCauses }),
        inset: stackedCursorBarInset,
        radius: 2,
      }),
      crosshair<string, number>({
        id: 'stacked-cursor-rule',
        x: false,
        y: {
          stroke: '#475569',
          strokeOpacity: 0.82,
          strokeWidth: 1,
          strokeDasharray: '4 4',
          label: {
            format: formatStackedCursorEndpoint,
            fill: 'CanvasText',
            stroke: 'Canvas',
            strokeWidth: 16,
            fontSize: 11,
            fontWeight: 700,
          },
        },
        motion: { transition: cursorTransition },
      }),
    ],
    x: {
      scale: scaleBand<string>().domain(stackedCursorPeriods).padding(0.18),
    },
    y: {
      scale: scaleLinear().domain([0, stackedCursorMaximum]),
      grid: true,
      axis: { ticks: { count: 5 }, label: 'Deaths' },
    },
    color: {
      domain: stackedCursorCauses,
      range: stackedCursorColors,
      legend: colorLegend({ label: 'Cause' }),
    },
    focus: 'group-x',
    focusRing: false,
    maxFocusDistance: Number.POSITIVE_INFINITY,
    tooltip: false,
    keyboard: true,
  })
