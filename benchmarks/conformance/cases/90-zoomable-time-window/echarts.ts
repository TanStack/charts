import { LineChart } from 'echarts/charts'
import {
  AriaComponent,
  DataZoomInsideComponent,
  GridComponent,
} from 'echarts/components'
import { use } from 'echarts/core'
import { SVGRenderer } from 'echarts/renderers'
import type { LineSeriesOption } from 'echarts/charts'
import type {
  AriaComponentOption,
  DataZoomComponentOption,
  GridComponentOption,
} from 'echarts/components'
import type { ComposeOption, EChartsType } from 'echarts/core'
import { echartsMount } from '../../shared/echarts-mount'
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
import type { ZoomWindow } from './data'
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
  DataZoomInsideComponent,
  AriaComponent,
  SVGRenderer,
])

type ZoomOption = ComposeOption<
  | LineSeriesOption
  | GridComponentOption
  | DataZoomComponentOption
  | AriaComponentOption
>

interface ZoomState {
  window: ZoomWindow
  lastAction: 'none' | 'zoom' | 'pan'
}

const color = '#0f766e'
const yDomain = [20, 85] as const

export const mount: ConformanceMount = (container, input) => {
  const state: ZoomState = {
    window: { ...initialZoomWindow },
    lastAction: 'none',
  }
  let destroyInteractions = () => {}
  const mountCase = echartsMount(
    (nextInput) => zoomOption(nextInput, state.window),
    'Time series with a wheel-zoomable and pannable time viewport',
    ({ chart, surface, getInput }) => {
      const interactions = createZoomInteractions(
        chart,
        surface,
        getInput,
        state,
      )
      destroyInteractions = interactions.destroy
      return interactions.driver
    },
  )
  const handle = mountCase(container, input)

  return {
    driver: handle.driver,
    update(nextInput) {
      handle.update(nextInput)
    },
    destroy() {
      destroyInteractions()
      handle.destroy()
    },
  }
}

function zoomOption(input: ConformanceInput, window: ZoomWindow): ZoomOption {
  const rows = zoomData(input.revision)
  const percent = zoomPercent(window)
  return {
    animation: false,
    aria: {
      enabled: true,
      description:
        'A daily time series whose visible domain zooms around the pointer and pans horizontally.',
    },
    grid: { top: 20, right: 24, bottom: 44, left: 58 },
    xAxis: {
      type: 'time',
      min: zoomFullDomain[0].getTime(),
      max: zoomFullDomain[1].getTime(),
      name: 'Wheel to zoom · horizontal wheel to pan',
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
    dataZoom: {
      id: 'time-window',
      type: 'inside',
      xAxisIndex: 0,
      start: percent.start,
      end: percent.end,
      filterMode: 'filter',
      zoomOnMouseWheel: false,
      moveOnMouseWheel: false,
      moveOnMouseMove: false,
      preventDefaultMouseMove: false,
      throttle: 0,
    },
    series: {
      id: 'zoom-series',
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

function createZoomInteractions(
  chart: EChartsType,
  surface: HTMLDivElement,
  getInput: () => ConformanceInput,
  state: ZoomState,
) {
  const applyWindow = (window: ZoomWindow, action: ZoomState['lastAction']) => {
    state.window = window
    state.lastAction = action
    const percent = zoomPercent(window)
    chart.dispatchAction({
      type: 'dataZoom',
      dataZoomId: 'time-window',
      start: percent.start,
      end: percent.end,
    })
    chart.getZr().flush()
  }

  const handleWheel = (event: WheelEvent) => {
    if (!event.deltaX && !event.deltaY) return
    event.preventDefault()
    if (Math.abs(event.deltaY) >= Math.abs(event.deltaX) && event.deltaY) {
      const anchor = dateAtPointer(chart, surface, event)
      if (!anchor) return
      applyWindow(
        zoomWindowAt(state.window, anchor, event.deltaY < 0 ? 0.5 : 2),
        'zoom',
      )
      return
    }
    applyWindow(panZoomWindow(state.window, event.deltaX < 0 ? -1 : 1), 'pan')
  }

  surface.addEventListener('wheel', handleWheel, {
    capture: true,
    passive: false,
  })

  const driver: ConformanceTestDriver = {
    resolveTarget(target) {
      return resolveTarget(chart, surface, target)
    },
    readState() {
      return interactionState(state, getInput())
    },
    geometry(query) {
      return zoomGeometry(chart, surface, getInput(), state.window, query)
    },
    settle() {
      chart.getZr().flush()
    },
  }

  return {
    driver,
    destroy() {
      surface.removeEventListener('wheel', handleWheel, true)
    },
  }
}

function zoomPercent(window: ZoomWindow) {
  const start = zoomFullDomain[0].getTime()
  const span = zoomFullDomain[1].getTime() - start
  return {
    start: ((window.start.getTime() - start) / span) * 100,
    end: ((window.end.getTime() - start) / span) * 100,
  }
}

function dateAtPointer(
  chart: EChartsType,
  surface: HTMLDivElement,
  event: WheelEvent,
) {
  const bounds = surface.getBoundingClientRect()
  const value = chart.convertFromPixel({ xAxisIndex: 0, yAxisIndex: 0 }, [
    event.clientX - bounds.left,
    event.clientY - bounds.top,
  ])
  if (!Array.isArray(value) || typeof value[0] !== 'number') return null
  return new Date(value[0])
}

function resolveTarget(
  chart: EChartsType,
  surface: HTMLDivElement,
  target: ConformanceTarget,
) {
  if (target.view !== undefined && target.view !== 'main') return null
  const date = zoomDateFromAnchor(target.anchor)
  if (!date) return null
  const point = pixelPoint(chart, date, 52)
  if (!point) return null
  const bounds = surface.getBoundingClientRect()
  return {
    x: bounds.left + point[0],
    y: bounds.top + point[1],
    focusElement: surface,
  }
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
  chart: EChartsType,
  surface: HTMLDivElement,
  input: ConformanceInput,
  window: ZoomWindow,
  query: ConformanceGeometryQuery,
): readonly ConformanceGeometrySample[] {
  if (query.view !== undefined && query.view !== 'main') return []
  const bounds = surface.getBoundingClientRect()
  const rows = visibleZoomData(zoomData(input.revision), window)
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
  return []
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
