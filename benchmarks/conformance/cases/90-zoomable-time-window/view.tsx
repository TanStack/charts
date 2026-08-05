import {
  forwardRef,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { defineChart, dot, lineY } from '@tanstack/charts'
import { focusDisabled } from '@tanstack/charts/focus/disabled'
import { Chart } from '@tanstack/react-charts'
import { aapl } from '@charts-poc/demo-data/aapl'
import { scaleLinear, scaleUtc } from 'd3-scale'
import { select } from 'd3-selection'
import { zoom, zoomIdentity } from 'd3-zoom'
import { reactMount } from '../../shared/react-mount'
import {
  initialZoomWindow,
  selectZoomRows,
  visibleZoomData,
  visibleZoomDataWithNeighbors,
  zoomDateFromAnchor,
  zoomDateKey,
  zoomFullDomain,
  zoomSpanDays,
} from './model'
import type { ChartScene } from '@tanstack/charts'
import type { AaplRow } from '@charts-poc/demo-data/aapl'
import type { D3ZoomEvent, ZoomTransform } from 'd3-zoom'
import type { ZoomWindow } from './model'
import type {
  ConformanceGeometryQuery,
  ConformanceGeometrySample,
  ConformanceJsonObject,
  ConformanceTarget,
  ConformanceTestDriver,
} from '../../types'
import type { ReactConformanceProps } from '../../shared/react-mount'

interface ZoomState {
  window: ZoomWindow
  lastAction: 'none' | 'zoom' | 'pan' | 'reset'
  active: boolean
  wheelCaptured: boolean
}

interface ZoomController {
  sync: () => void
  reset: () => void
  destroy: () => void
}

const color = '#0f766e'
const zoomScale = scaleUtc().domain(zoomFullDomain)
const zoomRows = selectZoomRows(aapl)

const ZoomableTimeWindowExample = forwardRef<
  ConformanceTestDriver,
  ReactConformanceProps
>(function ZoomableTimeWindowExample({ input, idPrefix }, ref) {
  const surfaceRef = useRef<HTMLDivElement>(null)
  const interactionRef = useRef<SVGRectElement>(null)
  const sceneRef = useRef<ChartScene<AaplRow> | null>(null)
  const controllerRef = useRef<ZoomController | null>(null)
  const stateRef = useRef<ZoomState>({
    window: { ...initialZoomWindow },
    lastAction: 'none',
    active: false,
    wheelCaptured: false,
  })
  const [state, setState] = useState(stateRef.current)
  const [scene, setScene] = useState<ChartScene<AaplRow> | null>(null)
  const visibleRows = visibleZoomData(zoomRows, state.window)
  const lineRows = visibleZoomDataWithNeighbors(zoomRows, state.window)
  const definition = useMemo(
    () =>
      defineChart(
        defineChart({
          marks: [
            lineY(lineRows, {
              x: 'Date',
              y: 'Close',
              stroke: color,
              strokeWidth: 2.5,
            }),
            dot(visibleRows, {
              x: 'Date',
              y: 'Close',
              fill: color,
              r: 3.5,
              stroke: '#ffffff',
              strokeWidth: 1,
            }),
          ],
          x: {
            scale: scaleForWindow(state.window),
            axis: {
              ticks: {
                format: (value) =>
                  value.toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    timeZone: 'UTC',
                  }),
              },
              label: 'Date',
            },
          },
          y: {
            scale: scaleLinear,
            grid: true,
            axis: { ticks: { count: 4 }, label: 'AAPL close ($)' },
          },
          clip: true,
          margin: { top: 56, right: 24, bottom: 44, left: 58 },
        }),
        { animate: false, keyboard: false, focus: focusDisabled },
      ),
    [state.window.start, state.window.end],
  )
  const ready = scene !== null

  useLayoutEffect(() => {
    const interaction = interactionRef.current
    if (!interaction || !ready) return
    const controller = createZoomController(
      interaction,
      () => sceneRef.current,
      stateRef,
      () => setState({ ...stateRef.current }),
    )
    controllerRef.current = controller
    controller.sync()
    return () => {
      controller.destroy()
      if (controllerRef.current === controller) controllerRef.current = null
    }
  }, [ready])

  useImperativeHandle(
    ref,
    () => ({
      resolveTarget(target) {
        const surface = surfaceRef.current
        const currentScene = sceneRef.current
        return surface && currentScene
          ? resolveTarget(surface, currentScene, target)
          : null
      },
      readState() {
        return interactionState(stateRef.current)
      },
      geometry(query) {
        const surface = surfaceRef.current
        const currentScene = sceneRef.current
        return surface && currentScene
          ? zoomGeometry(surface, currentScene, stateRef.current.window, query)
          : []
      },
    }),
    [],
  )

  const status = state.active
    ? `${zoomDateKey(state.window.start)} → ${zoomDateKey(state.window.end)} · ${formatSpan(zoomSpanDays(state.window))} days`
    : 'Focus chart to zoom'

  if (input.preview) {
    return (
      <Chart
        idPrefix={idPrefix}
        definition={definition}
        initialWidth={input.width}
        aspectRatio={input.width / input.height}
        ariaLabel="Time series with a wheel-zoomable and pannable time viewport"
      />
    )
  }

  return (
    <div
      ref={surfaceRef}
      data-conformance-view="main"
      style={{ position: 'relative', width: input.width, height: input.height }}
    >
      <Chart
        idPrefix={idPrefix}
        definition={definition}
        width={input.width}
        height={input.height}
        ariaLabel="Time series with a wheel-zoomable and pannable time viewport"
        onRender={({ scene: nextScene }) => {
          sceneRef.current = nextScene
          setScene(nextScene)
          controllerRef.current?.sync()
        }}
      />
      {scene ? (
        <svg
          data-conformance-overlay="zoom"
          viewBox={`0 0 ${scene.width} ${scene.height}`}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            overflow: 'hidden',
            pointerEvents: 'none',
          }}
        >
          <rect
            ref={interactionRef}
            data-conformance-zoom-surface="true"
            data-zoom-active={state.active}
            x={scene.chart.x}
            y={scene.chart.y}
            width={scene.chart.width}
            height={scene.chart.height}
            fill="transparent"
            tabIndex={0}
            role="application"
            aria-label="Zoomable time window. Focus the chart before wheel zoom; drag or use a horizontal wheel to pan; use plus, minus, arrow keys, or Home."
            aria-description={`${status}. Wheel zoom; drag or horizontal wheel pan; plus and minus zoom; arrows pan; Home resets.`}
            aria-keyshortcuts="ArrowLeft ArrowRight + - Home"
            stroke={state.active ? 'currentColor' : 'transparent'}
            strokeWidth={3}
            strokeDasharray="6 4"
            vectorEffect="non-scaling-stroke"
            style={{
              pointerEvents: 'all',
              touchAction: state.active ? 'none' : 'pan-y',
            }}
          />
        </svg>
      ) : null}
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
        {status}
      </output>
      <button
        data-conformance-zoom-reset="true"
        type="button"
        title="Reset zoom"
        aria-label="Reset zoom"
        onClick={() => controllerRef.current?.reset()}
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

export const catalogComponent = ZoomableTimeWindowExample
export const mount = reactMount(ZoomableTimeWindowExample)

function scaleForWindow(window: ZoomWindow) {
  return zoomScale.copy().domain([window.start, window.end])
}

function createZoomController(
  interaction: SVGRectElement,
  getScene: () => ChartScene<AaplRow> | null,
  stateRef: { current: ZoomState },
  publish: () => void,
): ZoomController {
  const interactionSelection = select<SVGRectElement, unknown>(interaction)
  let syncing = false
  let pendingAction: ZoomState['lastAction'] | null = null
  const behavior = zoom<SVGRectElement, unknown>()
    .touchable(true)
    .scaleExtent([1, 8])
    .clickDistance(3)
    .filter((event) => {
      if (!stateRef.current.active) return false
      if (event.type !== 'wheel') return !event.button
      const capturesWheel =
        Math.abs(event.deltaY) >= Math.abs(event.deltaX) && event.deltaY !== 0
      if (capturesWheel) stateRef.current.wheelCaptured = true
      return capturesWheel
    })
    .wheelDelta((event) => -normalizedWheelDelta(event, 'y') / 240)
    .on('zoom', (event: D3ZoomEvent<SVGRectElement, unknown>) => {
      if (syncing) return
      const scene = getScene()
      if (!scene) return
      const state = stateRef.current
      state.window = windowFromTransform(scene, event.transform)
      state.lastAction =
        pendingAction ??
        (event.sourceEvent instanceof WheelEvent ? 'zoom' : 'pan')
      pendingAction = null
      publish()
    })
  const sync = () => {
    const scene = getScene()
    if (!scene) return
    behavior
      .extent([
        [scene.chart.x, scene.chart.y],
        [scene.chart.x + scene.chart.width, scene.chart.y + scene.chart.height],
      ])
      .translateExtent([
        [scene.chart.x, scene.chart.y],
        [scene.chart.x + scene.chart.width, scene.chart.y + scene.chart.height],
      ])
    syncing = true
    interactionSelection.call(behavior)
    interactionSelection.call(
      behavior.transform,
      transformForWindow(scene, stateRef.current.window),
    )
    syncing = false
  }
  const updateActivation = (active: boolean) => {
    stateRef.current.active = active
    publish()
  }
  const handlePointerDown = () => interaction.focus()
  const handleFocus = () => updateActivation(true)
  const handleBlur = () => updateActivation(false)
  const observeWheel = () => {
    stateRef.current.wheelCaptured = false
  }
  const handleHorizontalWheel = (event: WheelEvent) => {
    if (
      interaction.ownerDocument.activeElement !== interaction ||
      Math.abs(event.deltaX) <= Math.abs(event.deltaY) ||
      !event.deltaX
    ) {
      return
    }
    event.preventDefault()
    const scene = getScene()
    if (!scene) return
    stateRef.current.wheelCaptured = true
    const fraction = normalizedWheelDelta(event, 'x') / 880
    const visibleFraction =
      zoomSpanDays(stateRef.current.window) / zoomSpanDays(initialZoomWindow)
    pendingAction = 'pan'
    interactionSelection.call(
      behavior.translateBy,
      -fraction * visibleFraction * scene.chart.width,
      0,
    )
  }
  const handleKeyDown = (event: KeyboardEvent) => {
    const scene = getScene()
    if (!scene) return
    const center: [number, number] = [
      scene.chart.x + scene.chart.width / 2,
      scene.chart.y + scene.chart.height / 2,
    ]
    if (event.key === '+' || event.key === '=') {
      event.preventDefault()
      pendingAction = 'zoom'
      interactionSelection.call(behavior.scaleBy, 2, center)
    } else if (event.key === '-') {
      event.preventDefault()
      pendingAction = 'zoom'
      interactionSelection.call(behavior.scaleBy, 0.5, center)
    } else if (event.key === 'Home') {
      event.preventDefault()
      pendingAction = 'reset'
      interactionSelection.call(behavior.transform, zoomIdentity)
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault()
      const direction = event.key === 'ArrowLeft' ? 1 : -1
      const visibleFraction =
        zoomSpanDays(stateRef.current.window) / zoomSpanDays(initialZoomWindow)
      pendingAction = 'pan'
      interactionSelection.call(
        behavior.translateBy,
        direction * visibleFraction * scene.chart.width * 0.125,
        0,
      )
    }
  }
  const reset = () => {
    pendingAction = 'reset'
    interactionSelection.call(behavior.transform, zoomIdentity)
    interaction.focus()
  }
  interaction.addEventListener('pointerdown', handlePointerDown)
  interaction.addEventListener('focus', handleFocus)
  interaction.addEventListener('blur', handleBlur)
  interaction.addEventListener('wheel', observeWheel, { capture: true })
  interaction.addEventListener('wheel', handleHorizontalWheel, {
    passive: false,
  })
  interaction.addEventListener('keydown', handleKeyDown)
  return {
    sync,
    reset,
    destroy() {
      interaction.removeEventListener('pointerdown', handlePointerDown)
      interaction.removeEventListener('focus', handleFocus)
      interaction.removeEventListener('blur', handleBlur)
      interaction.removeEventListener('wheel', observeWheel, true)
      interaction.removeEventListener('wheel', handleHorizontalWheel)
      interaction.removeEventListener('keydown', handleKeyDown)
      interactionSelection.on('.zoom', null)
    },
  }
}

function transformForWindow(
  scene: ChartScene<AaplRow>,
  window: ZoomWindow,
): ZoomTransform {
  const scale = Math.max(
    1,
    zoomSpanDays(initialZoomWindow) / zoomSpanDays(window),
  )
  const baseScale = zoomScale
    .copy()
    .range([scene.chart.x, scene.chart.x + scene.chart.width])
  return zoomIdentity
    .translate(scene.chart.x - scale * baseScale(window.start), 0)
    .scale(scale)
}

function windowFromTransform(
  scene: ChartScene<AaplRow>,
  transform: ZoomTransform,
): ZoomWindow {
  const baseScale = zoomScale
    .copy()
    .range([scene.chart.x, scene.chart.x + scene.chart.width])
  const domain = transform.rescaleX(baseScale).domain()
  return {
    start: domain[0] ?? zoomFullDomain[0],
    end: domain[1] ?? zoomFullDomain[1],
  }
}

function normalizedWheelDelta(event: WheelEvent, axis: 'x' | 'y') {
  const value = axis === 'x' ? event.deltaX : event.deltaY
  if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) return value * 16
  if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) return value * 240
  return value
}

function resolveTarget(
  surface: HTMLDivElement,
  scene: ChartScene<AaplRow>,
  target: ConformanceTarget,
) {
  if (target.view !== undefined && target.view !== 'main') return null
  if (target.anchor === 'control:reset') {
    const reset = surface.querySelector<HTMLButtonElement>(
      '[data-conformance-zoom-reset]',
    )
    return reset ? center(reset) : null
  }
  const date = zoomDateFromAnchor(zoomRows, target.anchor)
  const row = date
    ? zoomRows.find((datum) => datum.Date.getTime() === date.getTime())
    : null
  return date && row
    ? scenePointToClient(
        surface,
        scene,
        scene.scales.x.map(date),
        scene.scales.y.map(row.Close),
        surface.querySelector<SVGRectElement>(
          '[data-conformance-zoom-surface]',
        ) ?? undefined,
      )
    : null
}

function interactionState(state: ZoomState): ConformanceJsonObject {
  const visibleRows = visibleZoomData(zoomRows, state.window)
  const jan9Row = visibleRows.find(
    (row) => zoomDateKey(row.Date) === '2018-01-09',
  )
  return {
    viewport: {
      start: zoomDateKey(state.window.start),
      end: zoomDateKey(state.window.end),
      spanDays: zoomSpanDays(state.window),
    },
    visible: {
      count: visibleRows.length,
      ids: visibleRows.map((row) => zoomDateKey(row.Date)),
      jan9Close: jan9Row?.Close ?? null,
    },
    interaction: {
      last: state.lastAction,
      active: state.active,
      wheelCaptured: state.wheelCaptured,
    },
  }
}

function zoomGeometry(
  surface: HTMLDivElement,
  scene: ChartScene<AaplRow>,
  window: ZoomWindow,
  query: ConformanceGeometryQuery,
): readonly ConformanceGeometrySample[] {
  if (query.view !== undefined && query.view !== 'main') return []
  const svg = surface.querySelector<SVGSVGElement>('svg.ts-chart')
  if (!svg) return []
  const bounds = svg.getBoundingClientRect()
  const scaleX = bounds.width / scene.width
  const scaleY = bounds.height / scene.height
  const points = visibleZoomData(zoomRows, window).map(
    (row): readonly [number, number] => [
      scene.scales.x.map(row.Date),
      scene.scales.y.map(row.Close),
    ],
  )
  if (query.role === 'dot') {
    return points.map(([x, y]) => ({
      x: bounds.left + (x - 3.5) * scaleX,
      y: bounds.top + (y - 3.5) * scaleY,
      width: 7 * scaleX,
      height: 7 * scaleY,
      paint: color,
    }))
  }
  if (query.role !== 'line') return []
  const sample = pointsBounds(points, bounds, scaleX, scaleY, color)
  return sample ? [sample] : []
}

function scenePointToClient(
  surface: HTMLDivElement,
  scene: ChartScene<AaplRow>,
  x: number,
  y: number,
  focusElement?: HTMLElement | SVGElement,
) {
  const svg = surface.querySelector<SVGSVGElement>('svg.ts-chart')
  if (!svg) return null
  const bounds = svg.getBoundingClientRect()
  return {
    x: bounds.left + (x / scene.width) * bounds.width,
    y: bounds.top + (y / scene.height) * bounds.height,
    focusElement: focusElement ?? svg,
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

function formatSpan(days: number) {
  return Number.isInteger(days) ? String(days) : days.toFixed(1)
}

function center(element: HTMLElement | SVGElement) {
  const bounds = element.getBoundingClientRect()
  return {
    x: bounds.left + bounds.width / 2,
    y: bounds.top + bounds.height / 2,
    focusElement: element,
  }
}
