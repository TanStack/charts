import { defineChart, dot, lineY, mountChart } from '@tanstack/charts'
import { scaleLinear, scaleUtc } from 'd3-scale'
import {
  formatStreamingDate,
  fullStreamingViewport,
  latestStreamingViewport,
  streamingData,
  streamingDateKey,
  streamingViewportDomain,
  visibleStreamingData,
} from './data'
import { createStreamingControls, updateStreamingControls } from './controls'
import type {
  ChartHost,
  ChartPoint,
  ChartScene,
  ChartHostOptions,
} from '@tanstack/charts'
import type { StreamingDatum } from './data'
import type { StreamingControls, StreamingViewportMode } from './controls'
import type {
  ConformanceGeometryQuery,
  ConformanceGeometrySample,
  ConformanceInput,
  ConformanceMount,
  ConformanceTarget,
  ConformanceTestDriver,
} from '../../types'

interface StreamingChartInput extends ConformanceInput {
  rows: readonly StreamingDatum[]
  viewport: readonly [Date, Date]
  viewportMode: StreamingViewportMode
}

interface StreamingState {
  rows: readonly StreamingDatum[]
  appended: number
  viewport: readonly [Date, Date]
  viewportMode: StreamingViewportMode
  announcement: string
}

const color = '#2563eb'

const definition = (input: StreamingChartInput) =>
  defineChart(() => {
    const visibleRows = visibleStreamingData(input.rows, input.viewport)
    return {
      marks: [
        lineY(visibleRows, {
          id: 'stream-line',
          x: 'date',
          y: 'value',
          key: 'id',
          stroke: color,
          strokeWidth: 2.5,
        }),
        dot(visibleRows, {
          id: 'stream-points',
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
        scale: scaleUtc().domain(input.viewport),
        label:
          input.viewportMode === 'locked'
            ? 'Locked viewport'
            : input.viewportMode === 'latest'
              ? 'Following latest'
              : 'All samples',
        format: (value) =>
          value.toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            timeZone: 'UTC',
          }),
      },
      y: {
        scale: scaleLinear().domain([0, 80]),
        ticks: 5,
        grid: true,
        label: 'Value',
      },
      margin: { top: 18, right: 24, bottom: 44, left: 58 },
    }
  })

export const mount: ConformanceMount = (container, input) => {
  let currentInput = input
  const state: StreamingState = {
    rows: streamingData(input.revision),
    appended: 0,
    viewport: streamingViewportDomain,
    viewportMode: 'locked',
    announcement: '',
  }
  const view = container.ownerDocument.createElement('div')
  view.dataset.conformanceView = 'main'
  view.style.display = 'grid'
  view.style.gridTemplateRows = '78px minmax(0, 1fr)'

  const chartSurface = container.ownerDocument.createElement('div')
  chartSurface.style.minHeight = '0'
  const render = () => {
    updateStreamingControls(controls, {
      mode: state.viewportMode,
      status: streamingStatus(state),
    })
    host?.update(chartOptions())
  }
  const controls = createStreamingControls(container.ownerDocument, {
    append() {
      state.appended += 1
      state.rows = streamingData(currentInput.revision, state.appended)
      if (state.viewportMode === 'latest') {
        state.viewport = latestStreamingViewport(state.rows)
      } else if (state.viewportMode === 'all') {
        state.viewport = fullStreamingViewport(state.rows)
      }
      const added = state.rows.at(-1)
      state.announcement = added
        ? `Added ${formatStreamingDate(added.date)} (${added.value}). ${
            visibleStreamingData([added], state.viewport).length
              ? 'The new sample is visible.'
              : `It is outside the locked viewport ending ${formatStreamingDate(state.viewport[1])}.`
          }`
        : ''
      render()
    },
    follow() {
      state.viewportMode = 'latest'
      state.viewport = latestStreamingViewport(state.rows)
      state.announcement = `Following the latest samples through ${formatStreamingDate(state.viewport[1])}.`
      render()
    },
    showAll() {
      state.viewportMode = 'all'
      state.viewport = fullStreamingViewport(state.rows)
      state.announcement = `Viewport unlocked. Showing all ${state.rows.length} samples.`
      render()
    },
  })
  view.append(controls.root, chartSurface)
  container.append(view)
  sizeStreamingView(view, chartSurface, input)

  const chartOptions = (): ChartHostOptions<StreamingDatum> => ({
    definition: definition({
      ...currentInput,
      rows: state.rows,
      viewport: state.viewport,
      viewportMode: state.viewportMode,
    }),
    width: currentInput.width,
    height: streamingChartHeight(currentInput.height),
    ariaLabel: 'Streaming observations in a locked time viewport',
    animate: false,
    keyboard: true,
    tooltip: {
      format: (point: ChartPoint<StreamingDatum>) =>
        `${formatStreamingDate(point.datum.date)} · ${point.datum.value.toLocaleString()}`,
    },
  })
  let host: ChartHost<StreamingDatum> | undefined
  host = mountChart(chartSurface, chartOptions())
  updateStreamingControls(controls, {
    mode: state.viewportMode,
    status: streamingStatus(state),
  })

  const driver = createDriver(chartSurface, controls, state, host)

  return {
    driver,
    update(nextInput) {
      currentInput = nextInput
      state.rows = streamingData(nextInput.revision, state.appended)
      if (state.viewportMode === 'latest') {
        state.viewport = latestStreamingViewport(state.rows)
      } else if (state.viewportMode === 'all') {
        state.viewport = fullStreamingViewport(state.rows)
      }
      sizeStreamingView(view, chartSurface, nextInput)
      updateStreamingControls(controls, {
        mode: state.viewportMode,
        status: streamingStatus(state),
      })
      host.update(chartOptions())
    },
    destroy() {
      host.destroy()
      view.remove()
    },
  }
}

function createDriver(
  chartSurface: HTMLDivElement,
  controls: StreamingControls,
  state: StreamingState,
  host: ChartHost<StreamingDatum>,
): ConformanceTestDriver {
  return {
    resolveTarget(target) {
      return controlTarget(controls, target)
    },
    readState() {
      return streamingState(state)
    },
    geometry(query) {
      return streamingGeometry(chartSurface, state, host.getScene(), query)
    },
  }
}

function controlTarget(controls: StreamingControls, target: ConformanceTarget) {
  if (target.view !== undefined && target.view !== 'main') return null
  const button =
    target.anchor === 'control:append'
      ? controls.append
      : target.anchor === 'control:follow'
        ? controls.follow
        : target.anchor === 'control:all'
          ? controls.showAll
          : null
  if (!button) return null
  const bounds = button.getBoundingClientRect()
  return {
    x: bounds.left + bounds.width / 2,
    y: bounds.top + bounds.height / 2,
    focusElement: button,
  }
}

function streamingState(state: StreamingState) {
  const first = state.rows[0]
  const last = state.rows[state.rows.length - 1]
  const visibleRows = visibleStreamingData(state.rows, state.viewport)
  const revisionProbe = visibleRows.find((row) => row.id === 'sample-7')
  return {
    data: {
      count: state.rows.length,
      ids: state.rows.map((row) => row.id),
      domainStart: first ? streamingDateKey(first.date) : null,
      domainEnd: last ? streamingDateKey(last.date) : null,
    },
    visible: {
      count: visibleRows.length,
      ids: visibleRows.map((row) => row.id),
      revisionProbeValue: revisionProbe?.value ?? null,
    },
    viewport: {
      start: streamingDateKey(state.viewport[0]),
      end: streamingDateKey(state.viewport[1]),
      locked: state.viewportMode === 'locked',
      mode: state.viewportMode,
    },
    control: {
      appended: state.appended,
    },
  }
}

function streamingGeometry(
  chartSurface: HTMLDivElement,
  state: StreamingState,
  scene: ChartScene<StreamingDatum>,
  query: ConformanceGeometryQuery,
): readonly ConformanceGeometrySample[] {
  if (query.view !== undefined && query.view !== 'main') return []
  const svg = chartSurface.querySelector<SVGSVGElement>('svg.ts-chart')
  if (!svg) return []
  const rows = visibleStreamingData(state.rows, state.viewport)
  const bounds = svg.getBoundingClientRect()
  const scaleX = bounds.width / scene.width
  const scaleY = bounds.height / scene.height
  const points = rows.map((row): readonly [number, number] => [
    scene.scales.x.map(row.date),
    scene.scales.y.map(row.value),
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
    const sample = pointsBounds(points, bounds, scaleX, scaleY)
    return sample ? [sample] : []
  }
  return []
}

function pointsBounds(
  points: readonly (readonly [number, number])[],
  svgBounds: DOMRect,
  scaleX: number,
  scaleY: number,
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
    paint: color,
  }
}

function streamingStatus(state: StreamingState) {
  if (state.announcement) return state.announcement
  return `${state.rows.length} samples · ${formatStreamingDate(
    state.viewport[0],
  )}–${formatStreamingDate(state.viewport[1])} · viewport locked`
}

function streamingChartHeight(viewportHeight: number) {
  return Math.max(180, viewportHeight - 78)
}

function sizeStreamingView(
  view: HTMLDivElement,
  chartSurface: HTMLDivElement,
  input: ConformanceInput,
) {
  view.style.width = `${input.width}px`
  view.style.height = `${input.height}px`
  chartSurface.style.width = `${input.width}px`
  chartSurface.style.height = `${streamingChartHeight(input.height)}px`
}
