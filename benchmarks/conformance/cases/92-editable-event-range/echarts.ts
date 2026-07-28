import { CustomChart } from 'echarts/charts'
import { AriaComponent, GridComponent } from 'echarts/components'
import { use } from 'echarts/core'
import { SVGRenderer } from 'echarts/renderers'
import type { CustomSeriesOption } from 'echarts/charts'
import type {
  AriaComponentOption,
  GridComponentOption,
} from 'echarts/components'
import type { ComposeOption, EChartsType } from 'echarts/core'
import { echartsMount } from '../../shared/echarts-mount'
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
import type { EditableEvent, EditableLane } from './data'
import type { EditableHandleLayout } from './overlay'
import type {
  ConformanceGeometryQuery,
  ConformanceGeometrySample,
  ConformanceInput,
  ConformanceMount,
  ConformanceTarget,
  ConformanceTestDriver,
} from '../../types'

use([CustomChart, GridComponent, AriaComponent, SVGRenderer])

type EditableOption = ComposeOption<
  CustomSeriesOption | GridComponentOption | AriaComponentOption
>

interface EditableState {
  end: Date
  editing: boolean
  editCount: number
}

const margin = { top: 24, right: 26, bottom: 48, left: 82 }
const barRatio = 0.62

export const mount: ConformanceMount = (container, input) => {
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
  container.append(view)

  let paint = () => {}
  let destroyInteractions = () => {}
  const mountCase = echartsMount(
    (nextInput) => editableOption(nextInput, state.end),
    'Editable keyed event ranges across resource lanes',
    ({ chart, surface, getInput }) => {
      surface.removeAttribute('data-conformance-view')
      const interactions = createEditableInteractions(
        chart,
        surface,
        view,
        getInput,
        state,
      )
      paint = interactions.paint
      destroyInteractions = interactions.destroy
      return interactions.driver
    },
  )
  const handle = mountCase(view, input)
  paint()

  return {
    driver: handle.driver,
    update(nextInput) {
      sizeView(view, nextInput)
      handle.update(nextInput)
      paint()
    },
    destroy() {
      destroyInteractions()
      handle.destroy()
      view.remove()
    },
  }
}

function editableOption(input: ConformanceInput, end: Date): EditableOption {
  const rows = editableEvents(input.revision, end)
  const series: CustomSeriesOption = {
    id: 'editable-events',
    name: 'Events',
    type: 'custom',
    coordinateSystem: 'cartesian2d',
    dimensions: ['start', 'end', 'lane'],
    encode: {
      x: [0, 1],
      y: 2,
    },
    data: rows.map((row) => ({
      id: row.id,
      name: row.label,
      value: [
        row.start.getTime(),
        row.end.getTime(),
        editableLanes.indexOf(row.lane),
      ],
    })),
    renderItem(params, api) {
      const start = api.value(0)
      const finish = api.value(1)
      const lane = api.value(2)
      if (
        typeof start !== 'number' ||
        typeof finish !== 'number' ||
        typeof lane !== 'number'
      ) {
        return null
      }
      const startPoint = api.coord([start, lane])
      const endPoint = api.coord([finish, lane])
      if (!isFinitePoint(startPoint) || !isFinitePoint(endPoint)) return null
      const row = rows[params.dataIndexInside]
      if (!row) return null
      const height = customBarHeight(api.size?.([0, 1]))
      return {
        type: 'rect',
        name: row.id,
        shape: {
          x: Math.min(startPoint[0], endPoint[0]),
          y: startPoint[1] - height / 2,
          width: Math.abs(endPoint[0] - startPoint[0]),
          height,
          r: 5,
        },
        style: {
          fill: editableEventColor(row.id),
          stroke: '#ffffff',
          lineWidth: 1,
        },
      }
    },
    clip: true,
    silent: true,
    animation: false,
  }

  return {
    animation: false,
    aria: {
      enabled: true,
      description:
        'Four stable keyed events with a draggable release end handle.',
    },
    grid: margin,
    xAxis: {
      type: 'time',
      min: editableDomain[0].getTime(),
      max: editableDomain[1].getTime(),
      splitLine: {
        show: true,
        lineStyle: { color: '#e2e8f0' },
      },
    },
    yAxis: {
      type: 'category',
      data: [...editableLanes],
      inverse: true,
      axisTick: { show: false },
      axisLine: { show: false },
    },
    series,
  }
}

function createEditableInteractions(
  chart: EChartsType,
  surface: HTMLDivElement,
  view: HTMLDivElement,
  getInput: () => ConformanceInput,
  state: EditableState,
) {
  const overlay = createEditableHandleOverlay(view)
  const layout = () => editableLayout(chart, surface, view, state.end)
  const paint = () => {
    const nextLayout = layout()
    if (!nextLayout) return
    overlay.paint(nextLayout, `Release ends ${editableDateKey(state.end)}`)
  }
  const renderState = () => {
    chart.setOption(
      {
        ...editableOption(getInput(), state.end),
        animation: false,
      },
      {
        notMerge: true,
        lazyUpdate: false,
        silent: false,
      },
    )
    chart.getZr().flush()
    paint()
  }
  const updateAtPointer = (event: PointerEvent) => {
    const date = dateAtPointer(chart, surface, event)
    if (!date) return
    state.end = date
    renderState()
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
      return resolveTarget(chart, surface, view, state.end, target)
    },
    readState() {
      return interactionState(state, getInput())
    },
    geometry(query) {
      return editableGeometry(
        chart,
        surface,
        view,
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
    settle() {
      chart.getZr().flush()
      paint()
    },
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
  chart: EChartsType,
  surface: HTMLDivElement,
  view: HTMLDivElement,
  end: Date,
  target: ConformanceTarget,
) {
  if (target.view !== undefined && target.view !== 'main') return null
  const date =
    target.anchor === 'event:release:end'
      ? end
      : editableDateFromAnchor(target.anchor)
  if (!date) return null
  const point = localPoint(chart, surface, view, date, 'Engineering')
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
  chart: EChartsType,
  surface: HTMLDivElement,
  view: HTMLDivElement,
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
  const height = laneHeight(chart, surface, view)
  return editableEvents(input.revision, end).flatMap((row) => {
    const start = localPoint(chart, surface, view, row.start, row.lane)
    const finish = localPoint(chart, surface, view, row.end, row.lane)
    if (!start || !finish) return []
    return [
      {
        x: viewBounds.left + Math.min(start[0], finish[0]),
        y: viewBounds.top + start[1] - height / 2,
        width: Math.abs(finish[0] - start[0]),
        height,
        paint: editableEventColor(row.id),
      },
    ]
  })
}

function editableLayout(
  chart: EChartsType,
  surface: HTMLDivElement,
  view: HTMLDivElement,
  end: Date,
): EditableHandleLayout | null {
  const point = localPoint(chart, surface, view, end, 'Engineering')
  return point ? { x: point[0], y: point[1] } : null
}

function dateAtPointer(
  chart: EChartsType,
  surface: HTMLDivElement,
  event: PointerEvent,
) {
  const bounds = surface.getBoundingClientRect()
  const value = chart.convertFromPixel({ xAxisIndex: 0, yAxisIndex: 0 }, [
    event.clientX - bounds.left,
    event.clientY - bounds.top,
  ])
  if (!Array.isArray(value) || typeof value[0] !== 'number') return null
  return clampEditableEventEnd(new Date(value[0]))
}

function localPoint(
  chart: EChartsType,
  surface: HTMLDivElement,
  view: HTMLDivElement,
  date: Date,
  lane: EditableLane,
): readonly [number, number] | null {
  const point = chart.convertToPixel({ xAxisIndex: 0, yAxisIndex: 0 }, [
    date.getTime(),
    lane,
  ])
  if (!isFinitePoint(point)) return null
  const surfaceBounds = surface.getBoundingClientRect()
  const viewBounds = view.getBoundingClientRect()
  return [
    surfaceBounds.left - viewBounds.left + point[0],
    surfaceBounds.top - viewBounds.top + point[1],
  ]
}

function laneHeight(
  chart: EChartsType,
  surface: HTMLDivElement,
  view: HTMLDivElement,
) {
  const first = localPoint(
    chart,
    surface,
    view,
    editableDomain[0],
    editableLanes[0] ?? 'Product',
  )
  const second = localPoint(
    chart,
    surface,
    view,
    editableDomain[0],
    editableLanes[1] ?? 'Design',
  )
  return first && second
    ? Math.max(10, Math.abs(second[1] - first[1]) * barRatio)
    : 20
}

function customBarHeight(size: unknown) {
  return Array.isArray(size) &&
    typeof size[1] === 'number' &&
    Number.isFinite(size[1])
    ? Math.max(10, Math.abs(size[1]) * barRatio)
    : 20
}

function isFinitePoint(value: unknown): value is [number, number] {
  return (
    Array.isArray(value) &&
    typeof value[0] === 'number' &&
    typeof value[1] === 'number' &&
    Number.isFinite(value[0]) &&
    Number.isFinite(value[1])
  )
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
