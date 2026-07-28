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
  streamingData,
  streamingDateKey,
  streamingViewportDomain,
  visibleStreamingData,
} from './data'
import type { StreamingDatum } from './data'
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
  rows: readonly StreamingDatum[]
  appended: number
}

const color = '#2563eb'

export const mount: ConformanceMount = (container, input) => {
  let currentInput = input
  const state: StreamingState = {
    rows: streamingData(input.revision),
    appended: 0,
  }
  const view = container.ownerDocument.createElement('div')
  view.dataset.conformanceView = 'main'
  view.style.display = 'grid'
  view.style.gridTemplateRows = '40px minmax(0, 1fr)'

  const controls = container.ownerDocument.createElement('div')
  controls.style.display = 'flex'
  controls.style.alignItems = 'center'
  controls.style.justifyContent = 'space-between'
  controls.style.gap = '12px'
  controls.style.padding = '0 12px'

  const button = container.ownerDocument.createElement('button')
  button.type = 'button'
  button.textContent = 'Append sample'
  button.dataset.streamingControl = 'append'

  const status = container.ownerDocument.createElement('output')
  status.setAttribute('aria-live', 'polite')
  status.style.font = '500 12px/1.2 system-ui, sans-serif'
  controls.append(button, status)

  const chartFrame = container.ownerDocument.createElement('div')
  chartFrame.style.minHeight = '0'
  view.append(controls, chartFrame)
  container.append(view)
  sizeStreamingView(view, chartFrame, input)
  updateStatus(status, state)

  const mountChart = echartsMount(
    (nextInput) => streamingOption(nextInput, state.rows),
    'Streaming observations in a locked time viewport',
    ({ chart, surface }) => createDriver(chart, surface, button, state),
  )
  const chartHandle = mountChart(chartFrame, streamingInput(input))
  chartFrame
    .querySelector<HTMLElement>('[data-conformance-view="main"]')
    ?.removeAttribute('data-conformance-view')

  button.addEventListener('click', () => {
    state.appended += 1
    state.rows = streamingData(currentInput.revision, state.appended)
    updateStatus(status, state)
    chartHandle.update(streamingInput(currentInput))
  })

  return {
    driver: chartHandle.driver,
    update(nextInput) {
      currentInput = nextInput
      state.rows = streamingData(nextInput.revision, state.appended)
      sizeStreamingView(view, chartFrame, nextInput)
      updateStatus(status, state)
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
  rows: readonly StreamingDatum[],
): StreamingOption {
  const visibleRows = visibleStreamingData(rows)
  return {
    animation: false,
    aria: {
      enabled: true,
      description:
        'A time series whose locked January fifth through January twelfth viewport remains unchanged as observations append.',
    },
    grid: { top: 18, right: 24, bottom: 44, left: 58 },
    xAxis: {
      type: 'time',
      min: streamingViewportDomain[0].getTime(),
      max: streamingViewportDomain[1].getTime(),
      name: 'Locked viewport',
      nameLocation: 'middle',
      nameGap: 32,
    },
    yAxis: {
      type: 'value',
      min: 0,
      max: 80,
      interval: 20,
      name: 'Value',
      splitLine: {
        show: true,
        lineStyle: { color: '#e2e8f0' },
      },
    },
    series: {
      id: 'stream',
      name: 'Value',
      type: 'line',
      data: visibleRows.map((row) => ({
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
      animation: false,
      emphasis: { disabled: true },
    },
  }
}

function createDriver(
  chart: EChartsType,
  surface: HTMLDivElement,
  button: HTMLButtonElement,
  state: StreamingState,
): ConformanceTestDriver {
  return {
    resolveTarget(target) {
      return controlTarget(button, target)
    },
    readState() {
      return streamingState(state)
    },
    geometry(query) {
      return streamingGeometry(chart, surface, state, query)
    },
  }
}

function controlTarget(button: HTMLButtonElement, target: ConformanceTarget) {
  if (
    (target.view !== undefined && target.view !== 'main') ||
    target.anchor !== 'control:append'
  ) {
    return null
  }
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
  const visibleRows = visibleStreamingData(state.rows)
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
      start: streamingDateKey(streamingViewportDomain[0]),
      end: streamingDateKey(streamingViewportDomain[1]),
      locked: true,
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
  const rows = visibleStreamingData(state.rows)
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
  row: StreamingDatum,
): readonly [number, number] | null {
  const point = chart.convertToPixel({ xAxisIndex: 0, yAxisIndex: 0 }, [
    row.date.getTime(),
    row.value,
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

function updateStatus(status: HTMLOutputElement, state: StreamingState) {
  status.textContent = `${state.rows.length} samples · viewport locked`
}

function streamingInput(input: ConformanceInput): ConformanceInput {
  return {
    ...input,
    height: streamingChartHeight(input.height),
  }
}

function streamingChartHeight(viewportHeight: number) {
  return Math.max(180, viewportHeight - 40)
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
