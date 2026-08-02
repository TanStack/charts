import {
  forwardRef,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react'
import { defineChart, dot, lineY } from '@tanstack/charts'
import { focusDisabled } from '@tanstack/charts/focus/disabled'
import { Chart } from '@tanstack/react-charts'
import { cars } from '@charts-poc/demo-data/cars'
import { scaleLinear } from 'd3-scale'
import { reactMount } from '../../shared/react-mount'
import {
  freeCursorFractionFromAnchor,
  freeCursorRows,
  freeCursorXDomain,
  freeCursorYDomain,
} from './model'
import type { ChartScene } from '@tanstack/charts'
import type { CompleteCar } from './model'
import type {
  ConformanceGeometryQuery,
  ConformanceGeometrySample,
  ConformanceJsonObject,
  ConformanceTarget,
  ConformanceTestDriver,
} from '../../types'
import type { ReactConformanceProps } from '../../shared/react-mount'

interface CursorState {
  visible: boolean
  xNormalized: number | null
  yNormalized: number | null
  xValue: number | null
  yValue: number | null
  pinned: boolean
}

const clearedCursor: CursorState = {
  visible: false,
  xNormalized: null,
  yNormalized: null,
  xValue: null,
  yValue: null,
  pinned: false,
}

const configuredXScale = scaleLinear().domain(freeCursorXDomain)
const configuredYScale = scaleLinear().domain(freeCursorYDomain)
const rows = freeCursorRows(cars)

const FreeCursorExample = forwardRef<
  ConformanceTestDriver,
  ReactConformanceProps
>(function FreeCursorExample({ input }, ref) {
  const surfaceRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<ChartScene<CompleteCar> | null>(null)
  const cursorRef = useRef<CursorState>(clearedCursor)
  const renderCountRef = useRef(0)
  const [scene, setScene] = useState<ChartScene<CompleteCar> | null>(null)
  const [cursor, setCursorState] = useState<CursorState>(clearedCursor)
  const [controls, setControls] = useState({
    x: midpoint(freeCursorXDomain),
    y: midpoint(freeCursorYDomain),
  })
  const definition = useMemo(
    () =>
      defineChart(
        defineChart({
          marks: [
            lineY(rows, {
              x: 'power (hp)',
              y: 'economy (mpg)',
              stroke: '#0f766e',
              strokeWidth: 2,
            }),
            dot(rows, {
              x: 'power (hp)',
              y: 'economy (mpg)',
              fill: '#0f766e',
              r: 3.5,
              stroke: '#ffffff',
              strokeWidth: 1,
            }),
          ],
          x: {
            scale: configuredXScale,
            axis: { label: 'Horsepower' },
          },
          y: {
            scale: configuredYScale,
            grid: true,
            axis: { ticks: { count: 7 }, label: 'Fuel economy (mpg)' },
          },
          margin: { top: 22, right: 24, bottom: 44, left: 58 },
        }),
        {
          animate: false,
          keyboard: false,
          focus: focusDisabled,
        },
      ),
    [],
  )

  const setCursor = (next: CursorState) => {
    cursorRef.current = next
    setCursorState(next)
    if (next.visible && next.xValue !== null && next.yValue !== null) {
      setControls({ x: next.xValue, y: next.yValue })
    }
  }
  const setFromValues = (xValue: number, yValue: number) => {
    setCursor({
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
      pinned: true,
    })
  }
  const handlePointer = (clientX: number, clientY: number) => {
    if (cursorRef.current.pinned) return
    const currentScene = sceneRef.current
    const surface = surfaceRef.current
    const svg = surface?.querySelector<SVGSVGElement>('svg.ts-chart')
    if (!currentScene || !svg) return
    const bounds = svg.getBoundingClientRect()
    const sceneX = ((clientX - bounds.left) / bounds.width) * currentScene.width
    const sceneY =
      ((clientY - bounds.top) / bounds.height) * currentScene.height
    if (
      sceneX < currentScene.chart.x ||
      sceneX > currentScene.chart.x + currentScene.chart.width ||
      sceneY < currentScene.chart.y ||
      sceneY > currentScene.chart.y + currentScene.chart.height
    ) {
      setCursor(clearedCursor)
      return
    }
    setCursor({
      visible: true,
      xNormalized: (sceneX - currentScene.chart.x) / currentScene.chart.width,
      yNormalized: (sceneY - currentScene.chart.y) / currentScene.chart.height,
      xValue: roundCursorValue(
        configuredXScale
          .copy()
          .range([
            currentScene.chart.x,
            currentScene.chart.x + currentScene.chart.width,
          ])
          .invert(sceneX),
      ),
      yValue: roundCursorValue(
        configuredYScale
          .copy()
          .range([
            currentScene.chart.y + currentScene.chart.height,
            currentScene.chart.y,
          ])
          .invert(sceneY),
      ),
      pinned: false,
    })
  }

  useImperativeHandle(
    ref,
    () => ({
      resolveTarget(target) {
        return resolveTarget(surfaceRef.current, sceneRef.current, target)
      },
      readState() {
        return interactionState(cursorRef.current, renderCountRef.current)
      },
      geometry(query) {
        return geometry(surfaceRef.current, sceneRef.current, query)
      },
    }),
    [],
  )

  const displayX = controls.x
  const displayY = controls.y
  const chartHeight = Math.max(180, input.height - 68)
  const x =
    scene && cursor.visible && cursor.xNormalized !== null
      ? scene.chart.x + scene.chart.width * cursor.xNormalized
      : null
  const y =
    scene && cursor.visible && cursor.yNormalized !== null
      ? scene.chart.y + scene.chart.height * cursor.yNormalized
      : null

  return (
    <div
      onKeyDown={(event) => {
        if (event.key !== 'Escape' || !cursorRef.current.visible) return
        event.preventDefault()
        setCursor(clearedCursor)
      }}
      style={{
        display: 'grid',
        gridTemplateRows: '68px minmax(0, 1fr)',
        width: input.width,
        height: input.height,
      }}
    >
      <CursorControls
        cursor={cursor}
        x={displayX}
        y={displayY}
        onChange={setFromValues}
      />
      <div
        ref={surfaceRef}
        data-conformance-view="main"
        onPointerMove={(event) => handlePointer(event.clientX, event.clientY)}
        onPointerDown={(event) => handlePointer(event.clientX, event.clientY)}
        onMouseLeave={() => {
          if (!cursorRef.current.pinned) setCursor(clearedCursor)
        }}
        onPointerCancel={() => {
          if (!cursorRef.current.pinned) setCursor(clearedCursor)
        }}
        onClick={() => {
          const current = cursorRef.current
          if (!current.visible) return
          setCursor(
            current.pinned ? clearedCursor : { ...current, pinned: true },
          )
        }}
        style={{
          position: 'relative',
          width: input.width,
          height: chartHeight,
        }}
      >
        <Chart
          definition={definition}
          width={input.width}
          height={chartHeight}
          ariaLabel="Line chart with a free two-dimensional cursor"
          onRender={({ scene: nextScene }) => {
            renderCountRef.current += 1
            sceneRef.current = nextScene
            setScene(nextScene)
          }}
        />
        {scene ? (
          <CursorOverlay scene={scene} cursor={cursor} x={x} y={y} />
        ) : null}
      </div>
    </div>
  )
})

export const mount = reactMount(FreeCursorExample)

function CursorControls({
  cursor,
  onChange,
  x,
  y,
}: {
  cursor: CursorState
  onChange: (x: number, y: number) => void
  x: number
  y: number
}) {
  const status = cursor.visible
    ? `${formatCursorValue('HP', x)} · ${formatCursorValue('MPG', y)}${cursor.pinned ? ' · pinned' : ''}`
    : 'Move the pointer or adjust horsepower and fuel economy'
  return (
    <div
      role="group"
      aria-label="Free cursor car measurements"
      data-active={cursor.visible}
      data-pinned={cursor.pinned}
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
        gridTemplateRows: '44px 18px',
        alignItems: 'center',
        gap: '2px 14px',
        minHeight: 68,
        padding: '4px 12px 2px',
        boxSizing: 'border-box',
        borderBottom:
          '1px solid color-mix(in srgb, CanvasText 16%, transparent)',
        background: 'color-mix(in srgb, Canvas 95%, CanvasText 5%)',
        color: 'CanvasText',
        font: '600 11px/1.2 system-ui, sans-serif',
      }}
    >
      <CoordinateSlider
        label="HP"
        ariaLabel="Horsepower"
        domain={freeCursorXDomain}
        value={x}
        onChange={(value) => onChange(value, y)}
      />
      <CoordinateSlider
        label="MPG"
        ariaLabel="Fuel economy"
        domain={freeCursorYDomain}
        value={y}
        onChange={(value) => onChange(x, value)}
      />
      <output
        data-conformance-free-cursor-status
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
  )
}

function CoordinateSlider({
  ariaLabel,
  domain,
  label,
  onChange,
  value,
}: {
  ariaLabel: string
  domain: readonly [number, number]
  label: string
  onChange: (value: number) => void
  value: number
}) {
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
        type="range"
        min={domain[0]}
        max={domain[1]}
        step={0.1}
        value={value}
        aria-label={ariaLabel}
        aria-valuetext={formatCursorValue(ariaLabel, value)}
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
}

function CursorOverlay({
  cursor,
  scene,
  x,
  y,
}: {
  cursor: CursorState
  scene: ChartScene<CompleteCar>
  x: number | null
  y: number | null
}) {
  if (x === null || y === null) return null
  return (
    <>
      <svg
        data-conformance-overlay="free-cursor"
        aria-hidden="true"
        viewBox={`0 0 ${scene.width} ${scene.height}`}
        style={overlayStyle}
      >
        <line
          data-conformance-crosshair="x"
          x1={x}
          x2={x}
          y1={scene.chart.y}
          y2={scene.chart.y + scene.chart.height}
          stroke="#64748b"
          strokeWidth={1}
          strokeDasharray="4 4"
        />
        <line
          data-conformance-crosshair="y"
          x1={scene.chart.x}
          x2={scene.chart.x + scene.chart.width}
          y1={y}
          y2={y}
          stroke="#64748b"
          strokeWidth={1}
          strokeDasharray="4 4"
        />
        <circle
          data-conformance-crosshair="marker"
          cx={x}
          cy={y}
          r={4}
          fill="#ffffff"
          stroke="#0f766e"
          strokeWidth={2}
        />
      </svg>
      <CursorBadge
        axis="x"
        value={formatCursorValue('HP', cursor.xValue)}
        left={`${(x / scene.width) * 100}%`}
        top={`${((scene.chart.y + scene.chart.height + 4) / scene.height) * 100}%`}
      />
      <CursorBadge
        axis="y"
        value={formatCursorValue('MPG', cursor.yValue)}
        left={`${Math.max(2, scene.chart.x - 48)}px`}
        top={`${(y / scene.height) * 100}%`}
      />
    </>
  )
}

function CursorBadge({
  axis,
  left,
  top,
  value,
}: {
  axis: 'x' | 'y'
  left: string
  top: string
  value: string
}) {
  return (
    <div
      data-conformance-cursor-badge={axis}
      style={{
        position: 'absolute',
        zIndex: 2,
        left,
        top,
        padding: '2px 5px',
        borderRadius: 4,
        background: 'CanvasText',
        color: 'Canvas',
        font: '600 10px/1.2 system-ui, sans-serif',
        pointerEvents: 'none',
        transform: axis === 'x' ? 'translateX(-50%)' : 'translateY(-50%)',
        whiteSpace: 'nowrap',
      }}
    >
      {value}
    </div>
  )
}

const overlayStyle = {
  position: 'absolute',
  inset: 0,
  width: '100%',
  height: '100%',
  overflow: 'visible',
  pointerEvents: 'none',
} as const

function resolveTarget(
  surface: HTMLDivElement | null,
  scene: ChartScene<CompleteCar> | null,
  target: ConformanceTarget,
) {
  if (!surface || (target.view !== undefined && target.view !== 'main')) {
    return null
  }
  const control =
    target.anchor === 'control:x'
      ? surface.parentElement?.querySelector<HTMLInputElement>(
          'input[aria-label="Horsepower"]',
        )
      : target.anchor === 'control:y'
        ? surface.parentElement?.querySelector<HTMLInputElement>(
            'input[aria-label="Fuel economy"]',
          )
        : null
  if (control) {
    const bounds = control.getBoundingClientRect()
    return {
      x: bounds.left + bounds.width / 2,
      y: bounds.top + bounds.height / 2,
      focusElement: control,
    }
  }
  const fraction = freeCursorFractionFromAnchor(target.anchor)
  if (!scene || !fraction) return null
  return scenePointToClient(
    surface,
    scene,
    scene.chart.x + scene.chart.width * fraction.x,
    scene.chart.y + scene.chart.height * fraction.y,
  )
}

function geometry(
  surface: HTMLDivElement | null,
  scene: ChartScene<CompleteCar> | null,
  query: ConformanceGeometryQuery,
): readonly ConformanceGeometrySample[] {
  if (!surface || (query.view !== undefined && query.view !== 'main')) {
    return []
  }
  const svg = surface.querySelector<SVGSVGElement>('svg.ts-chart')
  if (!scene || !svg) return []
  const svgBounds = svg.getBoundingClientRect()
  const scaleX = svgBounds.width / scene.width
  const scaleY = svgBounds.height / scene.height
  if (query.role === 'dot') {
    return rows.map((datum) => ({
      x:
        svgBounds.left +
        scene.scales.x.map(datum['power (hp)']) * scaleX -
        3.5 * scaleX,
      y:
        svgBounds.top +
        scene.scales.y.map(datum['economy (mpg)']) * scaleY -
        3.5 * scaleY,
      width: 7 * scaleX,
      height: 7 * scaleY,
      paint: '#0f766e',
    }))
  }
  if (query.role !== 'line') return []
  const points = rows.map((datum): readonly [number, number] => [
    scene.scales.x.map(datum['power (hp)']),
    scene.scales.y.map(datum['economy (mpg)']),
  ])
  const sample = pointsBounds(points, svgBounds, scaleX, scaleY, '#0f766e')
  return sample ? [sample] : []
}

function scenePointToClient(
  surface: HTMLDivElement,
  scene: ChartScene<CompleteCar>,
  x: number,
  y: number,
) {
  const svg = surface.querySelector<SVGSVGElement>('svg.ts-chart')
  if (!svg) return null
  const bounds = svg.getBoundingClientRect()
  return {
    x: bounds.left + (x / scene.width) * bounds.width,
    y: bounds.top + (y / scene.height) * bounds.height,
    focusElement: svg,
  }
}

function pointsBounds(
  points: readonly (readonly [number, number])[],
  bounds: DOMRect,
  scaleX: number,
  scaleY: number,
  paint: string,
): ConformanceGeometrySample | null {
  if (!points.length) return null
  const xs = points.map(([x]) => x)
  const ys = points.map(([, y]) => y)
  const left = Math.min(...xs)
  const right = Math.max(...xs)
  const top = Math.min(...ys)
  const bottom = Math.max(...ys)
  return {
    x: bounds.left + left * scaleX,
    y: bounds.top + top * scaleY,
    width: Math.max(1, (right - left) * scaleX),
    height: Math.max(1, (bottom - top) * scaleY),
    paint,
  }
}

function interactionState(
  cursor: CursorState,
  renderCount: number,
): ConformanceJsonObject {
  return {
    cursor: {
      visible: cursor.visible,
      xNormalized: cursor.xNormalized,
      yNormalized: cursor.yNormalized,
      xValue: cursor.xValue,
      yValue: cursor.yValue,
      pinned: cursor.pinned,
      snapped: false,
      datum: null,
    },
    render: { count: renderCount },
  }
}

function formatCursorValue(axis: string, value: number | null) {
  return `${axis} ${
    value?.toLocaleString(undefined, { maximumFractionDigits: 1 }) ?? '—'
  }`
}

function roundCursorValue(value: number) {
  return Math.round(value * 10) / 10
}

function midpoint(domain: readonly [number, number]) {
  return (domain[0] + domain[1]) / 2
}
