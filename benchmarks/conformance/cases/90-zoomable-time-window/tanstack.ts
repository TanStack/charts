import { defineChart, dot, lineY, mountChart } from '@tanstack/charts'
import { focusDisabled } from '@tanstack/charts/focus/disabled'
import { scaleLinear, scaleUtc } from 'd3-scale'
import {
  initialZoomWindow,
  panZoomWindow,
  visibleZoomData,
  zoomData,
  zoomDateFromAnchor,
  zoomDateKey,
  zoomFullDomain,
  zoomSpanDays,
  zoomWindowAt,
} from './data'
import type { ChartScene, DynamicChartHostOptions } from '@tanstack/charts'
import type { ZoomDatum, ZoomWindow } from './data'
import type {
  ConformanceGeometryQuery,
  ConformanceGeometrySample,
  ConformanceHandle,
  ConformanceInput,
  ConformanceJsonObject,
  ConformanceTarget,
  ConformanceTestDriver,
} from '../../types'

interface ZoomChartInput extends ConformanceInput {
  window: ZoomWindow
}

interface ZoomState {
  window: ZoomWindow
  lastAction: 'none' | 'zoom' | 'pan'
}

const color = '#0f766e'
const yDomain = [20, 85] as const
const zoomScale = scaleUtc().domain(zoomFullDomain)

const definition = defineChart<ZoomChartInput>()(({ input }) => {
  const rows = visibleZoomData(zoomData(input.revision), input.window)
  return {
    marks: [
      lineY(rows, {
        id: 'zoom-series',
        x: 'date',
        y: 'value',
        key: 'id',
        stroke: color,
        strokeWidth: 2.5,
      }),
      dot(rows, {
        id: 'zoom-points',
        x: 'date',
        y: 'value',
        key: 'id',
        fill: color,
        r: 3.5,
        stroke: '#ffffff',
        strokeWidth: 1,
      }),
    ],
    x: {
      scale: scaleForWindow(input.window),
      label: 'Wheel to zoom · horizontal wheel to pan',
      format: (value) =>
        value.toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
          timeZone: 'UTC',
        }),
    },
    y: {
      scale: scaleLinear().domain(yDomain),
      ticks: 4,
      grid: true,
      label: 'Value',
    },
    margin: { top: 20, right: 24, bottom: 44, left: 58 },
  }
})

export function mount(
  container: HTMLElement,
  input: ConformanceInput,
): ConformanceHandle {
  let currentInput = input
  const state: ZoomState = {
    window: { ...initialZoomWindow },
    lastAction: 'none',
  }
  const surface = container.ownerDocument.createElement('div')
  surface.dataset.conformanceView = 'main'
  surface.style.position = 'relative'
  setSurfaceSize(surface, input)
  container.append(surface)

  const options = (): DynamicChartHostOptions<ZoomDatum, ZoomChartInput> => ({
    definition,
    input: {
      ...currentInput,
      window: state.window,
    },
    width: currentInput.width,
    height: currentInput.height,
    ariaLabel: 'Time series with a wheel-zoomable and pannable time viewport',
    animate: false,
    keyboard: false,
    focus: focusDisabled,
  })
  const host = mountChart(surface, options())

  const applyWindow = (window: ZoomWindow, action: ZoomState['lastAction']) => {
    state.window = window
    state.lastAction = action
    host.update(options())
  }

  const handleWheel = (event: WheelEvent) => {
    if (!event.deltaX && !event.deltaY) return
    event.preventDefault()
    if (Math.abs(event.deltaY) >= Math.abs(event.deltaX) && event.deltaY) {
      const anchor = dateAtPointer(
        surface,
        host.getScene(),
        state.window,
        event,
      )
      if (!anchor) return
      applyWindow(
        zoomWindowAt(state.window, anchor, event.deltaY < 0 ? 0.5 : 2),
        'zoom',
      )
      return
    }
    applyWindow(panZoomWindow(state.window, event.deltaX < 0 ? -1 : 1), 'pan')
  }

  surface.addEventListener('wheel', handleWheel, { passive: false })

  const driver = createDriver(
    surface,
    () => currentInput,
    () => host.getScene(),
    state,
  )

  return {
    driver,
    update(nextInput) {
      currentInput = nextInput
      setSurfaceSize(surface, nextInput)
      host.update(options())
    },
    destroy() {
      surface.removeEventListener('wheel', handleWheel)
      host.destroy()
      surface.remove()
    },
  }
}

function scaleForWindow(window: ZoomWindow) {
  return zoomScale.copy().domain([window.start, window.end])
}

function dateAtPointer(
  surface: HTMLDivElement,
  scene: ChartScene<ZoomDatum>,
  window: ZoomWindow,
  event: WheelEvent,
) {
  const svg = surface.querySelector<SVGSVGElement>('svg.ts-chart')
  if (!svg) return null
  const bounds = svg.getBoundingClientRect()
  const sceneX = ((event.clientX - bounds.left) / bounds.width) * scene.width
  const sceneY = ((event.clientY - bounds.top) / bounds.height) * scene.height
  if (
    sceneX < scene.chart.x ||
    sceneX > scene.chart.x + scene.chart.width ||
    sceneY < scene.chart.y ||
    sceneY > scene.chart.y + scene.chart.height
  ) {
    return null
  }
  const inverseScale = scaleForWindow(window).range([
    scene.chart.x,
    scene.chart.x + scene.chart.width,
  ])
  return inverseScale.invert(sceneX)
}

function createDriver(
  surface: HTMLDivElement,
  getInput: () => ConformanceInput,
  getScene: () => ChartScene<ZoomDatum>,
  state: ZoomState,
): ConformanceTestDriver {
  return {
    resolveTarget(target) {
      return resolveTarget(surface, getScene(), target)
    },
    readState() {
      return interactionState(state, getInput())
    },
    geometry(query) {
      return zoomGeometry(surface, getScene(), getInput(), state.window, query)
    },
  }
}

function resolveTarget(
  surface: HTMLDivElement,
  scene: ChartScene<ZoomDatum>,
  target: ConformanceTarget,
) {
  if (target.view !== undefined && target.view !== 'main') return null
  const date = zoomDateFromAnchor(target.anchor)
  if (!date) return null
  return scenePointToClient(
    surface,
    scene,
    scene.scales.x.map(date),
    scene.scales.y.map(52),
  )
}

function interactionState(
  state: ZoomState,
  input: ConformanceInput,
): ConformanceJsonObject {
  const visibleRows = visibleZoomData(zoomData(input.revision), state.window)
  const revisionProbe = visibleRows.find(
    (row) => zoomDateKey(row.date) === '2025-01-08',
  )
  return {
    viewport: {
      start: zoomDateKey(state.window.start),
      end: zoomDateKey(state.window.end),
      spanDays: zoomSpanDays(state.window),
    },
    visible: {
      count: visibleRows.length,
      ids: visibleRows.map((row) => row.id),
      revisionProbeValue: revisionProbe?.value ?? null,
    },
    interaction: {
      last: state.lastAction,
    },
  }
}

function zoomGeometry(
  surface: HTMLDivElement,
  scene: ChartScene<ZoomDatum>,
  input: ConformanceInput,
  window: ZoomWindow,
  query: ConformanceGeometryQuery,
): readonly ConformanceGeometrySample[] {
  if (query.view !== undefined && query.view !== 'main') return []
  const svg = surface.querySelector<SVGSVGElement>('svg.ts-chart')
  if (!svg) return []
  const bounds = svg.getBoundingClientRect()
  const scaleX = bounds.width / scene.width
  const scaleY = bounds.height / scene.height
  const points = visibleZoomData(zoomData(input.revision), window).map(
    (row): readonly [number, number] => [
      scene.scales.x.map(row.date),
      scene.scales.y.map(row.value),
    ],
  )

  if (query.role === 'dot') {
    return points.map((point) => ({
      x: bounds.left + (point[0] - 3.5) * scaleX,
      y: bounds.top + (point[1] - 3.5) * scaleY,
      width: 7 * scaleX,
      height: 7 * scaleY,
      paint: color,
    }))
  }
  if (query.role === 'line') {
    const sample = pointsBounds(points, bounds, scaleX, scaleY, color)
    return sample ? [sample] : []
  }
  return []
}

function scenePointToClient(
  surface: HTMLDivElement,
  scene: ChartScene<ZoomDatum>,
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
  svgBounds: DOMRect,
  scaleX: number,
  scaleY: number,
  paint: string,
): ConformanceGeometrySample | null {
  if (!points.length) return null
  const xs = points.map((point) => point[0])
  const ys = points.map((point) => point[1])
  const left = Math.min(...xs)
  const right = Math.max(...xs)
  const top = Math.min(...ys)
  const bottom = Math.max(...ys)
  return {
    x: svgBounds.left + left * scaleX,
    y: svgBounds.top + top * scaleY,
    width: Math.max(1, (right - left) * scaleX),
    height: Math.max(1, (bottom - top) * scaleY),
    paint,
  }
}

function setSurfaceSize(surface: HTMLDivElement, input: ConformanceInput) {
  surface.style.width = `${input.width}px`
  surface.style.height = `${input.height}px`
}
