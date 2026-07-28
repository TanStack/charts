import * as Plot from '@observablehq/plot'
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
import type { FocusContextWindow } from './data'
import type {
  ConformanceInput,
  ConformanceMount,
  ConformanceTarget,
} from '../../types'

const detailMargin = { top: 16, right: 24, bottom: 38, left: 52 }
const overviewMargin = { top: 8, right: 24, bottom: 22, left: 52 }
const gap = 8

function viewHeights(height: number) {
  const overview = Math.max(88, Math.min(112, Math.round(height * 0.3)))
  return {
    detail: Math.max(180, height - overview - gap),
    overview,
  }
}

function linePlot(
  input: ConformanceInput,
  height: number,
  window: FocusContextWindow,
) {
  const rows = rowsInWindow(focusContextData(input.revision), window)
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
    y: { domain: [30, 90], grid: true, label: 'Value' },
    marks: [
      Plot.lineY(rows, {
        x: 'date',
        y: 'value',
        stroke: '#2563eb',
        strokeWidth: 2.5,
      }),
      Plot.dot(rows, {
        x: 'date',
        y: 'value',
        fill: '#2563eb',
        r: 3,
      }),
    ],
  })
}

function overviewPlot(input: ConformanceInput, height: number) {
  const rows = focusContextData(input.revision)
  return Plot.plot({
    width: input.width,
    height,
    marginTop: overviewMargin.top,
    marginRight: overviewMargin.right,
    marginBottom: overviewMargin.bottom,
    marginLeft: overviewMargin.left,
    ariaLabel: 'Overview time series; click to choose a detail window',
    x: {
      type: 'utc',
      domain: focusContextDomain,
      axis: null,
    },
    y: { domain: [30, 90], axis: null },
    marks: [
      Plot.lineY(rows, {
        x: 'date',
        y: 'value',
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
  const domainStart = focusContextDomain[0].getTime()
  const domainSpan = focusContextDomain[1].getTime() - domainStart
  const innerWidth = Math.max(1, width - margin.left - margin.right)
  return (
    margin.left + ((date.getTime() - domainStart) / domainSpan) * innerWidth
  )
}

function nearestDateAtClientX(
  clientX: number,
  svg: SVGSVGElement,
  width: number,
) {
  const bounds = svg.getBoundingClientRect()
  const localX = ((clientX - bounds.left) / bounds.width) * width
  return focusContextDates.reduce((nearest, date) =>
    Math.abs(datePosition(date, width, overviewMargin) - localX) <
    Math.abs(datePosition(nearest, width, overviewMargin) - localX)
      ? date
      : nearest,
  )
}

function targetDate(target: ConformanceTarget) {
  if (target.view !== 'overview') return null
  return dateFromAnchor(target.anchor)
}

export const mount: ConformanceMount = (container, input) => {
  const document = container.ownerDocument
  const shell = document.createElement('div')
  const detailView = document.createElement('div')
  const overviewView = document.createElement('div')
  const windowBand = document.createElement('div')
  detailView.dataset.conformanceView = 'detail'
  overviewView.dataset.conformanceView = 'overview'
  overviewView.style.position = 'relative'
  windowBand.dataset.focusWindow = ''
  Object.assign(windowBand.style, {
    position: 'absolute',
    zIndex: '1',
    border: '1px solid #2563eb',
    borderRadius: '3px',
    background: 'rgb(37 99 235 / 0.12)',
    pointerEvents: 'none',
  })
  shell.append(detailView, overviewView)
  overviewView.append(windowBand)
  container.append(shell)

  let currentInput = input
  let window = initialFocusContextWindow()
  let detailChart: HTMLElement | SVGSVGElement | undefined
  let overviewChart: HTMLElement | SVGSVGElement | undefined

  const sizeShell = () => {
    const heights = viewHeights(currentInput.height)
    shell.style.width = `${currentInput.width}px`
    shell.style.height = `${currentInput.height}px`
    shell.style.display = 'grid'
    shell.style.gridTemplateRows = `${heights.detail}px ${heights.overview}px`
    shell.style.gap = `${gap}px`
    return heights
  }

  const paintWindow = () => {
    const left = datePosition(window.start, currentInput.width, overviewMargin)
    const right = datePosition(window.end, currentInput.width, overviewMargin)
    const heights = viewHeights(currentInput.height)
    windowBand.style.left = `${left}px`
    windowBand.style.width = `${Math.max(1, right - left)}px`
    windowBand.style.top = `${overviewMargin.top}px`
    windowBand.style.height = `${Math.max(
      1,
      heights.overview - overviewMargin.top - overviewMargin.bottom,
    )}px`
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
    paintWindow()
  }

  const chooseDate = (date: Date) => {
    window = windowForDate(date)
    renderDetail()
    paintWindow()
  }

  const handleOverviewClick = (event: MouseEvent) => {
    const svg = overviewView.querySelector<SVGSVGElement>('svg')
    if (!svg) return
    chooseDate(nearestDateAtClientX(event.clientX, svg, currentInput.width))
  }

  overviewView.addEventListener('click', handleOverviewClick)
  sizeShell()
  renderDetail()
  renderOverview()

  return {
    update(nextInput) {
      currentInput = nextInput
      sizeShell()
      renderDetail()
      renderOverview()
    },
    driver: {
      resolveTarget(target) {
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
        }
      },
    },
    destroy() {
      overviewView.removeEventListener('click', handleOverviewClick)
      shell.remove()
    },
  }
}
