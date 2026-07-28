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
import type {
  BenchmarkChartType,
  BenchmarkHandle,
  BenchmarkInput,
  BenchmarkMount,
  BenchmarkOperation,
} from '../types'
import { createSignaledOperation } from '../stress/operation'
import {
  groupedVisibleSeriesRows,
  multiSeriesColors,
  renderedSize,
  seriesColor,
  seriesColors,
  visibleSeries,
  xMaximum,
  xMinimum,
} from './tier'

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
declare const BENCHMARK_STRESS: boolean
declare const BENCHMARK_VARIABLE_SIZE: boolean
declare const BENCHMARK_MULTI_SERIES: boolean
declare const BENCHMARK_ROLLING_WINDOW: boolean
let lineRegistered = false
let barRegistered = false
let areaRegistered = false
let scatterRegistered = false

function common(maximum = 100): Option {
  return {
    animation: false,
    color: BENCHMARK_MULTI_SERIES ? [...multiSeriesColors] : [...seriesColors],
    grid: { top: 16, right: 16, bottom: 32, left: 48 },
    legend: BENCHMARK_INTERACTIVE
      ? { show: !BENCHMARK_MULTI_SERIES }
      : undefined,
    tooltip: BENCHMARK_INTERACTIVE
      ? {
          trigger: 'axis',
          className: 'benchmark-echarts-tooltip',
        }
      : undefined,
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
  chartType: BenchmarkChartType,
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
  const ready = BENCHMARK_STRESS
    ? armEChartsOperation(chart).operation
    : undefined
  chart.setOption(option, { notMerge: true, lazyUpdate: false, silent: true })

  return echartsHandle(chart, container, input, chartType, updateOption, ready)
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
    'line',
    {
      ...common(),
      xAxis: {
        type: 'value',
        min: BENCHMARK_STRESS ? xMinimum(input) : 0,
        max: BENCHMARK_STRESS
          ? xMaximum(input)
          : Math.max(1, input.rows.length - 1),
      },
      series: lineSeries(input),
    },
    (nextInput) =>
      BENCHMARK_MULTI_SERIES
        ? {
            ...common(),
            xAxis: {
              type: 'value',
              min: xMinimum(nextInput),
              max: xMaximum(nextInput),
            },
            series: lineSeries(nextInput),
          }
        : {
            ...(BENCHMARK_STRESS
              ? {
                  xAxis: {
                    min: xMinimum(nextInput),
                    max: xMaximum(nextInput),
                  },
                }
              : undefined),
            series: lineSeries(nextInput),
          },
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
    'bar',
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
    'area',
    {
      ...common(BENCHMARK_ADVANCED ? 200 : 100),
      xAxis: {
        type: 'value',
        min: BENCHMARK_STRESS ? xMinimum(input) : 0,
        max: BENCHMARK_STRESS
          ? xMaximum(input)
          : Math.max(1, input.rows.length - 1),
      },
      series: areaSeries(input),
    },
    (nextInput) => ({
      ...(BENCHMARK_STRESS
        ? {
            xAxis: {
              min: xMinimum(nextInput),
              max: xMaximum(nextInput),
            },
          }
        : undefined),
      series: areaSeries(nextInput),
    }),
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
    'scatter',
    {
      ...common(),
      tooltip: BENCHMARK_INTERACTIVE
        ? {
            trigger: 'item',
            className: 'benchmark-echarts-tooltip',
          }
        : undefined,
      xAxis: {
        type: 'value',
        min: BENCHMARK_STRESS ? xMinimum(input) : 0,
        max: BENCHMARK_STRESS
          ? xMaximum(input)
          : Math.max(1, input.rows.length - 1),
      },
      series: scatterSeries(input),
    },
    (nextInput) => ({
      ...(BENCHMARK_STRESS
        ? {
            xAxis: {
              min: xMinimum(nextInput),
              max: xMaximum(nextInput),
            },
          }
        : undefined),
      series: scatterSeries(nextInput),
    }),
  )
}

function lineSeries(input: BenchmarkInput): LineSeriesOption[] {
  if (BENCHMARK_MULTI_SERIES) {
    return groupedVisibleSeriesRows(input).map(([series, rows]) => ({
      id: series,
      name: series,
      type: 'line',
      data: rows.map((row) => [row.x, row.y]),
      showSymbol: false,
      smooth: false,
      lineStyle: { color: seriesColor(input, series), width: 2 },
    }))
  }

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
      data: input.rows.map((row) =>
        BENCHMARK_ROLLING_WINDOW
          ? [row.x, row.y, row.size, row.id, row.category, row.series]
          : [row.x, row.y, row.size],
      ),
      symbolSize:
        BENCHMARK_ADVANCED || BENCHMARK_VARIABLE_SIZE
          ? (value) => Number((value as readonly unknown[])[2]) * 2
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
              Number((value as readonly unknown[])[2]) * 2,
            itemStyle: { color: seriesColors[1] },
          },
        ]
      : []),
  ]
}

function echartsHandle(
  chart: ECharts,
  container: HTMLElement,
  initialInput: BenchmarkInput,
  chartType: BenchmarkChartType,
  updateOption: (input: BenchmarkInput) => EChartsCoreOption,
  ready: BenchmarkOperation | undefined,
): BenchmarkHandle {
  let width = initialInput.width
  let height = initialInput.height
  let currentInput = initialInput
  return {
    ...(ready ? { ready } : undefined),
    ...(BENCHMARK_STRESS
      ? {
          output: {
            read() {
              const option = chart.getOption()
              const itemCount = optionDataItemCount(option.series)
              const xDomainMaximum =
                chartType === 'bar'
                  ? undefined
                  : optionNumericMaximum(option.xAxis)
              const xDomainMinimum =
                chartType === 'bar'
                  ? undefined
                  : optionNumericMinimum(option.xAxis)
              const seriesVertexCounts =
                BENCHMARK_MULTI_SERIES &&
                (chartType === 'line' || chartType === 'area')
                  ? optionSeriesVertexCounts(option.series)
                  : undefined
              const probedSeriesColors = BENCHMARK_MULTI_SERIES
                ? optionSeriesColors(option.series)
                : undefined
              return {
                ...renderedSize(container),
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
                    : echartsEndpointVisible(
                        chart,
                        option.series,
                        xDomainMaximum,
                      ),
              }
            },
            ...(BENCHMARK_ROLLING_WINDOW
              ? {
                  readData() {
                    return optionLogicalData(chart.getOption().series)
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
              const rows = BENCHMARK_MULTI_SERIES
                ? (groupedVisibleSeriesRows(currentInput)[0]?.[1] ?? [])
                : currentInput.rows
              const row =
                rows[
                  Math.round(
                    Math.max(0, Math.min(1, fraction)) *
                      Math.max(0, rows.length - 1),
                  )
                ]
              if (!row) return undefined
              const point = chart.convertToPixel({ seriesIndex: 0 }, [
                row.x,
                row.y,
              ])
              if (
                !Array.isArray(point) ||
                !Number.isFinite(point[0]) ||
                !Number.isFinite(point[1])
              ) {
                return undefined
              }
              const bounds = container.getBoundingClientRect()
              return {
                x: bounds.left + Number(point[0]),
                y: bounds.top + Number(point[1]),
                focusX: BENCHMARK_MULTI_SERIES ? row.x : undefined,
              }
            },
            isActive() {
              const element = container.querySelector<HTMLElement>(
                '.benchmark-echarts-tooltip',
              )
              return Boolean(
                element?.textContent?.trim() &&
                element.style.display !== 'none' &&
                element.style.visibility !== 'hidden' &&
                element.style.opacity !== '0',
              )
            },
            signature() {
              const element = container.querySelector<HTMLElement>(
                '.benchmark-echarts-tooltip',
              )
              return element?.textContent?.trim()
            },
            seriesIdentities() {
              const text = container.querySelector<HTMLElement>(
                '.benchmark-echarts-tooltip',
              )?.textContent
              if (!text) return []
              return visibleSeries(currentInput).filter((series) =>
                text.includes(series),
              )
            },
            seriesValues() {
              const text = container.querySelector<HTMLElement>(
                '.benchmark-echarts-tooltip',
              )?.textContent
              const match = text?.match(/^\s*(-?\d+(?:\.\d+)?)/)
              const x = match ? Number(match[1]) : Number.NaN
              return Number.isFinite(x)
                ? optionSeriesValuesAtX(chart.getOption().series, x)
                : []
            },
            focusedX() {
              const text = container.querySelector<HTMLElement>(
                '.benchmark-echarts-tooltip',
              )?.textContent
              const match = text?.match(/^\s*(-?\d+(?:\.\d+)?)/)
              const value = match ? Number(match[1]) : Number.NaN
              return Number.isFinite(value) ? value : undefined
            },
          },
        }
      : undefined),
    update(input) {
      currentInput = input
      if (input.width !== width || input.height !== height) {
        width = input.width
        height = input.height
        container.style.width = `${width}px`
        container.style.height = `${height}px`
        chart.resize({ width, height, silent: true })
      }
      const operation = BENCHMARK_STRESS
        ? armEChartsOperation(chart).operation
        : undefined
      chart.setOption(updateOption(input), {
        notMerge: BENCHMARK_MULTI_SERIES,
        lazyUpdate: false,
        silent: true,
      })
      return operation
    },
    destroy() {
      chart.dispose()
    },
  }
}

function optionLogicalData(value: unknown) {
  return optionRecords(value).flatMap((option) => {
    if (!Array.isArray(option.data)) return []
    return option.data.flatMap((item) => {
      if (!Array.isArray(item)) return []
      const [x, y, , key, category, series] = item
      return typeof key === 'number' &&
        typeof x === 'number' &&
        typeof y === 'number' &&
        typeof series === 'string' &&
        typeof category === 'string'
        ? [{ key, x, y, series, category }]
        : []
    })
  })
}

function optionSeriesValuesAtX(value: unknown, x: number) {
  return optionRecords(value).flatMap((option, index) => {
    const series =
      typeof option.name === 'string' ? option.name : `Series ${index + 1}`
    if (!Array.isArray(option.data)) return []
    for (const item of option.data) {
      if (
        Array.isArray(item) &&
        item[0] === x &&
        typeof item[1] === 'number' &&
        Number.isFinite(item[1])
      ) {
        return [{ series, value: item[1] }]
      }
    }
    return []
  })
}

function optionDataItemCount(value: unknown): number {
  let count = 0
  for (const option of optionRecords(value)) {
    if (Array.isArray(option.data)) count += option.data.length
  }
  return count
}

function optionSeriesVertexCounts(
  value: unknown,
): ReadonlyArray<{ series: string; vertices: number }> {
  return optionRecords(value).flatMap((option, index) => {
    const series =
      typeof option.name === 'string' ? option.name : `Series ${index + 1}`
    return Array.isArray(option.data)
      ? [{ series, vertices: option.data.length }]
      : []
  })
}

function optionSeriesColors(
  value: unknown,
): ReadonlyArray<{ series: string; color: string }> {
  return optionRecords(value).flatMap((option, index) => {
    const style = isRecord(option.lineStyle) ? option.lineStyle : undefined
    const color = style?.color
    if (typeof color !== 'string') return []
    return [
      {
        series:
          typeof option.name === 'string' ? option.name : `Series ${index + 1}`,
        color,
      },
    ]
  })
}

function optionNumericMaximum(value: unknown): number | undefined {
  for (const option of optionRecords(value)) {
    if (typeof option.max === 'number' && Number.isFinite(option.max)) {
      return option.max
    }
  }
  return undefined
}

function optionNumericMinimum(value: unknown): number | undefined {
  for (const option of optionRecords(value)) {
    if (typeof option.min === 'number' && Number.isFinite(option.min)) {
      return option.min
    }
  }
  return undefined
}

function echartsEndpointVisible(
  chart: ECharts,
  value: unknown,
  xDomainMaximum: number,
): boolean {
  const series = optionRecords(value)
  for (let seriesIndex = 0; seriesIndex < series.length; seriesIndex++) {
    const data = series[seriesIndex]?.data
    if (!Array.isArray(data)) continue
    for (const item of data) {
      if (
        !Array.isArray(item) ||
        typeof item[0] !== 'number' ||
        typeof item[1] !== 'number' ||
        item[0] !== xDomainMaximum
      ) {
        continue
      }
      const point = chart.convertToPixel({ seriesIndex }, [item[0], item[1]])
      if (
        Array.isArray(point) &&
        typeof point[0] === 'number' &&
        typeof point[1] === 'number' &&
        point[0] >= -2 &&
        point[0] <= chart.getWidth() + 2 &&
        point[1] >= -2 &&
        point[1] <= chart.getHeight() + 2
      ) {
        return true
      }
    }
  }
  return false
}

function optionRecords(value: unknown): readonly Record<string, unknown>[] {
  if (Array.isArray(value)) return value.filter(isRecord)
  return isRecord(value) ? [value] : []
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function armEChartsOperation(chart: ECharts) {
  const controller = createSignaledOperation()
  if (!BENCHMARK_STRESS || !controller.operation) {
    return controller
  }

  const rendered = () => controller.markFirstFrame()
  const finished = () => controller.markSettled()
  chart.on('rendered', rendered)
  chart.on('finished', finished)
  void controller.operation.settled.then(() => {
    if (chart.isDisposed()) return
    chart.off('rendered', rendered)
    chart.off('finished', finished)
  })
  return controller
}
