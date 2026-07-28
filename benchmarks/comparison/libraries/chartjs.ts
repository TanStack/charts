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
  BenchmarkDatum,
  BenchmarkHandle,
  BenchmarkInput,
  BenchmarkMount,
} from '../types'
import { seriesColors } from './tier'

declare const BENCHMARK_INTERACTIVE: boolean
declare const BENCHMARK_ADVANCED: boolean
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
    plugins: {
      legend: { display: BENCHMARK_INTERACTIVE },
      tooltip: { enabled: BENCHMARK_INTERACTIVE },
    },
  }
}

function pointData(rows: readonly BenchmarkDatum[]) {
  return rows.map((row) => ({ x: row.x, y: row.y }))
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
          min: 0,
          max: Math.max(1, input.rows.length - 1),
        },
        y: { type: 'linear', min: 0, max: 100 },
      },
    },
  })

  return chartHandle(chart, (nextInput) => {
    chart.data.datasets = lineDatasets(nextInput)
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

  return chartHandle(chart, (nextInput) => {
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
          min: 0,
          max: Math.max(1, input.rows.length - 1),
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

  return chartHandle(chart, (nextInput) => {
    chart.data.datasets = areaDatasets(nextInput)
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
          min: 0,
          max: Math.max(1, input.rows.length - 1),
        },
        y: { type: 'linear', min: 0, max: 100 },
      },
    },
  })

  return chartHandle(chart, (nextInput) => {
    chart.data.datasets = scatterDatasets(nextInput)
  })
}

function lineDatasets(input: BenchmarkInput) {
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
      pointRadius: BENCHMARK_ADVANCED ? input.rows.map((row) => row.size) : 2,
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
  setData: (input: BenchmarkInput) => void,
): BenchmarkHandle {
  return {
    update(input) {
      setData(input)
      chart.update('none')
    },
    destroy() {
      chart.destroy()
    },
  }
}

const _configurationTypeCheck: ChartConfiguration | undefined = undefined
void _configurationTypeCheck
