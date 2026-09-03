import {
  forwardRef,
  memo,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react'
import { Chart } from '@tanstack/charts/react'
import { reactMount } from '../../shared/react-mount'
import { formatFreeCursorValue } from './format'
import { freeCursorXDomain, freeCursorYDomain } from './model'
import { createDriver } from './tanstack'
import {
  chartHeight,
  clearedCursor,
  cursorControlsHeight,
  cursorState,
  freeCursorDefinition,
  roundedPosition,
} from './example'
import type { ChartScene } from '@tanstack/charts'
import type {
  ContinuousCursorChange,
  ContinuousCursorPosition,
} from '@tanstack/charts/interaction/cursor'
import type { CompleteCar } from './model'
import type { CursorState } from './example'
import type { ConformanceTestDriver } from '../../types'
import type { ReactConformanceProps } from '../../shared/react-mount'

const FreeCursorExample = forwardRef<
  ConformanceTestDriver,
  ReactConformanceProps
>(function FreeCursorExample({ input, idPrefix }, ref) {
  const chartFrameRef = useRef<HTMLDivElement>(null)
  const xRef = useRef<HTMLInputElement>(null)
  const yRef = useRef<HTMLInputElement>(null)
  const sceneRef = useRef<ChartScene<CompleteCar, number, number>>(null)
  const stateRef = useRef<CursorState>(clearedCursor())
  const lastPositionRef = useRef<ContinuousCursorPosition<number, number>>({
    x: (freeCursorXDomain[0] + freeCursorXDomain[1]) / 2,
    y: (freeCursorYDomain[0] + freeCursorYDomain[1]) / 2,
  })
  const renderCountRef = useRef(0)
  const [accepted, setAccepted] = useState<ContinuousCursorPosition<
    number,
    number
  > | null>(null)
  const [state, setState] = useState(clearedCursor)
  stateRef.current = state

  const accept = useCallback(
    (value: ContinuousCursorPosition<number, number> | null) => {
      const next = value ? roundedPosition(value) : null
      if (next) lastPositionRef.current = next
      const nextState = next ? cursorState(next, true) : clearedCursor()
      stateRef.current = nextState
      setAccepted(next)
      setState(nextState)
    },
    [],
  )
  const handleCursorChange = useCallback(
    (
      value: ContinuousCursorPosition<number, number> | null,
      reason: ContinuousCursorChange<number, number>,
    ) => {
      if (reason.type === 'preview') {
        if (value) lastPositionRef.current = roundedPosition(value)
        const nextState = value ? cursorState(value, false) : clearedCursor()
        stateRef.current = nextState
        setState(nextState)
        return
      }
      accept(value)
    },
    [accept],
  )

  useImperativeHandle(ref, () => {
    const surface = chartFrameRef.current
    const x = xRef.current
    const y = yRef.current
    if (!surface || !x || !y) throw new Error('Missing free cursor view')
    return createDriver(
      surface,
      { x, y },
      () => {
        if (!sceneRef.current) throw new Error('Missing free cursor scene')
        return sceneRef.current
      },
      () => stateRef.current,
      () => renderCountRef.current,
    )
  }, [])

  const visible =
    state.visible && state.xValue !== null && state.yValue !== null
  const xValue = visible ? state.xValue! : lastPositionRef.current.x
  const yValue = visible ? state.yValue! : lastPositionRef.current.y
  const status = visible
    ? `${formatFreeCursorValue('HP', xValue)} · ${formatFreeCursorValue(
        'MPG',
        yValue,
      )}${state.pinned ? ' · pinned' : ''}`
    : 'Move the pointer or adjust horsepower and fuel economy'
  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'Escape' || !stateRef.current.visible) return
    event.preventDefault()
    accept(null)
  }

  return (
    <div
      onKeyDown={handleKeyDown}
      style={{
        display: 'grid',
        gridTemplateRows: `${cursorControlsHeight}px minmax(0, 1fr)`,
        width: input.width,
        height: input.height,
      }}
    >
      <div
        role="group"
        aria-label="Free cursor car measurements"
        data-active={String(visible)}
        data-pinned={String(state.pinned)}
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
          gridTemplateRows: '44px 18px',
          alignItems: 'center',
          gap: '2px 14px',
          minHeight: cursorControlsHeight,
          padding: '4px 12px 2px',
          boxSizing: 'border-box',
          borderBottom:
            '1px solid color-mix(in srgb, CanvasText 16%, transparent)',
          background: 'color-mix(in srgb, Canvas 95%, CanvasText 5%)',
          color: 'CanvasText',
          font: '600 11px/1.2 system-ui, sans-serif',
        }}
      >
        <CursorSlider
          ref={xRef}
          label="HP"
          ariaLabel="Horsepower"
          domain={freeCursorXDomain}
          value={xValue}
          onChange={(x) => accept({ x, y: yValue })}
        />
        <CursorSlider
          ref={yRef}
          label="MPG"
          ariaLabel="Fuel economy"
          domain={freeCursorYDomain}
          value={yValue}
          onChange={(y) => accept({ x: xValue, y })}
        />
        <output
          data-conformance-free-cursor-status=""
          aria-live="polite"
          aria-atomic="true"
          style={{
            gridColumn: '1 / -1',
            overflow: 'hidden',
            color: 'currentColor',
            fontWeight: 500,
            opacity: 0.72,
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {status}
        </output>
      </div>
      <div
        ref={chartFrameRef}
        data-conformance-view="main"
        style={{
          minHeight: 0,
          width: input.width,
          height: chartHeight(input.height),
        }}
      >
        <FreeCursorChart
          input={input}
          idPrefix={idPrefix}
          accepted={accepted}
          onChange={handleCursorChange}
          onRender={(scene) => {
            sceneRef.current = scene
            renderCountRef.current += 1
          }}
        />
      </div>
    </div>
  )
})

export const mount = reactMount(FreeCursorExample)

const FreeCursorChart = memo(function FreeCursorChart({
  accepted,
  idPrefix,
  input,
  onChange,
  onRender,
}: {
  accepted: ContinuousCursorPosition<number, number> | null
  idPrefix?: string
  input: ReactConformanceProps['input']
  onChange: Parameters<typeof freeCursorDefinition>[1]
  onRender: (scene: ChartScene<CompleteCar, number, number>) => void
}) {
  const definition = useMemo(
    () => freeCursorDefinition(accepted, onChange),
    [accepted, onChange],
  )
  return (
    <Chart
      idPrefix={idPrefix}
      definition={definition}
      width={input.width}
      height={chartHeight(input.height)}
      ariaLabel="Line chart with a free two-dimensional cursor"
      ariaDescription="Move across the plot to inspect arbitrary horsepower and fuel-economy coordinates. Select to pin the cursor; press Escape to clear it."
      onRender={({ scene }) => onRender(scene)}
    />
  )
})

const CursorSlider = forwardRef<
  HTMLInputElement,
  {
    ariaLabel: string
    domain: readonly [number, number]
    label: string
    onChange: (value: number) => void
    value: number
  }
>(function CursorSlider({ ariaLabel, domain, label, onChange, value }, ref) {
  return (
    <label
      style={{
        display: 'grid',
        gridTemplateColumns: '14px minmax(0, 1fr)',
        alignItems: 'center',
        gap: 5,
        minWidth: 0,
      }}
    >
      <span>{label}</span>
      <input
        ref={ref}
        type="range"
        min={domain[0]}
        max={domain[1]}
        step={0.1}
        value={value}
        aria-label={ariaLabel}
        aria-valuetext={formatFreeCursorValue(ariaLabel, value)}
        onChange={(event) => onChange(Number(event.currentTarget.value))}
        style={{
          width: '100%',
          minWidth: 0,
          height: 44,
          margin: 0,
          accentColor: '#0f766e',
        }}
      />
    </label>
  )
})
