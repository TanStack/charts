import { BarChart, LineChart, ScatterChart } from 'echarts/charts'
import {
  GridComponent,
  LegendComponent,
  TooltipComponent,
  type GridComponentOption,
  type LegendComponentOption,
  type TooltipComponentOption,
} from 'echarts/components'
import {
  init,
  use,
  type ComposeOption,
  type ECharts,
  type EChartsCoreOption,
} from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import type {
  BarSeriesOption,
  LineSeriesOption,
  ScatterSeriesOption,
} from 'echarts/charts'
import type { BenchmarkHandle, BenchmarkInput, BenchmarkMount } from '../types'
import { seriesColors } from './tier'

type Option = ComposeOption<
  | BarSeriesOption
  | GridComponentOption
  | LegendComponentOption
  | LineSeriesOption
  | ScatterSeriesOption
  | TooltipComponentOption
>

declare const BENCHMARK_INTERACTIVE: boolean
declare const BENCHMARK_ADVANCED: boolean
let lineRegistered = false
let barRegistered = false
let areaRegistered = false
let scatterRegistered = false

function common(maximum = 100): Option {
  return {
    animation: false,
    color: [...seriesColors],
    grid: { top: 16, right: 16, bottom: 32, left: 48 },
    legend: BENCHMARK_INTERACTIVE ? { show: true } : undefined,
    tooltip: BENCHMARK_INTERACTIVE ? { trigger: 'axis' } : undefined,
    yAxis: {
      type: 'value',
      min: 0,
      max: maximum,
      splitNumber: 5,
    },
  }
}

function mountECharts(
  container: HTMLElement,
  input: BenchmarkInput,
  option: EChartsCoreOption,
  updateOption: (input: BenchmarkInput) => EChartsCoreOption,
): BenchmarkHandle {
  container.style.width = `${input.width}px`
  container.style.height = `${input.height}px`
  const chart = init(container, undefined, {
    renderer: 'canvas',
    width: input.width,
    height: input.height,
    devicePixelRatio: 1,
  })
  chart.setOption(option, { notMerge: true, lazyUpdate: false, silent: true })

  return echartsHandle(chart, updateOption)
}

export const mountLine: BenchmarkMount = (container, input) => {
  if (!lineRegistered) {
    use([LineChart, GridComponent, CanvasRenderer])
    if (BENCHMARK_INTERACTIVE) use([LegendComponent, TooltipComponent])
    lineRegistered = true
  }
  return mountECharts(
    container,
    input,
    {
      ...common(),
      xAxis: {
        type: 'value',
        min: 0,
        max: Math.max(1, input.rows.length - 1),
      },
      series: lineSeries(input),
    },
    (nextInput) => ({ series: lineSeries(nextInput) }),
  )
}

export const mountBar: BenchmarkMount = (container, input) => {
  if (!barRegistered) {
    use([BarChart, GridComponent, CanvasRenderer])
    if (BENCHMARK_INTERACTIVE) use([LegendComponent, TooltipComponent])
    barRegistered = true
  }
  return mountECharts(
    container,
    input,
    {
      ...common(BENCHMARK_ADVANCED ? 200 : 100),
      xAxis: {
        type: 'category',
        data: input.rows.map((row) => row.category),
      },
      series: barSeries(input),
    },
    (nextInput) => ({
      xAxis: {
        data: nextInput.rows.map((row) => row.category),
      },
      series: barSeries(nextInput),
    }),
  )
}

export const mountArea: BenchmarkMount = (container, input) => {
  if (!areaRegistered) {
    use([LineChart, GridComponent, CanvasRenderer])
    if (BENCHMARK_INTERACTIVE) use([LegendComponent, TooltipComponent])
    areaRegistered = true
  }
  return mountECharts(
    container,
    input,
    {
      ...common(BENCHMARK_ADVANCED ? 200 : 100),
      xAxis: {
        type: 'value',
        min: 0,
        max: Math.max(1, input.rows.length - 1),
      },
      series: areaSeries(input),
    },
    (nextInput) => ({ series: areaSeries(nextInput) }),
  )
}

export const mountScatter: BenchmarkMount = (container, input) => {
  if (!scatterRegistered) {
    use([ScatterChart, GridComponent, CanvasRenderer])
    if (BENCHMARK_INTERACTIVE) use([LegendComponent, TooltipComponent])
    scatterRegistered = true
  }
  return mountECharts(
    container,
    input,
    {
      ...common(),
      tooltip: BENCHMARK_INTERACTIVE ? { trigger: 'item' } : undefined,
      xAxis: {
        type: 'value',
        min: 0,
        max: Math.max(1, input.rows.length - 1),
      },
      series: scatterSeries(input),
    },
    (nextInput) => ({ series: scatterSeries(nextInput) }),
  )
}

function lineSeries(input: BenchmarkInput): LineSeriesOption[] {
  return [
    {
      name: 'Series A',
      type: 'line',
      data: input.rows.map((row) => [row.x, row.y]),
      showSymbol: false,
      smooth: BENCHMARK_ADVANCED,
      lineStyle: { color: seriesColors[0], width: 2 },
    },
    ...(BENCHMARK_ADVANCED
      ? [
          {
            name: 'Series B',
            type: 'line' as const,
            data: input.secondaryRows.map((row) => [row.x, row.y]),
            showSymbol: false,
            smooth: true,
            lineStyle: { color: seriesColors[1], width: 2 },
          },
        ]
      : []),
  ]
}

function barSeries(input: BenchmarkInput): BarSeriesOption[] {
  return [
    {
      name: 'Series A',
      type: 'bar',
      data: input.rows.map((row) => row.y),
      stack: BENCHMARK_ADVANCED ? 'combined' : undefined,
      itemStyle: { color: seriesColors[0] },
    },
    ...(BENCHMARK_ADVANCED
      ? [
          {
            name: 'Series B',
            type: 'bar' as const,
            data: input.secondaryRows.map((row) => row.y),
            stack: 'combined',
            itemStyle: { color: seriesColors[1] },
          },
        ]
      : []),
  ]
}

function areaSeries(input: BenchmarkInput): LineSeriesOption[] {
  return [
    {
      name: 'Series A',
      type: 'line',
      data: input.rows.map((row) => [row.x, row.y]),
      showSymbol: false,
      smooth: BENCHMARK_ADVANCED,
      stack: BENCHMARK_ADVANCED ? 'combined' : undefined,
      lineStyle: { color: seriesColors[0], width: 2 },
      areaStyle: { color: seriesColors[0], opacity: 0.25 },
    },
    ...(BENCHMARK_ADVANCED
      ? [
          {
            name: 'Series B',
            type: 'line' as const,
            data: input.secondaryRows.map((row) => [row.x, row.y]),
            showSymbol: false,
            smooth: true,
            stack: 'combined',
            lineStyle: { color: seriesColors[1], width: 2 },
            areaStyle: { color: seriesColors[1], opacity: 0.25 },
          },
        ]
      : []),
  ]
}

function scatterSeries(input: BenchmarkInput): ScatterSeriesOption[] {
  return [
    {
      name: 'Series A',
      type: 'scatter',
      data: input.rows.map((row) => [row.x, row.y, row.size]),
      symbolSize: BENCHMARK_ADVANCED
        ? (value) => Number((value as readonly unknown[])[2])
        : 4,
      itemStyle: { color: seriesColors[0] },
    },
    ...(BENCHMARK_ADVANCED
      ? [
          {
            name: 'Series B',
            type: 'scatter' as const,
            data: input.secondaryRows.map((row) => [row.x, row.y, row.size]),
            symbolSize: (value: unknown) =>
              Number((value as readonly unknown[])[2]),
            itemStyle: { color: seriesColors[1] },
          },
        ]
      : []),
  ]
}

function echartsHandle(
  chart: ECharts,
  updateOption: (input: BenchmarkInput) => EChartsCoreOption,
): BenchmarkHandle {
  return {
    update(input) {
      chart.setOption(updateOption(input), {
        notMerge: false,
        lazyUpdate: false,
        silent: true,
      })
    },
    destroy() {
      chart.dispose()
    },
  }
}
