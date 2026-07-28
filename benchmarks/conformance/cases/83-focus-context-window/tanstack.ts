import { defineChart, dot, lineY, mountChart } from '@tanstack/charts'
import { scaleLinear, scaleUtc } from 'd3-scale'
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
import type { ChartHost, DynamicChartHostOptions } from '@tanstack/charts'
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

const detailDefinition = defineChart<DetailInput>()(({ input }) => {
  const rows = rowsInWindow(focusContextData(input.revision), input.window)
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

const overviewDefinition = defineChart<ConformanceInput>()(({ input }) => {
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
    x: { scale: scaleUtc().domain(focusContextDomain) },
    y: { scale: scaleLinear().domain([30, 90]) },
    guides: false,
    margin: overviewMargin,
  }
})

function viewHeights(height: number) {
  const overview = Math.max(88, Math.min(112, Math.round(height * 0.3)))
  return {
    detail: Math.max(180, height - overview - gap),
    overview,
  }
}

function targetDate(target: ConformanceTarget) {
  if (target.view !== 'overview') return null
  return dateFromAnchor(target.anchor)
}

function scenePointToClient(
  surface: HTMLElement,
  host: ChartHost<FocusContextDatum, ConformanceInput>,
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
  detailView.append(detailSurface)
  overviewView.append(overviewSurface, windowBand)
  shell.append(detailView, overviewView)
  container.append(shell)

  let currentInput = input
  let window = initialFocusContextWindow()

  const sizeShell = () => {
    const heights = viewHeights(currentInput.height)
    shell.style.width = `${currentInput.width}px`
    shell.style.height = `${currentInput.height}px`
    shell.style.display = 'grid'
    shell.style.gridTemplateRows = `${heights.detail}px ${heights.overview}px`
    shell.style.gap = `${gap}px`
    return heights
  }

  const detailOptions = (): DynamicChartHostOptions<
    FocusContextDatum,
    DetailInput
  > => {
    const heights = viewHeights(currentInput.height)
    return {
      definition: detailDefinition,
      input: { ...currentInput, window },
      width: currentInput.width,
      height: heights.detail,
      ariaLabel: 'Detail time window',
      animate: false,
      keyboard: false,
    }
  }

  const overviewOptions = (): DynamicChartHostOptions<
    FocusContextDatum,
    ConformanceInput
  > => {
    const heights = viewHeights(currentInput.height)
    return {
      definition: overviewDefinition,
      input: currentInput,
      width: currentInput.width,
      height: heights.overview,
      ariaLabel: 'Overview time series; click to choose a detail window',
      animate: false,
      keyboard: false,
    }
  }

  sizeShell()
  const detailHost = mountChart(detailSurface, detailOptions())
  const overviewHost = mountChart(overviewSurface, overviewOptions())

  const paintWindow = () => {
    const scene = overviewHost.getScene()
    const left = scene.scales.x.map(window.start)
    const right = scene.scales.x.map(window.end)
    windowBand.style.left = `${left}px`
    windowBand.style.width = `${Math.max(1, right - left)}px`
    windowBand.style.top = `${scene.chart.y}px`
    windowBand.style.height = `${scene.chart.height}px`
  }

  const chooseDate = (date: Date) => {
    window = windowForDate(date)
    detailHost.update(detailOptions())
    paintWindow()
  }

  const handleOverviewClick = (event: MouseEvent) => {
    const svg = overviewSurface.querySelector<SVGSVGElement>('svg.ts-chart')
    if (!svg) return
    const scene = overviewHost.getScene()
    const bounds = svg.getBoundingClientRect()
    const sceneX = ((event.clientX - bounds.left) / bounds.width) * scene.width
    const nearest = focusContextDates.reduce((candidate, date) =>
      Math.abs(scene.scales.x.map(date) - sceneX) <
      Math.abs(scene.scales.x.map(candidate) - sceneX)
        ? date
        : candidate,
    )
    chooseDate(nearest)
  }

  overviewView.addEventListener('click', handleOverviewClick)
  paintWindow()

  return {
    update(nextInput) {
      currentInput = nextInput
      sizeShell()
      overviewHost.update(overviewOptions())
      detailHost.update(detailOptions())
      paintWindow()
    },
    driver: {
      resolveTarget(target) {
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
        }
      },
    },
    destroy() {
      overviewView.removeEventListener('click', handleOverviewClick)
      detailHost.destroy()
      overviewHost.destroy()
      shell.remove()
    },
  }
}
