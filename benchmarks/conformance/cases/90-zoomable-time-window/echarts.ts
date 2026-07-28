import { LineChart } from 'echarts/charts'
import { DataZoomInsideComponent, GridComponent } from 'echarts/components'
import { use } from 'echarts/core'
import { SVGRenderer } from 'echarts/renderers'
import type { LineSeriesOption } from 'echarts/charts'
import type {
  DataZoomComponentOption,
  GridComponentOption,
} from 'echarts/components'
import type { ComposeOption, EChartsType } from 'echarts/core'
import { echartsMount } from '../../shared/echarts-mount'
import {
  initialZoomWindow,
  millisecondsPerDay,
  shiftZoomWindow,
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

use([LineChart, GridComponent, DataZoomInsideComponent, SVGRenderer])

type ZoomOption = ComposeOption<
  LineSeriesOption | GridComponentOption | DataZoomComponentOption
>

interface ZoomState {
  window: ZoomWindow
  lastAction: 'none' | 'zoom' | 'pan' | 'reset'
  active: boolean
  wheelCaptured: boolean
}

const color = '#0f766e'
const yDomain = [20, 85] as const

export const mount: ConformanceMount = (container, input) => {
  const state: ZoomState = {
    window: { ...initialZoomWindow },
    lastAction: 'none',
    active: false,
    wheelCaptured: false,
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
    grid: { top: 56, right: 24, bottom: 44, left: 58 },
    xAxis: {
      type: 'time',
      min: zoomFullDomain[0].getTime(),
      max: zoomFullDomain[1].getTime(),
      name: 'Date',
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
  const document = surface.ownerDocument
  const interaction = document.createElement('div')
  interaction.dataset.conformanceZoomSurface = 'true'
  interaction.tabIndex = 0
  interaction.setAttribute('role', 'application')
  interaction.setAttribute(
    'aria-label',
    'Zoomable time window. Focus the chart before wheel zoom; drag or use a horizontal wheel to pan; use plus, minus, arrow keys, or Home.',
  )
  interaction.setAttribute('aria-keyshortcuts', 'ArrowLeft ArrowRight + - Home')
  Object.assign(interaction.style, {
    position: 'absolute',
    inset: '56px 24px 44px 58px',
    zIndex: '3',
    boxSizing: 'border-box',
    border: '3px dashed transparent',
    outline: 'none',
    background: 'transparent',
    touchAction: 'pan-y',
  })

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
  reset.type = 'button'
  reset.dataset.conformanceZoomReset = 'true'
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

  surface.append(interaction, status, reset)
  let drag:
    | {
        pointerId: number
        originX: number
        originWindow: ZoomWindow
      }
    | undefined

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
    interaction.style.borderColor = active ? 'currentColor' : 'transparent'
    interaction.dataset.zoomActive = String(active)
    updateStatus()
  }

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
    updateStatus()
  }

  const handleWheel = (event: WheelEvent) => {
    state.wheelCaptured = false
    if (!state.active) return
    if (!event.deltaX && !event.deltaY) return
    event.preventDefault()
    state.wheelCaptured = true
    if (Math.abs(event.deltaY) >= Math.abs(event.deltaX) && event.deltaY) {
      const anchor = dateAtPointer(chart, surface, event)
      if (!anchor) return
      const delta = normalizedWheelDelta(event, 'y')
      applyWindow(
        zoomWindowAt(state.window, anchor, 2 ** (delta / 240)),
        'zoom',
      )
      return
    }
    const delta = normalizedWheelDelta(event, 'x')
    const span = state.window.end.getTime() - state.window.start.getTime()
    applyWindow(shiftZoomWindow(state.window, (delta / 880) * span), 'pan')
  }

  const handleFocus = () => {
    updateActivation(true)
  }

  const handleBlur = () => {
    updateActivation(false)
  }

  const handleKeyDown = (event: KeyboardEvent) => {
    const center = new Date(
      (state.window.start.getTime() + state.window.end.getTime()) / 2,
    )
    if (event.key === '+' || event.key === '=') {
      event.preventDefault()
      applyWindow(zoomWindowAt(state.window, center, 0.5), 'zoom')
      return
    }
    if (event.key === '-') {
      event.preventDefault()
      applyWindow(zoomWindowAt(state.window, center, 2), 'zoom')
      return
    }
    if (event.key === 'Home') {
      event.preventDefault()
      applyWindow({ ...initialZoomWindow }, 'reset')
      return
    }
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault()
      const span = state.window.end.getTime() - state.window.start.getTime()
      applyWindow(
        shiftZoomWindow(
          state.window,
          (event.key === 'ArrowLeft' ? -1 : 1) * span * 0.125,
        ),
        'pan',
      )
    }
  }

  const handlePointerDown = (event: PointerEvent) => {
    const wasActive = state.active
    interaction.focus()
    if (!wasActive || event.button !== 0) return
    event.preventDefault()
    drag = {
      pointerId: event.pointerId,
      originX: event.clientX,
      originWindow: { ...state.window },
    }
    interaction.setPointerCapture(event.pointerId)
  }

  const handlePointerMove = (event: PointerEvent) => {
    if (!drag || drag.pointerId !== event.pointerId) return
    const span =
      drag.originWindow.end.getTime() - drag.originWindow.start.getTime()
    const delta =
      ((drag.originX - event.clientX) /
        Math.max(1, interaction.getBoundingClientRect().width)) *
      span
    applyWindow(shiftZoomWindow(drag.originWindow, delta), 'pan')
  }

  const finishPointer = (event: PointerEvent) => {
    if (!drag || drag.pointerId !== event.pointerId) return
    if (interaction.hasPointerCapture(event.pointerId)) {
      interaction.releasePointerCapture(event.pointerId)
    }
    drag = undefined
  }

  const cancelPointer = (event: PointerEvent) => {
    if (!drag || drag.pointerId !== event.pointerId) return
    applyWindow(drag.originWindow, 'pan')
    if (interaction.hasPointerCapture(event.pointerId)) {
      interaction.releasePointerCapture(event.pointerId)
    }
    drag = undefined
  }

  const resetZoom = () => {
    applyWindow({ ...initialZoomWindow }, 'reset')
    interaction.focus()
  }

  interaction.addEventListener('focus', handleFocus)
  interaction.addEventListener('blur', handleBlur)
  interaction.addEventListener('wheel', handleWheel, {
    passive: false,
  })
  interaction.addEventListener('keydown', handleKeyDown)
  interaction.addEventListener('pointerdown', handlePointerDown)
  interaction.addEventListener('pointermove', handlePointerMove)
  interaction.addEventListener('pointerup', finishPointer)
  interaction.addEventListener('pointercancel', cancelPointer)
  reset.addEventListener('click', resetZoom)
  updateActivation(false)

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
      interaction.removeEventListener('focus', handleFocus)
      interaction.removeEventListener('blur', handleBlur)
      interaction.removeEventListener('wheel', handleWheel)
      interaction.removeEventListener('keydown', handleKeyDown)
      interaction.removeEventListener('pointerdown', handlePointerDown)
      interaction.removeEventListener('pointermove', handlePointerMove)
      interaction.removeEventListener('pointerup', finishPointer)
      interaction.removeEventListener('pointercancel', cancelPointer)
      reset.removeEventListener('click', resetZoom)
      interaction.remove()
      status.remove()
      reset.remove()
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
  const roundedDay =
    Math.round(value[0] / millisecondsPerDay) * millisecondsPerDay
  return new Date(
    Math.abs(roundedDay - value[0]) <= millisecondsPerDay / 24
      ? roundedDay
      : value[0],
  )
}

function resolveTarget(
  chart: EChartsType,
  surface: HTMLDivElement,
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
  const date = zoomDateFromAnchor(target.anchor)
  if (!date) return null
  const point = pixelPoint(chart, date, 52)
  if (!point) return null
  const bounds = surface.getBoundingClientRect()
  return {
    x: bounds.left + point[0],
    y: bounds.top + point[1],
    focusElement:
      surface.querySelector<HTMLElement>('[data-conformance-zoom-surface]') ??
      surface,
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
      active: state.active,
      wheelCaptured: state.wheelCaptured,
    },
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
