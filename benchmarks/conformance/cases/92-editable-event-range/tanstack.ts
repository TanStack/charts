import { defineChart, mountChart, rect, text } from '@tanstack/charts'
import { handleX } from '@tanstack/charts/interaction/handle'
import { controlledSignal } from '@tanstack/charts/interaction/signal'
import { scaleBand, scaleUtc } from 'd3-scale'
import { editableEventColor } from './colors'
import { createEditableControls } from './controls'
import {
  clampEditableEventEnd,
  editableDateFromAnchor,
  editableDateKey,
  editableDurationDays,
  editableEventEndValues,
} from './model'
import {
  editableDomain,
  editableEvents,
  editableEventStart,
  editableLanes,
  initialEditableEventEnd,
} from './scenario'
import { scenePointToClient } from '../../shared/driver-geometry'
import { tanstackCase } from '../../shared/mount'
import type { ChartHost, ChartHostOptions, ChartScene } from '@tanstack/charts'
import type { HandleXChange } from '@tanstack/charts/interaction/handle'
import type { EditableEvent } from './scenario'
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
const handleId = 'release-end'

export function editableEventDefinition(
  input: EditableChartInput,
  onEndChange: (value: Date, reason: HandleXChange<Date>) => void,
) {
  const rows = editableEvents(input.revision, input.end)
  const outsideLabels = rows
    .filter((row) => row.id !== 'release')
    .map((row) => ({ ...row, labelDate: row.end }))

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
          id: 'event-ranges',
          x1: 'start',
          x2: 'end',
          y: 'lane',
          color: 'id',
          radius: 5,
          stroke: '#ffffff',
          strokeWidth: 1,
        }),
        text(outsideLabels, {
          id: 'event-labels',
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
          id: 'release-label',
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
      behaviors: [
        handleX<Date, string>({
          id: handleId,
          value: controlledSignal<Date, HandleXChange<Date>>(
            input.end,
            (next, { reason }) => onEndChange(next, reason),
          ),
          values: editableEventEndValues,
          cross: { value: 'Engineering' },
          trackStyle: {
            fill: 'color-mix(in srgb, var(--ts-chart-2, #f97316) 58%, transparent)',
          },
          ruleStyle: false,
          handleStyle: {
            fill: 'var(--ts-chart-2, #f97316)',
            stroke: 'Canvas',
            strokeWidth: 2,
          },
          hitSize: 44,
          ariaLabel: 'Release end handle',
          format: (value) => editableHandleValueText(value),
        }),
      ],
      animate: false,
      keyboard: false,
      focusRing: false,
      margin,
    }
  })
}

export const catalogCase = tanstackCase(
  (input: ConformanceInput) =>
    editableEventDefinition(
      { ...input, end: initialEditableEventEnd },
      () => {},
    ),
  editableAriaLabel(0, initialEditableEventEnd),
)

export const mount: ConformanceMount = (container, input) => {
  let currentInput = input
  let acceptedEnd = cloneDate(initialEditableEventEnd)
  let host: ChartHost<EditableEvent, Date | number, string> | undefined
  const state: EditableState = {
    end: cloneDate(acceptedEnd),
    editing: false,
    editCount: 0,
    originEnd: null,
  }

  const document = container.ownerDocument
  const view = document.createElement('div')
  const chartSurface = document.createElement('div')
  view.dataset.conformanceView = 'main'
  view.style.position = 'relative'
  view.style.touchAction = 'pan-y'
  view.append(chartSurface)
  container.append(view)
  sizeView(view, input)

  const beginEdit = (origin = state.end) => {
    if (state.editing) return
    state.originEnd = cloneDate(origin)
    state.editing = true
  }

  const options = (): ChartHostOptions<
    EditableEvent,
    Date | number,
    string
  > => ({
    definition: editableEventDefinition(
      { ...currentInput, end: acceptedEnd },
      handleEndChange,
    ),
    width: currentInput.width,
    height: currentInput.height,
    ariaLabel: editableAriaLabel(currentInput.revision, state.end),
  })

  const applyEnd = (next: Date) => {
    acceptedEnd = clampEditableEventEnd(next)
    state.end = cloneDate(acceptedEnd)
    host?.update(options())
  }

  const commitEdit = () => {
    if (!state.editing) return
    state.editing = false
    state.originEnd = null
    state.editCount += 1
    paintControls()
  }

  const cancelEdit = (fallback?: Date) => {
    if (!state.editing && !fallback) return
    const origin = fallback ?? state.originEnd
    state.editing = false
    state.originEnd = null
    if (origin) applyEnd(origin)
    paintControls()
  }

  function handleEndChange(next: Date, reason: HandleXChange<Date>) {
    if (reason.type === 'preview') {
      beginEdit(reason.origin)
      applyEnd(next)
      paintControls()
      return
    }
    if (reason.type === 'cancel') {
      cancelEdit(reason.origin)
      return
    }
    beginEdit(reason.origin)
    applyEnd(next)
    commitEdit()
  }

  const controls = createEditableControls(view, {
    onDateInput(value) {
      const next = editableDateFromAnchor(`date:${value}`)
      if (!next || clampEditableEventEnd(next).getTime() !== next.getTime()) {
        return false
      }
      beginEdit()
      applyEnd(next)
      paintControls()
      return true
    },
    onDateCommit: commitEdit,
    onDateCancel: () => cancelEdit(),
  })

  function paintControls() {
    controls.paint({
      date: editableDateKey(state.end),
      minDate: editableDateKey(editableEventEndValues[0]!),
      maxDate: editableDateKey(editableEventEndValues.at(-1)!),
      summaryText: editableSummaryText(state.end),
      eventDescriptions: editableEvents(currentInput.revision, state.end).map(
        (row) =>
          `${row.label}: ${editableDateKey(row.start)} to ${editableDateKey(row.end)}`,
      ),
    })
  }

  host = mountChart(chartSurface, options())
  paintControls()

  const driver = createDriver(
    view,
    chartSurface,
    controls.dateInput,
    () => host!.getScene(),
    () => state,
    () => currentInput,
  )

  return {
    driver,
    update(nextInput) {
      currentInput = nextInput
      sizeView(view, nextInput)
      host!.update(options())
      paintControls()
    },
    destroy() {
      controls.destroy()
      host!.destroy()
      view.remove()
    },
  }
}

function createDriver(
  view: HTMLDivElement,
  chartSurface: HTMLDivElement,
  dateInput: HTMLInputElement,
  getScene: () => ChartScene<EditableEvent, Date | number, string>,
  getState: () => EditableState,
  getInput: () => ConformanceInput,
): ConformanceTestDriver {
  return {
    resolveTarget(target) {
      return resolveTarget(
        chartSurface,
        dateInput,
        getScene(),
        getState().end,
        target,
      )
    },
    readState() {
      return interactionState(getState(), getInput())
    },
    geometry(query) {
      return editableGeometry(
        chartSurface,
        getScene(),
        getInput(),
        getState().end,
        query,
      )
    },
    viewBounds(viewName) {
      if (viewName !== undefined && viewName !== 'main') return null
      return elementGeometry(view)
    },
  }
}

function resolveTarget(
  chartSurface: HTMLDivElement,
  dateInput: HTMLInputElement,
  scene: ChartScene<EditableEvent, Date | number, string>,
  end: Date,
  target: ConformanceTarget,
) {
  if (target.view !== undefined && target.view !== 'main') return null
  if (target.anchor === 'control:date') return elementCenter(dateInput)
  const date =
    target.anchor === 'event:release:end'
      ? end
      : editableDateFromAnchor(target.anchor)
  if (!date) return null
  const point = scenePointToClient(
    chartSurface,
    scene,
    scene.scales.x.map(date),
    scene.scales.y.map('Engineering'),
  )
  if (!point) return null
  return {
    ...point,
    focusElement:
      chartSurface.querySelector<SVGElement>(
        `[data-chart-handle-surface="${handleId}"]`,
      ) ?? point.focusElement,
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
  scene: ChartScene<EditableEvent, Date | number, string>,
  input: ConformanceInput,
  end: Date,
  query: ConformanceGeometryQuery,
): readonly ConformanceGeometrySample[] {
  if (query.view !== undefined && query.view !== 'main') return []
  if (query.role === 'dot') {
    const handle = chartSurface.querySelector<SVGElement>(
      `[data-chart-handle="${handleId}"]`,
    )
    return handle ? [elementGeometry(handle)] : []
  }
  if (query.role === 'rule') {
    const track = chartSurface.querySelector<SVGElement>(
      `[data-chart-handle-track="${handleId}"]`,
    )
    return track ? [elementGeometry(track)] : []
  }
  if (query.role !== 'rect') return []

  const height = scene.scales.y.bandwidth
  return editableEvents(input.revision, end).flatMap((row) => {
    const start = scenePointToClient(
      chartSurface,
      scene,
      scene.scales.x.map(row.start),
      scene.scales.y.map(row.lane),
    )
    const finish = scenePointToClient(
      chartSurface,
      scene,
      scene.scales.x.map(row.end),
      scene.scales.y.map(row.lane),
    )
    const top = scenePointToClient(
      chartSurface,
      scene,
      scene.scales.x.map(row.start),
      scene.scales.y.map(row.lane) - height / 2,
    )
    const bottom = scenePointToClient(
      chartSurface,
      scene,
      scene.scales.x.map(row.start),
      scene.scales.y.map(row.lane) + height / 2,
    )
    if (!start || !finish || !top || !bottom) return []
    return [
      {
        x: Math.min(start.x, finish.x),
        y: Math.min(top.y, bottom.y),
        width: Math.abs(finish.x - start.x),
        height: Math.abs(bottom.y - top.y),
        paint: editableEventColor(row.id),
      },
    ]
  })
}

function elementGeometry(
  element: HTMLElement | SVGElement,
): ConformanceGeometrySample {
  const bounds = element.getBoundingClientRect()
  const style = getComputedStyle(element)
  return {
    x: bounds.left,
    y: bounds.top,
    width: bounds.width,
    height: bounds.height,
    paint: style.fill || style.backgroundColor || style.stroke,
  }
}

function elementCenter(element: HTMLElement | SVGElement) {
  const bounds = element.getBoundingClientRect()
  return {
    x: bounds.left + bounds.width / 2,
    y: bounds.top + bounds.height / 2,
    focusElement: element,
  }
}

function sizeView(view: HTMLDivElement, input: ConformanceInput) {
  view.style.width = `${input.width}px`
  view.style.height = `${input.height}px`
}

function editableHandleValueText(end: Date) {
  return `Release: ${editableDateKey(editableEventStart)} → ${editableDateKey(end)} · ${editableDurationDays(editableEventStart, end)} days`
}

function editableSummaryText(end: Date) {
  return `Release · ${compactDate(editableEventStart)} → ${compactDate(end)} · ${editableDurationDays(editableEventStart, end)} days`
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

function cloneDate(date: Date) {
  return new Date(date.getTime())
}
