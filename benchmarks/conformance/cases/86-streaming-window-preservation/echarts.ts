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
import { downloads } from '@charts-poc/demo-data/downloads'
import { echartsMount } from '../../shared/echarts-mount'
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

use([LineChart, GridComponent, AriaComponent, SVGRenderer])

type StreamingOption = ComposeOption<
  LineSeriesOption | GridComponentOption | AriaComponentOption
>

interface StreamingState {
  rows: readonly DownloadsRow[]
  appended: number
  viewport: readonly [Date, Date]
  viewportMode: StreamingViewportMode
  announcement: string
}

const color = '#2563eb'

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

  const chartFrame = container.ownerDocument.createElement('div')
  chartFrame.style.minHeight = '0'
  const render = () => {
    updateStreamingControls(controls, {
      mode: state.viewportMode,
      status: streamingStatus(state),
    })
    chartHandle?.update(streamingInput(currentInput))
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
  view.append(controls.root, chartFrame)
  container.append(view)
  sizeStreamingView(view, chartFrame, input)

  const mountChart = echartsMount(
    (nextInput) =>
      streamingOption(
        nextInput,
        state.rows,
        state.viewport,
        state.viewportMode,
      ),
    'Package downloads in a locked time viewport',
    ({ chart, surface }) => createDriver(chart, surface, controls, state),
  )
  let chartHandle: ReturnType<ConformanceMount> | undefined
  chartHandle = mountChart(chartFrame, streamingInput(input))
  chartFrame
    .querySelector<HTMLElement>('[data-conformance-view="main"]')
    ?.removeAttribute('data-conformance-view')

  updateStreamingControls(controls, {
    mode: state.viewportMode,
    status: streamingStatus(state),
  })

  return {
    driver: chartHandle.driver,
    update(nextInput) {
      currentInput = nextInput
      state.rows = streamingData(downloads, nextInput.revision, state.appended)
      if (state.viewportMode === 'latest') {
        state.viewport = latestStreamingViewport(state.rows)
      } else if (state.viewportMode === 'all') {
        state.viewport = fullStreamingViewport(state.rows)
      }
      sizeStreamingView(view, chartFrame, nextInput)
      updateStreamingControls(controls, {
        mode: state.viewportMode,
        status: streamingStatus(state),
      })
      chartHandle.update(streamingInput(nextInput))
    },
    destroy() {
      chartHandle.destroy()
      view.remove()
    },
  }
}

function streamingOption(
  _input: ConformanceInput,
  rows: readonly DownloadsRow[],
  viewport: readonly [Date, Date],
  viewportMode: StreamingViewportMode,
): StreamingOption {
  const visibleRows = visibleStreamingData(rows, viewport)
  return {
    animation: false,
    aria: {
      enabled: true,
      description:
        'Package downloads with controls for a locked window, following the latest dates, or showing all dates.',
    },
    grid: {
      top: 18,
      right: 24,
      bottom: 44,
      left: 58,
      outerBoundsMode: 'none',
    },
    xAxis: {
      type: 'time',
      min: viewport[0].getTime(),
      max: viewport[1].getTime(),
      name:
        viewportMode === 'locked'
          ? 'Locked viewport'
          : viewportMode === 'latest'
            ? 'Following latest'
            : 'All samples',
      nameLocation: 'middle',
      nameGap: 30,
    },
    yAxis: {
      type: 'value',
      min: 'dataMin',
      max: 'dataMax',
      name: 'Downloads',
      nameLocation: 'middle',
      nameGap: 44,
      nameRotate: 90,
      splitLine: {
        show: true,
        lineStyle: { color: '#e2e8f0' },
      },
    },
    series: {
      id: 'stream',
      name: 'Downloads',
      type: 'line',
      data: visibleRows.map((row) => ({
        id: streamingDateKey(row.date),
        name: streamingDateKey(row.date),
        value: [row.date.getTime(), row.downloads],
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
      animation: false,
      emphasis: { disabled: true },
    },
  }
}

function createDriver(
  chart: EChartsType,
  surface: HTMLDivElement,
  controls: StreamingControls,
  state: StreamingState,
): ConformanceTestDriver {
  return {
    resolveTarget(target) {
      return controlTarget(controls, target)
    },
    readState() {
      return streamingState(state)
    },
    geometry(query) {
      return streamingGeometry(chart, surface, state, query)
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
  chart: EChartsType,
  surface: HTMLDivElement,
  state: StreamingState,
  query: ConformanceGeometryQuery,
): readonly ConformanceGeometrySample[] {
  if (query.view !== undefined && query.view !== 'main') return []
  const rows = visibleStreamingData(state.rows, state.viewport)
  const bounds = surface.getBoundingClientRect()
  const points = rows.flatMap((row) => {
    const point = streamPoint(chart, row)
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
    const sample = pointsBounds(points, bounds)
    return sample ? [sample] : []
  }
  return []
}

function streamPoint(
  chart: EChartsType,
  row: DownloadsRow,
): readonly [number, number] | null {
  const point = chart.convertToPixel({ xAxisIndex: 0, yAxisIndex: 0 }, [
    row.date.getTime(),
    row.downloads,
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
    paint: color,
  }
}

function streamingStatus(state: StreamingState) {
  if (state.announcement) return state.announcement
  return `${state.rows.length} samples · ${formatStreamingDate(
    state.viewport[0],
  )}–${formatStreamingDate(state.viewport[1])} · viewport locked`
}

function streamingInput(input: ConformanceInput): ConformanceInput {
  return {
    ...input,
    height: streamingChartHeight(input.height),
  }
}

function streamingChartHeight(viewportHeight: number) {
  return Math.max(180, viewportHeight - 78)
}

function sizeStreamingView(
  view: HTMLDivElement,
  chartFrame: HTMLDivElement,
  input: ConformanceInput,
) {
  view.style.width = `${input.width}px`
  view.style.height = `${input.height}px`
  chartFrame.style.width = `${input.width}px`
  chartFrame.style.height = `${streamingChartHeight(input.height)}px`
}
