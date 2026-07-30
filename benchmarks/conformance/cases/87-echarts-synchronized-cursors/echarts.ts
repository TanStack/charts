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
import { travelers } from '@charts-poc/demo-data/travelers'
import { echartsMount } from '../../shared/echarts-mount'
import {
  selectSynchronizedCursorData,
  synchronizedCursorDates as datesForRows,
} from './selection'
import { synchronizedCursorViews, synchronizedCursorYDomains } from './model'
import { synchronizedCursorColors } from './colors'
import {
  synchronizedCursorAnchorDate,
  synchronizedCursorDateKey,
  synchronizedCursorDatumAtDate,
  synchronizedCursorNearestDatum,
} from './model'
import { createSynchronizedSummary, updateSynchronizedSummary } from './summary'
import type { SynchronizedCursorView } from './model'
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
  pinned: boolean
  preservedDate: Date | null
}

interface GridLayout {
  currentTop: number
  previousTop: number
  height: number
}

const travelerCountFormat = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 1,
})

function synchronizedCursorData(revision = 0) {
  return selectSynchronizedCursorData(travelers, revision)
}

function synchronizedCursorDates(revision = 0) {
  return datesForRows(synchronizedCursorData(revision))
}

export const mount: ConformanceMount = (container, input) => {
  let currentInput = input
  let restoreCursor: ((date: Date) => void) | undefined
  const state: CursorState = {
    date: null,
    pinned: false,
    preservedDate: null,
  }
  const shell = container.ownerDocument.createElement('div')
  const summary = createSynchronizedSummary(container.ownerDocument)
  const chartFrame = container.ownerDocument.createElement('div')
  shell.style.display = 'grid'
  shell.style.gridTemplateRows = '56px minmax(0, 1fr)'
  shell.append(summary.root, chartFrame)
  container.append(shell)
  sizeSynchronizedShell(shell, chartFrame, input)

  const updateSummary = () =>
    updateSynchronizedSummary(summary, state.date, currentInput, state.pinned)
  const mountCase = echartsMount(
    synchronizedCursorOption,
    '2020 and 2019 airport traveler views with linked date cursors',
    ({ chart, surface, getInput }) => {
      restoreCursor = (date) => showCursorDate(chart, getInput(), date)
      return createDriver(chart, surface, getInput, state, updateSummary)
    },
  )
  const chartHandle = mountCase(chartFrame, synchronizedInput(input))
  updateSummary()

  return {
    driver: chartHandle.driver,
    update(nextInput) {
      const semanticDate = state.date
      state.preservedDate = semanticDate
      currentInput = nextInput
      sizeSynchronizedShell(shell, chartFrame, nextInput)
      chartHandle.update(synchronizedInput(nextInput))
      if (semanticDate) {
        state.date = semanticDate
        restoreCursor?.(semanticDate)
        state.date = semanticDate
      }
      updateSummary()
    },
    destroy() {
      chartHandle.destroy()
      shell.remove()
    },
  }
}

function showCursorDate(
  chart: EChartsType,
  input: ConformanceInput,
  date: Date,
) {
  const dataIndex = synchronizedCursorData(input.revision).findIndex(
    (row) => row.date.getTime() === date.getTime(),
  )
  if (dataIndex < 0) return
  chart.dispatchAction({
    type: 'showTip',
    seriesIndex: 0,
    dataIndex,
  })
}

function synchronizedCursorOption(
  input: ConformanceInput,
): SynchronizedCursorOption {
  const layout = gridLayout(input.height)
  const rows = synchronizedCursorData(input.revision)
  const series: LineSeriesOption[] = synchronizedCursorViews.map(
    (view, viewIndex) => ({
      id: `${view}-line`,
      name: view === 'current' ? '2020 travelers' : '2019 travelers',
      type: 'line',
      xAxisIndex: viewIndex,
      yAxisIndex: viewIndex,
      data: rows.map((datum) => [datum.date.getTime(), datum[view]]),
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
        'Daily U.S. airport traveler counts for 2020 and 2019 with independent y domains and a linked date cursor.',
    },
    grid: [
      {
        id: 'current',
        top: layout.currentTop,
        right: 24,
        bottom: undefined,
        left: 62,
        height: layout.height,
        outerBoundsMode: 'none',
      },
      {
        id: 'previous',
        top: layout.previousTop,
        right: 24,
        bottom: undefined,
        left: 62,
        height: layout.height,
        outerBoundsMode: 'none',
      },
    ],
    xAxis: synchronizedCursorViews.map((view, viewIndex) => ({
      id: `${view}-x`,
      gridIndex: viewIndex,
      type: 'time',
      min: 'dataMin',
      max: 'dataMax',
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
      name: view === 'current' ? '2020 travelers' : '2019 travelers',
      nameLocation: 'middle',
      nameGap: 48,
      nameRotate: 90,
      axisLabel: {
        formatter: (value: number) => travelerCountFormat.format(value),
      },
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
  const viewGap = 8
  const viewTop = 16
  const viewBottom = 34
  const viewHeight = Math.max(140, Math.floor((height - viewGap) / 2))
  const gridHeight = Math.max(1, viewHeight - viewTop - viewBottom)
  return {
    currentTop: viewTop,
    previousTop: viewHeight + viewGap + viewTop,
    height: gridHeight,
  }
}

function createDriver(
  chart: EChartsType,
  surface: HTMLDivElement,
  getInput: () => ConformanceInput,
  state: CursorState,
  updateSummary: () => void,
): ConformanceTestDriver {
  const handleAxisPointer = (...args: unknown[]) => {
    const date = dateFromAxisPointerEvent(args, getInput().revision)
    if (!date) return
    state.date = state.preservedDate ?? date
    updateSummary()
  }
  const releasePreservedDate = () => {
    state.preservedDate = null
  }
  const clearCursor = () => {
    if (state.pinned) return
    state.preservedDate = null
    state.date = null
    updateSummary()
  }
  const pinCursor = () => {
    if (!state.date) return
    state.pinned = !state.pinned
    if (!state.pinned) state.date = null
    updateSummary()
  }
  const handleKeyDown = (event: KeyboardEvent) => {
    state.preservedDate = null
    if (event.key === 'Escape' && state.pinned) {
      event.preventDefault()
      state.pinned = false
      state.date = null
      chart.dispatchAction({ type: 'hideTip' })
      updateSummary()
      return
    }
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
    event.preventDefault()
    const dates = synchronizedCursorDates(getInput().revision)
    const currentIndex = state.date
      ? dates.findIndex((date) => date.getTime() === state.date?.getTime())
      : -1
    const nextIndex =
      event.key === 'ArrowRight'
        ? Math.min(dates.length - 1, currentIndex + 1)
        : Math.max(0, currentIndex < 0 ? 0 : currentIndex - 1)
    const nextDate = dates[nextIndex]
    if (!nextDate) return
    state.date = nextDate
    chart.dispatchAction({
      type: 'showTip',
      seriesIndex: 0,
      dataIndex: nextIndex,
    })
    updateSummary()
  }
  chart.on('updateAxisPointer', handleAxisPointer)
  surface.addEventListener('pointermove', releasePreservedDate, true)
  surface.addEventListener('mouseleave', clearCursor)
  surface.addEventListener('click', pinCursor)
  surface.addEventListener('keydown', handleKeyDown)

  return {
    resolveTarget(target) {
      return resolveTarget(chart, surface, getInput(), target)
    },
    readState() {
      return interactionState(chart, surface, getInput(), state)
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

function dateFromAxisPointerEvent(args: readonly unknown[], revision: number) {
  const event = args[0]
  if (!isRecord(event) || !Array.isArray(event.axesInfo)) return null
  for (const axisInfo of event.axesInfo) {
    if (
      isRecord(axisInfo) &&
      axisInfo.axisDim === 'x' &&
      axisInfo.axisIndex === 0 &&
      typeof axisInfo.value === 'number'
    ) {
      return nearestDate(axisInfo.value, revision)
    }
  }
  return null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function nearestDate(timestamp: number, revision: number) {
  return synchronizedCursorDates(revision).reduce((nearest, date) =>
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
  const rows = synchronizedCursorData(input.revision)
  const datum = synchronizedCursorNearestDatum(rows, date)
  if (!datum) return null
  const point = pixelPoint(chart, view, date, datum[view])
  const viewBounds = logicalViewBounds(chart, surface, view)
  const firstDate = rows[0]?.date
  const lastDate = rows.at(-1)?.date
  if (!point || !viewBounds || !firstDate || !lastDate) return null
  const span = lastDate.getTime() - firstDate.getTime()
  const x =
    viewBounds.x +
    ((date.getTime() - firstDate.getTime()) / span) * viewBounds.width
  const bounds = surface.getBoundingClientRect()
  return {
    x,
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
  const rows = synchronizedCursorData(input.revision)

  if (query.role === 'dot') {
    return rows.flatMap((datum) => {
      const point = pixelPoint(chart, view, datum.date, datum[view])
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
      const point = pixelPoint(chart, view, datum.date, datum[view])
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
  return view === 'current' || view === 'previous' ? view : null
}

function pixelPoint(
  chart: EChartsType,
  view: SynchronizedCursorView,
  date: Date,
  value: number,
): readonly [number, number] | null {
  const axisIndex = view === 'current' ? 0 : 1
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
  const bounds = surface.getBoundingClientRect()
  const layout = gridLayout(chart.getHeight())
  const left = 62
  const right = chart.getWidth() - 24
  const top = view === 'current' ? layout.currentTop : layout.previousTop
  return {
    x: bounds.left + left,
    y: bounds.top + top,
    width: right - left,
    height: layout.height,
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
  input: ConformanceInput,
  state: CursorState,
): ConformanceJsonObject {
  const rows = synchronizedCursorData(input.revision)
  const currentCrosshair = renderedCrosshairState(chart, surface, 'current')
  const previousCrosshair = renderedCrosshairState(chart, surface, 'previous')
  return {
    shared: {
      date: state.date ? synchronizedCursorDateKey(state.date) : null,
      currentValue: state.date
        ? (synchronizedCursorDatumAtDate(rows, state.date)?.current ?? null)
        : null,
      previousValue: state.date
        ? (synchronizedCursorDatumAtDate(rows, state.date)?.previous ?? null)
        : null,
      pinned: state.pinned,
    },
    crosshairs: {
      aligned: crosshairsAligned(currentCrosshair, previousCrosshair),
      current: currentCrosshair,
      previous: previousCrosshair,
    },
  }
}

function synchronizedInput(input: ConformanceInput): ConformanceInput {
  return {
    ...input,
    height: Math.max(280, input.height - 56),
  }
}

function sizeSynchronizedShell(
  shell: HTMLDivElement,
  chartFrame: HTMLDivElement,
  input: ConformanceInput,
) {
  shell.style.width = `${input.width}px`
  shell.style.height = `${input.height}px`
  chartFrame.style.width = `${input.width}px`
  chartFrame.style.height = `${Math.max(280, input.height - 56)}px`
}

function renderedCrosshairState(
  chart: EChartsType,
  surface: HTMLDivElement,
  view: SynchronizedCursorView,
) {
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

function crosshairsAligned(
  current: ReturnType<typeof renderedCrosshairState>,
  previous: ReturnType<typeof renderedCrosshairState>,
) {
  return (
    current.xNormalized !== null &&
    previous.xNormalized !== null &&
    Math.abs(current.xNormalized - previous.xNormalized) < 0.005
  )
}
