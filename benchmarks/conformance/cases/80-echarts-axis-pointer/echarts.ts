import { LineChart } from 'echarts/charts'
import {
  AriaComponent,
  AxisPointerComponent,
  GridComponent,
  TooltipComponent,
} from 'echarts/components'
import { use } from 'echarts/core'
import { SVGRenderer } from 'echarts/renderers'
import type { LineSeriesOption } from 'echarts/charts'
import type {
  AriaComponentOption,
  AxisPointerComponentOption,
  GridComponentOption,
  TooltipComponentOption,
} from 'echarts/components'
import type { ComposeOption, EChartsType } from 'echarts/core'
import { echartsMount } from '../../shared/echarts-mount'
import {
  axisPointerAnchorDate,
  axisPointerColors,
  axisPointerData,
  axisPointerDateKey,
  axisPointerDates,
  axisPointerDomain,
  axisPointerRowsAtDate,
  axisPointerSeries,
} from './data'
import type { AxisPointerDatum, AxisPointerSeries } from './data'
import type {
  ConformanceGeometryQuery,
  ConformanceGeometrySample,
  ConformanceInput,
  ConformanceJsonObject,
  ConformanceMount,
  ConformanceTarget,
  ConformanceTestDriver,
} from '../../types'

use([
  LineChart,
  GridComponent,
  TooltipComponent,
  AxisPointerComponent,
  AriaComponent,
  SVGRenderer,
])

type AxisPointerOption = ComposeOption<
  | LineSeriesOption
  | GridComponentOption
  | TooltipComponentOption
  | AxisPointerComponentOption
  | AriaComponentOption
>

interface InteractionState {
  date: string | null
  series: readonly string[]
  values: readonly number[]
  visible: boolean
}

export const mount: ConformanceMount = (container, input) => {
  const state: InteractionState = {
    date: null,
    series: [],
    values: [],
    visible: false,
  }

  const clearState = () => {
    state.date = null
    state.series = []
    state.values = []
    state.visible = false
  }

  const mountCase = echartsMount(
    (nextInput) => option(nextInput, state),
    'Snapped axis pointer with grouped tooltip',
    ({ chart, surface, getInput }) => {
      surface.addEventListener('mouseleave', clearState)
      return createDriver(chart, surface, getInput, state)
    },
  )

  return mountCase(container, input)
}

function option(
  input: ConformanceInput,
  state: InteractionState,
): AxisPointerOption {
  const rows = axisPointerData(input.revision)
  const series: LineSeriesOption[] = axisPointerSeries.map((seriesName) => ({
    id: seriesName,
    name: seriesName,
    type: 'line',
    data: rows
      .filter((row) => row.series === seriesName)
      .map((row) => [row.date.getTime(), row.value]),
    color: axisPointerColors[seriesName],
    lineStyle: {
      color: axisPointerColors[seriesName],
      width: 2,
    },
    itemStyle: {
      color: axisPointerColors[seriesName],
      borderColor: '#ffffff',
      borderWidth: 1,
    },
    showSymbol: true,
    symbol: 'circle',
    symbolSize: 6,
    emphasis: { disabled: true },
    animation: false,
  }))

  return {
    animation: false,
    aria: {
      enabled: true,
      description:
        'Three time series with a snapped vertical crosshair and grouped tooltip.',
    },
    grid: {
      top: 20,
      right: 24,
      bottom: 45,
      left: 60,
    },
    xAxis: {
      type: 'time',
      min: axisPointerDomain[0].getTime(),
      max: axisPointerDomain[1].getTime(),
      axisPointer: {
        show: true,
        snap: true,
        type: 'line',
        label: { show: false },
        lineStyle: {
          color: '#64748b',
          width: 1,
          type: 'dashed',
        },
      },
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
    axisPointer: {
      show: true,
      snap: true,
    },
    tooltip: {
      show: true,
      trigger: 'axis',
      triggerOn: 'mousemove',
      renderMode: 'html',
      confine: true,
      transitionDuration: 0,
      axisPointer: {
        type: 'line',
        snap: true,
      },
      formatter(params) {
        const entries = Array.isArray(params) ? params : [params]
        const first = entries[0]
        if (!first || typeof first.dataIndex !== 'number') {
          clearInteractionState(state)
          return ''
        }
        const date = axisPointerDates[first.dataIndex]
        if (!date) {
          clearInteractionState(state)
          return ''
        }
        const focusedRows = axisPointerRowsAtDate(rows, date)
        state.date = axisPointerDateKey(date)
        state.series = focusedRows.map((row) => row.series)
        state.values = focusedRows.map((row) => row.value)
        state.visible = true
        return tooltipHtml(date, focusedRows)
      },
    },
    series,
  }
}

function clearInteractionState(state: InteractionState) {
  state.date = null
  state.series = []
  state.values = []
  state.visible = false
}

function tooltipHtml(date: Date, rows: readonly AxisPointerDatum[]) {
  const title = date.toLocaleDateString(undefined, {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
  const body = rows
    .map(
      (row) =>
        `<div style="display:flex;align-items:center;gap:6px;margin-top:4px"><span style="width:8px;height:8px;border-radius:2px;background:${axisPointerColors[row.series]}"></span><span>${row.series}</span><strong style="margin-left:auto">${row.value.toLocaleString()}</strong></div>`,
    )
    .join('')
  return `<div data-conformance-tooltip="grouped"><strong>${title}</strong>${body}</div>`
}

function createDriver(
  chart: EChartsType,
  surface: HTMLDivElement,
  getInput: () => ConformanceInput,
  state: InteractionState,
): ConformanceTestDriver {
  return {
    resolveTarget(target) {
      return resolveTarget(chart, surface, getInput(), target)
    },
    readState() {
      return interactionState(state)
    },
    geometry(query) {
      return geometry(chart, surface, getInput(), query)
    },
  }
}

function resolveTarget(
  chart: EChartsType,
  surface: HTMLDivElement,
  input: ConformanceInput,
  target: ConformanceTarget,
) {
  if (target.view && target.view !== 'main') return null
  const date = axisPointerAnchorDate(target.anchor)
  if (!date) return null
  const rows = axisPointerRowsAtDate(axisPointerData(input.revision), date)
  if (!rows.length) return null
  const average =
    rows.reduce((total, row) => total + row.value, 0) / rows.length
  const point = pixelPoint(chart, date, average)
  if (!point) return null
  const bounds = surface.getBoundingClientRect()
  return {
    x: bounds.left + point[0],
    y: bounds.top + point[1],
    focusElement: surface,
  }
}

function geometry(
  chart: EChartsType,
  surface: HTMLDivElement,
  input: ConformanceInput,
  query: ConformanceGeometryQuery,
): readonly ConformanceGeometrySample[] {
  if (query.view && query.view !== 'main') return []
  const bounds = surface.getBoundingClientRect()
  const rows = axisPointerData(input.revision)

  if (query.role === 'dot') {
    return rows.flatMap((row) => {
      const point = pixelPoint(chart, row.date, row.value)
      return point
        ? [
            {
              x: bounds.left + point[0] - 3,
              y: bounds.top + point[1] - 3,
              width: 6,
              height: 6,
              paint: axisPointerColors[row.series],
            },
          ]
        : []
    })
  }

  if (query.role === 'line') {
    return axisPointerSeries.flatMap((series) => {
      const points = rows
        .filter((row) => row.series === series)
        .flatMap((row) => {
          const point = pixelPoint(chart, row.date, row.value)
          return point ? [point] : []
        })
      const sample = pointsBounds(points, bounds, axisPointerColors[series])
      return sample ? [sample] : []
    })
  }

  return []
}

function pixelPoint(
  chart: EChartsType,
  date: Date,
  value: number,
): readonly [number, number] | null {
  const point = chart.convertToPixel({ xAxisIndex: 0, yAxisIndex: 0 }, [
    date.getTime(),
    value,
  ])
  if (
    !Array.isArray(point) ||
    point.length < 2 ||
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
    x: surfaceBounds.left + left,
    y: surfaceBounds.top + top,
    width: Math.max(1, right - left),
    height: Math.max(1, bottom - top),
    paint,
  }
}

function interactionState(state: InteractionState): ConformanceJsonObject {
  return {
    focus: {
      date: state.date,
      series: state.series,
      values: state.values,
    },
    crosshair: {
      visible: state.visible,
    },
    tooltip: {
      visible: state.visible,
    },
  }
}
