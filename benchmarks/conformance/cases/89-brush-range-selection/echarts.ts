import { LineChart } from 'echarts/charts'
import {
  BrushComponent,
  GridComponent,
  ToolboxComponent,
} from 'echarts/components'
import { use } from 'echarts/core'
import { SVGRenderer } from 'echarts/renderers'
import { aapl } from '@tanstack/charts-data/aapl'
import type { LineSeriesOption } from 'echarts/charts'
import type {
  BrushComponentOption,
  GridComponentOption,
  ToolboxComponentOption,
} from 'echarts/components'
import type { ComposeOption, EChartsType } from 'echarts/core'
import { echartsMount } from '../../shared/echarts-mount'
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
import type { BrushRange } from './model'
import type {
  ConformanceGeometryQuery,
  ConformanceGeometrySample,
  ConformanceInput,
  ConformanceJsonObject,
  ConformanceMount,
  ConformanceTarget,
  ConformanceTestDriver,
} from '../../types'

use([LineChart, GridComponent, BrushComponent, ToolboxComponent, SVGRenderer])

type BrushOption = ComposeOption<
  | LineSeriesOption
  | GridComponentOption
  | BrushComponentOption
  | ToolboxComponentOption
>

interface BrushState {
  range: BrushRange
  origin: Date | null
  dragging: boolean
  originRange: BrushRange | null
}

const color = '#2563eb'
const grid = { top: 52, right: 24, bottom: 44, left: 58 } as const
const brushRows = monthlyAaplRows(aapl)
const brushDates = observedBrushDates(brushRows)
const fullDomain = brushDomain(brushDates)

export const mount: ConformanceMount = (container, input) => {
  const state: BrushState = {
    range: { ...initialBrushRange(brushDates) },
    origin: null,
    dragging: false,
    originRange: null,
  }
  let paint = () => {}
  let destroyInteractions = () => {}
  const mountCase = echartsMount(
    (nextInput) => brushOption(nextInput),
    'Monthly time range brush with two adjustable handles',
    ({ chart, surface, getInput }) => {
      const interactions = createBrushInteractions(
        chart,
        surface,
        getInput,
        state,
      )
      paint = interactions.paint
      destroyInteractions = interactions.destroy
      return interactions.driver
    },
  )
  const handle = mountCase(container, input)
  paint()

  return {
    driver: handle.driver,
    update(nextInput) {
      handle.update(nextInput)
      paint()
    },
    destroy() {
      destroyInteractions()
      handle.destroy()
    },
  }
}

function brushOption(_input: ConformanceInput): BrushOption {
  const rows = brushRows
  return {
    animation: false,
    grid,
    xAxis: {
      type: 'time',
      boundaryGap: [0, 0],
      min: fullDomain[0].getTime(),
      max: fullDomain[1].getTime(),
      name: 'Month',
      nameLocation: 'middle',
      nameGap: 30,
    },
    yAxis: {
      type: 'value',
      min: 'dataMin',
      max: 'dataMax',
      name: 'AAPL close ($)',
      splitLine: {
        show: true,
        lineStyle: { color: '#e2e8f0' },
      },
    },
    brush: {
      xAxisIndex: 'all',
      brushType: 'lineX',
      brushMode: 'single',
      transformable: false,
      removeOnClick: false,
      brushStyle: {
        borderColor: color,
        borderWidth: 1,
        color: brushSelectionFill,
      },
    },
    toolbox: { show: false },
    series: {
      id: 'brush-series',
      type: 'line',
      data: rows.map((row) => ({
        id: brushDateKey(row.Date),
        name: brushDateKey(row.Date),
        value: [row.Date.getTime(), row.Close],
      })),
      color,
      lineStyle: { color, width: 2.5 },
      itemStyle: {
        color,
        borderColor: '#ffffff',
        borderWidth: 1,
      },
      showSymbol: true,
      symbol: 'circle',
      symbolSize: 7,
      emphasis: { disabled: true },
      animation: false,
    },
  }
}

function createBrushInteractions(
  chart: EChartsType,
  surface: HTMLDivElement,
  getInput: () => ConformanceInput,
  state: BrushState,
) {
  surface.style.touchAction = 'none'
  surface.tabIndex = 0
  surface.setAttribute('role', 'application')
  surface.setAttribute(
    'aria-label',
    'Monthly time range brush with two adjustable handles',
  )
  const status = surface.ownerDocument.createElement('output')
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
  surface.append(status)
  const handles = [
    createSemanticHandle(surface, 'start'),
    createSemanticHandle(surface, 'end'),
  ] as const

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

  const paint = () => {
    chart.dispatchAction({
      type: 'brush',
      areas: [
        {
          brushType: 'lineX',
          xAxisIndex: 0,
          coordRange: [state.range.start.getTime(), state.range.end.getTime()],
        },
      ],
    })
    chart.getZr().flush()
    positionSemanticHandles(chart, handles, state.range)
    updateStatus()
  }

  const handlePointerDown = (event: PointerEvent) => {
    const date = dateAtPointer(chart, surface, event)
    if (!date) return
    event.preventDefault()
    state.origin = date
    state.originRange = { ...state.range }
    state.range = { start: date, end: date }
    state.dragging = true
    surface.setPointerCapture(event.pointerId)
    paint()
  }

  const handlePointerMove = (event: PointerEvent) => {
    if (!state.dragging || !state.origin) return
    const date = dateAtPointer(chart, surface, event)
    if (!date) return
    state.range = normalizedBrushRange(state.origin, date)
    paint()
  }

  const finishPointer = (event: PointerEvent) => {
    if (!state.dragging) return
    const date = dateAtPointer(chart, surface, event)
    if (date && state.origin) {
      state.range = normalizedBrushRange(state.origin, date)
    }
    state.dragging = false
    state.origin = null
    state.originRange = null
    if (surface.hasPointerCapture(event.pointerId)) {
      surface.releasePointerCapture(event.pointerId)
    }
    paint()
  }

  const cancelPointer = (event: PointerEvent) => {
    if (!state.dragging) return
    if (state.originRange) state.range = state.originRange
    state.dragging = false
    state.origin = null
    state.originRange = null
    if (surface.hasPointerCapture(event.pointerId)) {
      surface.releasePointerCapture(event.pointerId)
    }
    paint()
  }

  const handleKeyDown = (event: KeyboardEvent) => {
    const handle =
      event.target instanceof HTMLButtonElement
        ? event.target.dataset.conformanceBrushHandle
        : undefined
    if (handle !== 'start' && handle !== 'end') return
    const isStart = handle === 'start'
    const currentIndex = rangeIndex(
      isStart ? state.range.start : state.range.end,
    )
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
    const nextDate =
      brushDates[
        Math.max(
          isStart ? 0 : boundaryIndex,
          Math.min(
            isStart ? boundaryIndex : brushDates.length - 1,
            requestedIndex,
          ),
        )
      ]
    if (!nextDate) return
    state.range = isStart
      ? { start: nextDate, end: state.range.end }
      : { start: state.range.start, end: nextDate }
    paint()
    handles[isStart ? 0 : 1].focus()
  }

  surface.addEventListener('pointerdown', handlePointerDown)
  surface.addEventListener('pointermove', handlePointerMove)
  surface.addEventListener('pointerup', finishPointer)
  surface.addEventListener('pointercancel', cancelPointer)
  surface.addEventListener('keydown', handleKeyDown)

  const driver: ConformanceTestDriver = {
    resolveTarget(target) {
      return resolveTarget(chart, surface, target)
    },
    readState() {
      return interactionState(state, getInput())
    },
    geometry(query) {
      return brushGeometry(chart, surface, getInput(), state.range, query)
    },
    settle: paint,
  }

  return {
    driver,
    paint,
    destroy() {
      surface.removeEventListener('pointerdown', handlePointerDown)
      surface.removeEventListener('pointermove', handlePointerMove)
      surface.removeEventListener('pointerup', finishPointer)
      surface.removeEventListener('pointercancel', cancelPointer)
      surface.removeEventListener('keydown', handleKeyDown)
      handles.forEach((handle) => handle.remove())
      status.remove()
    },
  }
}

function dateAtPointer(
  chart: EChartsType,
  surface: HTMLDivElement,
  event: PointerEvent,
) {
  const bounds = surface.getBoundingClientRect()
  const value = chart.convertFromPixel({ xAxisIndex: 0, yAxisIndex: 0 }, [
    event.clientX - bounds.left,
    event.clientY - bounds.top,
  ])
  if (!Array.isArray(value) || typeof value[0] !== 'number') return null
  return clampBrushDate(brushDates, new Date(value[0]))
}

function resolveTarget(
  chart: EChartsType,
  surface: HTMLDivElement,
  target: ConformanceTarget,
) {
  if (target.view !== undefined && target.view !== 'main') return null
  if (target.anchor === 'handle:start' || target.anchor === 'handle:end') {
    const handle = surface.querySelector<HTMLButtonElement>(
      `[data-conformance-brush-handle="${target.anchor === 'handle:start' ? 'start' : 'end'}"]`,
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
  const point = brushPixelPoint(chart, date)
  if (!point) return null
  const bounds = surface.getBoundingClientRect()
  return {
    x: bounds.left + point[0],
    y: bounds.top + point[1],
    focusElement: surface,
  }
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
  chart: EChartsType,
  surface: HTMLDivElement,
  input: ConformanceInput,
  range: BrushRange,
  query: ConformanceGeometryQuery,
): readonly ConformanceGeometrySample[] {
  if (query.view !== undefined && query.view !== 'main') return []
  const bounds = surface.getBoundingClientRect()
  const rows = brushRows
  const points = rows.flatMap((row) => {
    const point = pixelPoint(chart, row.Date, row.Close)
    return point ? [point] : []
  })

  if (query.role === 'dot') {
    return points.map((point) => ({
      x: bounds.left + point[0] - 3.5,
      y: bounds.top + point[1] - 3.5,
      width: 7,
      height: 7,
      paint: color,
    }))
  }
  if (query.role === 'line') {
    const sample = pointsBounds(points, bounds, color)
    return sample ? [sample] : []
  }
  if (query.role === 'rect') {
    const start = brushPixelPoint(chart, range.start)
    const end = brushPixelPoint(chart, range.end)
    if (!start || !end) return []
    const expected = {
      x: bounds.left + Math.min(start[0], end[0]),
      y: bounds.top + grid.top,
      width: Math.max(1, Math.abs(end[0] - start[0])),
      height: chart.getHeight() - grid.top - grid.bottom,
    }
    const rendered = renderedBrushSample(surface, expected)
    return [
      rendered ?? {
        ...expected,
        paint: 'missing-echarts-rendered-brush-fill',
      },
    ]
  }
  return []
}

function renderedBrushSample(
  surface: HTMLDivElement,
  expected: Omit<ConformanceGeometrySample, 'paint'>,
): ConformanceGeometrySample | null {
  const candidates = [
    ...surface.querySelectorAll<SVGGraphicsElement>(
      'svg path, svg rect, svg polygon',
    ),
  ].flatMap((element) => {
    const paint = normalizedElementFill(element)
    if (!paint || paint.endsWith(', 0)')) return []
    const bounds = element.getBoundingClientRect()
    if (
      bounds.width < expected.width * 0.5 ||
      bounds.height < expected.height * 0.75
    ) {
      return []
    }
    const score =
      Math.abs(bounds.x - expected.x) +
      Math.abs(bounds.y - expected.y) +
      Math.abs(bounds.width - expected.width) +
      Math.abs(bounds.height - expected.height)
    return [{ bounds, paint, score }]
  })
  candidates.sort((a, b) => a.score - b.score)
  const candidate = candidates[0]
  return candidate
    ? {
        x: candidate.bounds.x,
        y: candidate.bounds.y,
        width: candidate.bounds.width,
        height: candidate.bounds.height,
        paint: candidate.paint,
      }
    : null
}

function pixelPoint(
  chart: EChartsType,
  date: Date,
  value: number,
): readonly [number, number] | null {
  const point = chart.convertToPixel({ xAxisIndex: 0, yAxisIndex: 0 }, [
    date.getTime(),
    value,
  ])
  if (
    !Array.isArray(point) ||
    typeof point[0] !== 'number' ||
    typeof point[1] !== 'number' ||
    !Number.isFinite(point[0]) ||
    !Number.isFinite(point[1])
  ) {
    return null
  }
  return [point[0], point[1]]
}

function brushPixelPoint(chart: EChartsType, date: Date) {
  const row = brushRows.find((datum) => datum.Date.getTime() === date.getTime())
  return row ? pixelPoint(chart, date, row.Close) : null
}

function pointsBounds(
  points: readonly (readonly [number, number])[],
  surfaceBounds: DOMRect,
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
    x: surfaceBounds.left + left,
    y: surfaceBounds.top + top,
    width: Math.max(1, right - left),
    height: Math.max(1, bottom - top),
    paint,
  }
}

function createSemanticHandle(surface: HTMLDivElement, edge: 'start' | 'end') {
  const handle = surface.ownerDocument.createElement('button')
  handle.type = 'button'
  handle.dataset.conformanceBrushHandle = edge
  handle.setAttribute('role', 'slider')
  handle.setAttribute(
    'aria-label',
    edge === 'start' ? 'Range start' : 'Range end',
  )
  handle.setAttribute('aria-orientation', 'horizontal')
  handle.setAttribute(
    'aria-keyshortcuts',
    'ArrowLeft ArrowRight ArrowUp ArrowDown Home End',
  )
  Object.assign(handle.style, {
    position: 'absolute',
    zIndex: '3',
    width: '16px',
    marginLeft: '-8px',
    padding: '0',
    border: `2px solid ${color}`,
    borderRadius: '4px',
    background: 'Canvas',
    cursor: 'ew-resize',
  })
  surface.append(handle)
  return handle
}

function positionSemanticHandles(
  chart: EChartsType,
  handles: readonly [HTMLButtonElement, HTMLButtonElement],
  range: BrushRange,
) {
  const startIndex = rangeIndex(range.start)
  const endIndex = rangeIndex(range.end)
  const positions = [
    { date: range.start, min: 0, max: endIndex, now: startIndex },
    {
      date: range.end,
      min: startIndex,
      max: brushDates.length - 1,
      now: endIndex,
    },
  ] as const
  handles.forEach((handle, index) => {
    const position = positions[index]
    const point = position ? brushPixelPoint(chart, position.date) : null
    if (!position || !point) return
    handle.style.left = `${point[0]}px`
    handle.style.top = `${grid.top}px`
    handle.style.height = `${chart.getHeight() - grid.top - grid.bottom}px`
    handle.setAttribute('aria-valuemin', String(position.min))
    handle.setAttribute('aria-valuemax', String(position.max))
    handle.setAttribute('aria-valuenow', String(position.now))
    handle.setAttribute('aria-valuetext', brushDateKey(position.date))
  })
}

function rangeIndex(date: Date) {
  return brushDates.findIndex(
    (candidate) => candidate.getTime() === date.getTime(),
  )
}
