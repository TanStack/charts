import { defineChart, dot, lineY, mountChart } from '@tanstack/charts'
import { focusDisabled } from '@tanstack/charts/focus/disabled'
import { aapl } from '@charts-poc/demo-data/aapl'
import { scaleLinear, scaleUtc } from 'd3-scale'
import { select } from 'd3-selection'
import { zoom, zoomIdentity } from 'd3-zoom'
import {
  initialZoomWindow,
  selectZoomRows,
  visibleZoomData,
  zoomDateFromAnchor,
  zoomDateKey,
  zoomFullDomain,
  zoomSpanDays,
} from './model'
import type { ChartScene, ChartHostOptions } from '@tanstack/charts'
import type { AaplRow } from '@charts-poc/demo-data/aapl'
import type { D3ZoomEvent, ZoomTransform } from 'd3-zoom'
import type { ZoomWindow } from './model'
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
  lastAction: 'none' | 'zoom' | 'pan' | 'reset'
  active: boolean
  wheelCaptured: boolean
}

const color = '#0f766e'
const zoomScale = scaleUtc().domain(zoomFullDomain)
const zoomRows = selectZoomRows(aapl)

const definition = (input: ZoomChartInput) => {
  const rows = visibleZoomData(zoomRows, input.window)
  return defineChart({
    marks: [
      lineY(rows, {
        x: 'Date',
        y: 'Close',
        stroke: color,
        strokeWidth: 2.5,
      }),
      dot(rows, {
        x: 'Date',
        y: 'Close',
        fill: color,
        r: 3.5,
        stroke: '#ffffff',
        strokeWidth: 1,
      }),
    ],
    x: {
      scale: scaleForWindow(input.window),
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
    margin: { top: 56, right: 24, bottom: 44, left: 58 },
  })
}

export function mount(
  container: HTMLElement,
  input: ConformanceInput,
): ConformanceHandle {
  let currentInput = input
  const state: ZoomState = {
    window: { ...initialZoomWindow },
    lastAction: 'none',
    active: false,
    wheelCaptured: false,
  }
  const surface = container.ownerDocument.createElement('div')
  surface.dataset.conformanceView = 'main'
  surface.style.position = 'relative'
  setSurfaceSize(surface, input)
  container.append(surface)

  const options = (): ChartHostOptions<AaplRow> => ({
    definition: defineChart(
      definition({
        ...currentInput,
        window: state.window,
      }),
      { animate: false, keyboard: false, focus: focusDisabled },
    ),
    width: currentInput.width,
    height: currentInput.height,
    ariaLabel: 'Time series with a wheel-zoomable and pannable time viewport',
  })
  const host = mountChart(surface, options())
  const controller = createZoomController(
    surface,
    () => host.getScene(),
    state,
    () => host.update(options()),
  )
  controller.sync()

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
      controller.sync()
    },
    destroy() {
      controller.destroy()
      host.destroy()
      surface.remove()
    },
  }
}

function scaleForWindow(window: ZoomWindow) {
  return zoomScale.copy().domain([window.start, window.end])
}

function createZoomController(
  surface: HTMLDivElement,
  getScene: () => ChartScene<AaplRow>,
  state: ZoomState,
  render: () => void,
) {
  const document = surface.ownerDocument
  const overlay = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  overlay.dataset.conformanceOverlay = 'zoom'
  Object.assign(overlay.style, {
    position: 'absolute',
    inset: '0',
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    pointerEvents: 'none',
  })

  const interaction = document.createElementNS(
    'http://www.w3.org/2000/svg',
    'rect',
  )
  interaction.dataset.conformanceZoomSurface = 'true'
  interaction.setAttribute('fill', 'transparent')
  interaction.setAttribute('tabindex', '0')
  interaction.setAttribute('role', 'application')
  interaction.setAttribute(
    'aria-label',
    'Zoomable time window. Focus the chart before wheel zoom; drag or use a horizontal wheel to pan; use plus, minus, arrow keys, or Home.',
  )
  interaction.setAttribute('aria-keyshortcuts', 'ArrowLeft ArrowRight + - Home')
  interaction.style.pointerEvents = 'all'
  interaction.style.touchAction = 'pan-y'
  interaction.setAttribute('stroke', 'transparent')
  interaction.setAttribute('stroke-width', '3')
  interaction.setAttribute('stroke-dasharray', '6 4')
  interaction.setAttribute('vector-effect', 'non-scaling-stroke')
  overlay.append(interaction)

  const status = document.createElement('output')
  status.dataset.conformanceZoomStatus = 'true'
  status.setAttribute('role', 'status')
  status.setAttribute('aria-live', 'polite')
  Object.assign(status.style, {
    position: 'absolute',
    top: '10px',
    right: '76px',
    zIndex: '4',
    padding: '4px 8px',
    border: '1px solid color-mix(in srgb, CanvasText 24%, transparent)',
    borderRadius: '999px',
    background: 'Canvas',
    color: 'CanvasText',
    font: '600 12px/1.2 system-ui, sans-serif',
    pointerEvents: 'none',
  })

  const reset = document.createElement('button')
  reset.dataset.conformanceZoomReset = 'true'
  reset.type = 'button'
  reset.textContent = '↺'
  reset.title = 'Reset zoom'
  reset.setAttribute('aria-label', 'Reset zoom')
  Object.assign(reset.style, {
    position: 'absolute',
    top: '6px',
    right: '20px',
    zIndex: '4',
    width: '44px',
    height: '44px',
    border: '1px solid color-mix(in srgb, CanvasText 24%, transparent)',
    borderRadius: '10px',
    background: 'Canvas',
    color: 'CanvasText',
    cursor: 'pointer',
    font: '700 20px/1 system-ui, sans-serif',
  })

  surface.append(overlay, status, reset)
  const interactionSelection = select<SVGRectElement, unknown>(interaction)
  let syncing = false
  let pendingAction: ZoomState['lastAction'] | null = null

  const behavior = zoom<SVGRectElement, unknown>()
    .touchable(true)
    .scaleExtent([1, 8])
    .clickDistance(3)
    .filter((event) => {
      if (!state.active) return false
      if (event.type !== 'wheel') return !event.button
      const capturesWheel =
        Math.abs(event.deltaY) >= Math.abs(event.deltaX) && event.deltaY !== 0
      if (capturesWheel) state.wheelCaptured = true
      return capturesWheel
    })
    .wheelDelta((event) => -normalizedWheelDelta(event, 'y') / 240)
    .on('zoom', (event: D3ZoomEvent<SVGRectElement, unknown>) => {
      if (syncing) return
      const scene = getScene()
      state.window = windowFromTransform(scene, event.transform)
      state.lastAction =
        pendingAction ??
        (event.sourceEvent instanceof WheelEvent ? 'zoom' : 'pan')
      pendingAction = null
      render()
      updateStatus()
    })

  const updateStatus = () => {
    const label = state.active
      ? `${zoomDateKey(state.window.start)} → ${zoomDateKey(state.window.end)} · ${formatSpan(zoomSpanDays(state.window))} days`
      : 'Focus chart to zoom'
    status.value = label
    status.textContent = label
    interaction.setAttribute(
      'aria-description',
      `${label}. Wheel zoom; drag or horizontal wheel pan; plus and minus zoom; arrows pan; Home resets.`,
    )
  }

  const updateActivation = (active: boolean) => {
    state.active = active
    interaction.style.touchAction = active ? 'none' : 'pan-y'
    interaction.setAttribute('stroke', active ? 'currentColor' : 'transparent')
    interaction.dataset.zoomActive = String(active)
    updateStatus()
  }

  const sync = () => {
    const scene = getScene()
    overlay.setAttribute('viewBox', `0 0 ${scene.width} ${scene.height}`)
    interaction.setAttribute('x', String(scene.chart.x))
    interaction.setAttribute('y', String(scene.chart.y))
    interaction.setAttribute('width', String(scene.chart.width))
    interaction.setAttribute('height', String(scene.chart.height))
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
      transformForWindow(scene, state.window),
    )
    syncing = false
    updateActivation(state.active)
  }

  const handlePointerDown = () => {
    interaction.focus()
  }

  const handleFocus = () => {
    updateActivation(true)
  }

  const handleBlur = () => {
    updateActivation(false)
  }

  const observeWheel = () => {
    state.wheelCaptured = false
  }

  const handleHorizontalWheel = (event: WheelEvent) => {
    if (
      document.activeElement !== interaction ||
      Math.abs(event.deltaX) <= Math.abs(event.deltaY) ||
      !event.deltaX
    ) {
      return
    }
    event.preventDefault()
    state.wheelCaptured = true
    const scene = getScene()
    const fraction = normalizedWheelDelta(event, 'x') / 880
    const visibleFraction =
      zoomSpanDays(state.window) / zoomSpanDays(initialZoomWindow)
    const basePixels = fraction * visibleFraction * scene.chart.width
    pendingAction = 'pan'
    interactionSelection.call(behavior.translateBy, -basePixels, 0)
  }

  const handleKeyDown = (event: KeyboardEvent) => {
    const scene = getScene()
    const center: [number, number] = [
      scene.chart.x + scene.chart.width / 2,
      scene.chart.y + scene.chart.height / 2,
    ]
    if (event.key === '+' || event.key === '=') {
      event.preventDefault()
      pendingAction = 'zoom'
      interactionSelection.call(behavior.scaleBy, 2, center)
      return
    }
    if (event.key === '-') {
      event.preventDefault()
      pendingAction = 'zoom'
      interactionSelection.call(behavior.scaleBy, 0.5, center)
      return
    }
    if (event.key === 'Home') {
      event.preventDefault()
      pendingAction = 'reset'
      interactionSelection.call(behavior.transform, zoomIdentity)
      return
    }
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault()
      const direction = event.key === 'ArrowLeft' ? 1 : -1
      const visibleFraction =
        zoomSpanDays(state.window) / zoomSpanDays(initialZoomWindow)
      pendingAction = 'pan'
      interactionSelection.call(
        behavior.translateBy,
        direction * visibleFraction * scene.chart.width * 0.125,
        0,
      )
    }
  }

  const resetZoom = () => {
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
  reset.addEventListener('click', resetZoom)

  return {
    sync,
    destroy() {
      interaction.removeEventListener('pointerdown', handlePointerDown)
      interaction.removeEventListener('focus', handleFocus)
      interaction.removeEventListener('blur', handleBlur)
      interaction.removeEventListener('wheel', observeWheel, true)
      interaction.removeEventListener('wheel', handleHorizontalWheel)
      interaction.removeEventListener('keydown', handleKeyDown)
      reset.removeEventListener('click', resetZoom)
      interactionSelection.on('.zoom', null)
      overlay.remove()
      status.remove()
      reset.remove()
    },
  }
}

function transformForWindow(
  scene: ChartScene<AaplRow>,
  window: ZoomWindow,
): ZoomTransform {
  const fullSpan = zoomSpanDays(initialZoomWindow)
  const span = zoomSpanDays(window)
  const scale = Math.max(1, fullSpan / span)
  const baseScale = zoomScale
    .copy()
    .range([scene.chart.x, scene.chart.x + scene.chart.width])
  const start = baseScale(window.start)
  return zoomIdentity.translate(scene.chart.x - scale * start, 0).scale(scale)
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
  if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) {
    return value * 240
  }
  return value
}

function formatSpan(days: number) {
  return Number.isInteger(days) ? String(days) : days.toFixed(1)
}

function createDriver(
  surface: HTMLDivElement,
  getInput: () => ConformanceInput,
  getScene: () => ChartScene<AaplRow>,
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
  scene: ChartScene<AaplRow>,
  target: ConformanceTarget,
) {
  if (target.view !== undefined && target.view !== 'main') return null
  if (target.anchor === 'control:reset') {
    const reset = surface.querySelector<HTMLButtonElement>(
      '[data-conformance-zoom-reset]',
    )
    if (!reset) return null
    const bounds = reset.getBoundingClientRect()
    return {
      x: bounds.left + bounds.width / 2,
      y: bounds.top + bounds.height / 2,
      focusElement: reset,
    }
  }
  const date = zoomDateFromAnchor(zoomRows, target.anchor)
  if (!date) return null
  const row = zoomRows.find((datum) => datum.Date.getTime() === date.getTime())
  if (!row) return null
  return scenePointToClient(
    surface,
    scene,
    scene.scales.x.map(date),
    scene.scales.y.map(row.Close),
    surface.querySelector<SVGRectElement>('[data-conformance-zoom-surface]') ??
      undefined,
  )
}

function interactionState(
  state: ZoomState,
  input: ConformanceInput,
): ConformanceJsonObject {
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
  const points = visibleZoomData(zoomRows, window).map(
    (row): readonly [number, number] => [
      scene.scales.x.map(row.Date),
      scene.scales.y.map(row.Close),
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
