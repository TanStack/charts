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
import { industries } from '@charts-poc/demo-data/industries'
import { echartsMount } from '../../shared/echarts-mount'
import { axisPointerColors } from './colors'
import {
  axisPointerData,
  axisPointerDates,
  axisPointerIndustries,
} from './selection'
import {
  axisPointerAnchorDate,
  axisPointerDateKey,
  axisPointerRowsAtDate,
  axisPointerTargetValue,
} from './model'
import type { AxisPointerDatum } from './selection'
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
  industries: readonly string[]
  values: readonly number[]
  visible: boolean
}

export const mount: ConformanceMount = (container, input) => {
  const state: InteractionState = {
    date: null,
    industries: [],
    values: [],
    visible: false,
  }

  const clearState = () => {
    state.date = null
    state.industries = []
    state.values = []
    state.visible = false
  }

  const mountCase = echartsMount(
    (nextInput) => option(nextInput, state),
    'Snapped axis pointer with grouped tooltip',
    ({ chart, surface, getInput }) => {
      surface.addEventListener('mouseleave', clearState)
      surface.addEventListener('pointercancel', clearState)
      surface.addEventListener('touchcancel', clearState)
      return createDriver(chart, surface, getInput, state)
    },
  )

  return mountCase(container, input)
}

function option(
  input: ConformanceInput,
  state: InteractionState,
): AxisPointerOption {
  const rows = axisPointerData(industries, input.revision)
  const series: LineSeriesOption[] = axisPointerIndustries.map((industry) => ({
    id: industry,
    name: industry,
    type: 'line',
    data: rows
      .filter((row) => row.industry === industry)
      .map((row) => [row.date.getTime(), row.unemployed]),
    color: axisPointerColors[industry],
    lineStyle: {
      color: axisPointerColors[industry],
      width: 2,
    },
    itemStyle: {
      color: axisPointerColors[industry],
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
        'Unemployment for three industries with a snapped vertical crosshair and grouped tooltip.',
    },
    grid: {
      top: 20,
      right: 24,
      bottom: 45,
      left: 60,
    },
    xAxis: {
      type: 'time',
      min: 'dataMin',
      max: 'dataMax',
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
      min: 'dataMin',
      max: 'dataMax',
      name: 'Unemployed (thousands)',
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
        const date = axisPointerDates(rows)[first.dataIndex]
        if (!date) {
          clearInteractionState(state)
          return ''
        }
        const focusedRows = axisPointerRowsAtDate(rows, date)
        state.date = axisPointerDateKey(date)
        state.industries = focusedRows.map((row) => row.industry)
        state.values = focusedRows.map((row) => row.unemployed)
        state.visible = true
        return tooltipHtml(date, focusedRows)
      },
    },
    series,
  }
}

function clearInteractionState(state: InteractionState) {
  state.date = null
  state.industries = []
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
        `<div style="display:flex;align-items:center;gap:6px;margin-top:4px"><span style="width:8px;height:8px;border-radius:2px;background:${axisPointerColors[row.industry]}"></span><span>${row.industry}</span><strong style="margin-left:auto">${row.unemployed.toLocaleString()}</strong></div>`,
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
  const rows = axisPointerData(industries, input.revision)
  const date = axisPointerAnchorDate(target.anchor, rows)
  if (!date) return null
  const focusedRows = axisPointerRowsAtDate(rows, date)
  const targetValue = axisPointerTargetValue(focusedRows)
  if (targetValue === null) return null
  const point = pixelPoint(chart, date, targetValue)
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
  const rows = axisPointerData(industries, input.revision)

  if (query.role === 'dot') {
    return rows.flatMap((row) => {
      const point = pixelPoint(chart, row.date, row.unemployed)
      return point
        ? [
            {
              x: bounds.left + point[0] - 3,
              y: bounds.top + point[1] - 3,
              width: 6,
              height: 6,
              paint: axisPointerColors[row.industry],
            },
          ]
        : []
    })
  }

  if (query.role === 'line') {
    return axisPointerIndustries.flatMap((industry) => {
      const points = rows
        .filter((row) => row.industry === industry)
        .flatMap((row) => {
          const point = pixelPoint(chart, row.date, row.unemployed)
          return point ? [point] : []
        })
      const sample = pointsBounds(points, bounds, axisPointerColors[industry])
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
      industries: state.industries,
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
