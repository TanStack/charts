import { defineChart, dot, lineY, mountChart } from '@tanstack/charts'
import { brushX } from 'd3-brush'
import { scaleLinear, scaleUtc } from 'd3-scale'
import { select } from 'd3-selection'
import {
  dateFromAnchor,
  dateKey,
  focusContextData,
  focusContextDates,
  focusContextDomain,
  initialFocusContextWindow,
  rowsInWindow,
  windowForDate,
} from './data'
import type { ChartHost, ChartHostOptions } from '@tanstack/charts'
import type { BrushSelection, D3BrushEvent } from 'd3-brush'
import type { FocusContextDatum, FocusContextWindow } from './data'
import type {
  ConformanceHandle,
  ConformanceInput,
  ConformanceTarget,
} from '../../types'

interface DetailInput extends ConformanceInput {
  window: FocusContextWindow
}

const detailMargin = { top: 16, right: 24, bottom: 38, left: 52 }
const overviewMargin = { top: 8, right: 24, bottom: 22, left: 52 }
const gap = 8

const detailDefinition = (input: DetailInput) =>
  defineChart(() => {
    const rows = rowsInWindow(focusContextData(input.revision), input.window)
    const selectedRows = rows.filter(
      (row) => row.date.getTime() === input.window.selected.getTime(),
    )
    return {
      marks: [
        lineY(rows, {
          id: 'detail-line',
          x: 'date',
          y: 'value',
          key: 'id',
          stroke: '#2563eb',
          strokeWidth: 2.5,
        }),
        dot(rows, {
          id: 'detail-points',
          x: 'date',
          y: 'value',
          key: 'id',
          fill: '#2563eb',
          r: 3,
        }),
        dot(selectedRows, {
          id: 'selected-point',
          x: 'date',
          y: 'value',
          key: 'id',
          fill: '#f97316',
          stroke: '#ffffff',
          strokeWidth: 2,
          r: 6,
        }),
      ],
      x: {
        scale: scaleUtc().domain([input.window.start, input.window.end]),
        label: 'Selected time window',
      },
      y: {
        scale: scaleLinear().domain([30, 90]),
        grid: true,
        label: 'Value',
      },
      margin: detailMargin,
    }
  })

const overviewDefinition = (input: ConformanceInput) =>
  defineChart(() => {
    const rows = focusContextData(input.revision)
    return {
      marks: [
        lineY(rows, {
          id: 'overview-line',
          x: 'date',
          y: 'value',
          key: 'id',
          stroke: '#2563eb',
          strokeWidth: 1.75,
        }),
      ],
      x: {
        scale: scaleUtc().domain(focusContextDomain),
        ticks: 4,
        format: (value) =>
          value.toLocaleDateString(undefined, {
            month: 'short',
            timeZone: 'UTC',
          }),
      },
      y: {
        scale: scaleLinear().domain([30, 90]),
        guide: false,
      },
      margin: overviewMargin,
    }
  })

function viewHeights(height: number) {
  const controls = 52
  const overview = Math.max(56, Math.min(100, Math.round(height * 0.24)))
  return {
    detail: Math.max(1, height - overview - controls - gap * 2),
    overview,
    controls,
  }
}

function targetDate(target: ConformanceTarget) {
  if (target.view !== 'overview') return null
  return dateFromAnchor(target.anchor)
}

function scenePointToClient(
  surface: HTMLElement,
  host: ChartHost<FocusContextDatum>,
  x: number,
  y: number,
) {
  const svg = surface.querySelector<SVGSVGElement>('svg.ts-chart')
  if (!svg) return null
  const scene = host.getScene()
  const bounds = svg.getBoundingClientRect()
  return {
    x: bounds.left + (x / scene.width) * bounds.width,
    y: bounds.top + (y / scene.height) * bounds.height,
    focusElement: svg,
  }
}

export function mount(
  container: HTMLElement,
  input: ConformanceInput,
): ConformanceHandle {
  const document = container.ownerDocument
  const shell = document.createElement('div')
  const detailView = document.createElement('div')
  const overviewView = document.createElement('div')
  const detailSurface = document.createElement('div')
  const overviewSurface = document.createElement('div')
  const brushOverlay = document.createElementNS(
    'http://www.w3.org/2000/svg',
    'svg',
  )
  const brushGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g')
  const controls = document.createElement('div')
  const monthControl = document.createElement('input')
  const rangeLabel = document.createElement('output')
  detailView.dataset.conformanceView = 'detail'
  overviewView.dataset.conformanceView = 'overview'
  controls.dataset.focusControls = ''
  overviewView.style.position = 'relative'
  brushOverlay.dataset.focusWindow = ''
  brushOverlay.setAttribute('aria-hidden', 'true')
  brushOverlay.append(brushGroup)
  Object.assign(brushOverlay.style, {
    position: 'absolute',
    zIndex: '1',
    inset: '0',
    width: '100%',
    height: '100%',
    touchAction: 'none',
  })
  controls.style.display = 'grid'
  controls.style.gridTemplateColumns = 'minmax(9rem, 1fr) auto'
  controls.style.alignItems = 'center'
  controls.style.gap = '10px'
  controls.style.padding = '4px 12px'
  controls.style.boxSizing = 'border-box'
  controls.style.font = '600 11px/1.25 system-ui, sans-serif'
  monthControl.type = 'range'
  monthControl.min = '0'
  monthControl.max = String(focusContextDates.length - 1)
  monthControl.step = '1'
  monthControl.setAttribute('aria-label', 'Selected month')
  monthControl.setAttribute(
    'aria-description',
    'Use arrow keys, Home, or End to move the four-month detail window.',
  )
  monthControl.style.width = '100%'
  monthControl.style.minHeight = '44px'
  monthControl.style.cursor = 'pointer'
  rangeLabel.dataset.focusRange = ''
  rangeLabel.setAttribute('aria-live', 'polite')
  rangeLabel.style.whiteSpace = 'nowrap'
  controls.append(monthControl, rangeLabel)
  detailView.append(detailSurface)
  overviewView.append(overviewSurface, brushOverlay)
  shell.append(detailView, overviewView, controls)
  container.append(shell)

  let currentInput = input
  let window = initialFocusContextWindow()

  const sizeShell = () => {
    const heights = viewHeights(currentInput.height)
    shell.style.width = `${currentInput.width}px`
    shell.style.height = `${currentInput.height}px`
    shell.style.display = 'grid'
    shell.style.gridTemplateRows = `${heights.detail}px ${heights.overview}px ${heights.controls}px`
    shell.style.gap = `${gap}px`
    return heights
  }

  const detailOptions = (): ChartHostOptions<FocusContextDatum> => {
    const heights = viewHeights(currentInput.height)
    return {
      definition: detailDefinition({ ...currentInput, window }),
      width: currentInput.width,
      height: heights.detail,
      ariaLabel: 'Detail time window',
      animate: false,
      keyboard: false,
    }
  }

  const overviewOptions = (): ChartHostOptions<FocusContextDatum> => {
    const heights = viewHeights(currentInput.height)
    return {
      definition: overviewDefinition(currentInput),
      width: currentInput.width,
      height: heights.overview,
      ariaLabel: 'Overview time series with draggable detail window',
      ariaDescription:
        'Drag the visible selection or use the range control below to reposition the four-month detail window.',
      animate: false,
      keyboard: false,
    }
  }

  sizeShell()
  const detailHost = mountChart(detailSurface, detailOptions())
  const overviewHost = mountChart(overviewSurface, overviewOptions())
  let movingBrush = false
  let brushDragging = false
  let brushOrigin: FocusContextWindow | null = null
  let cancelRequested = false
  let brushOutcome = 'idle'

  const brush = brushX<unknown>()
    .touchable(true)
    .handleSize(16)
    .on('start', (event: D3BrushEvent<unknown>) => {
      if (movingBrush || !event.sourceEvent) return
      brushOrigin = { ...window }
      brushDragging = true
      cancelRequested = false
      brushOutcome = 'dragging'
    })
    .on('end', (event: D3BrushEvent<unknown>) => {
      if (movingBrush || !event.sourceEvent) return
      const touchCancelled =
        event.sourceEvent instanceof Event &&
        event.sourceEvent.type === 'touchcancel'
      if (cancelRequested || touchCancelled) {
        if (brushOrigin) window = brushOrigin
        brushDragging = false
        brushOrigin = null
        cancelRequested = false
        brushOutcome = 'cancel'
        detailHost.update(detailOptions())
        paintWindow()
        return
      }
      brushDragging = false
      brushOrigin = null
      brushOutcome = 'commit'
      const selection = event.selection
      if (selection) {
        const range = horizontalBrushRange(selection)
        if (range) {
          chooseDate(nearestDate((range[0] + range[1]) / 2))
          return
        }
      }
      if ('clientX' in event.sourceEvent) {
        const bounds = brushOverlay.getBoundingClientRect()
        const scene = overviewHost.getScene()
        const sceneX =
          ((Number(event.sourceEvent.clientX) - bounds.left) / bounds.width) *
          scene.width
        chooseDate(nearestDate(sceneX))
      }
    })

  const configureBrush = () => {
    const scene = overviewHost.getScene()
    brush.extent([
      [scene.chart.x, scene.chart.y],
      [scene.chart.x + scene.chart.width, scene.chart.y + scene.chart.height],
    ])
    brushOverlay.setAttribute('viewBox', `0 0 ${scene.width} ${scene.height}`)
    select(brushGroup).call(brush)
    styleBrush(brushGroup)
  }

  const paintWindow = () => {
    const scene = overviewHost.getScene()
    const left = scene.scales.x.map(window.start)
    const right = scene.scales.x.map(window.end)
    movingBrush = true
    select(brushGroup).call(brush.move, [left, right])
    movingBrush = false
    styleBrush(brushGroup)
    monthControl.value = String(
      Math.max(
        0,
        focusContextDates.findIndex(
          (date) => date.getTime() === window.selected.getTime(),
        ),
      ),
    )
    rangeLabel.value = `${monthLabel(window.start)} – ${monthLabel(window.end)}`
    rangeLabel.textContent = rangeLabel.value
  }

  const chooseDate = (date: Date) => {
    window = windowForDate(date)
    detailHost.update(detailOptions())
    paintWindow()
  }

  const nearestDate = (sceneX: number) => {
    const scene = overviewHost.getScene()
    return focusContextDates.reduce((candidate, date) =>
      Math.abs(scene.scales.x.map(date) - sceneX) <
      Math.abs(scene.scales.x.map(candidate) - sceneX)
        ? date
        : candidate,
    )
  }

  const handleMonthInput = () => {
    const date = focusContextDates[Number(monthControl.value)]
    if (date) chooseDate(date)
  }
  const cancelActiveBrush = () => {
    if (!brushDragging || !brushOrigin) return
    cancelRequested = true
    window = brushOrigin
    brushDragging = false
    brushOutcome = 'cancel'
    detailHost.update(detailOptions())
    paintWindow()
  }
  monthControl.addEventListener('input', handleMonthInput)
  brushOverlay.addEventListener('pointercancel', cancelActiveBrush)
  brushOverlay.addEventListener('touchcancel', cancelActiveBrush)
  configureBrush()
  paintWindow()

  return {
    update(nextInput) {
      currentInput = nextInput
      sizeShell()
      overviewHost.update(overviewOptions())
      detailHost.update(detailOptions())
      configureBrush()
      paintWindow()
    },
    driver: {
      resolveTarget(target) {
        if (
          target.view === 'overview' &&
          target.anchor === 'control:selected-month'
        ) {
          return center(monthControl)
        }
        const date = targetDate(target)
        if (!date) return null
        const scene = overviewHost.getScene()
        return scenePointToClient(
          overviewSurface,
          overviewHost,
          scene.scales.x.map(date),
          scene.chart.y + scene.chart.height / 2,
        )
      },
      readState() {
        const detailRows = rowsInWindow(
          focusContextData(currentInput.revision),
          window,
        )
        const selectedRow = detailRows.find(
          (row) => row.date.getTime() === window.selected.getTime(),
        )
        return {
          window: {
            selected: dateKey(window.selected),
            start: dateKey(window.start),
            end: dateKey(window.end),
          },
          detail: {
            pointCount: detailRows.length,
            selectedValue: selectedRow?.value ?? null,
          },
          control: {
            value: Number(monthControl.value),
            label: rangeLabel.value,
          },
          brush: brushSelectionState(brushGroup, brushDragging, brushOutcome),
        }
      },
    },
    destroy() {
      monthControl.removeEventListener('input', handleMonthInput)
      brushOverlay.removeEventListener('pointercancel', cancelActiveBrush)
      brushOverlay.removeEventListener('touchcancel', cancelActiveBrush)
      select(brushGroup).on('.brush', null)
      detailHost.destroy()
      overviewHost.destroy()
      shell.remove()
    },
  }
}

function styleBrush(group: SVGGElement) {
  const selection = group.querySelector<SVGRectElement>('.selection')
  if (selection) {
    selection.setAttribute('fill', '#2563eb')
    selection.setAttribute('fill-opacity', '0.16')
    selection.setAttribute('stroke', '#2563eb')
    selection.setAttribute('stroke-width', '1.5')
    selection.style.cursor = 'grab'
  }
  for (const handle of group.querySelectorAll<SVGRectElement>('.handle')) {
    handle.setAttribute('fill', '#2563eb')
    handle.setAttribute('fill-opacity', '0.9')
    handle.setAttribute('width', '8')
  }
}

function monthLabel(date: Date) {
  return date.toLocaleDateString(undefined, {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

function brushSelectionState(
  group: SVGGElement,
  dragging: boolean,
  outcome: string,
) {
  const selection = group.querySelector<SVGRectElement>('.selection')
  return {
    x: Number(selection?.getAttribute('x') ?? 0),
    width: Number(selection?.getAttribute('width') ?? 0),
    dragging,
    outcome,
  }
}

function horizontalBrushRange(
  selection: BrushSelection,
): readonly [number, number] | null {
  const [left, right] = selection
  return typeof left === 'number' && typeof right === 'number'
    ? [left, right]
    : null
}

function center(element: HTMLElement | SVGElement) {
  const bounds = element.getBoundingClientRect()
  return {
    x: bounds.left + bounds.width / 2,
    y: bounds.top + bounds.height / 2,
    focusElement: element,
  }
}
