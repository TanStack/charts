import { CustomChart } from 'echarts/charts'
import {
  AriaComponent,
  GridComponent,
  TooltipComponent,
} from 'echarts/components'
import { use } from 'echarts/core'
import { SVGRenderer } from 'echarts/renderers'
import type { CustomSeriesOption } from 'echarts/charts'
import type {
  AriaComponentOption,
  GridComponentOption,
  TooltipComponentOption,
} from 'echarts/components'
import type { ComposeOption, EChartsType } from 'echarts/core'
import { echartsMount } from '../../shared/echarts-mount'
import {
  createResourceTimelineShell,
  sizeResourceTimelineShell,
  timelineBodyHeight,
  timelineLaneRailWidth,
  timelineMargin,
  updateTimelineTaskDetails,
} from './shell'
import {
  resourceLanes,
  resourceTasks,
  resourceTimelineDomain,
  timelineChartHeight,
  timelineContentWidth,
  timelineDateKey,
  timelineStatusColors,
  timelineStatuses,
} from './data'
import type { ResourceLane, ResourceTask } from './data'
import type {
  ConformanceGeometryQuery,
  ConformanceGeometrySample,
  ConformanceInput,
  ConformanceMount,
  ConformanceTarget,
  ConformanceTestDriver,
} from '../../types'

use([CustomChart, GridComponent, TooltipComponent, AriaComponent, SVGRenderer])

type ResourceTimelineOption = ComposeOption<
  | CustomSeriesOption
  | GridComponentOption
  | TooltipComponentOption
  | AriaComponentOption
>

const focusScrollPadding = 32

interface TimelineFocusState {
  taskId: string | null
  centerX: number | null
  scrolled: boolean
}

export const mount: ConformanceMount = (container, input) => {
  let currentInput = input
  const shell = createResourceTimelineShell(
    container.ownerDocument,
    input,
    resourceTasks(input.revision),
  )
  container.append(shell.root)
  const { viewport: view, chartSurface: chartFrame } = shell
  const focusState: TimelineFocusState = {
    taskId: null,
    centerX: null,
    scrolled: false,
  }

  const mountChart = echartsMount(
    (nextInput) => timelineOption(nextInput),
    'Tasks scheduled across five resource lanes',
    ({ chart, surface }) =>
      createDriver(chart, surface, view, shell, () => currentInput, focusState),
  )
  const chartHandle = mountChart(chartFrame, timelineInput(input))
  const dateRuler = createDateRuler(chartFrame)
  renderDateRuler(dateRuler, timelineInput(input))
  chartFrame
    .querySelector<HTMLElement>('[data-conformance-view="main"]')
    ?.removeAttribute('data-conformance-view')

  return {
    driver: chartHandle.driver,
    update(nextInput) {
      const scrollLeft = view.scrollLeft
      currentInput = nextInput
      sizeResourceTimelineShell(
        shell,
        nextInput,
        resourceTasks(nextInput.revision),
      )
      chartHandle.update(timelineInput(nextInput))
      renderDateRuler(dateRuler, timelineInput(nextInput))
      if (focusState.taskId) {
        updateTimelineTaskDetails(
          shell,
          resourceTasks(nextInput.revision).find(
            (row) => row.id === focusState.taskId,
          ) ?? null,
        )
      }
      view.scrollLeft = Math.min(
        scrollLeft,
        Math.max(0, view.scrollWidth - view.clientWidth),
      )
    },
    destroy() {
      chartHandle.destroy()
      shell.root.remove()
    },
  }
}

function timelineOption(input: ConformanceInput): ResourceTimelineOption {
  const rows = resourceTasks(input.revision)
  const series: CustomSeriesOption = {
    id: 'resource-tasks',
    name: 'Tasks',
    type: 'custom',
    coordinateSystem: 'cartesian2d',
    dimensions: ['start', 'end', 'lane', 'status'],
    encode: {
      x: [0, 1],
      y: 2,
    },
    data: rows.map((row) => ({
      id: row.id,
      name: `${row.label} · ${row.status}`,
      value: [
        row.start.getTime(),
        row.end.getTime(),
        resourceLanes.indexOf(row.resource),
        timelineStatuses.indexOf(row.status),
      ],
    })),
    renderItem(params, api) {
      const start = api.value(0)
      const end = api.value(1)
      const lane = api.value(2)
      const statusIndex = api.value(3)
      if (
        typeof start !== 'number' ||
        typeof end !== 'number' ||
        typeof lane !== 'number' ||
        typeof statusIndex !== 'number'
      ) {
        return null
      }
      const startPoint = api.coord([start, lane])
      const endPoint = api.coord([end, lane])
      if (!isFinitePoint(startPoint) || !isFinitePoint(endPoint)) return null

      const rawSize = api.size?.([0, 1])
      const categoricalSize =
        Array.isArray(rawSize) &&
        typeof rawSize[1] === 'number' &&
        Number.isFinite(rawSize[1])
          ? Math.abs(rawSize[1])
          : 30
      const height = Math.max(10, categoricalSize * 0.65)
      const status = timelineStatuses[statusIndex] ?? 'planned'
      const row = rows[params.dataIndexInside]

      return {
        type: 'rect',
        name: row?.id,
        shape: {
          x: Math.min(startPoint[0], endPoint[0]),
          y: startPoint[1] - height / 2,
          width: Math.abs(endPoint[0] - startPoint[0]),
          height,
          r: 4,
        },
        style: {
          fill: timelineStatusColors[status],
          stroke: '#ffffff',
          lineWidth: 1,
        },
      }
    },
    clip: true,
    silent: false,
    animation: false,
  }

  return {
    animation: false,
    aria: {
      enabled: true,
      description:
        'Ten tasks arranged across five named resource lanes on a scrollable schedule.',
    },
    grid: timelineMargin,
    tooltip: {
      trigger: 'item',
      confine: true,
    },
    xAxis: {
      type: 'time',
      min: resourceTimelineDomain[0].getTime(),
      max: resourceTimelineDomain[1].getTime(),
      splitNumber: Math.max(6, Math.floor(input.width / 84)),
      axisLabel: { show: false },
      axisTick: { show: false },
      splitLine: {
        show: true,
        lineStyle: { color: '#e2e8f0' },
      },
    },
    yAxis: {
      type: 'category',
      data: [...resourceLanes],
      inverse: true,
      show: false,
      axisTick: { show: false },
      axisLine: { show: false },
    },
    series,
  }
}

function createDriver(
  chart: EChartsType,
  surface: HTMLDivElement,
  viewport: HTMLDivElement,
  shell: ReturnType<typeof createResourceTimelineShell>,
  getInput: () => ConformanceInput,
  focusState: TimelineFocusState,
): ConformanceTestDriver {
  const focusTask = (dataIndex: number) => {
    const row = resourceTasks(getInput().revision)[dataIndex]
    if (!row) return
    const center = taskPoint(
      chart,
      new Date((row.start.getTime() + row.end.getTime()) / 2),
      row.resource,
    )
    if (!center) return
    focusState.taskId = row.id
    focusState.centerX = center[0]
    focusState.scrolled = ensureTimelineFocusVisible(viewport, center[0])
    updateTimelineTaskDetails(shell, row)
    chart.dispatchAction({
      type: 'showTip',
      seriesIndex: 0,
      dataIndex,
    })
  }

  const handleKeyDown = (event: KeyboardEvent) => {
    const rows = resourceTasks(getInput().revision)
    const order = rows
      .map((row, dataIndex) => ({ row, dataIndex }))
      .sort(
        (left, right) =>
          taskMidpoint(left.row) - taskMidpoint(right.row) ||
          resourceLanes.indexOf(left.row.resource) -
            resourceLanes.indexOf(right.row.resource),
      )
    const currentIndex = focusState.taskId
      ? order.findIndex(({ row }) => row.id === focusState.taskId)
      : -1
    let nextIndex: number | undefined
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        nextIndex = Math.min(order.length - 1, currentIndex + 1)
        break
      case 'ArrowLeft':
      case 'ArrowUp':
        nextIndex = Math.max(0, currentIndex < 0 ? 0 : currentIndex - 1)
        break
      case 'Home':
        nextIndex = 0
        break
      case 'End':
        nextIndex = order.length - 1
        break
    }
    if (nextIndex === undefined) return
    event.preventDefault()
    const task = order[nextIndex]
    if (task) focusTask(task.dataIndex)
  }
  surface.addEventListener('keydown', handleKeyDown)

  return {
    resolveTarget(target) {
      return timelineTarget(chart, surface, viewport, getInput(), target)
    },
    readState() {
      return timelineState(viewport, getInput(), focusState)
    },
    geometry(query) {
      return timelineGeometry(chart, surface, viewport, getInput(), query)
    },
  }
}

function timelineTarget(
  chart: EChartsType,
  surface: HTMLDivElement,
  viewport: HTMLDivElement,
  input: ConformanceInput,
  target: ConformanceTarget,
) {
  if (target.view !== undefined && target.view !== 'main') {
    return null
  }
  if (target.anchor.startsWith('task:')) {
    const taskId = target.anchor.slice('task:'.length)
    const row = resourceTasks(input.revision).find(
      (candidate) => candidate.id === taskId,
    )
    if (!row) return null
    const point = taskPoint(
      chart,
      new Date((row.start.getTime() + row.end.getTime()) / 2),
      row.resource,
    )
    if (!point) return null
    const bounds = surface.getBoundingClientRect()
    return {
      x: bounds.left + point[0],
      y: bounds.top + point[1],
      focusElement: surface,
    }
  }
  if (target.anchor !== 'viewport') return null
  const bounds = viewport.getBoundingClientRect()
  return {
    x: bounds.left + bounds.width / 2,
    y: bounds.top + bounds.height / 2,
    focusElement: viewport,
  }
}

function timelineState(
  viewport: HTMLDivElement,
  input: ConformanceInput,
  focusState: TimelineFocusState,
) {
  const rows = resourceTasks(input.revision)
  const apiBuild = rows.find((row) => row.id === 'api-build')
  const qualityRelease = rows.find((row) => row.id === 'quality-release')
  return {
    viewport: {
      scrollLeft: viewport.scrollLeft,
      clientWidth: viewport.clientWidth,
      scrollWidth: viewport.scrollWidth,
    },
    lanes: {
      count: resourceLanes.length,
      names: resourceLanes,
    },
    tasks: {
      count: rows.length,
      ids: rows.map((row) => row.id),
      apiBuildEnd: apiBuild ? timelineDateKey(apiBuild.end) : null,
      qualityReleaseStart: qualityRelease
        ? timelineDateKey(qualityRelease.start)
        : null,
    },
    domain: {
      start: timelineDateKey(resourceTimelineDomain[0]),
      end: timelineDateKey(resourceTimelineDomain[1]),
    },
    focus: {
      taskId: focusState.taskId,
      visible:
        focusState.centerX !== null &&
        focusState.centerX >= viewport.scrollLeft &&
        focusState.centerX <= viewport.scrollLeft + viewport.clientWidth,
      scrolled: focusState.scrolled,
    },
  }
}

function ensureTimelineFocusVisible(viewport: HTMLDivElement, centerX: number) {
  const previous = viewport.scrollLeft
  const visibleStart = previous + focusScrollPadding
  const visibleEnd = previous + viewport.clientWidth - focusScrollPadding
  let next = previous
  if (centerX < visibleStart) {
    next = centerX - focusScrollPadding
  } else if (centerX > visibleEnd) {
    next = centerX - viewport.clientWidth + focusScrollPadding
  }
  viewport.scrollLeft = Math.max(
    0,
    Math.min(next, viewport.scrollWidth - viewport.clientWidth),
  )
  return Math.abs(viewport.scrollLeft - previous) > 1
}

function taskMidpoint(task: ResourceTask) {
  return (task.start.getTime() + task.end.getTime()) / 2
}

function timelineGeometry(
  chart: EChartsType,
  surface: HTMLDivElement,
  viewport: HTMLDivElement,
  input: ConformanceInput,
  query: ConformanceGeometryQuery,
): readonly ConformanceGeometrySample[] {
  if (
    (query.view !== undefined && query.view !== 'main') ||
    query.role !== 'rect'
  ) {
    return []
  }
  const surfaceBounds = surface.getBoundingClientRect()
  const viewportBounds = viewport.getBoundingClientRect()
  const height = laneHeight(chart)

  return resourceTasks(input.revision).flatMap((row) => {
    const start = taskPoint(chart, row.start, row.resource)
    const end = taskPoint(chart, row.end, row.resource)
    if (!start || !end) return []
    const sample = clipClientSample(
      {
        x: surfaceBounds.left + Math.min(start[0], end[0]),
        y: surfaceBounds.top + start[1] - height / 2,
        width: Math.abs(end[0] - start[0]),
        height,
        paint: timelineStatusColors[row.status],
      },
      viewportBounds,
    )
    return sample ? [sample] : []
  })
}

function taskPoint(
  chart: EChartsType,
  date: Date,
  resource: ResourceLane,
): readonly [number, number] | null {
  const point = chart.convertToPixel({ xAxisIndex: 0, yAxisIndex: 0 }, [
    date.getTime(),
    resource,
  ])
  return isFinitePoint(point) ? [point[0], point[1]] : null
}

function laneHeight(chart: EChartsType) {
  const first = taskPoint(chart, resourceTimelineDomain[0], resourceLanes[0])
  const second = taskPoint(chart, resourceTimelineDomain[0], resourceLanes[1])
  return first && second
    ? Math.max(10, Math.abs(second[1] - first[1]) * 0.65)
    : 20
}

function isFinitePoint(value: unknown): value is [number, number] {
  return (
    Array.isArray(value) &&
    typeof value[0] === 'number' &&
    typeof value[1] === 'number' &&
    Number.isFinite(value[0]) &&
    Number.isFinite(value[1])
  )
}

function clipClientSample(
  sample: ConformanceGeometrySample,
  viewport: DOMRect,
): ConformanceGeometrySample | null {
  const left = Math.max(sample.x, viewport.left)
  const top = Math.max(sample.y, viewport.top)
  const right = Math.min(sample.x + sample.width, viewport.right)
  const bottom = Math.min(sample.y + sample.height, viewport.bottom)
  if (right <= left || bottom <= top) return null
  return {
    x: left,
    y: top,
    width: right - left,
    height: bottom - top,
    paint: sample.paint,
  }
}

function timelineInput(input: ConformanceInput): ConformanceInput {
  return {
    ...input,
    width: timelineContentWidth(
      input.width - timelineLaneRailWidth(input.width),
    ),
    height: timelineChartHeight(timelineBodyHeight(input.height)),
  }
}

function createDateRuler(chartFrame: HTMLDivElement) {
  chartFrame.style.position = 'relative'
  const ruler = chartFrame.ownerDocument.createElement('div')
  ruler.dataset.conformanceDateRuler = ''
  ruler.setAttribute('aria-label', 'Schedule dates')
  Object.assign(ruler.style, {
    position: 'absolute',
    inset: '0',
    zIndex: '2',
    pointerEvents: 'none',
    color: 'CanvasText',
    opacity: '0.72',
    font: '500 10px/1 system-ui, sans-serif',
  })
  chartFrame.append(ruler)
  return ruler
}

function renderDateRuler(ruler: HTMLDivElement, input: ConformanceInput) {
  const document = ruler.ownerDocument
  const start = resourceTimelineDomain[0].getTime()
  const end = resourceTimelineDomain[1].getTime()
  const week = 7 * 86_400_000
  const ticks: HTMLSpanElement[] = []
  for (let timestamp = start; timestamp <= end; timestamp += week) {
    const tick = document.createElement('span')
    tick.dataset.conformanceDateTick = ''
    tick.textContent = new Date(timestamp).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    })
    const fraction = (timestamp - start) / (end - start)
    Object.assign(tick.style, {
      position: 'absolute',
      left: `${
        timelineMargin.left +
        fraction * (input.width - timelineMargin.left - timelineMargin.right)
      }px`,
      top: `${input.height - timelineMargin.bottom + 16}px`,
      transform:
        timestamp === start
          ? 'none'
          : timestamp + week > end
            ? 'translateX(-100%)'
            : 'translateX(-50%)',
      whiteSpace: 'nowrap',
    })
    ticks.push(tick)
  }
  ruler.replaceChildren(...ticks)
}
