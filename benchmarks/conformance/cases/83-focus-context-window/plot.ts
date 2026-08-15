import * as Plot from '@observablehq/plot'
import { aapl } from '@tanstack/charts-data/aapl'
import { brushX } from 'd3-brush'
import { select } from 'd3-selection'
import {
  dateFromAnchor,
  dateKey,
  focusContextDomain,
  initialFocusContextWindow,
  monthlyAaplRows,
  rowsInWindow,
  windowForDate,
} from './model'
import type { FocusContextWindow } from './model'
import type { BrushSelection, D3BrushEvent } from 'd3-brush'
import type {
  ConformanceInput,
  ConformanceMount,
  ConformanceTarget,
} from '../../types'

const detailMargin = { top: 16, right: 24, bottom: 38, left: 52 }
const overviewMargin = { top: 8, right: 24, bottom: 22, left: 52 }
const gap = 8
const focusContextRows = monthlyAaplRows(aapl)
const focusContextDates = focusContextRows.map((row) => row.Date)
const fullDomain = focusContextDomain(focusContextRows)

function viewHeights(height: number) {
  const controls = 52
  const overview = Math.max(56, Math.min(100, Math.round(height * 0.24)))
  return {
    detail: Math.max(1, height - overview - controls - gap * 2),
    overview,
    controls,
  }
}

function linePlot(
  input: ConformanceInput,
  height: number,
  window: FocusContextWindow,
) {
  const rows = rowsInWindow(focusContextRows, window)
  return Plot.plot({
    width: input.width,
    height,
    marginTop: detailMargin.top,
    marginRight: detailMargin.right,
    marginBottom: detailMargin.bottom,
    marginLeft: detailMargin.left,
    ariaLabel: 'Detail time window',
    x: {
      type: 'utc',
      domain: [window.start, window.end],
      label: 'Selected time window',
    },
    y: { grid: true, label: 'Close ($)' },
    marks: [
      Plot.lineY(rows, {
        x: 'Date',
        y: 'Close',
        stroke: '#2563eb',
        strokeWidth: 2.5,
      }),
      Plot.dot(rows, {
        x: 'Date',
        y: 'Close',
        fill: '#2563eb',
        r: 3,
      }),
      Plot.dot(
        rows.filter((row) => row.Date.getTime() === window.selected.getTime()),
        {
          x: 'Date',
          y: 'Close',
          fill: '#f97316',
          stroke: '#ffffff',
          strokeWidth: 2,
          r: 6,
        },
      ),
    ],
  })
}

function overviewPlot(input: ConformanceInput, height: number) {
  const rows = focusContextRows
  return Plot.plot({
    width: input.width,
    height,
    marginTop: overviewMargin.top,
    marginRight: overviewMargin.right,
    marginBottom: overviewMargin.bottom,
    marginLeft: overviewMargin.left,
    ariaLabel: 'Overview time series with draggable detail window',
    x: {
      type: 'utc',
      domain: fullDomain,
      ticks: 4,
      tickFormat: '%b',
    },
    y: { axis: null },
    marks: [
      Plot.lineY(rows, {
        x: 'Date',
        y: 'Close',
        stroke: '#2563eb',
        strokeWidth: 1.75,
      }),
    ],
  })
}

function datePosition(
  date: Date,
  width: number,
  margin: { left: number; right: number },
) {
  const domainStart = fullDomain[0].getTime()
  const domainSpan = fullDomain[1].getTime() - domainStart
  const innerWidth = Math.max(1, width - margin.left - margin.right)
  return (
    margin.left + ((date.getTime() - domainStart) / domainSpan) * innerWidth
  )
}

function targetDate(target: ConformanceTarget) {
  if (target.view !== 'overview') return null
  return dateFromAnchor(focusContextDates, target.anchor)
}

export const mount: ConformanceMount = (container, input) => {
  const document = container.ownerDocument
  const shell = document.createElement('div')
  const detailView = document.createElement('div')
  const overviewView = document.createElement('div')
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
  brushOverlay.dataset.chartBrush = 'focus-window'
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
  shell.append(detailView, overviewView, controls)
  overviewView.append(brushOverlay)
  container.append(shell)

  let currentInput = input
  let window = initialFocusContextWindow(focusContextDates)
  let detailChart: HTMLElement | SVGSVGElement | undefined
  let overviewChart: HTMLElement | SVGSVGElement | undefined

  const sizeShell = () => {
    const heights = viewHeights(currentInput.height)
    shell.style.width = `${currentInput.width}px`
    shell.style.height = `${currentInput.height}px`
    shell.style.display = 'grid'
    shell.style.gridTemplateRows = `${heights.detail}px ${heights.overview}px ${heights.controls}px`
    shell.style.gap = `${gap}px`
    return heights
  }

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
        renderDetail()
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
        const localX =
          ((Number(event.sourceEvent.clientX) - bounds.left) / bounds.width) *
          currentInput.width
        chooseDate(nearestDate(localX))
      }
    })

  const configureBrush = () => {
    const heights = viewHeights(currentInput.height)
    brush.extent([
      [overviewMargin.left, overviewMargin.top],
      [
        currentInput.width - overviewMargin.right,
        heights.overview - overviewMargin.bottom,
      ],
    ])
    brushOverlay.setAttribute(
      'viewBox',
      `0 0 ${currentInput.width} ${heights.overview}`,
    )
    select(brushGroup).call(brush)
    styleBrush(brushGroup)
  }

  const paintWindow = () => {
    const left = datePosition(window.start, currentInput.width, overviewMargin)
    const right = datePosition(window.end, currentInput.width, overviewMargin)
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

  const renderDetail = () => {
    const heights = viewHeights(currentInput.height)
    const nextChart = linePlot(currentInput, heights.detail, window)
    if (detailChart) detailChart.replaceWith(nextChart)
    else detailView.append(nextChart)
    detailChart = nextChart
  }

  const renderOverview = () => {
    const heights = viewHeights(currentInput.height)
    const nextChart = overviewPlot(currentInput, heights.overview)
    if (overviewChart) overviewChart.replaceWith(nextChart)
    else overviewView.prepend(nextChart)
    overviewChart = nextChart
  }

  const chooseDate = (date: Date) => {
    window = windowForDate(focusContextDates, date)
    renderDetail()
    paintWindow()
  }

  const nearestDate = (localX: number) => {
    return focusContextDates.reduce((nearest, date) =>
      Math.abs(
        datePosition(date, currentInput.width, overviewMargin) - localX,
      ) <
      Math.abs(
        datePosition(nearest, currentInput.width, overviewMargin) - localX,
      )
        ? date
        : nearest,
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
    renderDetail()
    paintWindow()
  }
  monthControl.addEventListener('input', handleMonthInput)
  brushOverlay.addEventListener('pointercancel', cancelActiveBrush)
  brushOverlay.addEventListener('touchcancel', cancelActiveBrush)
  sizeShell()
  renderDetail()
  renderOverview()
  configureBrush()
  paintWindow()

  return {
    update(nextInput) {
      currentInput = nextInput
      sizeShell()
      renderDetail()
      renderOverview()
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
        const svg = overviewView.querySelector<SVGSVGElement>('svg')
        if (!date || !svg) return null
        const bounds = svg.getBoundingClientRect()
        const x =
          bounds.left +
          (datePosition(date, currentInput.width, overviewMargin) /
            currentInput.width) *
            bounds.width
        const height = viewHeights(currentInput.height).overview
        const yPosition =
          overviewMargin.top +
          (height - overviewMargin.top - overviewMargin.bottom) / 2
        return {
          x,
          y: bounds.top + (yPosition / height) * bounds.height,
          focusElement: svg,
        }
      },
      readState() {
        const detailRows = rowsInWindow(focusContextRows, window)
        const selectedRow = detailRows.find(
          (row) => row.Date.getTime() === window.selected.getTime(),
        )
        return {
          window: {
            selected: dateKey(window.selected),
            start: dateKey(window.start),
            end: dateKey(window.end),
          },
          detail: {
            pointCount: detailRows.length,
            selectedValue: selectedRow?.Close ?? null,
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
