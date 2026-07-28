import { defineChart, dot, lineY, mountChart } from '@tanstack/charts'
import { scaleLinear, scaleUtc } from 'd3-scale'
import {
  streamingData,
  streamingDateKey,
  streamingViewportDomain,
  visibleStreamingData,
} from './data'
import type {
  ChartHost,
  ChartScene,
  DynamicChartHostOptions,
} from '@tanstack/charts'
import type { StreamingDatum } from './data'
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
}

interface StreamingState {
  rows: readonly StreamingDatum[]
  appended: number
}

const color = '#2563eb'

const definition = defineChart<StreamingChartInput>()(({ input }) => {
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
      label: 'Locked viewport',
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

  const chartSurface = container.ownerDocument.createElement('div')
  chartSurface.style.minHeight = '0'
  view.append(controls, chartSurface)
  container.append(view)
  sizeStreamingView(view, chartSurface, input)
  updateStatus(status, state)

  const chartOptions = (): DynamicChartHostOptions<
    StreamingDatum,
    StreamingChartInput
  > => ({
    definition,
    input: {
      ...currentInput,
      rows: state.rows,
      viewport: streamingViewportDomain,
    },
    width: currentInput.width,
    height: streamingChartHeight(currentInput.height),
    ariaLabel: 'Streaming observations in a locked time viewport',
    animate: false,
    keyboard: false,
  })
  const host = mountChart(chartSurface, chartOptions())

  button.addEventListener('click', () => {
    state.appended += 1
    state.rows = streamingData(currentInput.revision, state.appended)
    updateStatus(status, state)
    host.update(chartOptions())
  })

  const driver = createDriver(chartSurface, button, state, host)

  return {
    driver,
    update(nextInput) {
      currentInput = nextInput
      state.rows = streamingData(nextInput.revision, state.appended)
      sizeStreamingView(view, chartSurface, nextInput)
      updateStatus(status, state)
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
  button: HTMLButtonElement,
  state: StreamingState,
  host: ChartHost<StreamingDatum, StreamingChartInput>,
): ConformanceTestDriver {
  return {
    resolveTarget(target) {
      return controlTarget(button, target)
    },
    readState() {
      return streamingState(state)
    },
    geometry(query) {
      return streamingGeometry(chartSurface, state, host.getScene(), query)
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
  chartSurface: HTMLDivElement,
  state: StreamingState,
  scene: ChartScene<StreamingDatum>,
  query: ConformanceGeometryQuery,
): readonly ConformanceGeometrySample[] {
  if (query.view !== undefined && query.view !== 'main') return []
  const svg = chartSurface.querySelector<SVGSVGElement>('svg.ts-chart')
  if (!svg) return []
  const rows = visibleStreamingData(state.rows)
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

function updateStatus(status: HTMLOutputElement, state: StreamingState) {
  status.textContent = `${state.rows.length} samples · viewport locked`
}

function streamingChartHeight(viewportHeight: number) {
  return Math.max(180, viewportHeight - 40)
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
