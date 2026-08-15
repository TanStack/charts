import { useCallback, useMemo, useRef, useState } from 'react'
import { Chart } from '@tanstack/charts/react'
import { initialBrushRange, observedBrushDates, monthlyAaplRows } from './model'
import { aapl } from '@tanstack/charts-data/aapl'
import type { ChartScene } from '@tanstack/charts'
import type {
  BrushRange,
  BrushXChange,
} from '@tanstack/charts/interaction/brush'
import type { AaplRow } from '@tanstack/charts-data/aapl'

export interface BrushState {
  range: BrushRange<Date>
  dragging: boolean
}
import { defineChart, dot, lineY } from '@tanstack/charts'
import { brushX } from '@tanstack/charts/interaction/brush'
import { controlledSignal } from '@tanstack/charts/interaction/signal'
import { decorative } from '@tanstack/charts/mark/decorative'
import { scaleLinear, scaleUtc } from 'd3-scale'
import {
  brushDateKey,
  brushDomain,
  brushRangeSummary,
  brushShortDate,
} from './model'
import { brushSelectionFill } from './paint'
const initialRange = initialBrushRange(
  observedBrushDates(monthlyAaplRows(aapl)),
)

export interface ExampleProps {
  width?: number
  height?: number
  revision?: number
}

const color = '#2563eb'

const brushRows = monthlyAaplRows(aapl)

const brushDates = observedBrushDates(brushRows)

const fullDomain = brushDomain(brushDates)

const brushMonthFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  timeZone: 'UTC',
})

export function brushRangeDefinition(
  range: BrushRange<Date>,
  onChange: (range: BrushRange<Date>, reason: BrushXChange<Date>) => void,
) {
  return defineChart({
    marks: [
      decorative(
        lineY(brushRows, {
          id: 'brush-series-line',
          x: 'Date',
          y: 'Close',
          stroke: color,
          strokeWidth: 2.5,
        }),
      ),
      dot(brushRows, {
        id: 'brush-series-points',
        x: 'Date',
        y: 'Close',
        fill: color,
        r: 3.5,
        stroke: '#ffffff',
        strokeWidth: 1,
      }),
    ],
    x: {
      scale: scaleUtc().domain(fullDomain),
      axis: {
        ticks: { format: (value) => brushMonthFormatter.format(value) },
        label: 'Month',
      },
    },
    y: {
      scale: scaleLinear,
      grid: true,
      axis: { ticks: { count: 4 }, label: 'AAPL close ($)' },
    },
    controls: [
      brushX({
        id: 'monthly-range',
        range: controlledSignal<BrushRange<Date>, BrushXChange<Date>>(
          range,
          (next, { reason }) => onChange(next, reason),
        ),
        values: brushDates,
        ariaLabel:
          'Monthly range brush. Drag to select; focus either handle and use arrow keys, Home, or End to adjust.',
        startAriaLabel: 'Range start',
        endAriaLabel: 'Range end',
        format: brushDateKey,
        handleSize: 16,
        selectionStyle: {
          fill: brushSelectionFill,
          fillOpacity: 1,
          stroke: color,
          strokeWidth: 1,
        },
        handleStyle: {
          fill: 'Canvas',
          fillOpacity: 1,
          stroke: color,
          strokeWidth: 2,
        },
      }),
    ],
    svgAnimation: false,
    keyboard: false,
    focusRing: false,
    margin: { top: 52, right: 24, bottom: 44, left: 58 },
  })
}

export function brushRangeStatus(range: BrushRange<Date>) {
  const summary = brushRangeSummary(brushRows, range)
  return {
    label: `${brushShortDate(range.start)} → ${brushShortDate(range.end)} · ${summary.count} AAPL closes · avg $${summary.average.toFixed(1)}`,
    ariaLabel: `${brushDateKey(range.start)} through ${brushDateKey(range.end)}, ${summary.count} AAPL closing prices, average $${summary.average.toFixed(1)}`,
  }
}

export function copyRange(range: BrushRange<Date>): BrushRange<Date> {
  return {
    start: new Date(range.start.getTime()),
    end: new Date(range.end.getTime()),
  }
}

export default function BrushRangeExample({
  width = 640,
  height = 480,
  revision = 0,
}: ExampleProps = {}) {
  const input = { width, height, revision, preview: false, interactive: true }
  const idPrefix = '89-brush-range-selection'
  const shellRef = useRef<HTMLDivElement>(null)

  const chartRef = useRef<HTMLDivElement>(null)

  const sceneRef = useRef<ChartScene<AaplRow, Date, number>>(null)

  const [accepted, setAccepted] = useState(() => copyRange(initialRange))

  const [state, setState] = useState<BrushState>(() => ({
    range: copyRange(initialRange),
    dragging: false,
  }))

  const stateRef = useRef(state)

  stateRef.current = state

  const handleBrushChange = useCallback(
    (next: BrushRange<Date>, reason: BrushXChange<Date>) => {
      const nextState = {
        range: copyRange(next),
        dragging: reason.type === 'preview',
      }
      stateRef.current = nextState
      setState(nextState)
      if (reason.type !== 'preview') setAccepted(copyRange(next))
    },
    [],
  )

  const definition = useMemo(
    () => brushRangeDefinition(accepted, handleBrushChange),
    [accepted, handleBrushChange],
  )

  const status = brushRangeStatus(state.range)

  return (
    <div
      ref={shellRef}
      data-conformance-view="main"
      role="application"
      aria-label="Monthly time range brush with two adjustable handles"
      style={{ position: 'relative', width: input.width, height: input.height }}
    >
      <div
        ref={chartRef}
        style={{
          position: 'relative',
          width: input.width,
          height: input.height,
        }}
      >
        <Chart
          idPrefix={idPrefix}
          definition={definition}
          width={input.width}
          height={input.height}
          ariaLabel="Time series with a draggable horizontal range brush"
          onRender={({ scene }) => {
            sceneRef.current = scene
          }}
        />
      </div>
      <output
        role="status"
        aria-live="polite"
        aria-label={status.ariaLabel}
        style={{
          position: 'absolute',
          right: 24,
          top: 10,
          zIndex: 4,
          padding: '4px 8px',
          border: '1px solid color-mix(in srgb, CanvasText 24%, transparent)',
          borderRadius: 999,
          background: 'Canvas',
          color: 'CanvasText',
          font: '600 12px/1.2 system-ui, sans-serif',
          pointerEvents: 'none',
        }}
      >
        {status.label}
      </output>
    </div>
  )
}
