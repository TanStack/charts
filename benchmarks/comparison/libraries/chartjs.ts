import {
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  Filler,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  ScatterController,
  Tooltip,
  type ChartConfiguration,
} from 'chart.js'
import type {
  BenchmarkChartType,
  BenchmarkDatum,
  BenchmarkHandle,
  BenchmarkInput,
  BenchmarkMount,
} from '../types'
import { createFrameOperation } from '../stress/operation'
import {
  groupedVisibleSeriesRows,
  seriesColor,
  seriesColors,
  xMaximum,
  xMinimum,
} from './tier'

declare const BENCHMARK_INTERACTIVE: boolean
declare const BENCHMARK_ADVANCED: boolean
declare const BENCHMARK_STRESS: boolean
declare const BENCHMARK_VARIABLE_SIZE: boolean
declare const BENCHMARK_MULTI_SERIES: boolean
declare const BENCHMARK_ROLLING_WINDOW: boolean
const fill = 'rgba(37, 99, 235, 0.25)'
let lineRegistered = false
let barRegistered = false
let areaRegistered = false
let scatterRegistered = false

function canvas(container: HTMLElement, input: BenchmarkInput) {
  const element = document.createElement('canvas')
  element.width = input.width
  element.height = input.height
  element.style.width = `${input.width}px`
  element.style.height = `${input.height}px`
  container.append(element)
  return element
}

function commonOptions() {
  const events: (keyof HTMLElementEventMap)[] = BENCHMARK_INTERACTIVE
    ? ['mousemove', 'mouseout', 'click', 'touchstart', 'touchmove']
    : []
  return {
    animation: false as const,
    responsive: false,
    maintainAspectRatio: false,
    devicePixelRatio: 1,
    events,
    layout: {
      padding: { top: 8, right: 8, bottom: 8, left: 8 },
    },
    interaction: BENCHMARK_MULTI_SERIES
      ? { mode: 'index' as const, intersect: false }
      : undefined,
    plugins: {
      legend: {
        display: BENCHMARK_INTERACTIVE && !BENCHMARK_MULTI_SERIES,
      },
      tooltip: { enabled: BENCHMARK_INTERACTIVE },
    },
  }
}

function pointData(rows: readonly BenchmarkDatum[]) {
  return rows.map((row) =>
    BENCHMARK_ROLLING_WINDOW
      ? {
          x: row.x,
          y: row.y,
          id: row.id,
          series: row.series,
          category: row.category,
        }
      : { x: row.x, y: row.y },
  )
}

export const mountLine: BenchmarkMount = (container, input) => {
  if (!lineRegistered) {
    Chart.register(LineController, LineElement, PointElement, LinearScale)
    if (BENCHMARK_INTERACTIVE) Chart.register(Legend, Tooltip)
    lineRegistered = true
  }
  const chart = new Chart(canvas(container, input), {
    type: 'line',
    data: {
      datasets: lineDatasets(input),
    },
    options: {
      ...commonOptions(),
      scales: {
        x: {
          type: 'linear',
          min: BENCHMARK_STRESS ? xMinimum(input) : 0,
          max: BENCHMARK_STRESS
            ? xMaximum(input)
            : Math.max(1, input.rows.length - 1),
        },
        y: { type: 'linear', min: 0, max: 100 },
      },
    },
  })

  return chartHandle(chart, container, input, 'line', (nextInput) => {
    chart.data.datasets = lineDatasets(nextInput)
    if (BENCHMARK_STRESS && chart.options.scales?.x) {
      chart.options.scales.x.min = xMinimum(nextInput)
      chart.options.scales.x.max = xMaximum(nextInput)
    }
  })
}

export const mountBar: BenchmarkMount = (container, input) => {
  if (!barRegistered) {
    Chart.register(BarController, BarElement, CategoryScale, LinearScale)
    if (BENCHMARK_INTERACTIVE) Chart.register(Legend, Tooltip)
    barRegistered = true
  }
  const chart = new Chart(canvas(container, input), {
    type: 'bar',
    data: {
      labels: input.rows.map((row) => row.category),
      datasets: barDatasets(input),
    },
    options: {
      ...commonOptions(),
      scales: {
        x: { type: 'category', stacked: BENCHMARK_ADVANCED },
        y: {
          type: 'linear',
          min: 0,
          max: BENCHMARK_ADVANCED ? 200 : 100,
          stacked: BENCHMARK_ADVANCED,
        },
      },
    },
  })

  return chartHandle(chart, container, input, 'bar', (nextInput) => {
    chart.data.labels = nextInput.rows.map((row) => row.category)
    chart.data.datasets = barDatasets(nextInput)
  })
}

export const mountArea: BenchmarkMount = (container, input) => {
  if (!areaRegistered) {
    Chart.register(
      LineController,
      LineElement,
      PointElement,
      LinearScale,
      Filler,
    )
    if (BENCHMARK_INTERACTIVE) Chart.register(Legend, Tooltip)
    areaRegistered = true
  }
  const chart = new Chart(canvas(container, input), {
    type: 'line',
    data: {
      datasets: areaDatasets(input),
    },
    options: {
      ...commonOptions(),
      scales: {
        x: {
          type: 'linear',
          min: BENCHMARK_STRESS ? xMinimum(input) : 0,
          max: BENCHMARK_STRESS
            ? xMaximum(input)
            : Math.max(1, input.rows.length - 1),
        },
        y: {
          type: 'linear',
          min: 0,
          max: BENCHMARK_ADVANCED ? 200 : 100,
          stacked: BENCHMARK_ADVANCED,
        },
      },
    },
  })

  return chartHandle(chart, container, input, 'area', (nextInput) => {
    chart.data.datasets = areaDatasets(nextInput)
    if (BENCHMARK_STRESS && chart.options.scales?.x) {
      chart.options.scales.x.min = xMinimum(nextInput)
      chart.options.scales.x.max = xMaximum(nextInput)
    }
  })
}

export const mountScatter: BenchmarkMount = (container, input) => {
  if (!scatterRegistered) {
    Chart.register(ScatterController, PointElement, LinearScale)
    if (BENCHMARK_INTERACTIVE) Chart.register(Legend, Tooltip)
    scatterRegistered = true
  }
  const chart = new Chart(canvas(container, input), {
    type: 'scatter',
    data: {
      datasets: scatterDatasets(input),
    },
    options: {
      ...commonOptions(),
      scales: {
        x: {
          type: 'linear',
          min: BENCHMARK_STRESS ? xMinimum(input) : 0,
          max: BENCHMARK_STRESS
            ? xMaximum(input)
            : Math.max(1, input.rows.length - 1),
        },
        y: { type: 'linear', min: 0, max: 100 },
      },
    },
  })

  return chartHandle(chart, container, input, 'scatter', (nextInput) => {
    chart.data.datasets = scatterDatasets(nextInput)
    if (BENCHMARK_STRESS && chart.options.scales?.x) {
      chart.options.scales.x.min = xMinimum(nextInput)
      chart.options.scales.x.max = xMaximum(nextInput)
    }
  })
}

function lineDatasets(input: BenchmarkInput) {
  if (BENCHMARK_MULTI_SERIES) {
    return groupedVisibleSeriesRows(input).map(([series, rows]) => ({
      label: series,
      data: pointData(rows),
      borderColor: seriesColor(input, series),
      borderWidth: 2,
      pointRadius: 0,
      tension: 0,
    }))
  }

  return [
    {
      label: 'Series A',
      data: pointData(input.rows),
      borderColor: seriesColors[0],
      borderWidth: 2,
      pointRadius: 0,
      tension: BENCHMARK_ADVANCED ? 0.35 : 0,
      parsing: false as const,
    },
    ...(BENCHMARK_ADVANCED
      ? [
          {
            label: 'Series B',
            data: pointData(input.secondaryRows),
            borderColor: seriesColors[1],
            borderWidth: 2,
            pointRadius: 0,
            tension: 0.35,
            parsing: false as const,
          },
        ]
      : []),
  ]
}

function barDatasets(input: BenchmarkInput) {
  return [
    {
      label: 'Series A',
      data: input.rows.map((row) => row.y),
      backgroundColor: seriesColors[0],
      borderWidth: 0,
      stack: BENCHMARK_ADVANCED ? 'combined' : undefined,
    },
    ...(BENCHMARK_ADVANCED
      ? [
          {
            label: 'Series B',
            data: input.secondaryRows.map((row) => row.y),
            backgroundColor: seriesColors[1],
            borderWidth: 0,
            stack: 'combined',
          },
        ]
      : []),
  ]
}

function areaDatasets(input: BenchmarkInput) {
  return [
    {
      label: 'Series A',
      data: pointData(input.rows),
      borderColor: seriesColors[0],
      backgroundColor: fill,
      borderWidth: 2,
      pointRadius: 0,
      fill: 'origin' as const,
      stack: BENCHMARK_ADVANCED ? 'combined' : undefined,
      tension: BENCHMARK_ADVANCED ? 0.35 : 0,
      parsing: false as const,
    },
    ...(BENCHMARK_ADVANCED
      ? [
          {
            label: 'Series B',
            data: pointData(input.secondaryRows),
            borderColor: seriesColors[1],
            backgroundColor: 'rgba(249, 115, 22, 0.25)',
            borderWidth: 2,
            pointRadius: 0,
            fill: 'origin' as const,
            stack: 'combined',
            tension: 0.35,
            parsing: false as const,
          },
        ]
      : []),
  ]
}

function scatterDatasets(input: BenchmarkInput) {
  return [
    {
      label: 'Series A',
      data: pointData(input.rows),
      backgroundColor: seriesColors[0],
      pointRadius:
        BENCHMARK_ADVANCED || BENCHMARK_VARIABLE_SIZE
          ? input.rows.map((row) => row.size)
          : 2,
      parsing: false as const,
    },
    ...(BENCHMARK_ADVANCED
      ? [
          {
            label: 'Series B',
            data: pointData(input.secondaryRows),
            backgroundColor: seriesColors[1],
            pointRadius: input.secondaryRows.map((row) => row.size),
            parsing: false as const,
          },
        ]
      : []),
  ]
}

function chartHandle(
  chart: Chart,
  container: HTMLElement,
  initialInput: BenchmarkInput,
  chartType: BenchmarkChartType,
  setData: (input: BenchmarkInput) => void,
): BenchmarkHandle {
  let width = initialInput.width
  let height = initialInput.height
  let currentInput = initialInput
  return {
    ...(BENCHMARK_STRESS ? { ready: createFrameOperation() } : undefined),
    ...(BENCHMARK_STRESS
      ? {
          output: {
            read() {
              const bounds = chart.canvas.getBoundingClientRect()
              const itemCount = chart.data.datasets.reduce(
                (count, _, index) =>
                  count + chart.getDatasetMeta(index).data.length,
                0,
              )
              const xDomainMaximum =
                chartType !== 'bar' && Number.isFinite(chart.scales.x?.max)
                  ? chart.scales.x?.max
                  : undefined
              const xDomainMinimum =
                chartType !== 'bar' && Number.isFinite(chart.scales.x?.min)
                  ? chart.scales.x?.min
                  : undefined
              const seriesVertexCounts =
                BENCHMARK_MULTI_SERIES &&
                (chartType === 'line' || chartType === 'area')
                  ? chart.data.datasets.map((dataset, index) => ({
                      series: dataset.label ?? `Series ${index + 1}`,
                      vertices: chart.getDatasetMeta(index).data.length,
                    }))
                  : undefined
              const probedSeriesColors = BENCHMARK_MULTI_SERIES
                ? chart.data.datasets.flatMap((dataset, index) =>
                    typeof dataset.borderColor === 'string'
                      ? [
                          {
                            series: dataset.label ?? `Series ${index + 1}`,
                            color: dataset.borderColor,
                          },
                        ]
                      : [],
                  )
                : undefined
              return {
                width: bounds.width,
                height: bounds.height,
                itemCount,
                vertexCount:
                  chartType === 'line' || chartType === 'area'
                    ? itemCount
                    : undefined,
                pathCount: seriesVertexCounts?.length,
                seriesCount: seriesVertexCounts?.length,
                seriesIdentities: seriesVertexCounts?.map(
                  ({ series }) => series,
                ),
                seriesVertexCounts,
                seriesColors: probedSeriesColors,
                xDomainMinimum,
                xDomainMaximum,
                xEndpointVisible:
                  xDomainMaximum === undefined
                    ? undefined
                    : chartEndpointVisible(chart, xDomainMaximum),
              }
            },
            ...(BENCHMARK_ROLLING_WINDOW
              ? {
                  readData() {
                    return chart.data.datasets.flatMap((dataset) =>
                      dataset.data.flatMap((value) => {
                        const logical = chartLogicalDatum(value, dataset.label)
                        return logical ? [logical] : []
                      }),
                    )
                  },
                }
              : undefined),
          },
        }
      : undefined),
    ...(BENCHMARK_STRESS && BENCHMARK_INTERACTIVE
      ? {
          pointer: {
            target(fraction = 0.5) {
              const elements = chart.getDatasetMeta(0).data
              const element =
                elements[
                  Math.round(
                    Math.max(0, Math.min(1, fraction)) *
                      Math.max(0, elements.length - 1),
                  )
                ]
              if (!element) return undefined
              const bounds = chart.canvas.getBoundingClientRect()
              return {
                x: bounds.left + element.x,
                y: bounds.top + element.y,
                focusX: BENCHMARK_MULTI_SERIES
                  ? groupedVisibleSeriesRows(currentInput)[0]?.[1][
                      Math.round(
                        Math.max(0, Math.min(1, fraction)) *
                          Math.max(0, elements.length - 1),
                      )
                    ]?.x
                  : undefined,
              }
            },
            isActive() {
              return Boolean(chart.tooltip?.getActiveElements().length)
            },
            signature() {
              return chart.tooltip
                ?.getActiveElements()
                .map(({ datasetIndex, index }) => `${datasetIndex}:${index}`)
                .join('|')
            },
            seriesIdentities() {
              return [
                ...new Set(
                  (chart.tooltip?.getActiveElements() ?? [])
                    .map(
                      ({ datasetIndex }) =>
                        chart.data.datasets[datasetIndex]?.label,
                    )
                    .filter(
                      (series): series is string => typeof series === 'string',
                    ),
                ),
              ]
            },
            seriesValues() {
              return (chart.tooltip?.dataPoints ?? []).flatMap((point) => {
                const series = point.dataset.label
                const value = point.parsed.y
                return typeof series === 'string' &&
                  typeof value === 'number' &&
                  Number.isFinite(value)
                  ? [{ series, value }]
                  : []
              })
            },
            focusedX() {
              const active = chart.tooltip?.getActiveElements()[0]
              return active
                ? groupedVisibleSeriesRows(currentInput)[
                    active.datasetIndex
                  ]?.[1][active.index]?.x
                : undefined
            },
          },
        }
      : undefined),
    update(input) {
      currentInput = input
      setData(input)
      const resized = input.width !== width || input.height !== height
      if (resized) {
        width = input.width
        height = input.height
        container.style.width = `${width}px`
        container.style.height = `${height}px`
        chart.resize(width, height)
      } else {
        chart.update('none')
      }
      return BENCHMARK_STRESS ? createFrameOperation() : undefined
    },
    destroy() {
      chart.destroy()
    },
  }
}

function chartLogicalDatum(value: unknown, fallbackSeries: unknown) {
  if (typeof value !== 'object' || value === null) return undefined
  const key = Reflect.get(value, 'id')
  const x = Reflect.get(value, 'x')
  const y = Reflect.get(value, 'y')
  const series = Reflect.get(value, 'series') ?? fallbackSeries
  const category = Reflect.get(value, 'category')
  return typeof key === 'number' &&
    typeof x === 'number' &&
    typeof y === 'number' &&
    typeof series === 'string' &&
    typeof category === 'string'
    ? { key, x, y, series, category }
    : undefined
}

function chartEndpointVisible(chart: Chart, xDomainMaximum: number): boolean {
  const scale = chart.scales.x
  const area = chart.chartArea
  if (!scale || !area) return false
  const expectedX = scale.getPixelForValue(xDomainMaximum)
  return chart.data.datasets.some((_, index) =>
    chart
      .getDatasetMeta(index)
      .data.some(
        (element) =>
          Math.abs(element.x - expectedX) <= 2 &&
          element.y >= area.top - 2 &&
          element.y <= area.bottom + 2,
      ),
  )
}

const _configurationTypeCheck: ChartConfiguration | undefined = undefined
void _configurationTypeCheck
