import { useCallback, useMemo, useRef, useState } from 'react'
import { Chart } from '@tanstack/charts/react'
import { initialZoomWindow } from './model'
import type { AaplRow } from '@tanstack/charts-data/aapl'
import type { ChartScene } from '@tanstack/charts'
import type {
  ZoomXChange,
  ZoomXWindow,
} from '@tanstack/charts/interaction/zoom'
import { aapl } from '@tanstack/charts-data/aapl'
import { defineChart, dot, lineY } from '@tanstack/charts'
import { zoomX } from '@tanstack/charts/interaction/zoom'
import { controlledSignal } from '@tanstack/charts/interaction/signal'
import { decorative } from '@tanstack/charts/mark/decorative'
import { scaleLinear, scaleUtc } from 'd3-scale'
import {
  selectZoomRows,
  visibleZoomData,
  zoomDateKey,
  zoomFullDomain,
  zoomSpanDays,
} from './model'
import type { ZoomXAction } from '@tanstack/charts/interaction/zoom'
export interface ExampleProps {
  width?: number
  height?: number
  revision?: number
}

export interface ZoomState {
  window: ZoomXWindow<Date>
  lastAction: 'none' | ZoomXAction
  active: boolean
  wheelCaptured: boolean
}

const color = '#0f766e'

const zoomRows = selectZoomRows(aapl)

const zoomDateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
})

export function zoomTimeWindowDefinition(
  window: ZoomXWindow<Date>,
  onChange: (window: ZoomXWindow<Date>, reason: ZoomXChange<Date>) => void,
  onActiveChange?: (active: boolean) => void,
) {
  const rows = visibleZoomData(zoomRows, window)
  return defineChart({
    marks: [
      decorative(
        lineY(rows, {
          id: 'zoom-series-line',
          x: 'Date',
          y: 'Close',
          stroke: color,
          strokeWidth: 2.5,
        }),
      ),
      dot(rows, {
        id: 'zoom-series-points',
        x: 'Date',
        y: 'Close',
        fill: color,
        r: 3.5,
        stroke: '#ffffff',
        strokeWidth: 1,
      }),
    ],
    x: {
      scale: scaleUtc().domain([window.start, window.end]),
      axis: {
        ticks: { format: (value) => zoomDateFormatter.format(value) },
        label: 'Date',
      },
    },
    y: {
      scale: scaleLinear,
      grid: true,
      axis: { ticks: { count: 4 }, label: 'AAPL close ($)' },
    },
    controls: [
      zoomX({
        id: 'time-window',
        window: controlledSignal<ZoomXWindow<Date>, ZoomXChange<Date>>(
          window,
          (next, { reason }) => onChange(next, reason),
        ),
        extent: zoomFullDomain,
        scaleExtent: [1, 8],
        ariaLabel:
          'Zoomable time window. Focus the chart before wheel zoom; drag or use a horizontal wheel to pan; use plus, minus, arrow keys, or Home.',
        ariaDescription:
          'Wheel zoom; drag or horizontal wheel pan; plus and minus zoom; arrows pan; Home resets.',
        format: zoomDateKey,
        onActiveChange,
      }),
    ],
    svgAnimation: false,
    keyboard: false,
    focusRing: false,
    margin: { top: 56, right: 24, bottom: 44, left: 58 },
  })
}

export function zoomStatusLabel(state: ZoomState) {
  return state.active
    ? `${zoomDateKey(state.window.start)} → ${zoomDateKey(state.window.end)} · ${formatSpan(zoomSpanDays(state.window))} days`
    : 'Focus chart to zoom'
}

export function copyWindow(window: ZoomXWindow<Date>): ZoomXWindow<Date> {
  return {
    start: new Date(window.start.getTime()),
    end: new Date(window.end.getTime()),
  }
}

function formatSpan(days: number) {
  return Number.isInteger(days) ? String(days) : days.toFixed(1)
}

export default function ZoomTimeWindowExample({
  width = 640,
  height = 480,
  revision = 0,
}: ExampleProps = {}) {
  const input = { width, height, revision, preview: false, interactive: true }
  const idPrefix = '90-zoomable-time-window'
  const shellRef = useRef<HTMLDivElement>(null)

  const chartRef = useRef<HTMLDivElement>(null)

  const sceneRef = useRef<ChartScene<AaplRow, Date, number>>(null)

  const [accepted, setAccepted] = useState(() => copyWindow(initialZoomWindow))

  const [state, setState] = useState<ZoomState>(() => ({
    window: copyWindow(initialZoomWindow),
    lastAction: 'none',
    active: false,
    wheelCaptured: false,
  }))

  const stateRef = useRef(state)

  stateRef.current = state

  const handleZoomChange = useCallback(
    (next: ZoomXWindow<Date>, reason: ZoomXChange<Date>) => {
      const nextWindow = copyWindow(next)
      const nextState: ZoomState = {
        ...stateRef.current,
        window: nextWindow,
        lastAction: reason.action,
        wheelCaptured:
          stateRef.current.wheelCaptured || reason.source === 'wheel',
      }
      stateRef.current = nextState
      setAccepted(nextWindow)
      setState(nextState)
    },
    [],
  )

  const handleActiveChange = useCallback((active: boolean) => {
    const nextState = { ...stateRef.current, active }
    stateRef.current = nextState
    setState(nextState)
  }, [])

  const definition = useMemo(
    () =>
      zoomTimeWindowDefinition(accepted, handleZoomChange, handleActiveChange),
    [accepted, handleActiveChange, handleZoomChange],
  )

  const reset = () => {
    const nextWindow = copyWindow(initialZoomWindow)
    const nextState: ZoomState = {
      ...stateRef.current,
      window: nextWindow,
      lastAction: 'reset',
    }
    stateRef.current = nextState
    setAccepted(nextWindow)
    setState(nextState)
    chartRef.current
      ?.querySelector<SVGElement>('[data-chart-zoom-surface]')
      ?.focus()
  }

  return (
    <div
      ref={shellRef}
      data-conformance-view="main"
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
          ariaLabel="Time series with a wheel-zoomable and pannable time viewport"
          onRender={({ scene }) => {
            sceneRef.current = scene
          }}
        />
      </div>
      <output
        data-conformance-zoom-status="true"
        role="status"
        aria-live="polite"
        style={{
          position: 'absolute',
          top: 10,
          right: 76,
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
        {zoomStatusLabel(state)}
      </output>
      <button
        type="button"
        data-conformance-zoom-reset="true"
        title="Reset zoom"
        aria-label="Reset zoom"
        onPointerDown={(event) => event.preventDefault()}
        onClick={reset}
        style={{
          position: 'absolute',
          top: 6,
          right: 20,
          zIndex: 4,
          width: 44,
          height: 44,
          border: '1px solid color-mix(in srgb, CanvasText 24%, transparent)',
          borderRadius: 10,
          background: 'Canvas',
          color: 'CanvasText',
          cursor: 'pointer',
          font: '700 20px/1 system-ui, sans-serif',
        }}
      >
        ↺
      </button>
    </div>
  )
}
