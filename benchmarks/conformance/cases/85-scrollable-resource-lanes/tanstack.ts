import { defineChart, mountChart, rect } from '@tanstack/charts'
import { scaleBand, scaleOrdinal, scaleUtc } from 'd3-scale'
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
  ChartScene,
  DynamicChartHostOptions,
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

const definition = defineChart<ConformanceInput>()(({ input }) => {
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
      ticks: 3,
    },
    y: {
      scale: scaleBand<string>()
        .domain(resourceLanes)
        .paddingInner(0.08)
        .paddingOuter(0.04),
      grid: false,
    },
    color: {
      scale: scaleOrdinal<TimelineStatus, string>()
        .domain(timelineStatuses)
        .range(timelineStatuses.map((status) => timelineStatusColors[status])),
    },
    margin: { top: 18, right: 24, bottom: 50, left: 118 },
  }
})

export const mount: ConformanceMount = (container, input) => {
  let currentInput = input
  const viewport = container.ownerDocument.createElement('div')
  viewport.dataset.conformanceView = 'main'
  viewport.dataset.conformanceScrollViewport = ''
  viewport.setAttribute('role', 'region')
  viewport.setAttribute('aria-label', 'Scrollable resource schedule')
  viewport.tabIndex = 0
  viewport.style.overflowX = 'auto'
  viewport.style.overflowY = 'hidden'
  viewport.style.overscrollBehaviorX = 'contain'
  viewport.style.position = 'relative'

  const chartSurface = container.ownerDocument.createElement('div')
  viewport.append(chartSurface)
  container.append(viewport)
  sizeTimeline(viewport, chartSurface, input)

  const chartOptions = (
    nextInput: ConformanceInput,
  ): DynamicChartHostOptions<ResourceTask, ConformanceInput> => ({
    definition,
    input: nextInput,
    width: timelineContentWidth(nextInput.width),
    height: timelineChartHeight(nextInput.height),
    ariaLabel: 'Tasks scheduled across five resource lanes',
    animate: false,
    keyboard: false,
  })
  const host = mountChart(chartSurface, chartOptions(input))
  const driver = createDriver(viewport, chartSurface, () => currentInput, host)

  return {
    driver,
    update(nextInput) {
      const scrollLeft = viewport.scrollLeft
      currentInput = nextInput
      sizeTimeline(viewport, chartSurface, nextInput)
      host.update(chartOptions(nextInput))
      viewport.scrollLeft = Math.min(
        scrollLeft,
        Math.max(0, viewport.scrollWidth - viewport.clientWidth),
      )
    },
    destroy() {
      host.destroy()
      viewport.remove()
    },
  }
}

function createDriver(
  viewport: HTMLDivElement,
  chartSurface: HTMLDivElement,
  getInput: () => ConformanceInput,
  host: ChartHost<ResourceTask, ConformanceInput>,
): ConformanceTestDriver {
  return {
    resolveTarget(target) {
      return viewportTarget(viewport, target)
    },
    readState() {
      return timelineState(viewport, getInput())
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

function sizeTimeline(
  viewport: HTMLDivElement,
  chartSurface: HTMLDivElement,
  input: ConformanceInput,
) {
  viewport.style.width = `${input.width}px`
  viewport.style.height = `${input.height}px`
  chartSurface.style.width = `${timelineContentWidth(input.width)}px`
  chartSurface.style.height = `${timelineChartHeight(input.height)}px`
}
