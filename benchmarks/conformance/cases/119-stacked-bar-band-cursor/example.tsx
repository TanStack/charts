import { useMemo } from 'react'
import { defineChart } from '@tanstack/charts'
import { Chart } from '@tanstack/charts/react/core'
import { stackedCursorRowsForRevision } from './model'
import { barY, colorLegend, crosshair, stack } from '@tanstack/charts'
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
export interface ExampleProps {
  width?: number
  height?: number
  revision?: number
}

const cursorTransition = {
  type: 'spring' as const,
  stiffness: 260,
  damping: 26,
  mass: 0.72,
  restDelta: 0.02,
  restSpeed: 0.02,
}

export const createStackedCursorRenderer = () =>
  motion({
    initial: false,
    transition: {
      type: 'spring',
      stiffness: 190,
      damping: 22,
      mass: 0.85,
    },
  })

export const createExampleChart = (rows: readonly StackedCursorRow[]) =>
  defineChart(
    {
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
    },
    { svgAnimation: false },
  )

export default function StackedCursorCatalogView({
  width = 640,
  height = 480,
  revision = 0,
}: ExampleProps = {}) {
  const renderer = useMemo(createStackedCursorRenderer, [])

  const definition = useMemo(
    () => createExampleChart(stackedCursorRowsForRevision(revision)),
    [revision],
  )

  const ariaLabel = 'Crimean War deaths with x band and y rule cursors'

  const ariaDescription =
    'Move over a stacked bar. The x cursor highlights the full stack and the dotted y cursor marks the focused segment endpoint.'

  return (
    <div data-conformance-view="main" style={{ width, height }}>
      <Chart
        idPrefix="119-stacked-bar-band-cursor"
        definition={definition}
        renderer={renderer}
        width={width}
        height={height}
        ariaLabel={ariaLabel}
        ariaDescription={ariaDescription}
      />
    </div>
  )
}
