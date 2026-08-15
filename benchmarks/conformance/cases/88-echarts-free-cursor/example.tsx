import { forwardRef, memo, useCallback, useMemo, useRef, useState } from 'react'
import { Chart } from '@tanstack/charts/react'
import type { KeyboardEvent } from 'react'
import { formatFreeCursorValue } from './format'
import { freeCursorXDomain, freeCursorYDomain } from './model'
import type { ChartScene } from '@tanstack/charts'
import type {
  ContinuousCursorChange,
  ContinuousCursorPosition,
} from '@tanstack/charts/interaction/cursor'
import type { CompleteCar } from './model'
import { cars } from '@tanstack/charts-data/cars'
import { defineChart, dot, lineY } from '@tanstack/charts'
import { continuousCursor } from '@tanstack/charts/interaction/cursor'
import { controlledSignal } from '@tanstack/charts/interaction/signal'
import { decorative } from '@tanstack/charts/mark/decorative'
import { scaleLinear } from 'd3-scale'
import { freeCursorRows } from './model'
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

const FreeCursorChart = memo(function FreeCursorChart({
  accepted,
  idPrefix,
  input,
  onChange,
  onRender,
}: {
  accepted: ContinuousCursorPosition<number, number> | null
  idPrefix?: string
  input: { width: number; height: number }
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

export interface ExampleProps {
  width?: number
  height?: number
  revision?: number
}

export interface CursorState {
  visible: boolean
  xNormalized: number | null
  yNormalized: number | null
  xValue: number | null
  yValue: number | null
  pinned: boolean
}

export const cursorControlsHeight = 68

export function cursorState(
  position: ContinuousCursorPosition<number, number>,
  pinned: boolean,
): CursorState {
  const xValue = roundCursorValue(position.x)
  const yValue = roundCursorValue(position.y)
  return {
    visible: true,
    xNormalized:
      (xValue - freeCursorXDomain[0]) /
      (freeCursorXDomain[1] - freeCursorXDomain[0]),
    yNormalized:
      1 -
      (yValue - freeCursorYDomain[0]) /
        (freeCursorYDomain[1] - freeCursorYDomain[0]),
    xValue,
    yValue,
    pinned,
  }
}

export function clearedCursor(): CursorState {
  return {
    visible: false,
    xNormalized: null,
    yNormalized: null,
    xValue: null,
    yValue: null,
    pinned: false,
  }
}

export function roundedPosition(
  position: ContinuousCursorPosition<number, number>,
): ContinuousCursorPosition<number, number> {
  return {
    x: roundCursorValue(position.x),
    y: roundCursorValue(position.y),
  }
}

function roundCursorValue(value: number) {
  return Math.round(value * 10) / 10
}

export function chartHeight(height: number) {
  return Math.max(180, height - cursorControlsHeight)
}

const rows = freeCursorRows(cars)

export function freeCursorDefinition(
  position: ContinuousCursorPosition<number, number> | null,
  onChange: (
    value: ContinuousCursorPosition<number, number> | null,
    reason: ContinuousCursorChange<number, number>,
  ) => void,
  preview = false,
) {
  return defineChart({
    marks: [
      decorative(
        lineY(rows, {
          id: 'free-cursor-line',
          x: 'power (hp)',
          y: 'economy (mpg)',
          stroke: '#0f766e',
          strokeWidth: 2,
        }),
      ),
      dot(rows, {
        id: 'free-cursor-dots',
        x: 'power (hp)',
        y: 'economy (mpg)',
        fill: '#0f766e',
        r: 3.5,
        stroke: '#ffffff',
        strokeWidth: 1,
      }),
    ],
    x: {
      scale: scaleLinear().domain(freeCursorXDomain),
      axis: { label: 'Horsepower' },
    },
    y: {
      scale: scaleLinear().domain(freeCursorYDomain),
      grid: true,
      axis: { ticks: { count: 7 }, label: 'Fuel economy (mpg)' },
    },
    controls: [
      continuousCursor({
        position: controlledSignal<
          ContinuousCursorPosition<number, number> | null,
          ContinuousCursorChange<number, number>
        >(position, (next, { reason }) => onChange(next, reason)),
        xRule: {
          stroke: '#64748b',
          strokeWidth: 1,
          strokeDasharray: '4 4',
        },
        yRule: {
          stroke: '#64748b',
          strokeWidth: 1,
          strokeDasharray: '4 4',
        },
        marker: {
          radius: 4,
          fill: '#ffffff',
          stroke: '#0f766e',
          strokeWidth: 2,
        },
        xLabel: {
          format: (value) =>
            formatFreeCursorValue('HP', roundCursorValue(value)),
          ...(preview
            ? {
                offset: 2,
                paddingX: 3,
                paddingY: 2,
                fontSize: 8,
                color: 'Canvas',
                background: 'CanvasText',
                stroke: 'Canvas',
              }
            : {}),
        },
        yLabel: {
          side: 'start',
          format: (value) =>
            formatFreeCursorValue('MPG', roundCursorValue(value)),
          ...(preview
            ? {
                offset: 2,
                paddingX: 3,
                paddingY: 2,
                fontSize: 8,
                color: 'Canvas',
                background: 'CanvasText',
                stroke: 'Canvas',
              }
            : {}),
        },
      }),
    ],
    svgAnimation: false,
    keyboard: false,
    focusRing: false,
    margin: preview
      ? { top: 0, right: 0, bottom: 14, left: 40 }
      : { top: 22, right: 24, bottom: 44, left: 58 },
  })
}

export default function FreeCursorExample({
  width = 640,
  height = 480,
  revision = 0,
}: ExampleProps = {}) {
  const input = { width, height, revision, preview: false, interactive: true }
  const idPrefix = '88-echarts-free-cursor'
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
}
