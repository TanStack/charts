import { defineChart, mountChart, rect } from '@tanstack/charts'
import { scaleBand, scaleOrdinal, scaleUtc } from 'd3-scale'
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
import type {
  ChartHost,
  ChartPoint,
  ChartScene,
  ChartHostOptions,
} from '@tanstack/charts'
import type { ResourceTask, TimelineStatus } from './data'
import type {
  ConformanceGeometryQuery,
  ConformanceGeometrySample,
  ConformanceInput,
  ConformanceMount,
  ConformanceTarget,
  ConformanceTestDriver,
} from '../../types'

const taskInset = 5
const focusScrollPadding = 32

interface TimelineFocusState {
  taskId: string | null
  centerX: number | null
  scrolled: boolean
}

const definition = (input: ConformanceInput) =>
  defineChart(() => {
    const rows = resourceTasks(input.revision)
    return {
      marks: [
        rect(rows, {
          id: 'resource-tasks',
          x1: 'start',
          x2: 'end',
          y: 'resource',
          z: 'status',
          key: 'id',
          inset: taskInset,
          radius: 4,
          stroke: '#ffffff',
          strokeWidth: 1,
        }),
      ],
      x: {
        scale: scaleUtc().domain(resourceTimelineDomain),
        grid: true,
        ticks: Math.max(
          6,
          Math.floor(
            timelineContentWidth(
              input.width - timelineLaneRailWidth(input.width),
            ) / 84,
          ),
        ),
      },
      y: {
        scale: scaleBand<string>()
          .domain(resourceLanes)
          .paddingInner(0.08)
          .paddingOuter(0.04),
        grid: false,
        guide: false,
      },
      color: {
        scale: scaleOrdinal<TimelineStatus, string>()
          .domain(timelineStatuses)
          .range(
            timelineStatuses.map((status) => timelineStatusColors[status]),
          ),
      },
      margin: timelineMargin,
    }
  })

export const mount: ConformanceMount = (container, input) => {
  let currentInput = input
  const shell = createResourceTimelineShell(
    container.ownerDocument,
    input,
    resourceTasks(input.revision),
  )
  container.append(shell.root)
  const { viewport, chartSurface } = shell
  const focusState: TimelineFocusState = {
    taskId: null,
    centerX: null,
    scrolled: false,
  }

  const updateFocusedTask = (points: readonly ChartPoint<ResourceTask>[]) => {
    const point = points[0] ?? null
    focusState.taskId = point?.datum.id ?? null
    focusState.centerX = point?.x ?? null
    focusState.scrolled = point
      ? ensureTimelineFocusVisible(viewport, point.x)
      : false
    updateTimelineTaskDetails(shell, point?.datum ?? null)
  }

  const chartOptions = (
    nextInput: ConformanceInput,
  ): ChartHostOptions<ResourceTask> => ({
    definition: definition(nextInput),
    width: timelineContentWidth(
      nextInput.width - timelineLaneRailWidth(nextInput.width),
    ),
    height: timelineChartHeight(timelineBodyHeight(nextInput.height)),
    ariaLabel: 'Tasks scheduled across five resource lanes',
    ariaDescription:
      'Focus the chart and use the arrow, Home, and End keys to inspect tasks. Offscreen tasks scroll into view.',
    animate: false,
    keyboard: true,
    onFocusGroupChange: updateFocusedTask,
    tooltip: {
      format: (point: ChartPoint<ResourceTask>) =>
        `${point.datum.resource} · ${point.datum.label} · ${
          point.datum.status
        } · ${formatTaskDate(point.datum.start)}–${formatTaskDate(
          point.datum.end,
        )}`,
    },
  })
  const host = mountChart(chartSurface, chartOptions(input))
  const driver = createDriver(
    viewport,
    chartSurface,
    () => currentInput,
    host,
    focusState,
  )

  return {
    driver,
    update(nextInput) {
      const scrollLeft = viewport.scrollLeft
      currentInput = nextInput
      sizeResourceTimelineShell(
        shell,
        nextInput,
        resourceTasks(nextInput.revision),
      )
      host.update(chartOptions(nextInput))
      viewport.scrollLeft = Math.min(
        scrollLeft,
        Math.max(0, viewport.scrollWidth - viewport.clientWidth),
      )
    },
    destroy() {
      host.destroy()
      shell.root.remove()
    },
  }
}

function createDriver(
  viewport: HTMLDivElement,
  chartSurface: HTMLDivElement,
  getInput: () => ConformanceInput,
  host: ChartHost<ResourceTask>,
  focusState: TimelineFocusState,
): ConformanceTestDriver {
  return {
    resolveTarget(target) {
      return timelineTarget(viewport, chartSurface, host, target)
    },
    readState() {
      return timelineState(viewport, getInput(), focusState)
    },
    geometry(query) {
      return timelineGeometry(
        viewport,
        chartSurface,
        getInput(),
        host.getScene(),
        query,
      )
    },
  }
}

function timelineTarget(
  viewport: HTMLDivElement,
  chartSurface: HTMLDivElement,
  host: ChartHost<ResourceTask>,
  target: ConformanceTarget,
) {
  if (target.view !== undefined && target.view !== 'main') {
    return null
  }
  if (target.anchor.startsWith('task:')) {
    const taskId = target.anchor.slice('task:'.length)
    const scene = host.getScene()
    const point = scene.points.find(
      (candidate) => candidate.datum.id === taskId,
    )
    const svg = chartSurface.querySelector<SVGSVGElement>('svg.ts-chart')
    if (!point || !svg) return null
    const bounds = svg.getBoundingClientRect()
    return {
      x: bounds.left + (point.x / scene.width) * bounds.width,
      y: bounds.top + (point.y / scene.height) * bounds.height,
      focusElement: svg,
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

function timelineGeometry(
  viewport: HTMLDivElement,
  chartSurface: HTMLDivElement,
  input: ConformanceInput,
  scene: ChartScene<ResourceTask>,
  query: ConformanceGeometryQuery,
): readonly ConformanceGeometrySample[] {
  if (
    (query.view !== undefined && query.view !== 'main') ||
    query.role !== 'rect'
  ) {
    return []
  }
  const svg = chartSurface.querySelector<SVGSVGElement>('svg.ts-chart')
  if (!svg) return []
  const svgBounds = svg.getBoundingClientRect()
  const viewportBounds = viewport.getBoundingClientRect()
  const scaleX = svgBounds.width / scene.width
  const scaleY = svgBounds.height / scene.height
  const height = Math.max(
    0,
    (scene.scales.y.bandwidth - taskInset * 2) * scaleY,
  )

  return resourceTasks(input.revision).flatMap((row) => {
    const x1 = scene.scales.x.map(row.start)
    const x2 = scene.scales.x.map(row.end)
    const centerY = scene.scales.y.map(row.resource)
    const sample = clipClientSample(
      {
        x: svgBounds.left + Math.min(x1, x2) * scaleX,
        y:
          svgBounds.top +
          (centerY - scene.scales.y.bandwidth / 2 + taskInset) * scaleY,
        width: Math.abs(x2 - x1) * scaleX,
        height,
        paint: timelineStatusColors[row.status],
      },
      viewportBounds,
    )
    return sample ? [sample] : []
  })
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

function formatTaskDate(date: Date) {
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })
}
