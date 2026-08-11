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
import type { EditableEvent, EditableLane } from './scenario'
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
  originEnd: Date | null
}

const margin = { top: 96, right: 26, bottom: 48, left: 82 }
const barRatio = 0.62
const millisecondsPerDay = 86_400_000

export const mount: ConformanceMount = (container, input) => {
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
      const left = Math.min(startPoint[0], endPoint[0])
      const right = Math.max(startPoint[0], endPoint[0])
      const releaseLabelFits =
        row.id === 'release' && barCanFitLabel(right - left, 'Release')
      return {
        type: 'group',
        name: row.id,
        children: [
          {
            type: 'rect',
            shape: {
              x: left,
              y: startPoint[1] - height / 2,
              width: right - left,
              height,
              r: 5,
            },
            style: {
              fill: editableEventColor(row.id),
              stroke: '#ffffff',
              lineWidth: 1,
            },
          },
          ...(row.id !== 'release'
            ? [
                {
                  type: 'text' as const,
                  style: {
                    x: right + 5,
                    y: startPoint[1],
                    text: row.label,
                    fill: '#64748b',
                    font: '600 10px system-ui, sans-serif',
                    verticalAlign: 'middle' as const,
                    align: 'left' as const,
                  },
                },
              ]
            : releaseLabelFits
              ? [
                  {
                    type: 'text' as const,
                    style: {
                      x: left + 5,
                      y: startPoint[1],
                      text: 'Release',
                      fill: '#431407',
                      font: '700 10px system-ui, sans-serif',
                      verticalAlign: 'middle' as const,
                      align: 'left' as const,
                    },
                  },
                ]
              : []),
        ],
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
      description: editableAriaLabel(input.revision, end),
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
  const layout = () => editableLayout(chart, surface, view, state.end)
  let paint = () => {}
  let renderState = () => {}
  const beginEdit = () => {
    if (state.editing) return
    state.originEnd = state.end
    state.editing = true
  }
  const setEnd = (date: Date) => {
    state.end = clampEditableEventEnd(date)
    renderState()
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
  renderState = () => {
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
    settle() {
      chart.getZr().flush()
      paint()
    },
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
  chart: EChartsType,
  surface: HTMLDivElement,
  view: HTMLDivElement,
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
  const point = localPoint(chart, surface, view, date, 'Engineering')
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
  chart: EChartsType,
  surface: HTMLDivElement,
  view: HTMLDivElement,
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
  const minimum = localPoint(
    chart,
    surface,
    view,
    new Date(editableEventStart.getTime() + millisecondsPerDay),
    'Engineering',
  )
  const maximum = localPoint(
    chart,
    surface,
    view,
    editableDomain[1],
    'Engineering',
  )
  return point && minimum && maximum
    ? { x: point[0], y: point[1], minX: minimum[0], maxX: maximum[0] }
    : null
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
  return date.toLocaleDateString('en-US', {
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

function barCanFitLabel(width: number, label: string) {
  return width >= label.length * 6 + 10
}
