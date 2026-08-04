import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'
import { crosshair, defineChart, dot, lineY } from '@tanstack/charts'
import { createChartCursor } from '@tanstack/charts/cursor'
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
import type { ChartCursorState, ChartScene } from '@tanstack/charts'
import type { CompleteCar } from './model'
import type {
  ConformanceGeometryQuery,
  ConformanceGeometrySample,
  ConformanceJsonObject,
  ConformanceTarget,
  ConformanceTestDriver,
} from '../../types'
import type { ReactConformanceProps } from '../../shared/react-mount'

const configuredXScale = scaleLinear().domain(freeCursorXDomain)
const configuredYScale = scaleLinear().domain(freeCursorYDomain)
const rows = freeCursorRows(cars)

const FreeCursorExample = forwardRef<
  ConformanceTestDriver,
  ReactConformanceProps
>(function FreeCursorExample({ input, idPrefix }, ref) {
  const surfaceRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<ChartScene<CompleteCar> | null>(null)
  const renderCountRef = useRef(0)
  const cursor = useMemo(() => createChartCursor<number, number>(), [])
  const cursorState = useSyncExternalStore(
    cursor.subscribe,
    cursor.getState,
    cursor.getState,
  )
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
            crosshair<number, number>({
              id: 'free-cursor-crosshair',
              stroke: '#64748b',
              strokeWidth: 1,
              strokeDasharray: '4 4',
              x: {
                label: {
                  format: (value) => formatCursorValue('HP', value),
                  fontSize: 10,
                },
              },
              y: {
                label: {
                  format: (value) => formatCursorValue('MPG', value),
                  fontSize: 10,
                },
              },
              marker: {
                radius: 4,
                fill: '#ffffff',
                stroke: '#0f766e',
                strokeWidth: 2,
              },
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
          cursor: {
            controller: cursor,
            mode: 'free',
            pin: true,
            x: {
              valueAt: ({ scene, position }) =>
                roundCursorValue(
                  configuredXScale
                    .copy()
                    .range([scene.chart.x, scene.chart.x + scene.chart.width])
                    .invert(position),
                ),
            },
            y: {
              valueAt: ({ scene, position }) =>
                roundCursorValue(
                  configuredYScale
                    .copy()
                    .range([scene.chart.y + scene.chart.height, scene.chart.y])
                    .invert(position),
                ),
            },
          },
        },
      ),
    [cursor],
  )

  useEffect(() => {
    const x = cursorState?.value?.x
    const y = cursorState?.value?.y
    if (x !== undefined && y !== undefined) setControls({ x, y })
  }, [cursorState])

  const setFromValues = (xValue: number, yValue: number) => {
    setControls({ x: xValue, y: yValue })
    cursor.setState({
      anchor: 'value',
      value: { x: xValue, y: yValue },
      source: 'programmatic',
      pinned: true,
    })
  }

  useImperativeHandle(
    ref,
    () => ({
      resolveTarget(target) {
        return resolveTarget(surfaceRef.current, sceneRef.current, target)
      },
      readState() {
        return interactionState(
          surfaceRef.current,
          cursor.getState(),
          renderCountRef.current,
        )
      },
      geometry(query) {
        return geometry(surfaceRef.current, sceneRef.current, query)
      },
    }),
    [cursor],
  )

  const displayX = controls.x
  const displayY = controls.y
  const chartHeight = Math.max(180, input.height - 68)

  if (input.preview) {
    return (
      <Chart
        idPrefix={idPrefix}
        definition={definition}
        initialWidth={input.width}
        aspectRatio={input.width / input.height}
        ariaLabel="Line chart with a free two-dimensional cursor"
      />
    )
  }

  return (
    <div
      onKeyDown={(event) => {
        if (event.key !== 'Escape' || !cursor.getState()) return
        event.preventDefault()
        cursor.setState(null)
      }}
      style={{
        display: 'grid',
        gridTemplateRows: '68px minmax(0, 1fr)',
        width: input.width,
        height: input.height,
      }}
    >
      <CursorControls
        cursor={cursorState}
        x={displayX}
        y={displayY}
        onChange={setFromValues}
      />
      <div
        ref={surfaceRef}
        data-conformance-view="main"
        style={{
          position: 'relative',
          width: input.width,
          height: chartHeight,
        }}
      >
        <Chart
          idPrefix={idPrefix}
          definition={definition}
          width={input.width}
          height={chartHeight}
          ariaLabel="Line chart with a free two-dimensional cursor"
          onRender={({ scene: nextScene }) => {
            renderCountRef.current += 1
            sceneRef.current = nextScene
          }}
        />
      </div>
    </div>
  )
})

export const catalogComponent = FreeCursorExample
export const mount = reactMount(FreeCursorExample)

function CursorControls({
  cursor,
  onChange,
  x,
  y,
}: {
  cursor: ChartCursorState<number, number> | null
  onChange: (x: number, y: number) => void
  x: number
  y: number
}) {
  const status = cursor
    ? `${formatCursorValue('HP', x)} · ${formatCursorValue('MPG', y)}${cursor.pinned ? ' · pinned' : ''}`
    : 'Move the pointer or adjust horsepower and fuel economy'
  return (
    <div
      role="group"
      aria-label="Free cursor car measurements"
      data-active={Boolean(cursor)}
      data-pinned={cursor?.pinned ?? false}
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
  surface: HTMLDivElement | null,
  cursor: ChartCursorState<number, number> | null,
  renderCount: number,
): ConformanceJsonObject {
  const xRule = surface?.querySelector<SVGLineElement>(
    '[data-ts-key="free-cursor-crosshair:x-rule"]',
  )
  const layer = xRule?.closest<SVGGElement>('[data-ts-focus-guide-layer]')
  return {
    cursor: {
      visible: Boolean(
        cursor && xRule && layer?.getAttribute('visibility') !== 'hidden',
      ),
      xNormalized: cursor?.normalized?.x ?? null,
      yNormalized: cursor?.normalized?.y ?? null,
      xValue: cursor?.value?.x ?? null,
      yValue: cursor?.value?.y ?? null,
      pinned: cursor?.pinned ?? false,
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
