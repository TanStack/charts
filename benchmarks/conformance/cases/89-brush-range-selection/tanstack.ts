import { defineChart, dot, lineY, mountChart } from '@tanstack/charts'
import { focusDisabled } from '@tanstack/charts/focus/disabled'
import { aapl } from '@charts-poc/demo-data/aapl'
import { brushX } from 'd3-brush'
import { scaleLinear, scaleUtc } from 'd3-scale'
import { select } from 'd3-selection'
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
import type { ChartScene, ChartHostOptions } from '@tanstack/charts'
import type { D3BrushEvent } from 'd3-brush'
import type { AaplRow } from '@charts-poc/demo-data/aapl'
import type { BrushRange } from './model'
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
  dragging: boolean
  originRange: BrushRange | null
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

const definition = (input: ConformanceInput) => {
  const rows = brushRows
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
  })
}

export function mount(
  container: HTMLElement,
  input: ConformanceInput,
): ConformanceHandle {
  let currentInput = input
  const state: BrushState = {
    range: { ...initialBrushRange(brushDates) },
    dragging: false,
    originRange: null,
  }
  const surface = container.ownerDocument.createElement('div')
  surface.dataset.conformanceView = 'main'
  surface.style.position = 'relative'
  surface.setAttribute('role', 'application')
  surface.setAttribute(
    'aria-label',
    'Monthly time range brush with two adjustable handles',
  )
  setSurfaceSize(surface, input)
  container.append(surface)

  const options = (nextInput: ConformanceInput): ChartHostOptions<AaplRow> => ({
    definition: defineChart(definition(nextInput), {
      animate: false,
      keyboard: false,
      focus: focusDisabled,
    }),
    width: nextInput.width,
    height: nextInput.height,
    ariaLabel: 'Time series with a draggable horizontal range brush',
  })
  const host = mountChart(surface, options(input))
  const controller = createBrushController(
    surface,
    () => currentInput,
    () => host.getScene(),
    state,
  )
  controller.sync()

  const driver = createDriver(
    surface,
    () => currentInput,
    () => host.getScene(),
    state,
    controller.sync,
  )

  return {
    driver,
    update(nextInput) {
      currentInput = nextInput
      setSurfaceSize(surface, nextInput)
      host.update(options(nextInput))
      controller.sync()
    },
    destroy() {
      controller.destroy()
      host.destroy()
      surface.remove()
    },
  }
}

function createBrushController(
  surface: HTMLDivElement,
  getInput: () => ConformanceInput,
  getScene: () => ChartScene<AaplRow>,
  state: BrushState,
) {
  const document = surface.ownerDocument
  const overlay = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  overlay.dataset.conformanceOverlay = 'brush'
  overlay.setAttribute('role', 'group')
  overlay.setAttribute(
    'aria-label',
    'Monthly range brush. Drag to select; focus either handle and use arrow keys, Home, or End to adjust.',
  )
  Object.assign(overlay.style, {
    position: 'absolute',
    inset: '0',
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    pointerEvents: 'auto',
    touchAction: 'none',
  })

  const group = document.createElementNS('http://www.w3.org/2000/svg', 'g')
  overlay.append(group)

  const status = document.createElement('output')
  status.setAttribute('role', 'status')
  status.setAttribute('aria-live', 'polite')
  Object.assign(status.style, {
    position: 'absolute',
    right: '24px',
    top: '10px',
    zIndex: '4',
    padding: '4px 8px',
    border: '1px solid color-mix(in srgb, CanvasText 24%, transparent)',
    borderRadius: '999px',
    background: 'Canvas',
    color: 'CanvasText',
    font: '600 12px/1.2 system-ui, sans-serif',
    pointerEvents: 'none',
  })

  surface.append(overlay, status)
  const groupSelection = select<SVGGElement, unknown>(group)
  let syncing = false

  const behavior = brushX<unknown>()
    .touchable(true)
    .keyModifiers(true)
    .handleSize(16)
    .on('start', (event: D3BrushEvent<unknown>) => {
      if (syncing || !event.sourceEvent) return
      state.originRange = { ...state.range }
      state.dragging = true
      updateStatus()
    })
    .on('brush', (event: D3BrushEvent<unknown>) => {
      if (syncing || !event.sourceEvent) return
      const range = rangeFromSelection(event.selection)
      if (!range) return
      state.range = range
      updateStatus()
      decorateBrush()
    })
    .on('end', (event: D3BrushEvent<unknown>) => {
      if (syncing || !event.sourceEvent) return
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

  const updateStatus = () => {
    const summary = brushRangeSummary(brushRows, state.range)
    const label = `${brushShortDate(state.range.start)} → ${brushShortDate(state.range.end)} · ${summary.count} AAPL closes · avg $${summary.average.toFixed(1)}`
    status.value = label
    status.textContent = label
    status.setAttribute(
      'aria-label',
      `${brushDateKey(state.range.start)} through ${brushDateKey(state.range.end)}, ${summary.count} AAPL closing prices, average $${summary.average.toFixed(1)}`,
    )
  }

  const decorateBrush = () => {
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
      const index = brushDates.findIndex(
        (date) =>
          date.getTime() ===
          (isStart ? state.range.start : state.range.end).getTime(),
      )
      handle.setAttribute('tabindex', '0')
      handle.setAttribute('role', 'slider')
      handle.setAttribute('aria-label', isStart ? 'Range start' : 'Range end')
      handle.setAttribute(
        'aria-valuemin',
        String(isStart ? 0 : Math.max(0, rangeIndex(state.range.start))),
      )
      handle.setAttribute(
        'aria-valuemax',
        String(
          isStart
            ? Math.max(0, rangeIndex(state.range.end))
            : Math.max(0, brushDates.length - 1),
        ),
      )
      handle.setAttribute('aria-valuenow', String(Math.max(0, index)))
      handle.setAttribute('aria-orientation', 'horizontal')
      handle.setAttribute(
        'aria-keyshortcuts',
        'ArrowLeft ArrowRight ArrowUp ArrowDown Home End',
      )
      handle.setAttribute(
        'aria-valuetext',
        brushDateKey(isStart ? state.range.start : state.range.end),
      )
      handle.setAttribute('fill', 'Canvas')
      handle.setAttribute('fill-opacity', '1')
      handle.setAttribute('stroke', color)
      handle.setAttribute('stroke-width', '2')
      handle.style.outline = 'none'
    })
  }

  const sync = () => {
    const scene = getScene()
    overlay.setAttribute('viewBox', `0 0 ${scene.width} ${scene.height}`)
    behavior.extent([
      [scene.chart.x, scene.chart.y],
      [scene.chart.x + scene.chart.width, scene.chart.y + scene.chart.height],
    ])
    syncing = true
    groupSelection.call(behavior)
    groupSelection.call(behavior.move, [
      scene.scales.x.map(state.range.start),
      scene.scales.x.map(state.range.end),
    ])
    syncing = false
    decorateBrush()
    updateStatus()
  }

  const handleKeyDown = (event: KeyboardEvent) => {
    const target = event.target
    if (!(target instanceof SVGRectElement) || !target.matches('.handle')) {
      return
    }
    const isStart = target.classList.contains('handle--w')
    const current = isStart ? state.range.start : state.range.end
    const currentIndex = rangeIndex(current)
    if (currentIndex < 0) return
    const boundary = isStart ? state.range.end : state.range.start
    const boundaryIndex = rangeIndex(boundary)
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
    const nextHandle = group.querySelector<SVGRectElement>(
      isStart ? '.handle--w' : '.handle--e',
    )
    nextHandle?.focus()
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
    if (!state.dragging || !state.originRange) return
    state.range = state.originRange
    state.dragging = false
    state.originRange = null
    sync()
  }

  group.addEventListener('keydown', handleKeyDown)
  group.addEventListener('focusin', handleFocusChange)
  group.addEventListener('focusout', handleFocusChange)
  overlay.addEventListener('pointercancel', cancelActiveBrush)
  overlay.addEventListener('touchcancel', cancelActiveBrush)

  return {
    sync,
    destroy() {
      group.removeEventListener('keydown', handleKeyDown)
      group.removeEventListener('focusin', handleFocusChange)
      group.removeEventListener('focusout', handleFocusChange)
      overlay.removeEventListener('pointercancel', cancelActiveBrush)
      overlay.removeEventListener('touchcancel', cancelActiveBrush)
      groupSelection.on('.brush', null)
      overlay.remove()
      status.remove()
    },
  }
}

function createDriver(
  surface: HTMLDivElement,
  getInput: () => ConformanceInput,
  getScene: () => ChartScene<AaplRow>,
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
  scene: ChartScene<AaplRow>,
  target: ConformanceTarget,
) {
  if (target.view !== undefined && target.view !== 'main') return null
  if (target.anchor === 'handle:start' || target.anchor === 'handle:end') {
    const handle = surface.querySelector<SVGRectElement>(
      target.anchor === 'handle:start' ? '.handle--w' : '.handle--e',
    )
    if (!handle) return null
    const bounds = handle.getBoundingClientRect()
    return {
      x: bounds.left + bounds.width / 2,
      y: bounds.top + bounds.height / 2,
      focusElement: handle,
    }
  }
  const date = brushDateFromAnchor(brushDates, target.anchor)
  if (!date) return null
  const row = brushRows.find((datum) => datum.Date.getTime() === date.getTime())
  if (!row) return null
  return scenePointToClient(
    surface,
    scene,
    scene.scales.x.map(date),
    scene.scales.y.map(row.Close),
  )
}

function interactionState(
  state: BrushState,
  input: ConformanceInput,
): ConformanceJsonObject {
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
  const points = brushRows.map((row): readonly [number, number] => [
    scene.scales.x.map(row.Date),
    scene.scales.y.map(row.Close),
  ])

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

function rangeIndex(date: Date) {
  return brushDates.findIndex(
    (candidate) => candidate.getTime() === date.getTime(),
  )
}
