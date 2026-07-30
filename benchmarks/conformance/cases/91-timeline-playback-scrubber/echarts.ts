import { LineChart } from 'echarts/charts'
import { AriaComponent, GridComponent } from 'echarts/components'
import { use } from 'echarts/core'
import { SVGRenderer } from 'echarts/renderers'
import { aapl } from '@charts-poc/demo-data/aapl'
import type { AaplRow } from '@charts-poc/demo-data/aapl'
import type { LineSeriesOption } from 'echarts/charts'
import type {
  AriaComponentOption,
  GridComponentOption,
} from 'echarts/components'
import type { ComposeOption, EChartsType } from 'echarts/core'
import { echartsMount } from '../../shared/echarts-mount'
import {
  initialPlaybackIndex,
  playbackDomain,
  playbackDateKey,
  playbackIndexFromAnchor,
  selectPlaybackRows,
} from './model'
import { createPlaybackOverlay } from './overlay'
import type { PlaybackOverlayLayout } from './overlay'
import type {
  ConformanceGeometryQuery,
  ConformanceGeometrySample,
  ConformanceInput,
  ConformanceMount,
  ConformanceTarget,
  ConformanceTestDriver,
} from '../../types'

use([LineChart, GridComponent, AriaComponent, SVGRenderer])

type PlaybackOption = ComposeOption<
  LineSeriesOption | GridComponentOption | AriaComponentOption
>

interface PlaybackState {
  index: number
  dragging: boolean
  scrubCount: number
  playing: boolean
  originIndex: number | null
}

const linePaint = '#2563eb'
const margin = { top: 64, right: 24, bottom: 68, left: 56 }
const playbackRows = selectPlaybackRows(aapl)
const [playbackStart, playbackEnd] = playbackDomain(playbackRows)

export const mount: ConformanceMount = (container, input) => {
  const state: PlaybackState = {
    index: initialPlaybackIndex,
    dragging: false,
    scrubCount: 0,
    playing: false,
    originIndex: null,
  }
  const view = container.ownerDocument.createElement('div')
  view.dataset.conformanceView = 'main'
  view.style.position = 'relative'
  view.style.touchAction = 'pan-y'
  sizeView(view, input)
  container.append(view)

  let paint = () => {}
  let destroyInteractions = () => {}
  const mountCase = echartsMount(
    playbackOption,
    'AAPL closes with a draggable timeline playback scrubber',
    ({ chart, surface, getInput }) => {
      surface.removeAttribute('data-conformance-view')
      const interactions = createPlaybackInteractions(
        chart,
        surface,
        view,
        getInput,
        state,
      )
      paint = interactions.paint
      destroyInteractions = interactions.destroy
      return interactions.driver
    },
  )
  const handle = mountCase(view, input)
  paint()

  return {
    driver: handle.driver,
    update(nextInput) {
      sizeView(view, nextInput)
      handle.update(nextInput)
      paint()
    },
    destroy() {
      destroyInteractions()
      handle.destroy()
      view.remove()
    },
  }
}

function playbackOption(_input: ConformanceInput): PlaybackOption {
  return {
    animation: false,
    aria: {
      enabled: true,
      description:
        'Eight observed AAPL closes controlled by a draggable semantic playhead.',
    },
    grid: margin,
    xAxis: {
      type: 'time',
      boundaryGap: [0, 0],
      min: playbackStart.getTime(),
      max: playbackEnd.getTime(),
      axisLabel: {
        formatter(value: number) {
          return new Date(value).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            timeZone: 'UTC',
          })
        },
      },
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
    series: {
      id: 'playback-series',
      type: 'line',
      data: playbackRows.map((row) => ({
        id: playbackDateKey(row.Date),
        name: playbackDateKey(row.Date),
        value: [row.Date.getTime(), row.Close],
      })),
      color: linePaint,
      lineStyle: { color: linePaint, width: 2.5 },
      itemStyle: {
        color: linePaint,
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

function createPlaybackInteractions(
  chart: EChartsType,
  surface: HTMLDivElement,
  view: HTMLDivElement,
  getInput: () => ConformanceInput,
  state: PlaybackState,
) {
  let playbackTimer: ReturnType<typeof setInterval> | null = null
  let paint = () => {}
  let announce = (_message: string) => {}
  const frameText = () => {
    const row = playbackRows[state.index]
    return row ? playbackValueText(row) : 'No frame'
  }
  const stopPlayback = (message?: string) => {
    if (playbackTimer !== null) {
      clearInterval(playbackTimer)
      playbackTimer = null
    }
    state.playing = false
    paint()
    if (message) announce(`${message}. ${frameText()}`)
  }
  const togglePlayback = () => {
    if (state.playing) {
      stopPlayback('Playback paused')
      return
    }
    const lastIndex = playbackRows.length - 1
    const restarting = state.index >= lastIndex
    if (restarting) state.index = 0
    state.playing = true
    playbackTimer = setInterval(() => {
      const nextLastIndex = playbackRows.length - 1
      if (state.index >= nextLastIndex) {
        stopPlayback('Playback ended')
        return
      }
      state.index += 1
      paint()
    }, 700)
    paint()
    announce(
      `${restarting ? 'Playback restarted' : 'Playback started'}. ${frameText()}`,
    )
  }
  const beginChange = () => {
    if (state.dragging) return
    stopPlayback()
    state.originIndex = state.index
    state.dragging = true
  }
  const overlay = createPlaybackOverlay(
    view,
    (index) => {
      beginChange()
      state.index = Math.max(0, Math.min(playbackRows.length - 1, index))
      paint()
    },
    togglePlayback,
  )
  announce = overlay.announce

  const layout = () => playbackLayout(chart, surface, view, state.index)
  paint = () => {
    const nextLayout = layout()
    const row = playbackRows[state.index]
    if (!nextLayout || !row) return
    overlay.paint(nextLayout, {
      index: state.index,
      max: playbackRows.length - 1,
      playing: state.playing,
      valueText: playbackValueText(row),
    })
  }

  let scrubPointerId: number | null = null
  const updateFromPointer = (event: PointerEvent) => {
    const currentLayout = layout()
    if (!currentLayout || !isScrubberTarget(view, currentLayout, event)) return
    const bounds = view.getBoundingClientRect()
    state.index = nearestFrameIndex(
      currentLayout.frameXs,
      event.clientX - bounds.left,
    )
    paint()
  }
  const handlePointerDown = (event: PointerEvent) => {
    if (event.button !== 0) return
    event.preventDefault()
    overlay.range.focus()
    beginChange()
    scrubPointerId = event.pointerId
    overlay.range.setPointerCapture(event.pointerId)
    updateFromPointer(event)
  }
  const handlePointerMove = (event: PointerEvent) => {
    if (scrubPointerId !== event.pointerId) return
    event.preventDefault()
    updateFromPointer(event)
  }
  const handlePointerUp = (event: PointerEvent) => {
    if (scrubPointerId !== event.pointerId) return
    updateFromPointer(event)
    if (overlay.range.hasPointerCapture(event.pointerId)) {
      overlay.range.releasePointerCapture(event.pointerId)
    }
    scrubPointerId = null
    commitChange()
  }

  const commitChange = () => {
    if (!state.dragging) return
    state.dragging = false
    state.originIndex = null
    state.scrubCount += 1
    paint()
    announce(`Frame selected. ${frameText()}`)
  }

  const cancelChange = (event?: PointerEvent) => {
    if (!state.dragging) return
    if (event && overlay.range.hasPointerCapture(event.pointerId)) {
      overlay.range.releasePointerCapture(event.pointerId)
    }
    scrubPointerId = null
    if (state.originIndex !== null) state.index = state.originIndex
    state.dragging = false
    state.originIndex = null
    paint()
    announce(`Scrub canceled. ${frameText()}`)
  }

  overlay.range.addEventListener('pointerdown', handlePointerDown)
  overlay.range.addEventListener('pointermove', handlePointerMove)
  overlay.range.addEventListener('pointerup', handlePointerUp)
  overlay.range.addEventListener('change', commitChange)
  overlay.range.addEventListener('pointercancel', cancelChange)

  const driver: ConformanceTestDriver = {
    resolveTarget(target) {
      return resolveTarget(view, layout(), target)
    },
    readState() {
      return interactionState(state, getInput())
    },
    geometry(query) {
      return playbackGeometry(
        chart,
        surface,
        view,
        getInput(),
        layout(),
        overlay.ruleGeometry(),
        query,
      )
    },
    viewBounds(viewName) {
      return viewName === undefined || viewName === 'main'
        ? clientBounds(view)
        : null
    },
    settle() {
      chart.getZr().flush()
      paint()
    },
  }

  return {
    driver,
    paint,
    destroy() {
      if (playbackTimer !== null) clearInterval(playbackTimer)
      overlay.range.removeEventListener('pointerdown', handlePointerDown)
      overlay.range.removeEventListener('pointermove', handlePointerMove)
      overlay.range.removeEventListener('pointerup', handlePointerUp)
      overlay.range.removeEventListener('change', commitChange)
      overlay.range.removeEventListener('pointercancel', cancelChange)
      overlay.destroy()
    },
  }
}

function resolveTarget(
  view: HTMLDivElement,
  layout: PlaybackOverlayLayout | null,
  target: ConformanceTarget,
) {
  if (!layout || (target.view !== undefined && target.view !== 'main')) {
    return null
  }
  if (target.anchor === 'control:play') {
    const button = view.querySelector<HTMLButtonElement>(
      'button[aria-label$="timeline"]',
    )
    if (!button) return null
    const bounds = button.getBoundingClientRect()
    return {
      x: bounds.left + bounds.width / 2,
      y: bounds.top + bounds.height / 2,
      focusElement: button,
    }
  }
  const index = playbackIndexFromAnchor(playbackRows, target.anchor)
  const x = index === null ? undefined : layout.frameXs[index]
  if (x === undefined) return null
  const bounds = view.getBoundingClientRect()
  return {
    x: bounds.left + x,
    y: bounds.top + layout.trackY,
    focusElement:
      view.querySelector<HTMLInputElement>('.ts-conformance-playback-range') ??
      undefined,
  }
}

function interactionState(state: PlaybackState, input: ConformanceInput) {
  const rows = playbackRows
  const row = rows[state.index]
  return {
    playhead: {
      index: state.index,
      date: row ? playbackDateKey(row.Date) : null,
      value: row?.Close ?? null,
      progress: rows.length > 1 ? state.index / (rows.length - 1) : 0,
    },
    frames: {
      count: rows.length,
      ids: rows.map((datum) => playbackDateKey(datum.Date)),
      jan5Close: rows[3]?.Close ?? null,
    },
    interaction: {
      dragging: state.dragging,
      scrubCount: state.scrubCount,
      playing: state.playing,
    },
  }
}

function playbackGeometry(
  chart: EChartsType,
  surface: HTMLDivElement,
  view: HTMLDivElement,
  input: ConformanceInput,
  layout: PlaybackOverlayLayout | null,
  overlayRules: readonly ConformanceGeometrySample[],
  query: ConformanceGeometryQuery,
): readonly ConformanceGeometrySample[] {
  if (!layout || (query.view !== undefined && query.view !== 'main')) {
    return []
  }
  const viewBounds = view.getBoundingClientRect()
  const points = playbackRows.flatMap((row) => {
    const point = localPoint(chart, surface, view, row.Date, row.Close)
    return point ? [point] : []
  })

  if (query.role === 'dot') {
    return points.map((point) => ({
      x: viewBounds.left + point[0] - 3.5,
      y: viewBounds.top + point[1] - 3.5,
      width: 7,
      height: 7,
      paint: linePaint,
    }))
  }
  if (query.role === 'line') {
    const sample = pointsBounds(points, viewBounds, linePaint)
    return sample ? [sample] : []
  }
  if (query.role === 'rule') return overlayRules
  return []
}

function playbackLayout(
  chart: EChartsType,
  surface: HTMLDivElement,
  view: HTMLDivElement,
  index: number,
): PlaybackOverlayLayout | null {
  const frameXs = playbackRows.flatMap((row) => {
    const point = localPoint(chart, surface, view, row.Date, row.Close)
    return point ? [point[0]] : []
  })
  const playheadX = frameXs[index]
  if (playheadX === undefined || frameXs.length !== playbackDatesLength()) {
    return null
  }
  const surfaceBounds = surface.getBoundingClientRect()
  const viewBounds = view.getBoundingClientRect()
  const surfaceLeft = surfaceBounds.left - viewBounds.left
  const surfaceTop = surfaceBounds.top - viewBounds.top
  const left = surfaceLeft + margin.left
  const right = surfaceLeft + chart.getWidth() - margin.right
  const top = surfaceTop + margin.top
  const bottom = surfaceTop + chart.getHeight() - margin.bottom
  return {
    left,
    right,
    top,
    bottom,
    trackY: bottom + 34,
    playheadX,
    frameXs,
  }
}

function playbackDatesLength() {
  return playbackRows.length
}

function localPoint(
  chart: EChartsType,
  surface: HTMLDivElement,
  view: HTMLDivElement,
  date: Date,
  value: number,
): readonly [number, number] | null {
  const point = chart.convertToPixel({ xAxisIndex: 0, yAxisIndex: 0 }, [
    date.getTime(),
    value,
  ])
  if (!isFinitePoint(point)) return null
  const surfaceBounds = surface.getBoundingClientRect()
  const viewBounds = view.getBoundingClientRect()
  return [
    surfaceBounds.left - viewBounds.left + point[0],
    surfaceBounds.top - viewBounds.top + point[1],
  ]
}

function isFinitePoint(value: unknown): value is [number, number] {
  return (
    Array.isArray(value) &&
    typeof value[0] === 'number' &&
    typeof value[1] === 'number' &&
    Number.isFinite(value[0]) &&
    Number.isFinite(value[1])
  )
}

function isScrubberTarget(
  view: HTMLDivElement,
  layout: PlaybackOverlayLayout,
  event: PointerEvent,
) {
  const bounds = view.getBoundingClientRect()
  const x = event.clientX - bounds.left
  const y = event.clientY - bounds.top
  return (
    x >= layout.left - 12 &&
    x <= layout.right + 12 &&
    Math.abs(y - layout.trackY) <= 18
  )
}

function nearestFrameIndex(frameXs: readonly number[], x: number) {
  let nearestIndex = 0
  let nearestDistance = Number.POSITIVE_INFINITY
  frameXs.forEach((frameX, index) => {
    const distance = Math.abs(frameX - x)
    if (distance < nearestDistance) {
      nearestDistance = distance
      nearestIndex = index
    }
  })
  return nearestIndex
}

function pointsBounds(
  points: readonly (readonly [number, number])[],
  viewBounds: DOMRect,
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
    x: viewBounds.left + left,
    y: viewBounds.top + top,
    width: Math.max(1, right - left),
    height: Math.max(1, bottom - top),
    paint,
  }
}

function clientBounds(element: HTMLElement): ConformanceGeometrySample {
  const bounds = element.getBoundingClientRect()
  return {
    x: bounds.left,
    y: bounds.top,
    width: bounds.width,
    height: bounds.height,
  }
}

function sizeView(view: HTMLDivElement, input: ConformanceInput) {
  view.style.width = `${input.width}px`
  view.style.height = `${input.height}px`
}

function playbackValueText(row: AaplRow) {
  return `${playbackDateKey(row.Date)} · AAPL close $${row.Close.toFixed(2)}`
}
