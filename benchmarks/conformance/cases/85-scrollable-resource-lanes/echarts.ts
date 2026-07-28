import { CustomChart } from 'echarts/charts'
import { AriaComponent, GridComponent } from 'echarts/components'
import { use } from 'echarts/core'
import { SVGRenderer } from 'echarts/renderers'
import type { CustomSeriesOption } from 'echarts/charts'
import type {
  AriaComponentOption,
  GridComponentOption,
} from 'echarts/components'
import type { ComposeOption, EChartsType } from 'echarts/core'
import { echartsMount } from '../../shared/echarts-mount'
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

use([CustomChart, GridComponent, AriaComponent, SVGRenderer])

type ResourceTimelineOption = ComposeOption<
  CustomSeriesOption | GridComponentOption | AriaComponentOption
>

const margin = { top: 18, right: 24, bottom: 50, left: 118 }

export const mount: ConformanceMount = (container, input) => {
  let currentInput = input
  const view = container.ownerDocument.createElement('div')
  view.dataset.conformanceView = 'main'
  view.dataset.conformanceScrollViewport = ''
  view.setAttribute('role', 'region')
  view.setAttribute('aria-label', 'Scrollable resource schedule')
  view.tabIndex = 0
  view.style.overflowX = 'auto'
  view.style.overflowY = 'hidden'
  view.style.overscrollBehaviorX = 'contain'
  view.style.position = 'relative'

  const chartFrame = container.ownerDocument.createElement('div')
  view.append(chartFrame)
  container.append(view)
  sizeTimeline(view, chartFrame, input)

  const mountChart = echartsMount(
    (nextInput) => timelineOption(nextInput),
    'Tasks scheduled across five resource lanes',
    ({ chart, surface }) =>
      createDriver(chart, surface, view, () => currentInput),
  )
  const chartHandle = mountChart(chartFrame, timelineInput(input))
  chartFrame
    .querySelector<HTMLElement>('[data-conformance-view="main"]')
    ?.removeAttribute('data-conformance-view')

  return {
    driver: chartHandle.driver,
    update(nextInput) {
      const scrollLeft = view.scrollLeft
      currentInput = nextInput
      sizeTimeline(view, chartFrame, nextInput)
      chartHandle.update(timelineInput(nextInput))
      view.scrollLeft = Math.min(
        scrollLeft,
        Math.max(0, view.scrollWidth - view.clientWidth),
      )
    },
    destroy() {
      chartHandle.destroy()
      view.remove()
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
      name: row.label,
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
    silent: true,
    animation: false,
  }

  return {
    animation: false,
    aria: {
      enabled: true,
      description:
        'Ten tasks arranged across five named resource lanes on a scrollable schedule.',
    },
    grid: margin,
    xAxis: {
      type: 'time',
      min: resourceTimelineDomain[0].getTime(),
      max: resourceTimelineDomain[1].getTime(),
      splitLine: {
        show: true,
        lineStyle: { color: '#e2e8f0' },
      },
    },
    yAxis: {
      type: 'category',
      data: [...resourceLanes],
      inverse: true,
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
  getInput: () => ConformanceInput,
): ConformanceTestDriver {
  return {
    resolveTarget(target) {
      return viewportTarget(viewport, target)
    },
    readState() {
      return timelineState(viewport, getInput())
    },
    geometry(query) {
      return timelineGeometry(chart, surface, viewport, getInput(), query)
    },
  }
}

function viewportTarget(viewport: HTMLDivElement, target: ConformanceTarget) {
  if (
    (target.view !== undefined && target.view !== 'main') ||
    target.anchor !== 'viewport'
  ) {
    return null
  }
  const bounds = viewport.getBoundingClientRect()
  return {
    x: bounds.left + bounds.width / 2,
    y: bounds.top + bounds.height / 2,
    focusElement: viewport,
  }
}

function timelineState(viewport: HTMLDivElement, input: ConformanceInput) {
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
  }
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
    width: timelineContentWidth(input.width),
    height: timelineChartHeight(input.height),
  }
}

function sizeTimeline(
  viewport: HTMLDivElement,
  chartFrame: HTMLDivElement,
  input: ConformanceInput,
) {
  viewport.style.width = `${input.width}px`
  viewport.style.height = `${input.height}px`
  chartFrame.style.width = `${timelineContentWidth(input.width)}px`
  chartFrame.style.height = `${timelineChartHeight(input.height)}px`
}
