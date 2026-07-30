import { defineChart, dot, lineY, mountChart } from '@tanstack/charts'
import { downloads } from '@charts-poc/demo-data/downloads'
import { scaleLinear, scaleUtc } from 'd3-scale'
import { streamingData } from './selection'
import {
  formatStreamingDate,
  fullStreamingViewport,
  latestStreamingViewport,
  streamingDateKey,
  streamingViewportDomain,
  visibleStreamingData,
} from './model'
import { createStreamingControls, updateStreamingControls } from './controls'
import type { ChartHost, ChartScene, ChartHostOptions } from '@tanstack/charts'
import type { DownloadsRow } from '@charts-poc/demo-data/downloads'
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
  rows: readonly DownloadsRow[]
  viewport: readonly [Date, Date]
  viewportMode: StreamingViewportMode
}

interface StreamingState {
  rows: readonly DownloadsRow[]
  appended: number
  viewport: readonly [Date, Date]
  viewportMode: StreamingViewportMode
  announcement: string
}

const color = '#2563eb'

const definition = (input: StreamingChartInput) => {
  const visibleRows = visibleStreamingData(input.rows, input.viewport)
  return defineChart({
    marks: [
      lineY(visibleRows, {
        x: 'date',
        y: 'downloads',
        stroke: color,
        strokeWidth: 2.5,
      }),
      dot(visibleRows, {
        x: 'date',
        y: 'downloads',
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
      scale: scaleLinear,
      ticks: 5,
      grid: true,
      label: 'Downloads',
    },
    margin: { top: 18, right: 24, bottom: 44, left: 58 },
  })
}

export const mount: ConformanceMount = (container, input) => {
  let currentInput = input
  const state: StreamingState = {
    rows: streamingData(downloads, input.revision),
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
      state.rows = streamingData(
        downloads,
        currentInput.revision,
        state.appended,
      )
      if (state.viewportMode === 'latest') {
        state.viewport = latestStreamingViewport(state.rows)
      } else if (state.viewportMode === 'all') {
        state.viewport = fullStreamingViewport(state.rows)
      }
      const added = state.rows.at(-1)
      state.announcement = added
        ? `Added ${formatStreamingDate(added.date)} (${added.downloads.toLocaleString()} downloads). ${
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

  const chartOptions = (): ChartHostOptions<DownloadsRow> => ({
    definition: defineChart(
      definition({
        ...currentInput,
        rows: state.rows,
        viewport: state.viewport,
        viewportMode: state.viewportMode,
      }),
      {
        animate: false,
        keyboard: true,
        tooltip: {
          format: (point) =>
            `${formatStreamingDate(point.datum.date)} · ${point.datum.downloads.toLocaleString()} downloads`,
        },
      },
    ),
    width: currentInput.width,
    height: streamingChartHeight(currentInput.height),
    ariaLabel: 'Package downloads in a locked time viewport',
  })
  let host: ChartHost<DownloadsRow> | undefined
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
      state.rows = streamingData(downloads, nextInput.revision, state.appended)
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
  host: ChartHost<DownloadsRow>,
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
  return {
    data: {
      count: state.rows.length,
      ids: state.rows.map((row) => streamingDateKey(row.date)),
      domainStart: first ? streamingDateKey(first.date) : null,
      domainEnd: last ? streamingDateKey(last.date) : null,
    },
    visible: {
      count: visibleRows.length,
      ids: visibleRows.map((row) => streamingDateKey(row.date)),
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
  scene: ChartScene<DownloadsRow>,
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
    scene.scales.y.map(row.downloads),
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
