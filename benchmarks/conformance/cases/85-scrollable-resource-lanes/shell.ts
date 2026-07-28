import { scaleBand } from 'd3-scale'
import {
  resourceLanes,
  timelineChartHeight,
  timelineContentWidth,
  timelineStatusColors,
  timelineStatuses,
} from './data'
import type { ConformanceInput } from '../../types'
import type { ResourceTask } from './data'

export const timelineMargin = {
  top: 18,
  right: 24,
  bottom: 50,
  left: 12,
} as const

const headerHeight = 42

export interface ResourceTimelineShell {
  root: HTMLDivElement
  viewport: HTMLDivElement
  chartSurface: HTMLDivElement
  laneRail: HTMLDivElement
  schedule: HTMLUListElement
  taskDetails: HTMLOutputElement
}

export function createResourceTimelineShell(
  document: Document,
  input: ConformanceInput,
  rows: readonly ResourceTask[],
): ResourceTimelineShell {
  const root = document.createElement('div')
  root.style.display = 'grid'
  root.style.gridTemplateRows = `${headerHeight}px minmax(0, 1fr)`
  root.style.position = 'relative'

  const { header, taskDetails } = createTimelineHeader(document)
  const body = document.createElement('div')
  body.style.display = 'grid'
  body.style.minHeight = '0'

  const laneRail = document.createElement('div')
  laneRail.dataset.conformanceLaneRail = ''
  laneRail.setAttribute('aria-label', 'Resource lanes')
  Object.assign(laneRail.style, {
    position: 'relative',
    zIndex: '2',
    overflow: 'hidden',
    borderRight: '1px solid color-mix(in srgb, CanvasText 18%, transparent)',
    background: 'Canvas',
    color: 'CanvasText',
    font: '600 11px/1.15 system-ui, sans-serif',
  })

  const viewport = document.createElement('div')
  viewport.dataset.conformanceView = 'main'
  viewport.dataset.conformanceScrollViewport = ''
  viewport.setAttribute('role', 'region')
  viewport.setAttribute(
    'aria-label',
    'Scrollable resource schedule. Use horizontal scrolling to move through dates.',
  )
  viewport.tabIndex = 0
  Object.assign(viewport.style, {
    overflowX: 'auto',
    overflowY: 'hidden',
    overscrollBehaviorX: 'contain',
    position: 'relative',
    scrollbarGutter: 'stable',
  })

  const chartSurface = document.createElement('div')
  viewport.append(chartSurface)
  body.append(laneRail, viewport)

  const schedule = document.createElement('ul')
  schedule.setAttribute('aria-label', 'Task schedule details')
  Object.assign(schedule.style, {
    position: 'absolute',
    width: '1px',
    height: '1px',
    padding: '0',
    margin: '-1px',
    overflow: 'hidden',
    clip: 'rect(0, 0, 0, 0)',
    whiteSpace: 'nowrap',
    border: '0',
  })

  root.append(header, body, schedule)
  const shell = {
    root,
    viewport,
    chartSurface,
    laneRail,
    schedule,
    taskDetails,
  }
  sizeResourceTimelineShell(shell, input, rows)
  return shell
}

export function sizeResourceTimelineShell(
  shell: ResourceTimelineShell,
  input: ConformanceInput,
  rows: readonly ResourceTask[],
) {
  const railWidth = timelineLaneRailWidth(input.width)
  const bodyHeight = timelineBodyHeight(input.height)
  const viewportWidth = Math.max(1, input.width - railWidth)
  const body = shell.laneRail.parentElement
  if (body) body.style.gridTemplateColumns = `${railWidth}px minmax(0, 1fr)`

  shell.root.style.width = `${input.width}px`
  shell.root.style.height = `${input.height}px`
  shell.laneRail.style.width = `${railWidth}px`
  shell.laneRail.style.height = `${bodyHeight}px`
  shell.viewport.style.width = `${viewportWidth}px`
  shell.viewport.style.height = `${bodyHeight}px`
  shell.chartSurface.style.width = `${timelineContentWidth(viewportWidth)}px`
  shell.chartSurface.style.height = `${timelineChartHeight(bodyHeight)}px`
  renderLaneRail(shell.laneRail, timelineChartHeight(bodyHeight))
  renderSchedule(shell.schedule, rows)
}

export function timelineBodyHeight(height: number) {
  return Math.max(220, height - headerHeight)
}

export function timelineLaneRailWidth(width: number) {
  return Math.round(Math.max(96, Math.min(128, width * 0.28)))
}

export function updateTimelineTaskDetails(
  shell: ResourceTimelineShell,
  task: ResourceTask | null,
) {
  shell.taskDetails.textContent = task
    ? `${task.resource} · ${task.label} · ${task.status} · ${formatDate(
        task.start,
      )}–${formatDate(task.end)}`
    : 'Scroll dates →'
  shell.taskDetails.title = task
    ? shell.taskDetails.textContent
    : 'Scroll horizontally through the schedule'
}

function createTimelineHeader(document: Document) {
  const header = document.createElement('div')
  header.setAttribute('aria-label', 'Task status legend')
  Object.assign(header.style, {
    display: 'flex',
    alignItems: 'center',
    gap: '8px 12px',
    padding: '5px 10px',
    boxSizing: 'border-box',
    overflow: 'hidden',
    borderBottom: '1px solid color-mix(in srgb, CanvasText 14%, transparent)',
    background: 'color-mix(in srgb, Canvas 94%, CanvasText 6%)',
    color: 'CanvasText',
    font: '600 11px/1.2 system-ui, sans-serif',
    whiteSpace: 'nowrap',
  })

  for (const status of timelineStatuses) {
    const item = document.createElement('span')
    item.dataset.conformanceTimelineStatus = status
    item.style.display = 'inline-flex'
    item.style.alignItems = 'center'
    item.style.gap = '5px'
    const swatch = document.createElement('span')
    Object.assign(swatch.style, {
      width: '9px',
      height: '9px',
      borderRadius: '3px',
      background: timelineStatusColors[status],
    })
    const label = document.createElement('span')
    label.textContent = status[0]?.toUpperCase() + status.slice(1)
    item.append(swatch, label)
    header.append(item)
  }

  const taskDetails = document.createElement('output')
  taskDetails.dataset.conformanceOverflowCue = ''
  taskDetails.dataset.conformanceTimelineDetails = ''
  taskDetails.setAttribute('aria-live', 'polite')
  taskDetails.setAttribute('aria-atomic', 'true')
  taskDetails.textContent = 'Scroll dates →'
  Object.assign(taskDetails.style, {
    marginLeft: 'auto',
    overflow: 'hidden',
    opacity: '0.76',
    textOverflow: 'ellipsis',
  })
  header.append(taskDetails)
  return { header, taskDetails }
}

function renderLaneRail(rail: HTMLDivElement, height: number) {
  const scale = scaleBand<string>()
    .domain(resourceLanes)
    .range([timelineMargin.top, height - timelineMargin.bottom])
    .paddingInner(0.08)
    .paddingOuter(0.04)
  const document = rail.ownerDocument
  rail.replaceChildren(
    ...resourceLanes.map((lane) => {
      const label = document.createElement('span')
      label.dataset.conformanceLane = lane
      label.textContent = lane
      Object.assign(label.style, {
        position: 'absolute',
        top: `${(scale(lane) ?? 0) + scale.bandwidth() / 2}px`,
        left: '8px',
        right: '6px',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        transform: 'translateY(-50%)',
        whiteSpace: 'nowrap',
      })
      label.title = lane
      return label
    }),
  )
}

function renderSchedule(
  schedule: HTMLUListElement,
  rows: readonly ResourceTask[],
) {
  const document = schedule.ownerDocument
  schedule.replaceChildren(
    ...rows.map((row) => {
      const item = document.createElement('li')
      item.textContent = `${row.resource}: ${row.label}, ${row.status}, ${formatDate(
        row.start,
      )} through ${formatDate(row.end)}`
      return item
    }),
  )
}

function formatDate(date: Date) {
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  })
}
