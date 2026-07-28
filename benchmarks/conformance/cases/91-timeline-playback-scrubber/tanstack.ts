import { defineChart, dot, lineY, mountChart } from '@tanstack/charts'
import { focusDisabled } from '@tanstack/charts/focus/disabled'
import { scaleLinear, scaleUtc } from 'd3-scale'
import {
  initialPlaybackIndex,
  playbackData,
  playbackDateKey,
  playbackDomain,
  playbackIndexFromAnchor,
} from './data'
import { createPlaybackOverlay } from './overlay'
import type {
  ChartHost,
  ChartScene,
  DynamicChartHostOptions,
} from '@tanstack/charts'
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

const definition = defineChart<ConformanceInput>()(({ input }) => {
  const rows = playbackData(input.revision)
  return {
    marks: [
      lineY(rows, {
        id: 'playback-series',
        x: 'date',
        y: 'value',
        key: 'id',
        stroke: linePaint,
        strokeWidth: 2.5,
      }),
      dot(rows, {
        id: 'playback-points',
        x: 'date',
        y: 'value',
        key: 'id',
        fill: linePaint,
        r: 3.5,
        stroke: '#ffffff',
        strokeWidth: 1,
      }),
    ],
    x: {
      scale: scaleUtc().domain(playbackDomain),
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
    },
    margin,
  }
})

export const mount: ConformanceMount = (container, input) => {
  let currentInput = input
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

  const chartSurface = container.ownerDocument.createElement('div')
  view.append(chartSurface)
  container.append(view)

  const options = (): DynamicChartHostOptions<
    PlaybackDatum,
    ConformanceInput
  > => ({
    definition,
    input: currentInput,
    width: currentInput.width,
    height: currentInput.height,
    ariaLabel: 'Weekly values with a draggable timeline playback scrubber',
    animate: false,
    keyboard: false,
    focus: focusDisabled,
  })
  const host = mountChart(chartSurface, options())
  const interactions = createPlaybackInteractions(
    chartSurface,
    view,
    () => currentInput,
    state,
    host,
  )
  interactions.paint()

  return {
    driver: interactions.driver,
    update(nextInput) {
      currentInput = nextInput
      sizeView(view, nextInput)
      host.update(options())
      interactions.paint()
    },
    destroy() {
      interactions.destroy()
      host.destroy()
      view.remove()
    },
  }
}

function createPlaybackInteractions(
  chartSurface: HTMLDivElement,
  view: HTMLDivElement,
  getInput: () => ConformanceInput,
  state: PlaybackState,
  host: ChartHost<PlaybackDatum, ConformanceInput>,
) {
  const overlay = createPlaybackOverlay(view)
  const layout = () =>
    playbackLayout(chartSurface, view, host.getScene(), state.index)

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
    state.index = nearestFrameIndex(
      nextLayout.frameXs,
      event.clientX - bounds.left,
    )
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
      return playbackGeometry(
        chartSurface,
        view,
        host.getScene(),
        getInput(),
        layout(),
        query,
      )
    },
    viewBounds(viewName) {
      return viewName === undefined || viewName === 'main'
        ? clientBounds(view)
        : null
    },
    settle: paint,
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
  chartSurface: HTMLDivElement,
  view: HTMLDivElement,
  scene: ChartScene<PlaybackDatum>,
  input: ConformanceInput,
  layout: PlaybackOverlayLayout | null,
  query: ConformanceGeometryQuery,
): readonly ConformanceGeometrySample[] {
  if (!layout || (query.view !== undefined && query.view !== 'main')) {
    return []
  }
  const viewBounds = view.getBoundingClientRect()
  const points = playbackData(input.revision).flatMap((row) => {
    const point = sceneLocalPoint(
      chartSurface,
      view,
      scene,
      scene.scales.x.map(row.date),
      scene.scales.y.map(row.value),
    )
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
  chartSurface: HTMLDivElement,
  view: HTMLDivElement,
  scene: ChartScene<PlaybackDatum>,
  index: number,
): PlaybackOverlayLayout | null {
  const first = sceneLocalPoint(
    chartSurface,
    view,
    scene,
    scene.chart.x,
    scene.chart.y + scene.chart.height,
  )
  const last = sceneLocalPoint(
    chartSurface,
    view,
    scene,
    scene.chart.x + scene.chart.width,
    scene.chart.y + scene.chart.height,
  )
  const top = sceneLocalPoint(
    chartSurface,
    view,
    scene,
    scene.chart.x,
    scene.chart.y,
  )
  if (!first || !last || !top) return null
  const frameXs = playbackData().flatMap((row) => {
    const point = sceneLocalPoint(
      chartSurface,
      view,
      scene,
      scene.scales.x.map(row.date),
      scene.chart.y + scene.chart.height,
    )
    return point ? [point[0]] : []
  })
  const playheadX = frameXs[index]
  if (playheadX === undefined || frameXs.length !== playbackData().length) {
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

function sceneLocalPoint(
  chartSurface: HTMLDivElement,
  view: HTMLDivElement,
  scene: ChartScene<PlaybackDatum>,
  sceneX: number,
  sceneY: number,
): readonly [number, number] | null {
  const svg = chartSurface.querySelector<SVGSVGElement>('svg.ts-chart')
  if (!svg) return null
  const svgBounds = svg.getBoundingClientRect()
  const viewBounds = view.getBoundingClientRect()
  return [
    svgBounds.left - viewBounds.left + (sceneX / scene.width) * svgBounds.width,
    svgBounds.top - viewBounds.top + (sceneY / scene.height) * svgBounds.height,
  ]
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
