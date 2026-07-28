import { defineChart, dot, lineY, mountChart } from '@tanstack/charts'
import { focusDisabled } from '@tanstack/charts/focus/disabled'
import { scaleLinear, scaleUtc } from 'd3-scale'
import {
  brushData,
  brushDateFromAnchor,
  brushDateKey,
  brushDomain,
  brushRowsInRange,
  clampBrushDate,
  initialBrushRange,
  normalizedBrushRange,
} from './data'
import { brushSelectionFill, normalizedElementFill } from './paint'
import type { ChartScene, DynamicChartHostOptions } from '@tanstack/charts'
import type { BrushDatum, BrushRange } from './data'
import type {
  ConformanceGeometryQuery,
  ConformanceGeometrySample,
  ConformanceHandle,
  ConformanceInput,
  ConformanceJsonObject,
  ConformanceTarget,
  ConformanceTestDriver,
} from '../../types'

interface BrushState {
  range: BrushRange
  origin: Date | null
  dragging: boolean
}

const color = '#2563eb'
const yDomain = [20, 80] as const
const brushScale = scaleUtc().domain(brushDomain)
const brushMonthFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  timeZone: 'UTC',
})

const definition = defineChart<ConformanceInput>()(({ input }) => {
  const rows = brushData(input.revision)
  return {
    marks: [
      lineY(rows, {
        id: 'brush-series',
        x: 'date',
        y: 'value',
        key: 'id',
        stroke: color,
        strokeWidth: 2.5,
      }),
      dot(rows, {
        id: 'brush-points',
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
      scale: brushScale,
      format: (value) => brushMonthFormatter.format(value),
      label: 'Month',
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
  const state: BrushState = {
    range: { ...initialBrushRange },
    origin: null,
    dragging: false,
  }
  const surface = container.ownerDocument.createElement('div')
  surface.dataset.conformanceView = 'main'
  surface.style.position = 'relative'
  setSurfaceSize(surface, input)
  container.append(surface)

  const options = (
    nextInput: ConformanceInput,
  ): DynamicChartHostOptions<BrushDatum, ConformanceInput> => ({
    definition,
    input: nextInput,
    width: nextInput.width,
    height: nextInput.height,
    ariaLabel: 'Time series with a draggable horizontal range brush',
    animate: false,
    keyboard: false,
    focus: focusDisabled,
  })
  const host = mountChart(surface, options(input))
  const elements = createSelectionElements(surface)

  const paint = () => {
    paintSelection(elements, host.getScene(), state.range)
  }

  const handlePointerDown = (event: PointerEvent) => {
    const date = dateAtPointer(surface, host.getScene(), event)
    if (!date) return
    event.preventDefault()
    state.origin = date
    state.range = { start: date, end: date }
    state.dragging = true
    surface.setPointerCapture(event.pointerId)
    paint()
  }

  const handlePointerMove = (event: PointerEvent) => {
    if (!state.dragging || !state.origin) return
    const date = dateAtPointer(surface, host.getScene(), event)
    if (!date) return
    state.range = normalizedBrushRange(state.origin, date)
    paint()
  }

  const finishPointer = (event: PointerEvent) => {
    if (!state.dragging) return
    const date = dateAtPointer(surface, host.getScene(), event)
    if (date && state.origin) {
      state.range = normalizedBrushRange(state.origin, date)
    }
    state.dragging = false
    state.origin = null
    if (surface.hasPointerCapture(event.pointerId)) {
      surface.releasePointerCapture(event.pointerId)
    }
    paint()
  }

  surface.addEventListener('pointerdown', handlePointerDown)
  surface.addEventListener('pointermove', handlePointerMove)
  surface.addEventListener('pointerup', finishPointer)
  surface.addEventListener('pointercancel', finishPointer)
  paint()

  const driver = createDriver(
    surface,
    () => currentInput,
    () => host.getScene(),
    state,
    paint,
  )

  return {
    driver,
    update(nextInput) {
      currentInput = nextInput
      setSurfaceSize(surface, nextInput)
      host.update(options(nextInput))
      paint()
    },
    destroy() {
      surface.removeEventListener('pointerdown', handlePointerDown)
      surface.removeEventListener('pointermove', handlePointerMove)
      surface.removeEventListener('pointerup', finishPointer)
      surface.removeEventListener('pointercancel', finishPointer)
      host.destroy()
      surface.remove()
    },
  }
}

interface SelectionElements {
  overlay: SVGSVGElement
  band: SVGRectElement
}

function createSelectionElements(surface: HTMLDivElement): SelectionElements {
  const document = surface.ownerDocument
  const overlay = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  overlay.dataset.conformanceOverlay = 'brush'
  overlay.setAttribute('aria-hidden', 'true')
  Object.assign(overlay.style, {
    position: 'absolute',
    inset: '0',
    width: '100%',
    height: '100%',
    overflow: 'visible',
    pointerEvents: 'none',
  })
  const band = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
  band.dataset.conformanceSelection = 'range'
  band.setAttribute('fill', brushSelectionFill)
  band.setAttribute('stroke', color)
  band.setAttribute('stroke-width', '1')
  overlay.append(band)
  surface.append(overlay)
  return { overlay, band }
}

function paintSelection(
  elements: SelectionElements,
  scene: ChartScene<BrushDatum>,
  range: BrushRange,
) {
  const start = scene.scales.x.map(range.start)
  const end = scene.scales.x.map(range.end)
  elements.overlay.setAttribute('viewBox', `0 0 ${scene.width} ${scene.height}`)
  elements.band.setAttribute('x', String(Math.min(start, end)))
  elements.band.setAttribute('y', String(scene.chart.y))
  elements.band.setAttribute(
    'width',
    String(Math.max(1, Math.abs(end - start))),
  )
  elements.band.setAttribute('height', String(scene.chart.height))
}

function dateAtPointer(
  surface: HTMLDivElement,
  scene: ChartScene<BrushDatum>,
  event: PointerEvent,
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
  const inverseScale = brushScale
    .copy()
    .range([scene.chart.x, scene.chart.x + scene.chart.width])
  return clampBrushDate(inverseScale.invert(sceneX))
}

function createDriver(
  surface: HTMLDivElement,
  getInput: () => ConformanceInput,
  getScene: () => ChartScene<BrushDatum>,
  state: BrushState,
  settle: () => void,
): ConformanceTestDriver {
  return {
    resolveTarget(target) {
      return resolveTarget(surface, getScene(), target)
    },
    readState() {
      return interactionState(state, getInput())
    },
    geometry(query) {
      return brushGeometry(surface, getScene(), getInput(), state.range, query)
    },
    settle,
  }
}

function resolveTarget(
  surface: HTMLDivElement,
  scene: ChartScene<BrushDatum>,
  target: ConformanceTarget,
) {
  if (target.view !== undefined && target.view !== 'main') return null
  const date = brushDateFromAnchor(target.anchor)
  if (!date) return null
  return scenePointToClient(
    surface,
    scene,
    scene.scales.x.map(date),
    scene.scales.y.map(50),
  )
}

function interactionState(
  state: BrushState,
  input: ConformanceInput,
): ConformanceJsonObject {
  return {
    selection: {
      start: brushDateKey(state.range.start),
      end: brushDateKey(state.range.end),
      pointCount: brushRowsInRange(brushData(input.revision), state.range)
        .length,
      dragging: state.dragging,
    },
  }
}

function brushGeometry(
  surface: HTMLDivElement,
  scene: ChartScene<BrushDatum>,
  input: ConformanceInput,
  range: BrushRange,
  query: ConformanceGeometryQuery,
): readonly ConformanceGeometrySample[] {
  if (query.view !== undefined && query.view !== 'main') return []
  const svg = surface.querySelector<SVGSVGElement>('svg.ts-chart')
  if (!svg) return []
  const bounds = svg.getBoundingClientRect()
  const scaleX = bounds.width / scene.width
  const scaleY = bounds.height / scene.height
  const points = brushData(input.revision).map(
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
  if (query.role === 'rect') {
    const band = surface.querySelector<SVGRectElement>(
      '[data-conformance-selection="range"]',
    )
    if (!band) {
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
  return []
}

function scenePointToClient(
  surface: HTMLDivElement,
  scene: ChartScene<BrushDatum>,
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
