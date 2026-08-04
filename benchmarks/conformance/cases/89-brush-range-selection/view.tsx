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
import { brushX } from 'd3-brush'
import { scaleLinear, scaleUtc } from 'd3-scale'
import { select } from 'd3-selection'
import { reactMount } from '../../shared/react-mount'
import {
  brushDomain,
  brushDateFromAnchor,
  brushDateKey,
  brushRangeSummary,
  brushShortDate,
  clampBrushDate,
  initialBrushRange,
  monthlyAaplRows,
  normalizedBrushRange,
  observedBrushDates,
} from './model'
import { brushSelectionFill, normalizedElementFill } from './paint'
import type { ChartScene } from '@tanstack/charts'
import type { D3BrushEvent } from 'd3-brush'
import type { AaplRow } from '@charts-poc/demo-data/aapl'
import type { BrushRange } from './model'
import type {
  ConformanceGeometryQuery,
  ConformanceGeometrySample,
  ConformanceJsonObject,
  ConformanceTarget,
  ConformanceTestDriver,
} from '../../types'
import type { ReactConformanceProps } from '../../shared/react-mount'

interface BrushState {
  range: BrushRange
  dragging: boolean
  originRange: BrushRange | null
}

interface BrushController {
  sync: () => void
  destroy: () => void
}

const color = '#2563eb'
const brushRows = monthlyAaplRows(aapl)
const brushDates = observedBrushDates(brushRows)
const fullDomain = brushDomain(brushDates)
const brushScale = scaleUtc().domain(fullDomain)
const brushMonthFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  timeZone: 'UTC',
})

const BrushRangeExample = forwardRef<
  ConformanceTestDriver,
  ReactConformanceProps
>(function BrushRangeExample({ input, idPrefix }, ref) {
  const surfaceRef = useRef<HTMLDivElement>(null)
  const groupRef = useRef<SVGGElement>(null)
  const sceneRef = useRef<ChartScene<AaplRow> | null>(null)
  const controllerRef = useRef<BrushController | null>(null)
  const brushStateRef = useRef<BrushState>({
    range: { ...initialBrushRange(brushDates) },
    dragging: false,
    originRange: null,
  })
  const [brushState, setBrushState] = useState(brushStateRef.current)
  const [scene, setScene] = useState<ChartScene<AaplRow> | null>(null)
  const definition = useMemo(
    () =>
      defineChart(
        defineChart({
          marks: [
            lineY(brushRows, {
              x: 'Date',
              y: 'Close',
              stroke: color,
              strokeWidth: 2.5,
            }),
            dot(brushRows, {
              x: 'Date',
              y: 'Close',
              fill: color,
              r: 3.5,
              stroke: '#ffffff',
              strokeWidth: 1,
            }),
          ],
          x: {
            scale: brushScale,
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
          margin: { top: 52, right: 24, bottom: 44, left: 58 },
        }),
        { animate: false, keyboard: false, focus: focusDisabled },
      ),
    [],
  )

  useLayoutEffect(() => {
    const surface = surfaceRef.current
    const group = groupRef.current
    if (!surface || !group || !scene) return
    const controller = createBrushController(
      surface,
      group,
      () => sceneRef.current ?? scene,
      brushStateRef,
      () => setBrushState({ ...brushStateRef.current }),
    )
    controllerRef.current = controller
    controller.sync()
    return () => {
      controller.destroy()
      if (controllerRef.current === controller) controllerRef.current = null
    }
  }, [scene])

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
        return interactionState(brushStateRef.current)
      },
      geometry(query) {
        const surface = surfaceRef.current
        const currentScene = sceneRef.current
        return surface && currentScene
          ? brushGeometry(
              surface,
              currentScene,
              brushStateRef.current.range,
              query,
            )
          : []
      },
      settle() {
        controllerRef.current?.sync()
      },
    }),
    [],
  )

  const summary = brushRangeSummary(brushRows, brushState.range)
  const status = `${brushShortDate(brushState.range.start)} → ${brushShortDate(brushState.range.end)} · ${summary.count} AAPL closes · avg $${summary.average.toFixed(1)}`

  if (input.preview) {
    return (
      <Chart
        idPrefix={idPrefix}
        definition={definition}
        initialWidth={input.width}
        aspectRatio={input.width / input.height}
        ariaLabel="Time series with a draggable horizontal range brush"
      />
    )
  }

  return (
    <div
      ref={surfaceRef}
      data-conformance-view="main"
      role="application"
      aria-label="Monthly time range brush with two adjustable handles"
      style={{ position: 'relative', width: input.width, height: input.height }}
    >
      <Chart
        idPrefix={idPrefix}
        definition={definition}
        width={input.width}
        height={input.height}
        ariaLabel="Time series with a draggable horizontal range brush"
        onRender={({ scene: nextScene }) => {
          sceneRef.current = nextScene
          setScene(nextScene)
        }}
      />
      {scene ? (
        <svg
          data-conformance-overlay="brush"
          role="group"
          aria-label="Monthly range brush. Drag to select; focus either handle and use arrow keys, Home, or End to adjust."
          viewBox={`0 0 ${scene.width} ${scene.height}`}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            overflow: 'hidden',
            pointerEvents: 'auto',
            touchAction: 'none',
          }}
        >
          <g ref={groupRef} />
        </svg>
      ) : null}
      <output
        role="status"
        aria-live="polite"
        aria-label={`${brushDateKey(brushState.range.start)} through ${brushDateKey(brushState.range.end)}, ${summary.count} AAPL closing prices, average $${summary.average.toFixed(1)}`}
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
        {status}
      </output>
    </div>
  )
})

export const catalogComponent = BrushRangeExample
export const mount = reactMount(BrushRangeExample)

function createBrushController(
  surface: HTMLDivElement,
  group: SVGGElement,
  getScene: () => ChartScene<AaplRow>,
  stateRef: { current: BrushState },
  publish: () => void,
): BrushController {
  const groupSelection = select<SVGGElement, unknown>(group)
  let syncing = false
  const behavior = brushX<unknown>()
    .touchable(true)
    .keyModifiers(true)
    .handleSize(16)
    .on('start', (event: D3BrushEvent<unknown>) => {
      if (syncing || !event.sourceEvent) return
      const state = stateRef.current
      state.originRange = { ...state.range }
      state.dragging = true
      publish()
    })
    .on('brush', (event: D3BrushEvent<unknown>) => {
      if (syncing || !event.sourceEvent) return
      const range = rangeFromSelection(event.selection)
      if (!range) return
      stateRef.current.range = range
      decorateBrush(group, stateRef.current.range)
      publish()
    })
    .on('end', (event: D3BrushEvent<unknown>) => {
      if (syncing || !event.sourceEvent) return
      const state = stateRef.current
      const cancelled =
        event.sourceEvent instanceof Event &&
        event.sourceEvent.type === 'touchcancel'
      if (cancelled && state.originRange) {
        state.range = state.originRange
      } else {
        const range = rangeFromSelection(event.selection)
        if (range) state.range = range
      }
      state.dragging = false
      state.originRange = null
      sync()
      publish()
    })

  const rangeScale = () => {
    const scene = getScene()
    return brushScale
      .copy()
      .range([scene.chart.x, scene.chart.x + scene.chart.width])
  }
  const rangeFromSelection = (
    selection: D3BrushEvent<unknown>['selection'],
  ): BrushRange | null => {
    if (
      !selection ||
      Array.isArray(selection[0]) ||
      typeof selection[0] !== 'number' ||
      typeof selection[1] !== 'number'
    ) {
      return null
    }
    const scale = rangeScale()
    return normalizedBrushRange(
      clampBrushDate(brushDates, scale.invert(selection[0])),
      clampBrushDate(brushDates, scale.invert(selection[1])),
    )
  }
  const sync = () => {
    const scene = getScene()
    behavior.extent([
      [scene.chart.x, scene.chart.y],
      [scene.chart.x + scene.chart.width, scene.chart.y + scene.chart.height],
    ])
    syncing = true
    groupSelection.call(behavior)
    groupSelection.call(behavior.move, [
      scene.scales.x.map(stateRef.current.range.start),
      scene.scales.x.map(stateRef.current.range.end),
    ])
    syncing = false
    decorateBrush(group, stateRef.current.range)
  }
  const handleKeyDown = (event: KeyboardEvent) => {
    const target = event.target
    if (!(target instanceof SVGRectElement) || !target.matches('.handle'))
      return
    const state = stateRef.current
    const isStart = target.classList.contains('handle--w')
    const currentIndex = rangeIndex(
      isStart ? state.range.start : state.range.end,
    )
    if (currentIndex < 0) return
    const boundaryIndex = rangeIndex(
      isStart ? state.range.end : state.range.start,
    )
    const direction =
      event.key === 'ArrowLeft' || event.key === 'ArrowDown'
        ? -1
        : event.key === 'ArrowRight' || event.key === 'ArrowUp'
          ? 1
          : 0
    const requestedIndex =
      event.key === 'Home'
        ? isStart
          ? 0
          : boundaryIndex
        : event.key === 'End'
          ? isStart
            ? boundaryIndex
            : brushDates.length - 1
          : currentIndex + direction
    if (!direction && event.key !== 'Home' && event.key !== 'End') return
    event.preventDefault()
    const nextIndex = Math.max(
      isStart ? 0 : boundaryIndex,
      Math.min(isStart ? boundaryIndex : brushDates.length - 1, requestedIndex),
    )
    const nextDate = brushDates[nextIndex]
    if (!nextDate) return
    state.range = isStart
      ? { start: nextDate, end: state.range.end }
      : { start: state.range.start, end: nextDate }
    sync()
    publish()
    group
      .querySelector<SVGRectElement>(isStart ? '.handle--w' : '.handle--e')
      ?.focus()
  }
  const handleFocusChange = (event: FocusEvent) => {
    const handle =
      event.target instanceof SVGRectElement && event.target.matches('.handle')
        ? event.target
        : null
    if (!handle) return
    handle.setAttribute('stroke-width', event.type === 'focusin' ? '4' : '2')
    handle.setAttribute('stroke', event.type === 'focusin' ? '#1d4ed8' : color)
  }
  const cancelActiveBrush = () => {
    const state = stateRef.current
    if (!state.dragging || !state.originRange) return
    state.range = state.originRange
    state.dragging = false
    state.originRange = null
    sync()
    publish()
  }
  group.addEventListener('keydown', handleKeyDown)
  group.addEventListener('focusin', handleFocusChange)
  group.addEventListener('focusout', handleFocusChange)
  surface.addEventListener('pointercancel', cancelActiveBrush)
  surface.addEventListener('touchcancel', cancelActiveBrush)
  return {
    sync,
    destroy() {
      group.removeEventListener('keydown', handleKeyDown)
      group.removeEventListener('focusin', handleFocusChange)
      group.removeEventListener('focusout', handleFocusChange)
      surface.removeEventListener('pointercancel', cancelActiveBrush)
      surface.removeEventListener('touchcancel', cancelActiveBrush)
      groupSelection.on('.brush', null)
      group.replaceChildren()
    },
  }
}

function decorateBrush(group: SVGGElement, range: BrushRange) {
  const selection = group.querySelector<SVGRectElement>('.selection')
  if (selection) {
    selection.dataset.conformanceSelection = 'range'
    selection.setAttribute('fill', brushSelectionFill)
    selection.setAttribute('fill-opacity', '1')
    selection.setAttribute('stroke', color)
    selection.setAttribute('stroke-width', '1')
  }
  group.querySelectorAll<SVGRectElement>('.handle').forEach((handle) => {
    const isStart = handle.classList.contains('handle--w')
    const date = isStart ? range.start : range.end
    const index = rangeIndex(date)
    const boundaryIndex = rangeIndex(isStart ? range.end : range.start)
    handle.setAttribute('tabindex', '0')
    handle.setAttribute('role', 'slider')
    handle.setAttribute('aria-label', isStart ? 'Range start' : 'Range end')
    handle.setAttribute('aria-valuemin', String(isStart ? 0 : boundaryIndex))
    handle.setAttribute(
      'aria-valuemax',
      String(isStart ? boundaryIndex : brushDates.length - 1),
    )
    handle.setAttribute('aria-valuenow', String(index))
    handle.setAttribute('aria-orientation', 'horizontal')
    handle.setAttribute(
      'aria-keyshortcuts',
      'ArrowLeft ArrowRight ArrowUp ArrowDown Home End',
    )
    handle.setAttribute('aria-valuetext', brushDateKey(date))
    handle.setAttribute('fill', 'Canvas')
    handle.setAttribute('fill-opacity', '1')
    handle.setAttribute('stroke', color)
    handle.setAttribute('stroke-width', '2')
    handle.style.outline = 'none'
  })
}

function resolveTarget(
  surface: HTMLDivElement,
  scene: ChartScene<AaplRow>,
  target: ConformanceTarget,
) {
  if (target.view !== undefined && target.view !== 'main') return null
  if (target.anchor === 'handle:start' || target.anchor === 'handle:end') {
    const handle = surface.querySelector<SVGRectElement>(
      target.anchor === 'handle:start' ? '.handle--w' : '.handle--e',
    )
    if (!handle) return null
    return center(handle)
  }
  const date = brushDateFromAnchor(brushDates, target.anchor)
  const row = date
    ? brushRows.find((datum) => datum.Date.getTime() === date.getTime())
    : null
  return date && row
    ? scenePointToClient(
        surface,
        scene,
        scene.scales.x.map(date),
        scene.scales.y.map(row.Close),
      )
    : null
}

function interactionState(state: BrushState): ConformanceJsonObject {
  const summary = brushRangeSummary(brushRows, state.range)
  return {
    selection: {
      start: brushDateKey(state.range.start),
      end: brushDateKey(state.range.end),
      pointCount: summary.count,
      closeAverage: summary.average,
      closeChange: summary.change,
      dragging: state.dragging,
    },
  }
}

function brushGeometry(
  surface: HTMLDivElement,
  scene: ChartScene<AaplRow>,
  range: BrushRange,
  query: ConformanceGeometryQuery,
): readonly ConformanceGeometrySample[] {
  if (query.view !== undefined && query.view !== 'main') return []
  const svg = surface.querySelector<SVGSVGElement>('svg.ts-chart')
  if (!svg) return []
  const bounds = svg.getBoundingClientRect()
  const scaleX = bounds.width / scene.width
  const scaleY = bounds.height / scene.height
  const points = brushRows.map((row): readonly [number, number] => [
    scene.scales.x.map(row.Date),
    scene.scales.y.map(row.Close),
  ])
  if (query.role === 'dot') {
    return points.map(([x, y]) => ({
      x: bounds.left + (x - 3.5) * scaleX,
      y: bounds.top + (y - 3.5) * scaleY,
      width: 7 * scaleX,
      height: 7 * scaleY,
      paint: color,
    }))
  }
  if (query.role === 'line') {
    const sample = pointsBounds(points, bounds, scaleX, scaleY, color)
    return sample ? [sample] : []
  }
  if (query.role !== 'rect') return []
  const band = surface.querySelector<SVGRectElement>(
    '[data-conformance-selection="range"]',
  )
  if (band) {
    const bandBounds = band.getBoundingClientRect()
    return [
      {
        x: bandBounds.x,
        y: bandBounds.y,
        width: bandBounds.width,
        height: bandBounds.height,
        paint:
          normalizedElementFill(band) ?? 'invalid-tanstack-rendered-brush-fill',
      },
    ]
  }
  const start = scene.scales.x.map(range.start)
  const end = scene.scales.x.map(range.end)
  return [
    {
      x: bounds.left + Math.min(start, end) * scaleX,
      y: bounds.top + scene.chart.y * scaleY,
      width: Math.max(1, Math.abs(end - start) * scaleX),
      height: scene.chart.height * scaleY,
      paint: 'missing-tanstack-rendered-brush-fill',
    },
  ]
}

function scenePointToClient(
  surface: HTMLDivElement,
  scene: ChartScene<AaplRow>,
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

function rangeIndex(date: Date) {
  return brushDates.findIndex(
    (candidate) => candidate.getTime() === date.getTime(),
  )
}

function center(element: HTMLElement | SVGElement) {
  const bounds = element.getBoundingClientRect()
  return {
    x: bounds.left + bounds.width / 2,
    y: bounds.top + bounds.height / 2,
    focusElement: element,
  }
}
