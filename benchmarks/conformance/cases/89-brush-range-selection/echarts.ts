import { LineChart } from 'echarts/charts'
import {
  AriaComponent,
  BrushComponent,
  GridComponent,
  ToolboxComponent,
} from 'echarts/components'
import { use } from 'echarts/core'
import { SVGRenderer } from 'echarts/renderers'
import type { LineSeriesOption } from 'echarts/charts'
import type {
  AriaComponentOption,
  BrushComponentOption,
  GridComponentOption,
  ToolboxComponentOption,
} from 'echarts/components'
import type { ComposeOption, EChartsType } from 'echarts/core'
import { echartsMount } from '../../shared/echarts-mount'
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
import type { BrushRange } from './data'
import type {
  ConformanceGeometryQuery,
  ConformanceGeometrySample,
  ConformanceInput,
  ConformanceJsonObject,
  ConformanceMount,
  ConformanceTarget,
  ConformanceTestDriver,
} from '../../types'

use([
  LineChart,
  GridComponent,
  BrushComponent,
  ToolboxComponent,
  AriaComponent,
  SVGRenderer,
])

type BrushOption = ComposeOption<
  | LineSeriesOption
  | GridComponentOption
  | BrushComponentOption
  | ToolboxComponentOption
  | AriaComponentOption
>

interface BrushState {
  range: BrushRange
  origin: Date | null
  dragging: boolean
}

const color = '#2563eb'
const yDomain = [20, 80] as const

export const mount: ConformanceMount = (container, input) => {
  const state: BrushState = {
    range: { ...initialBrushRange },
    origin: null,
    dragging: false,
  }
  let paint = () => {}
  let destroyInteractions = () => {}
  const mountCase = echartsMount(
    (nextInput) => brushOption(nextInput),
    'Time series with a draggable horizontal range brush',
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

function brushOption(input: ConformanceInput): BrushOption {
  const rows = brushData(input.revision)
  return {
    animation: false,
    aria: {
      enabled: true,
      description:
        'A monthly time series with a persistent horizontal drag selection.',
    },
    grid: { top: 20, right: 24, bottom: 44, left: 58 },
    xAxis: {
      type: 'time',
      min: brushDomain[0].getTime(),
      max: brushDomain[1].getTime(),
      name: 'Month',
      nameLocation: 'middle',
      nameGap: 30,
    },
    yAxis: {
      type: 'value',
      min: yDomain[0],
      max: yDomain[1],
      interval: 20,
      name: 'Value',
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
    series: {
      id: 'brush-series',
      type: 'line',
      data: rows.map((row) => ({
        id: row.id,
        name: row.id,
        value: [row.date.getTime(), row.value],
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
  }

  const handlePointerDown = (event: PointerEvent) => {
    const date = dateAtPointer(chart, surface, event)
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
    if (surface.hasPointerCapture(event.pointerId)) {
      surface.releasePointerCapture(event.pointerId)
    }
    paint()
  }

  surface.addEventListener('pointerdown', handlePointerDown)
  surface.addEventListener('pointermove', handlePointerMove)
  surface.addEventListener('pointerup', finishPointer)
  surface.addEventListener('pointercancel', finishPointer)

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
      surface.removeEventListener('pointercancel', finishPointer)
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
  return clampBrushDate(new Date(value[0]))
}

function resolveTarget(
  chart: EChartsType,
  surface: HTMLDivElement,
  target: ConformanceTarget,
) {
  if (target.view !== undefined && target.view !== 'main') return null
  const date = brushDateFromAnchor(target.anchor)
  if (!date) return null
  const point = pixelPoint(chart, date, 50)
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
  chart: EChartsType,
  surface: HTMLDivElement,
  input: ConformanceInput,
  range: BrushRange,
  query: ConformanceGeometryQuery,
): readonly ConformanceGeometrySample[] {
  if (query.view !== undefined && query.view !== 'main') return []
  const bounds = surface.getBoundingClientRect()
  const rows = brushData(input.revision)
  const points = rows.flatMap((row) => {
    const point = pixelPoint(chart, row.date, row.value)
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
    const start = pixelPoint(chart, range.start, yDomain[1])
    const end = pixelPoint(chart, range.end, yDomain[0])
    if (!start || !end) return []
    const expected = {
      x: bounds.left + Math.min(start[0], end[0]),
      y: bounds.top + Math.min(start[1], end[1]),
      width: Math.max(1, Math.abs(end[0] - start[0])),
      height: Math.abs(end[1] - start[1]),
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
