import { defineChart, mountChart, rect } from '@tanstack/charts'
import { focusDisabled } from '@tanstack/charts/focus/disabled'
import { scaleBand, scaleOrdinal, scaleUtc } from 'd3-scale'
import {
  clampEditableEventEnd,
  editableDateFromAnchor,
  editableDateKey,
  editableDomain,
  editableDurationDays,
  editableEventColor,
  editableEvents,
  editableEventStart,
  editableLanes,
  initialEditableEventEnd,
} from './data'
import { createEditableHandleOverlay } from './overlay'
import type {
  ChartHost,
  ChartScene,
  DynamicChartHostOptions,
} from '@tanstack/charts'
import type { EditableEvent, EditableEventId } from './data'
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
}

const margin = { top: 24, right: 26, bottom: 48, left: 82 }

const definition = defineChart<EditableChartInput>()(({ input }) => {
  const rows = editableEvents(input.revision, input.end)
  return {
    marks: [
      rect(rows, {
        id: 'editable-events',
        x1: 'start',
        x2: 'end',
        y: 'lane',
        z: 'id',
        key: 'id',
        radius: 5,
        stroke: '#ffffff',
        strokeWidth: 1,
      }),
    ],
    x: {
      scale: scaleUtc().domain(editableDomain),
      grid: true,
      format: (value) =>
        value.toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
          timeZone: 'UTC',
        }),
    },
    y: {
      scale: scaleBand<string>()
        .domain(editableLanes)
        .paddingInner(0.38)
        .paddingOuter(0.19),
      grid: false,
    },
    color: {
      scale: scaleOrdinal<EditableEventId, string>()
        .domain(['discovery', 'design', 'campaign', 'release'])
        .range([
          editableEventColor('discovery'),
          editableEventColor('design'),
          editableEventColor('campaign'),
          editableEventColor('release'),
        ]),
    },
    margin,
  }
})

export const mount: ConformanceMount = (container, input) => {
  let currentInput = input
  const state: EditableState = {
    end: initialEditableEventEnd,
    editing: false,
    editCount: 0,
  }
  const view = container.ownerDocument.createElement('div')
  view.dataset.conformanceView = 'main'
  view.style.position = 'relative'
  view.style.touchAction = 'pan-y'
  sizeView(view, input)

  const chartSurface = container.ownerDocument.createElement('div')
  view.append(chartSurface)
  container.append(view)

  const options = (): DynamicChartHostOptions<
    EditableEvent,
    EditableChartInput
  > => ({
    definition,
    input: {
      ...currentInput,
      end: state.end,
    },
    width: currentInput.width,
    height: currentInput.height,
    ariaLabel: 'Editable keyed event ranges across resource lanes',
    animate: false,
    keyboard: false,
    focus: focusDisabled,
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
  host: ChartHost<EditableEvent, EditableChartInput>,
  options: () => DynamicChartHostOptions<EditableEvent, EditableChartInput>,
) {
  const overlay = createEditableHandleOverlay(view)
  const layout = () =>
    editableLayout(chartSurface, view, host.getScene(), state.end)
  const paint = () => {
    const nextLayout = layout()
    if (!nextLayout) return
    overlay.paint(nextLayout, `Release ends ${editableDateKey(state.end)}`)
  }
  const updateAtPointer = (event: PointerEvent) => {
    const date = dateAtPointer(chartSurface, host.getScene(), event)
    if (!date) return
    state.end = date
    host.update(options())
    paint()
  }

  const handlePointerDown = (event: PointerEvent) => {
    const nextLayout = layout()
    if (!nextLayout || !isHandleTarget(view, nextLayout, event)) return
    event.preventDefault()
    state.editing = true
    view.setPointerCapture(event.pointerId)
    updateAtPointer(event)
  }

  const handlePointerMove = (event: PointerEvent) => {
    if (!state.editing) return
    updateAtPointer(event)
  }

  const finishPointer = (event: PointerEvent) => {
    if (!state.editing) return
    updateAtPointer(event)
    state.editing = false
    state.editCount += 1
    if (view.hasPointerCapture(event.pointerId)) {
      view.releasePointerCapture(event.pointerId)
    }
  }

  view.addEventListener('pointerdown', handlePointerDown, true)
  view.addEventListener('pointermove', handlePointerMove, true)
  view.addEventListener('pointerup', finishPointer, true)
  view.addEventListener('pointercancel', finishPointer, true)

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
      view.removeEventListener('pointerdown', handlePointerDown, true)
      view.removeEventListener('pointermove', handlePointerMove, true)
      view.removeEventListener('pointerup', finishPointer, true)
      view.removeEventListener('pointercancel', finishPointer, true)
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
    focusElement: view,
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
  query: ConformanceGeometryQuery,
): readonly ConformanceGeometrySample[] {
  if (!layout || (query.view !== undefined && query.view !== 'main')) {
    return []
  }
  const viewBounds = view.getBoundingClientRect()
  if (query.role === 'dot') {
    return [
      {
        x: viewBounds.left + layout.x - 8,
        y: viewBounds.top + layout.y - 8,
        width: 16,
        height: 16,
        paint: editableEventColor('release'),
      },
    ]
  }
  if (query.role !== 'rect') return []
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
  return point ? { x: point[0], y: point[1] } : null
}

function dateAtPointer(
  chartSurface: HTMLDivElement,
  scene: ChartScene<EditableEvent>,
  event: PointerEvent,
) {
  const svg = chartSurface.querySelector<SVGSVGElement>('svg.ts-chart')
  if (!svg) return null
  const bounds = svg.getBoundingClientRect()
  const sceneX = ((event.clientX - bounds.left) / bounds.width) * scene.width
  if (sceneX < scene.chart.x || sceneX > scene.chart.x + scene.chart.width) {
    return null
  }
  const inverseScale = scaleUtc()
    .domain(editableDomain)
    .range([scene.chart.x, scene.chart.x + scene.chart.width])
  return clampEditableEventEnd(inverseScale.invert(sceneX))
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

function isHandleTarget(
  view: HTMLDivElement,
  layout: EditableHandleLayout,
  event: PointerEvent,
) {
  const bounds = view.getBoundingClientRect()
  const x = event.clientX - bounds.left
  const y = event.clientY - bounds.top
  return Math.hypot(x - layout.x, y - layout.y) <= 18
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
