import {
  forwardRef,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { Chart } from '@tanstack/charts/react'
import { reactMount } from '../../shared/react-mount'
import { timelineStatusColors } from './colors'
import {
  timelineBodyHeight,
  timelineChartHeight,
  timelineContentWidth,
  timelineLaneRailWidth,
} from './layout'
import {
  resourceLanes,
  resourceTasks,
  resourceTimelineDomain,
  timelineStatuses,
} from './scenario'
import { timelineDateKey } from './model'
import { resourceTimelineDefinition } from './tanstack'
import type { ChartPoint, ChartScene } from '@tanstack/charts'
import type { ResourceLane, ResourceTask } from './scenario'
import type {
  ConformanceGeometryQuery,
  ConformanceGeometrySample,
  ConformanceTarget,
  ConformanceTestDriver,
} from '../../types'
import type { ReactConformanceProps } from '../../shared/react-mount'

const taskInset = 5
const focusScrollPadding = 32

interface TimelineFocusState {
  taskId: string | null
  centerX: number | null
  scrolled: boolean
}

const ResourceTimelineExample = forwardRef<
  ConformanceTestDriver,
  ReactConformanceProps
>(function ResourceTimelineExample({ input, idPrefix }, ref) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const chartSurfaceRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<ChartScene<ResourceTask>>(null)
  const inputRef = useRef(input)
  const focusRef = useRef<TimelineFocusState>({
    taskId: null,
    centerX: null,
    scrolled: false,
  })
  const [focusedTask, setFocusedTask] = useState<ResourceTask | null>(null)
  const [lanePositions, setLanePositions] = useState<
    Readonly<Record<ResourceLane, number>>
  >({} as Record<ResourceLane, number>)
  inputRef.current = input
  const rows = useMemo(() => resourceTasks(input.revision), [input.revision])
  const definition = useMemo(() => resourceTimelineDefinition(input), [input])
  const railWidth = timelineLaneRailWidth(input.width)
  const bodyHeight = timelineBodyHeight(input.height)
  const viewportWidth = Math.max(1, input.width - railWidth)
  const contentWidth = timelineContentWidth(viewportWidth)
  const chartHeight = timelineChartHeight(bodyHeight)

  useLayoutEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) return
    viewport.scrollLeft = Math.min(
      viewport.scrollLeft,
      Math.max(0, viewport.scrollWidth - viewport.clientWidth),
    )
  }, [contentWidth, input.revision, viewportWidth])

  const updateFocusedTask = (point: ChartPoint<ResourceTask> | null) => {
    const viewport = viewportRef.current
    const chartSurface = chartSurfaceRef.current
    const keyboardFocused =
      chartSurface?.querySelector('svg.ts-chart') ===
      chartSurface?.ownerDocument.activeElement
    focusRef.current = {
      taskId: point?.datum.id ?? null,
      centerX: point?.x ?? null,
      scrolled:
        viewport && point && keyboardFocused
          ? ensureTimelineFocusVisible(viewport, point.x)
          : false,
    }
    setFocusedTask(point?.datum ?? null)
  }

  useImperativeHandle(
    ref,
    () => ({
      resolveTarget(target) {
        const viewport = viewportRef.current
        const chartSurface = chartSurfaceRef.current
        const scene = sceneRef.current
        return viewport && chartSurface && scene
          ? timelineTarget(viewport, chartSurface, scene, target)
          : null
      },
      readState() {
        const viewport = viewportRef.current
        return viewport
          ? timelineState(viewport, inputRef.current, focusRef.current)
          : {}
      },
      geometry(query) {
        const viewport = viewportRef.current
        const chartSurface = chartSurfaceRef.current
        const scene = sceneRef.current
        return viewport && chartSurface && scene
          ? timelineGeometry(
              viewport,
              chartSurface,
              inputRef.current,
              scene,
              query,
            )
          : []
      },
    }),
    [],
  )

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateRows: '42px minmax(0, 1fr)',
        position: 'relative',
        width: input.width,
        height: input.height,
      }}
    >
      <div
        data-conformance-timeline-legend=""
        aria-label="Task status legend"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px 12px',
          padding: '5px 10px',
          boxSizing: 'border-box',
          overflow: 'hidden',
          borderBottom:
            '1px solid color-mix(in srgb, CanvasText 14%, transparent)',
          background: 'color-mix(in srgb, Canvas 94%, CanvasText 6%)',
          color: 'CanvasText',
          font: '600 11px/1.2 system-ui, sans-serif',
          whiteSpace: 'nowrap',
        }}
      >
        {timelineStatuses.map((status) => (
          <span
            key={status}
            data-conformance-timeline-status={status}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}
          >
            <span
              style={{
                width: 9,
                height: 9,
                borderRadius: 3,
                background: timelineStatusColors[status],
              }}
            />
            <span>{status[0]?.toUpperCase() + status.slice(1)}</span>
          </span>
        ))}
        <output
          data-conformance-overflow-cue=""
          data-conformance-timeline-details=""
          aria-live="polite"
          aria-atomic="true"
          title={
            focusedTask
              ? taskDetails(focusedTask)
              : 'Scroll horizontally through the schedule'
          }
          style={{
            marginLeft: 'auto',
            overflow: 'hidden',
            opacity: 0.76,
            textOverflow: 'ellipsis',
          }}
        >
          {focusedTask ? taskDetails(focusedTask) : 'Scroll dates →'}
        </output>
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `${railWidth}px minmax(0, 1fr)`,
          minHeight: 0,
        }}
      >
        <div
          data-conformance-lane-rail=""
          aria-label="Resource lanes"
          style={{
            position: 'relative',
            zIndex: 2,
            width: railWidth,
            height: bodyHeight,
            overflow: 'hidden',
            borderRight:
              '1px solid color-mix(in srgb, CanvasText 18%, transparent)',
            background: 'Canvas',
            color: 'CanvasText',
            font: '600 11px/1.15 system-ui, sans-serif',
          }}
        >
          {resourceLanes.map((lane) => (
            <span
              key={lane}
              data-conformance-lane={lane}
              title={lane}
              style={{
                position: 'absolute',
                top: lanePositions[lane],
                left: 8,
                right: 6,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                transform: 'translateY(-50%)',
                whiteSpace: 'nowrap',
              }}
            >
              {lane}
            </span>
          ))}
        </div>
        <div
          ref={viewportRef}
          data-conformance-view="main"
          data-conformance-scroll-viewport=""
          role="region"
          aria-label="Scrollable resource schedule. Use horizontal scrolling to move through dates."
          tabIndex={0}
          style={{
            width: viewportWidth,
            height: bodyHeight,
            overflowX: 'auto',
            overflowY: 'hidden',
            overscrollBehaviorX: 'contain',
            position: 'relative',
            scrollbarGutter: 'stable',
          }}
        >
          <div
            ref={chartSurfaceRef}
            style={{ width: contentWidth, height: chartHeight }}
          >
            <Chart
              idPrefix={idPrefix}
              definition={definition}
              width={contentWidth}
              height={chartHeight}
              ariaLabel="Tasks scheduled across five resource lanes"
              ariaDescription="Focus the chart and use the arrow, Home, and End keys to inspect tasks. Offscreen tasks scroll into view."
              onFocusChange={updateFocusedTask}
              onRender={({ scene }) => {
                sceneRef.current = scene
                const next = Object.fromEntries(
                  resourceLanes.map((lane) => [lane, scene.scales.y.map(lane)]),
                ) as Record<ResourceLane, number>
                setLanePositions((current) =>
                  resourceLanes.every((lane) => current[lane] === next[lane])
                    ? current
                    : next,
                )
              }}
            />
          </div>
        </div>
      </div>
      <ul aria-label="Task schedule details" style={visuallyHidden}>
        {rows.map((row) => (
          <li key={row.id}>
            {row.resource}: {row.label}, {row.status}, {formatDate(row.start)}{' '}
            through {formatDate(row.end)}
          </li>
        ))}
      </ul>
    </div>
  )
})

export const mount = reactMount(ResourceTimelineExample)

const visuallyHidden = {
  position: 'absolute',
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0,
} as const

function ensureTimelineFocusVisible(viewport: HTMLDivElement, centerX: number) {
  const previous = viewport.scrollLeft
  const visibleStart = previous + focusScrollPadding
  const visibleEnd = previous + viewport.clientWidth - focusScrollPadding
  let next = previous
  if (centerX < visibleStart) next = centerX - focusScrollPadding
  else if (centerX > visibleEnd) {
    next = centerX - viewport.clientWidth + focusScrollPadding
  }
  viewport.scrollLeft = Math.max(
    0,
    Math.min(next, viewport.scrollWidth - viewport.clientWidth),
  )
  return Math.abs(viewport.scrollLeft - previous) > 1
}

function timelineTarget(
  viewport: HTMLDivElement,
  chartSurface: HTMLDivElement,
  scene: ChartScene<ResourceTask>,
  target: ConformanceTarget,
) {
  if (target.view !== undefined && target.view !== 'main') return null
  if (target.anchor.startsWith('task:')) {
    const taskId = target.anchor.slice('task:'.length)
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
  input: ReactConformanceProps['input'],
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
    lanes: { count: resourceLanes.length, names: resourceLanes },
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
  input: ReactConformanceProps['input'],
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

function taskDetails(task: ResourceTask) {
  return `${task.resource} · ${task.label} · ${task.status} · ${formatDate(task.start)}–${formatDate(task.end)}`
}

function formatDate(date: Date) {
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  })
}
