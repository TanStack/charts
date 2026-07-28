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
  synchronizedCursorAnchorDate,
  synchronizedCursorColors,
  synchronizedCursorData,
  synchronizedCursorDateDomain,
  synchronizedCursorDateKey,
  synchronizedCursorDates,
  synchronizedCursorDatumAtDate,
  synchronizedCursorViews,
  synchronizedCursorYDomains,
} from './data'
import type { SynchronizedCursorView } from './data'
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

type SynchronizedCursorOption = ComposeOption<
  | LineSeriesOption
  | GridComponentOption
  | TooltipComponentOption
  | AxisPointerComponentOption
  | AriaComponentOption
>

interface CursorState {
  date: Date | null
}

interface GridLayout {
  primaryTop: number
  secondaryTop: number
  height: number
}

export const mount: ConformanceMount = (container, input) => {
  const state: CursorState = {
    date: null,
  }
  const mountCase = echartsMount(
    synchronizedCursorOption,
    'Throughput and error-rate views with linked date cursors',
    ({ chart, surface, getInput }) =>
      createDriver(chart, surface, getInput, state),
  )
  return mountCase(container, input)
}

function synchronizedCursorOption(
  input: ConformanceInput,
): SynchronizedCursorOption {
  const layout = gridLayout(input.height)
  const series: LineSeriesOption[] = synchronizedCursorViews.map(
    (view, viewIndex) => ({
      id: `${view}-line`,
      name: synchronizedCursorData(view, input.revision)[0]?.series ?? view,
      type: 'line',
      xAxisIndex: viewIndex,
      yAxisIndex: viewIndex,
      data: synchronizedCursorData(view, input.revision).map((datum) => [
        datum.date.getTime(),
        datum.value,
      ]),
      color: synchronizedCursorColors[view],
      lineStyle: {
        color: synchronizedCursorColors[view],
        width: 2,
      },
      itemStyle: {
        color: synchronizedCursorColors[view],
        borderColor: '#ffffff',
        borderWidth: 1,
      },
      showSymbol: true,
      symbol: 'circle',
      symbolSize: 6,
      emphasis: { disabled: true },
      animation: false,
    }),
  )

  return {
    animation: false,
    aria: {
      enabled: true,
      description:
        'Two time-series views with independent y domains and a linked date cursor.',
    },
    grid: [
      {
        id: 'primary',
        top: layout.primaryTop,
        right: 24,
        bottom: undefined,
        left: 62,
        height: layout.height,
      },
      {
        id: 'secondary',
        top: layout.secondaryTop,
        right: 24,
        bottom: undefined,
        left: 62,
        height: layout.height,
      },
    ],
    xAxis: synchronizedCursorViews.map((view, viewIndex) => ({
      id: `${view}-x`,
      gridIndex: viewIndex,
      type: 'time',
      min: synchronizedCursorDateDomain[0].getTime(),
      max: synchronizedCursorDateDomain[1].getTime(),
      axisLabel: { show: true },
      axisTick: { show: true },
      axisLine: { show: true },
      splitLine: { show: false },
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
    })),
    yAxis: synchronizedCursorViews.map((view, viewIndex) => ({
      id: `${view}-y`,
      gridIndex: viewIndex,
      type: 'value',
      min: synchronizedCursorYDomains[view][0],
      max: synchronizedCursorYDomains[view][1],
      name: view === 'primary' ? 'Throughput' : 'Error rate',
      splitLine: {
        show: true,
        lineStyle: { color: '#e2e8f0' },
      },
    })),
    axisPointer: {
      show: true,
      snap: true,
      link: [{ xAxisIndex: [0, 1] }],
    },
    tooltip: {
      show: true,
      showContent: false,
      trigger: 'axis',
      triggerOn: 'mousemove',
      transitionDuration: 0,
      axisPointer: {
        type: 'line',
        snap: true,
      },
    },
    series,
  }
}

function gridLayout(height: number): GridLayout {
  const primaryTop = 20
  const gap = 30
  const bottom = 38
  const available = Math.max(180, height - primaryTop - gap - bottom)
  const gridHeight = Math.floor(available / 2)
  return {
    primaryTop,
    secondaryTop: primaryTop + gridHeight + gap,
    height: gridHeight,
  }
}

function createDriver(
  chart: EChartsType,
  surface: HTMLDivElement,
  getInput: () => ConformanceInput,
  state: CursorState,
): ConformanceTestDriver {
  const handleAxisPointer = (...args: unknown[]) => {
    const date = dateFromAxisPointerEvent(args)
    if (!date) return
    state.date = date
  }
  const clearCursor = () => {
    state.date = null
  }
  chart.on('updateAxisPointer', handleAxisPointer)
  surface.addEventListener('mouseleave', clearCursor)

  return {
    resolveTarget(target) {
      return resolveTarget(chart, surface, getInput(), target)
    },
    readState() {
      return interactionState(chart, surface, state)
    },
    geometry(query) {
      return geometry(chart, surface, getInput(), query)
    },
    viewBounds(view) {
      const synchronized = synchronizedView(view)
      return synchronized
        ? logicalViewBounds(chart, surface, synchronized)
        : null
    },
  }
}

function dateFromAxisPointerEvent(args: readonly unknown[]) {
  const event = args[0]
  if (!isRecord(event) || !Array.isArray(event.axesInfo)) return null
  for (const axisInfo of event.axesInfo) {
    if (
      isRecord(axisInfo) &&
      axisInfo.axisDim === 'x' &&
      axisInfo.axisIndex === 0 &&
      typeof axisInfo.value === 'number'
    ) {
      return nearestDate(axisInfo.value)
    }
  }
  return null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function nearestDate(timestamp: number) {
  return synchronizedCursorDates.reduce((nearest, date) =>
    Math.abs(date.getTime() - timestamp) <
    Math.abs(nearest.getTime() - timestamp)
      ? date
      : nearest,
  )
}

function resolveTarget(
  chart: EChartsType,
  surface: HTMLDivElement,
  input: ConformanceInput,
  target: ConformanceTarget,
) {
  const view = synchronizedView(target.view)
  const date = synchronizedCursorAnchorDate(target.anchor)
  if (!view || !date) return null
  const datum = synchronizedCursorDatumAtDate(view, input.revision, date)
  if (!datum) return null
  const point = pixelPoint(chart, view, date, datum.value)
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
  const view = synchronizedView(query.view)
  if (!view) return []
  const bounds = surface.getBoundingClientRect()
  const rows = synchronizedCursorData(view, input.revision)

  if (query.role === 'dot') {
    return rows.flatMap((datum) => {
      const point = pixelPoint(chart, view, datum.date, datum.value)
      return point
        ? [
            {
              x: bounds.left + point[0] - 3,
              y: bounds.top + point[1] - 3,
              width: 6,
              height: 6,
              paint: synchronizedCursorColors[view],
            },
          ]
        : []
    })
  }

  if (query.role === 'line') {
    const points = rows.flatMap((datum) => {
      const point = pixelPoint(chart, view, datum.date, datum.value)
      return point ? [point] : []
    })
    const sample = pointsBounds(points, bounds, synchronizedCursorColors[view])
    return sample ? [sample] : []
  }

  return []
}

function synchronizedView(
  view: string | undefined,
): SynchronizedCursorView | null {
  return view === 'primary' || view === 'secondary' ? view : null
}

function pixelPoint(
  chart: EChartsType,
  view: SynchronizedCursorView,
  date: Date,
  value: number,
): readonly [number, number] | null {
  const axisIndex = view === 'primary' ? 0 : 1
  const point = chart.convertToPixel(
    { xAxisIndex: axisIndex, yAxisIndex: axisIndex },
    [date.getTime(), value],
  )
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

function logicalViewBounds(
  chart: EChartsType,
  surface: HTMLDivElement,
  view: SynchronizedCursorView,
): ConformanceGeometrySample | null {
  const domain = synchronizedCursorYDomains[view]
  const corners = [
    pixelPoint(chart, view, synchronizedCursorDateDomain[0], domain[0]),
    pixelPoint(chart, view, synchronizedCursorDateDomain[1], domain[0]),
    pixelPoint(chart, view, synchronizedCursorDateDomain[0], domain[1]),
    pixelPoint(chart, view, synchronizedCursorDateDomain[1], domain[1]),
  ].filter((point): point is readonly [number, number] => point !== null)
  if (corners.length !== 4) return null

  const bounds = surface.getBoundingClientRect()
  const xs = corners.map((point) => point[0])
  const ys = corners.map((point) => point[1])
  const left = Math.min(...xs)
  const right = Math.max(...xs)
  const top = Math.min(...ys)
  const bottom = Math.max(...ys)
  return {
    x: bounds.left + left,
    y: bounds.top + top,
    width: right - left,
    height: bottom - top,
  }
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

function interactionState(
  chart: EChartsType,
  surface: HTMLDivElement,
  state: CursorState,
): ConformanceJsonObject {
  return {
    shared: {
      date: state.date ? synchronizedCursorDateKey(state.date) : null,
    },
    crosshairs: {
      primary: renderedCrosshairState(chart, surface, 'primary'),
      secondary: renderedCrosshairState(chart, surface, 'secondary'),
    },
  }
}

function renderedCrosshairState(
  chart: EChartsType,
  surface: HTMLDivElement,
  view: SynchronizedCursorView,
): ConformanceJsonObject {
  const viewBounds = logicalViewBounds(chart, surface, view)
  if (!viewBounds) return { visible: false, xNormalized: null }

  const line = [
    ...surface.querySelectorAll<SVGPathElement>(
      'svg path[stroke="#64748b"][stroke-dasharray]',
    ),
  ].find((path) => {
    const bounds = path.getBoundingClientRect()
    const centerY = bounds.top + bounds.height / 2
    return (
      bounds.height >= viewBounds.height * 0.75 &&
      centerY >= viewBounds.y &&
      centerY <= viewBounds.y + viewBounds.height
    )
  })
  if (!line) return { visible: false, xNormalized: null }

  const bounds = line.getBoundingClientRect()
  const x = bounds.left + bounds.width / 2
  return {
    visible: true,
    xNormalized: (x - viewBounds.x) / viewBounds.width,
  }
}
