import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Chart } from '@tanstack/charts/react'
import { timelineStatusColors } from './colors'
import {
  timelineBodyHeight,
  timelineChartHeight,
  timelineContentWidth,
  timelineLaneRailWidth,
} from './layout'
import { resourceLanes, resourceTasks, timelineStatuses } from './scenario'
import type { ChartPoint, ChartScene } from '@tanstack/charts'
import type { ResourceLane, ResourceTask } from './scenario'
import { defineChart, rect } from '@tanstack/charts'
import { tooltip } from '@tanstack/charts/tooltip'
import { scaleBand, scaleUtc } from 'd3-scale'
import { timelineMargin } from './layout'
import { resourceTimelineDomain } from './scenario'
const focusScrollPadding = 32

interface TimelineFocusState {
  taskId: string | null
  centerX: number | null
  scrolled: boolean
}

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

export interface ExampleProps {
  width?: number
  height?: number
  revision?: number
}

const taskInset = 5

export const resourceTimelineDefinition = (input: ExampleChartInput) => {
  const rows = resourceTasks(input.revision)

  return defineChart(
    ({ width }) => {
      return {
        marks: [
          rect(rows, {
            key: 'id',
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
    },
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

function formatTaskDate(date: Date) {
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

export interface ExampleChartInput {
  width: number
  height: number
  revision: number
  preview?: boolean
  interactive?: boolean
}

export default function ResourceTimelineExample({
  width = 640,
  height = 480,
  revision = 0,
}: ExampleProps = {}) {
  const input = { width, height, revision, preview: false, interactive: true }
  const idPrefix = '85-scrollable-resource-lanes'
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
}
