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
import { initialZoomWindow } from './model'
import { createDriver } from './tanstack'
import {
  copyWindow,
  zoomStatusLabel,
  zoomTimeWindowDefinition,
} from './example'
import type { AaplRow } from '@charts-poc/demo-data/aapl'
import type { ChartScene } from '@tanstack/charts'
import type {
  ZoomXChange,
  ZoomXWindow,
} from '@tanstack/charts/interaction/zoom'
import type { ReactConformanceProps } from '../../shared/react-mount'
import type { ConformanceTestDriver } from '../../types'
import type { ZoomState } from './example'

const ZoomTimeWindowExample = forwardRef<
  ConformanceTestDriver,
  ReactConformanceProps
>(function ZoomTimeWindowExample({ input, idPrefix }, ref) {
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

  useImperativeHandle(ref, () => {
    const shell = shellRef.current
    const chart = chartRef.current
    if (!shell || !chart) throw new Error('Missing zoom time window view')
    return createDriver(
      shell,
      chart,
      () => {
        if (!sceneRef.current) throw new Error('Missing zoom time window scene')
        return sceneRef.current
      },
      () => stateRef.current,
    )
  }, [])

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
})

export const mount = reactMount(ZoomTimeWindowExample)
