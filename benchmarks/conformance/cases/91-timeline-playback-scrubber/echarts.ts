import { LineChart } from 'echarts/charts'
import { AriaComponent, GridComponent } from 'echarts/components'
import { use } from 'echarts/core'
import { SVGRenderer } from 'echarts/renderers'
import type { LineSeriesOption } from 'echarts/charts'
import type {
  AriaComponentOption,
  GridComponentOption,
} from 'echarts/components'
import type { ComposeOption, EChartsType } from 'echarts/core'
import { echartsMount } from '../../shared/echarts-mount'
import {
  initialPlaybackIndex,
  playbackData,
  playbackDateKey,
  playbackDomain,
  playbackIndexFromAnchor,
} from './data'
import { createPlaybackOverlay } from './overlay'
import type { PlaybackDatum } from './data'
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
}

const linePaint = '#2563eb'
const playheadPaint = '#f97316'
const trackPaint = '#cbd5e1'
const yDomain: readonly [number, number] = [20, 80]
const margin = { top: 24, right: 24, bottom: 68, left: 56 }

export const mount: ConformanceMount = (container, input) => {
  const state: PlaybackState = {
    index: initialPlaybackIndex,
    dragging: false,
    scrubCount: 0,
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
    'Weekly values with a draggable timeline playback scrubber',
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

function playbackOption(input: ConformanceInput): PlaybackOption {
  return {
    animation: false,
    aria: {
      enabled: true,
      description:
        'Eight weekly values controlled by a draggable semantic playhead.',
    },
    grid: margin,
    xAxis: {
      type: 'time',
      min: playbackDomain[0].getTime(),
      max: playbackDomain[1].getTime(),
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
      min: yDomain[0],
      max: yDomain[1],
      interval: 20,
      splitLine: {
        show: true,
        lineStyle: { color: '#e2e8f0' },
      },
    },
    series: {
      id: 'playback-series',
      type: 'line',
      data: playbackData(input.revision).map((row) => ({
        id: row.id,
        name: row.id,
        value: [row.date.getTime(), row.value],
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
  const overlay = createPlaybackOverlay(view)

  const layout = () => playbackLayout(chart, surface, view, state.index)
  const paint = () => {
    const nextLayout = layout()
    const row = playbackData(getInput().revision)[state.index]
    if (!nextLayout || !row) return
    overlay.paint(nextLayout, `${playbackDateKey(row.date)} · ${row.value}`)
  }

  const selectAtPointer = (event: PointerEvent) => {
    const nextLayout = layout()
    if (!nextLayout) return
    const bounds = view.getBoundingClientRect()
    const localX = event.clientX - bounds.left
    state.index = nearestFrameIndex(nextLayout.frameXs, localX)
    paint()
  }

  const handlePointerDown = (event: PointerEvent) => {
    const nextLayout = layout()
    if (!nextLayout || !isScrubberTarget(view, nextLayout, event)) return
    event.preventDefault()
    state.dragging = true
    view.setPointerCapture(event.pointerId)
    selectAtPointer(event)
  }

  const handlePointerMove = (event: PointerEvent) => {
    if (!state.dragging) return
    selectAtPointer(event)
  }

  const finishPointer = (event: PointerEvent) => {
    if (!state.dragging) return
    selectAtPointer(event)
    state.dragging = false
    state.scrubCount += 1
    if (view.hasPointerCapture(event.pointerId)) {
      view.releasePointerCapture(event.pointerId)
    }
  }

  view.addEventListener('pointerdown', handlePointerDown, true)
  view.addEventListener('pointermove', handlePointerMove, true)
  view.addEventListener('pointerup', finishPointer, true)
  view.addEventListener('pointercancel', finishPointer, true)

  const driver: ConformanceTestDriver = {
    resolveTarget(target) {
      return resolveTarget(view, layout(), target)
    },
    readState() {
      return interactionState(state, getInput())
    },
    geometry(query) {
      return playbackGeometry(chart, surface, view, getInput(), layout(), query)
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
      view.removeEventListener('pointerdown', handlePointerDown, true)
      view.removeEventListener('pointermove', handlePointerMove, true)
      view.removeEventListener('pointerup', finishPointer, true)
      view.removeEventListener('pointercancel', finishPointer, true)
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
  const index = playbackIndexFromAnchor(target.anchor)
  const x = index === null ? undefined : layout.frameXs[index]
  if (x === undefined) return null
  const bounds = view.getBoundingClientRect()
  return {
    x: bounds.left + x,
    y: bounds.top + layout.trackY,
    focusElement: view,
  }
}

function interactionState(state: PlaybackState, input: ConformanceInput) {
  const rows = playbackData(input.revision)
  const row = rows[state.index]
  return {
    playhead: {
      index: state.index,
      date: row ? playbackDateKey(row.date) : null,
      value: row?.value ?? null,
      progress: rows.length > 1 ? state.index / (rows.length - 1) : 0,
    },
    frames: {
      count: rows.length,
      ids: rows.map((datum) => datum.id),
      revisionProbeValue: rows[3]?.value ?? null,
    },
    interaction: {
      dragging: state.dragging,
      scrubCount: state.scrubCount,
    },
  }
}

function playbackGeometry(
  chart: EChartsType,
  surface: HTMLDivElement,
  view: HTMLDivElement,
  input: ConformanceInput,
  layout: PlaybackOverlayLayout | null,
  query: ConformanceGeometryQuery,
): readonly ConformanceGeometrySample[] {
  if (!layout || (query.view !== undefined && query.view !== 'main')) {
    return []
  }
  const viewBounds = view.getBoundingClientRect()
  const points = playbackData(input.revision).flatMap((row) => {
    const point = localPoint(chart, surface, view, row.date, row.value)
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
  if (query.role === 'rule') {
    return [
      {
        x: viewBounds.left + layout.left,
        y: viewBounds.top + layout.trackY - 1,
        width: Math.max(1, layout.right - layout.left),
        height: 2,
        paint: trackPaint,
      },
      {
        x: viewBounds.left + layout.playheadX - 1,
        y: viewBounds.top + layout.top,
        width: 2,
        height: Math.max(1, layout.trackY - layout.top),
        paint: playheadPaint,
      },
    ]
  }
  return []
}

function playbackLayout(
  chart: EChartsType,
  surface: HTMLDivElement,
  view: HTMLDivElement,
  index: number,
): PlaybackOverlayLayout | null {
  const first = localPoint(chart, surface, view, playbackDomain[0], yDomain[0])
  const last = localPoint(chart, surface, view, playbackDomain[1], yDomain[0])
  const top = localPoint(chart, surface, view, playbackDomain[0], yDomain[1])
  if (!first || !last || !top) return null
  const frameXs = playbackData().flatMap((row) => {
    const point = localPoint(chart, surface, view, row.date, yDomain[0])
    return point ? [point[0]] : []
  })
  const playheadX = frameXs[index]
  if (playheadX === undefined || frameXs.length !== playbackDatesLength()) {
    return null
  }
  return {
    left: first[0],
    right: last[0],
    top: top[1],
    bottom: first[1],
    trackY: first[1] + 34,
    playheadX,
    frameXs,
  }
}

function playbackDatesLength() {
  return playbackData().length
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
