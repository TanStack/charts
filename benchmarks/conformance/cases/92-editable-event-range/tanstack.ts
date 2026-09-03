import {
  editableEventDefinition,
  editableSummaryText,
  editableAriaLabel,
  cloneDate,
} from './example'
import type { EditableChartInput, EditableState } from './example'
export {
  editableEventDefinition,
  editableSummaryText,
  editableAriaLabel,
  cloneDate,
} from './example'
export type { EditableChartInput, EditableState } from './example'
import { editableEventColor } from './colors'
import {
  editableDateFromAnchor,
  editableDateKey,
  editableDurationDays,
} from './model'
import {
  editableEvents,
  editableEventStart,
  initialEditableEventEnd,
} from './scenario'
import { scenePointToClient } from '../../shared/driver-geometry'
import { tanstackCase } from '../../shared/mount'
import type { ChartScene } from '@tanstack/charts'
import type { EditableEvent } from './scenario'
import type {
  ConformanceGeometryQuery,
  ConformanceGeometrySample,
  ConformanceInput,
  ConformanceTarget,
  ConformanceTestDriver,
} from '../../types'

export { default as Example } from './example'

const handleId = 'release-end'

export const catalogCase = tanstackCase(
  (input: ConformanceInput) =>
    editableEventDefinition(
      { ...input, end: initialEditableEventEnd },
      () => {},
    ),
  editableAriaLabel(0, initialEditableEventEnd),
)

export { mount } from './view'

export function createDriver(
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
