import { defineChart, mountChart, rect, text } from '@tanstack/charts'
import { focusDisabled } from '@tanstack/charts/focus/disabled'
import { scaleBand, scaleUtc } from 'd3-scale'
import { editableEventColor } from './colors'
import {
  editableDomain,
  editableEvents,
  editableEventStart,
  editableLanes,
  initialEditableEventEnd,
} from './scenario'
import {
  clampEditableEventEnd,
  editableDateFromAnchor,
  editableDateKey,
  editableDurationDays,
} from './model'
import { createEditableHandleOverlay } from './overlay'
import { tanstackCase } from '../../shared/mount'
import type { ChartHost, ChartScene, ChartHostOptions } from '@tanstack/charts'
import type { EditableEvent } from './scenario'
import type { EditableHandleLayout } from './overlay'
import type {
  ConformanceGeometryQuery,
  ConformanceGeometrySample,
  ConformanceInput,
  ConformanceMount,
  ConformanceTarget,
  ConformanceTestDriver,
} from '../../types'

interface EditableChartInput extends ConformanceInput {
  end: Date
}

interface EditableState {
  end: Date
  editing: boolean
  editCount: number
  originEnd: Date | null
}

const margin = { top: 96, right: 26, bottom: 48, left: 82 }
const millisecondsPerDay = 86_400_000

const definition = (input: EditableChartInput) => {
  const rows = editableEvents(input.revision, input.end)
  const outsideLabels = rows
    .filter((row) => row.id !== 'release')
    .map((row) => ({
      ...row,
      labelDate: row.end,
    }))

  return defineChart(({ width }) => {
    const releaseLabels = rows
      .filter(
        (row) =>
          row.id === 'release' && eventBarCanFitLabel(row, width, 'Release'),
      )
      .map((row) => ({
        ...row,
        labelDate: row.start,
        shortLabel: 'Release',
      }))
    return {
      marks: [
        rect(rows, {
          x1: 'start',
          x2: 'end',
          y: 'lane',
          color: 'id',
          radius: 5,
          stroke: '#ffffff',
          strokeWidth: 1,
        }),
        text(outsideLabels, {
          x: 'labelDate',
          y: 'lane',
          text: 'label',
          anchor: 'start',
          dx: 5,
          fill: 'currentColor',
          fontSize: 10,
          fontWeight: 600,
        }),
        text(releaseLabels, {
          x: 'labelDate',
          y: 'lane',
          text: 'shortLabel',
          anchor: 'start',
          dx: 5,
          fill: '#431407',
          fontSize: 10,
          fontWeight: 700,
        }),
      ],
      x: {
        scale: scaleUtc().domain(editableDomain),
        grid: true,
        axis: {
          ticks: {
            format: (value: Date) =>
              value.toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                timeZone: 'UTC',
              }),
          },
        },
      },
      y: {
        scale: scaleBand<string>()
          .domain(editableLanes)
          .paddingInner(0.38)
          .paddingOuter(0.19),
        grid: false,
      },
      color: {
        domain: ['discovery', 'design', 'campaign', 'release'],
        range: [
          editableEventColor('discovery'),
          editableEventColor('design'),
          editableEventColor('campaign'),
          editableEventColor('release'),
        ],
      },
      margin,
    }
  })
}

export const catalogCase = tanstackCase(
  (input: ConformanceInput) =>
    definition({ ...input, end: initialEditableEventEnd }),
  editableAriaLabel(0, initialEditableEventEnd),
)

export const mount: ConformanceMount = (container, input) => {
  let currentInput = input
  const state: EditableState = {
    end: initialEditableEventEnd,
    editing: false,
    editCount: 0,
    originEnd: null,
  }
  const view = container.ownerDocument.createElement('div')
  view.dataset.conformanceView = 'main'
  view.style.position = 'relative'
  view.style.touchAction = 'pan-y'
  sizeView(view, input)

  const chartSurface = container.ownerDocument.createElement('div')
  view.append(chartSurface)
  container.append(view)

  const options = (): ChartHostOptions<EditableEvent> => ({
    definition: defineChart(
      definition({
        ...currentInput,
        end: state.end,
      }),
      { animate: false, keyboard: false, focus: focusDisabled },
    ),
    width: currentInput.width,
    height: currentInput.height,
    ariaLabel: editableAriaLabel(currentInput.revision, state.end),
  })
  const host = mountChart(chartSurface, options())
  const interactions = createEditableInteractions(
    chartSurface,
    view,
    () => currentInput,
    state,
    host,
    options,
  )
  interactions.paint()

  return {
    driver: interactions.driver,
    update(nextInput) {
      currentInput = nextInput
      sizeView(view, nextInput)
      host.update(options())
      interactions.paint()
    },
    destroy() {
      interactions.destroy()
      host.destroy()
      view.remove()
    },
  }
}

function createEditableInteractions(
  chartSurface: HTMLDivElement,
  view: HTMLDivElement,
  getInput: () => ConformanceInput,
  state: EditableState,
  host: ChartHost<EditableEvent>,
  options: () => ChartHostOptions<EditableEvent>,
) {
  let paint = () => {}
  const beginEdit = () => {
    if (state.editing) return
    state.originEnd = state.end
    state.editing = true
  }
  const setEnd = (date: Date) => {
    state.end = clampEditableEventEnd(date)
    host.update(options())
    paint()
  }
  const overlay = createEditableHandleOverlay(
    view,
    (value) => {
      beginEdit()
      setEnd(new Date(editableDomain[0].getTime() + value * millisecondsPerDay))
    },
    (value) => {
      const date = editableDateFromAnchor(`date:${value}`)
      if (!date) return false
      beginEdit()
      setEnd(date)
      return true
    },
  )
  const layout = () =>
    editableLayout(chartSurface, view, host.getScene(), state.end)
  paint = () => {
    const nextLayout = layout()
    if (!nextLayout) return
    overlay.paint(nextLayout, {
      value: editableDayIndex(state.end),
      min: editableDayIndex(
        new Date(editableEventStart.getTime() + millisecondsPerDay),
      ),
      max: editableDayIndex(editableDomain[1]),
      date: editableDateKey(state.end),
      minDate: editableDateKey(
        new Date(editableEventStart.getTime() + millisecondsPerDay),
      ),
      maxDate: editableDateKey(editableDomain[1]),
      valueText: `Release: ${editableDateKey(editableEventStart)} → ${editableDateKey(state.end)} · ${editableDurationDays(editableEventStart, state.end)} days`,
      summaryText: `Release · ${compactDate(editableEventStart)} → ${compactDate(state.end)} · ${editableDurationDays(editableEventStart, state.end)} days`,
      eventDescriptions: editableEvents(getInput().revision, state.end).map(
        (row) =>
          `${row.label}: ${editableDateKey(row.start)} to ${editableDateKey(row.end)}`,
      ),
    })
  }

  const commitEdit = () => {
    if (!state.editing) return
    state.editing = false
    state.originEnd = null
    state.editCount += 1
    paint()
  }

  const cancelEdit = () => {
    if (!state.editing) return
    const originEnd = state.originEnd
    state.editing = false
    state.originEnd = null
    if (originEnd) setEnd(originEnd)
    else paint()
  }

  overlay.range.addEventListener('pointerdown', beginEdit)
  overlay.range.addEventListener('change', commitEdit)
  overlay.range.addEventListener('pointercancel', cancelEdit)
  overlay.dateInput.addEventListener('change', commitEdit)
  overlay.dateInput.addEventListener('pointercancel', cancelEdit)

  const driver: ConformanceTestDriver = {
    resolveTarget(target) {
      return resolveTarget(
        chartSurface,
        view,
        host.getScene(),
        state.end,
        target,
      )
    },
    readState() {
      return interactionState(state, getInput())
    },
    geometry(query) {
      return editableGeometry(
        chartSurface,
        view,
        host.getScene(),
        getInput(),
        state.end,
        layout(),
        overlay.handleGeometry(),
        overlay.trackGeometry(),
        query,
      )
    },
    viewBounds(viewName) {
      return viewName === undefined || viewName === 'main'
        ? clientBounds(view)
        : null
    },
    settle: paint,
  }

  return {
    driver,
    paint,
    destroy() {
      overlay.range.removeEventListener('pointerdown', beginEdit)
      overlay.range.removeEventListener('change', commitEdit)
      overlay.range.removeEventListener('pointercancel', cancelEdit)
      overlay.dateInput.removeEventListener('change', commitEdit)
      overlay.dateInput.removeEventListener('pointercancel', cancelEdit)
      overlay.destroy()
    },
  }
}

function resolveTarget(
  chartSurface: HTMLDivElement,
  view: HTMLDivElement,
  scene: ChartScene<EditableEvent>,
  end: Date,
  target: ConformanceTarget,
) {
  if (target.view !== undefined && target.view !== 'main') return null
  if (target.anchor === 'control:date') {
    const dateInput = view.querySelector<HTMLInputElement>(
      '.ts-conformance-event-date',
    )
    if (!dateInput) return null
    const bounds = dateInput.getBoundingClientRect()
    return {
      x: bounds.left + bounds.width / 2,
      y: bounds.top + bounds.height / 2,
      focusElement: dateInput,
    }
  }
  const date =
    target.anchor === 'event:release:end'
      ? end
      : editableDateFromAnchor(target.anchor)
  if (!date) return null
  const point = sceneLocalPoint(
    chartSurface,
    view,
    scene,
    scene.scales.x.map(date),
    scene.scales.y.map('Engineering'),
  )
  if (!point) return null
  const bounds = view.getBoundingClientRect()
  return {
    x: bounds.left + point[0],
    y: bounds.top + point[1],
    focusElement:
      view.querySelector<HTMLInputElement>('.ts-conformance-event-range') ??
      undefined,
  }
}

function interactionState(state: EditableState, input: ConformanceInput) {
  const rows = editableEvents(input.revision, state.end)
  const design = rows.find((row) => row.id === 'design')
  const campaign = rows.find((row) => row.id === 'campaign')
  return {
    editor: {
      id: 'release',
      start: editableDateKey(editableEventStart),
      end: editableDateKey(state.end),
      durationDays: editableDurationDays(editableEventStart, state.end),
      editing: state.editing,
      editCount: state.editCount,
    },
    events: {
      count: rows.length,
      ids: rows.map((row) => row.id),
      designEnd: design ? editableDateKey(design.end) : null,
      campaignStart: campaign ? editableDateKey(campaign.start) : null,
    },
  }
}

function editableGeometry(
  chartSurface: HTMLDivElement,
  view: HTMLDivElement,
  scene: ChartScene<EditableEvent>,
  input: ConformanceInput,
  end: Date,
  layout: EditableHandleLayout | null,
  overlayHandle: ConformanceGeometrySample,
  overlayTrack: ConformanceGeometrySample,
  query: ConformanceGeometryQuery,
): readonly ConformanceGeometrySample[] {
  if (!layout || (query.view !== undefined && query.view !== 'main')) {
    return []
  }
  if (query.role === 'dot') return [overlayHandle]
  if (query.role === 'rule') return [overlayTrack]
  if (query.role !== 'rect') return []
  const viewBounds = view.getBoundingClientRect()
  const height = scene.scales.y.bandwidth
  return editableEvents(input.revision, end).flatMap((row) => {
    const start = sceneLocalPoint(
      chartSurface,
      view,
      scene,
      scene.scales.x.map(row.start),
      scene.scales.y.map(row.lane),
    )
    const finish = sceneLocalPoint(
      chartSurface,
      view,
      scene,
      scene.scales.x.map(row.end),
      scene.scales.y.map(row.lane),
    )
    const top = sceneLocalPoint(
      chartSurface,
      view,
      scene,
      scene.scales.x.map(row.start),
      scene.scales.y.map(row.lane) - height / 2,
    )
    const bottom = sceneLocalPoint(
      chartSurface,
      view,
      scene,
      scene.scales.x.map(row.start),
      scene.scales.y.map(row.lane) + height / 2,
    )
    if (!start || !finish || !top || !bottom) return []
    return [
      {
        x: viewBounds.left + Math.min(start[0], finish[0]),
        y: viewBounds.top + Math.min(top[1], bottom[1]),
        width: Math.abs(finish[0] - start[0]),
        height: Math.abs(bottom[1] - top[1]),
        paint: editableEventColor(row.id),
      },
    ]
  })
}

function editableLayout(
  chartSurface: HTMLDivElement,
  view: HTMLDivElement,
  scene: ChartScene<EditableEvent>,
  end: Date,
): EditableHandleLayout | null {
  const point = sceneLocalPoint(
    chartSurface,
    view,
    scene,
    scene.scales.x.map(end),
    scene.scales.y.map('Engineering'),
  )
  const minimum = sceneLocalPoint(
    chartSurface,
    view,
    scene,
    scene.scales.x.map(
      new Date(editableEventStart.getTime() + millisecondsPerDay),
    ),
    scene.scales.y.map('Engineering'),
  )
  const maximum = sceneLocalPoint(
    chartSurface,
    view,
    scene,
    scene.scales.x.map(editableDomain[1]),
    scene.scales.y.map('Engineering'),
  )
  return point && minimum && maximum
    ? { x: point[0], y: point[1], minX: minimum[0], maxX: maximum[0] }
    : null
}

function sceneLocalPoint(
  chartSurface: HTMLDivElement,
  view: HTMLDivElement,
  scene: ChartScene<EditableEvent>,
  sceneX: number,
  sceneY: number,
): readonly [number, number] | null {
  const svg = chartSurface.querySelector<SVGSVGElement>('svg.ts-chart')
  if (!svg) return null
  const svgBounds = svg.getBoundingClientRect()
  const viewBounds = view.getBoundingClientRect()
  return [
    svgBounds.left - viewBounds.left + (sceneX / scene.width) * svgBounds.width,
    svgBounds.top - viewBounds.top + (sceneY / scene.height) * svgBounds.height,
  ]
}

function editableDayIndex(date: Date) {
  return Math.round(
    (date.getTime() - editableDomain[0].getTime()) / millisecondsPerDay,
  )
}

function clientBounds(element: HTMLElement): ConformanceGeometrySample {
  const bounds = element.getBoundingClientRect()
  return {
    x: bounds.left,
    y: bounds.top,
    width: bounds.width,
    height: bounds.height,
  }
}

function sizeView(view: HTMLDivElement, input: ConformanceInput) {
  view.style.width = `${input.width}px`
  view.style.height = `${input.height}px`
}

function compactDate(date: Date) {
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

function editableAriaLabel(revision: number, end: Date) {
  return `Editable schedule. ${editableEvents(revision, end)
    .map(
      (row) =>
        `${row.label}, ${editableDateKey(row.start)} to ${editableDateKey(row.end)}`,
    )
    .join('. ')}.`
}

function eventBarCanFitLabel(
  event: EditableEvent,
  width: number,
  label: string,
) {
  const plotWidth = Math.max(0, width - margin.left - margin.right)
  const domainWidth = editableDomain[1].getTime() - editableDomain[0].getTime()
  const eventWidth = event.end.getTime() - event.start.getTime()
  const barWidth = domainWidth > 0 ? (eventWidth / domainWidth) * plotWidth : 0
  return barWidth >= label.length * 6 + 10
}
