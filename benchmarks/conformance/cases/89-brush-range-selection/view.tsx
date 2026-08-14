import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react'
import { Chart } from '@tanstack/charts/react'
import { reactMount } from '../../shared/react-mount'
import { initialBrushRange, observedBrushDates, monthlyAaplRows } from './model'
import { aapl } from '@charts-poc/demo-data/aapl'
import { createDriver } from './tanstack'
import { brushRangeDefinition, brushRangeStatus, copyRange } from './example'
import type { ChartScene } from '@tanstack/charts'
import type {
  BrushRange,
  BrushXChange,
} from '@tanstack/charts/interaction/brush'
import type { AaplRow } from '@charts-poc/demo-data/aapl'
import type { BrushState } from './example'
import type { ConformanceTestDriver } from '../../types'
import type { ReactConformanceProps } from '../../shared/react-mount'

const initialRange = initialBrushRange(
  observedBrushDates(monthlyAaplRows(aapl)),
)

const BrushRangeExample = forwardRef<
  ConformanceTestDriver,
  ReactConformanceProps
>(function BrushRangeExample({ input, idPrefix }, ref) {
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

  useImperativeHandle(ref, () => {
    const shell = shellRef.current
    const chart = chartRef.current
    if (!shell || !chart) throw new Error('Missing brush range view')
    return createDriver(
      shell,
      chart,
      () => {
        if (!sceneRef.current) throw new Error('Missing brush range scene')
        return sceneRef.current
      },
      () => stateRef.current,
    )
  }, [])

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
})

export const mount = reactMount(BrushRangeExample)
