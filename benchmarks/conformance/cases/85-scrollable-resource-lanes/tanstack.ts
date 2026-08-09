import { defineChart, mountChart, rect } from '@tanstack/charts'
import { tooltip } from '@tanstack/charts/tooltip'
import { scaleBand, scaleUtc } from 'd3-scale'
import { timelineStatusColors } from './colors'
import {
  createResourceTimelineShell,
  ensureTimelineFocusVisible,
  renderTimelineLaneRail,
  sizeResourceTimelineShell,
  timelineBodyHeight,
  timelineChartHeight,
  timelineContentWidth,
  timelineLaneRailWidth,
  timelineMargin,
  updateTimelineTaskDetails,
} from './shell'
import {
  resourceLanes,
  resourceTasks,
  resourceTimelineDomain,
  timelineStatuses,
} from './scenario'
import { timelineDateKey } from './model'
import { tanstackCase } from '../../shared/mount'
import type {
  ChartHost,
  ChartPoint,
  ChartScene,
  ChartHostOptions,
} from '@tanstack/charts'
import type { ResourceTask } from './scenario'
import type {
  ConformanceGeometryQuery,
  ConformanceGeometrySample,
  ConformanceInput,
  ConformanceMount,
  ConformanceTarget,
  ConformanceTestDriver,
} from '../../types'

const taskInset = 5

interface TimelineFocusState {
  taskId: string | null
  centerX: number | null
  scrolled: boolean
}

export const resourceTimelineDefinition = (input: ConformanceInput) => {
  const rows = resourceTasks(input.revision)

  return defineChart(
    defineChart(({ width }) => {
      return {
        marks: [
          rect(rows, {
            x1: 'start',
            x2: 'end',
            y: 'resource',
            color: 'status',
            inset: taskInset,
            radius: 4,
            stroke: '#ffffff',
            strokeWidth: 1,
          }),
        ],
        x: {
          scale: scaleUtc().domain(resourceTimelineDomain),
          grid: true,
          axis: { ticks: { count: Math.max(6, Math.floor(width / 84)) } },
        },
        y: {
          scale: scaleBand<string>()
            .domain(resourceLanes)
            .paddingInner(0.08)
            .paddingOuter(0.04),
          grid: false,
          axis: false,
        },
        color: {
          domain: timelineStatuses,
          range: timelineStatuses.map((status) => timelineStatusColors[status]),
        },
        margin: timelineMargin,
      }
    }),
    {
      svgAnimation: false,
      keyboard: true,
      tooltip: {
        use: tooltip,
        format: (point) =>
          `${point.datum.resource} · ${point.datum.label} · ${
            point.datum.status
          } · ${formatTaskDate(point.datum.start)}–${formatTaskDate(
            point.datum.end,
          )}`,
      },
    },
  )
}

export const catalogCase = tanstackCase(
  resourceTimelineDefinition,
  'Tasks scheduled across five resource lanes',
  {
    format: (point) =>
      `${point.datum.resource} · ${point.datum.label} · ${
        point.datum.status
      } · ${formatTaskDate(point.datum.start)}–${formatTaskDate(
        point.datum.end,
      )}`,
  },
)

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

  const updateFocusedTask = (point: ChartPoint<ResourceTask> | null) => {
    focusState.taskId = point?.datum.id ?? null
    focusState.centerX = point?.x ?? null
    focusState.scrolled = point
      ? ensureTimelineFocusVisible(viewport, point.x)
      : false
    updateTimelineTaskDetails(shell, point?.datum ?? null)
  }

  const chartOptions = (
    nextInput: ConformanceInput,
  ): ChartHostOptions<ResourceTask, number, string> => ({
    definition: resourceTimelineDefinition(nextInput),
    width: timelineContentWidth(
      nextInput.width - timelineLaneRailWidth(nextInput.width),
    ),
    height: timelineChartHeight(timelineBodyHeight(nextInput.height)),
    ariaLabel: 'Tasks scheduled across five resource lanes',
    ariaDescription:
      'Focus the chart and use the arrow, Home, and End keys to inspect tasks. Offscreen tasks scroll into view.',
    onFocusChange: updateFocusedTask,
    onRender: ({ scene }) => {
      renderTimelineLaneRail(shell.laneRail, (lane) => scene.scales.y.map(lane))
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
  host: ChartHost<ResourceTask, number, string>,
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
  host: ChartHost<ResourceTask, number, string>,
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
