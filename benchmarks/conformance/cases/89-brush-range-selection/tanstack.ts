import { aapl } from '@charts-poc/demo-data/aapl'
import { defineChart, dot, lineY, mountChart } from '@tanstack/charts'
import { brushX } from '@tanstack/charts/interaction/brush'
import { controlledSignal } from '@tanstack/charts/interaction/signal'
import { decorative } from '@tanstack/charts/mark/decorative'
import { scaleLinear, scaleUtc } from 'd3-scale'
import {
  clientPointBounds,
  scenePointToClient,
} from '../../shared/driver-geometry'
import {
  brushDateFromAnchor,
  brushDateKey,
  brushDomain,
  brushRangeSummary,
  brushShortDate,
  initialBrushRange,
  monthlyAaplRows,
  observedBrushDates,
} from './model'
import { brushSelectionFill, normalizedElementFill } from './paint'
import type { AaplRow } from '@charts-poc/demo-data/aapl'
import type {
  BrushRange,
  BrushXChange,
} from '@tanstack/charts/interaction/brush'
import type { ChartHost, ChartHostOptions, ChartScene } from '@tanstack/charts'
import type {
  ConformanceGeometryQuery,
  ConformanceGeometrySample,
  ConformanceInput,
  ConformanceJsonObject,
  ConformanceMount,
  ConformanceTarget,
  ConformanceTestDriver,
} from '../../types'

interface BrushState {
  range: BrushRange<Date>
  dragging: boolean
}

const color = '#2563eb'
const brushRows = monthlyAaplRows(aapl)
const brushDates = observedBrushDates(brushRows)
const fullDomain = brushDomain(brushDates)
const brushMonthFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  timeZone: 'UTC',
})

export function brushRangeDefinition(
  range: BrushRange<Date>,
  onChange: (range: BrushRange<Date>, reason: BrushXChange<Date>) => void,
) {
  return defineChart({
    marks: [
      decorative(
        lineY(brushRows, {
          id: 'brush-series-line',
          x: 'Date',
          y: 'Close',
          stroke: color,
          strokeWidth: 2.5,
        }),
      ),
      dot(brushRows, {
        id: 'brush-series-points',
        x: 'Date',
        y: 'Close',
        fill: color,
        r: 3.5,
        stroke: '#ffffff',
        strokeWidth: 1,
      }),
    ],
    x: {
      scale: scaleUtc().domain(fullDomain),
      axis: {
        ticks: { format: (value) => brushMonthFormatter.format(value) },
        label: 'Month',
      },
    },
    y: {
      scale: scaleLinear,
      grid: true,
      axis: { ticks: { count: 4 }, label: 'AAPL close ($)' },
    },
    behaviors: [
      brushX({
        id: 'monthly-range',
        range: controlledSignal(range, onChange),
        values: brushDates,
        ariaLabel:
          'Monthly range brush. Drag to select; focus either handle and use arrow keys, Home, or End to adjust.',
        startAriaLabel: 'Range start',
        endAriaLabel: 'Range end',
        format: brushDateKey,
        handleSize: 16,
        selectionStyle: {
          fill: brushSelectionFill,
          fillOpacity: 1,
          stroke: color,
          strokeWidth: 1,
        },
        handleStyle: {
          fill: 'Canvas',
          fillOpacity: 1,
          stroke: color,
          strokeWidth: 2,
        },
      }),
    ],
    animate: false,
    keyboard: false,
    focusRing: false,
    margin: { top: 52, right: 24, bottom: 44, left: 58 },
  })
}

export const mount: ConformanceMount = (container, input) => {
  let currentInput = input
  let accepted = copyRange(initialBrushRange(brushDates))
  let state: BrushState = { range: copyRange(accepted), dragging: false }
  let host: ChartHost<AaplRow, Date, number> | undefined

  const shell = container.ownerDocument.createElement('div')
  const chartFrame = container.ownerDocument.createElement('div')
  const status = createRangeStatus(container.ownerDocument)
  shell.dataset.conformanceView = 'main'
  shell.setAttribute('role', 'application')
  shell.setAttribute(
    'aria-label',
    'Monthly time range brush with two adjustable handles',
  )
  shell.style.position = 'relative'
  chartFrame.style.position = 'relative'
  shell.append(chartFrame, status)
  container.append(shell)
  sizeShell(shell, chartFrame, input)

  const handleBrushChange = (
    next: BrushRange<Date>,
    reason: BrushXChange<Date>,
  ) => {
    state = {
      range: copyRange(next),
      dragging: reason.type === 'preview',
    }
    updateRangeStatus(status, state.range)
    if (reason.type === 'preview') return
    accepted = copyRange(next)
    host?.update(options())
  }

  const options = (): ChartHostOptions<AaplRow, Date, number> => ({
    definition: brushRangeDefinition(accepted, handleBrushChange),
    width: currentInput.width,
    height: currentInput.height,
    ariaLabel: 'Time series with a draggable horizontal range brush',
  })

  host = mountChart(chartFrame, options())
  updateRangeStatus(status, state.range)

  const driver = createDriver(
    shell,
    chartFrame,
    () => host!.getScene(),
    () => state,
  )

  return {
    driver,
    update(nextInput) {
      currentInput = nextInput
      sizeShell(shell, chartFrame, nextInput)
      host!.update(options())
      updateRangeStatus(status, state.range)
    },
    destroy() {
      host!.destroy()
      shell.remove()
    },
  }
}

function createDriver(
  shell: HTMLElement,
  surface: HTMLElement,
  getScene: () => ChartScene<AaplRow, Date, number>,
  getState: () => BrushState,
): ConformanceTestDriver {
  return {
    resolveTarget(target) {
      return resolveTarget(surface, getScene(), target)
    },
    readState() {
      return interactionState(getState())
    },
    geometry(query) {
      return brushGeometry(surface, getScene(), getState().range, query)
    },
    viewBounds(view) {
      if (view && view !== 'main') return null
      const bounds = shell.getBoundingClientRect()
      return {
        x: bounds.left,
        y: bounds.top,
        width: bounds.width,
        height: bounds.height,
      }
    },
  }
}

function resolveTarget(
  surface: HTMLElement,
  scene: ChartScene<AaplRow, Date, number>,
  target: ConformanceTarget,
) {
  if (target.view !== undefined && target.view !== 'main') return null
  if (target.anchor === 'handle:start' || target.anchor === 'handle:end') {
    const handle = surface.querySelector<SVGRectElement>(
      `[data-chart-brush-handle="${target.anchor === 'handle:start' ? 'start' : 'end'}"]`,
    )
    return handle ? center(handle) : null
  }
  const date = brushDateFromAnchor(brushDates, target.anchor)
  const row = date
    ? brushRows.find((datum) => datum.Date.getTime() === date.getTime())
    : null
  return date && row
    ? scenePointToClient(
        surface,
        scene,
        scene.scales.x.map(date),
        scene.scales.y.map(row.Close),
      )
    : null
}

function interactionState(state: BrushState): ConformanceJsonObject {
  const summary = brushRangeSummary(brushRows, state.range)
  return {
    selection: {
      start: brushDateKey(state.range.start),
      end: brushDateKey(state.range.end),
      pointCount: summary.count,
      closeAverage: summary.average,
      closeChange: summary.change,
      dragging: state.dragging,
    },
  }
}

function brushGeometry(
  surface: HTMLElement,
  scene: ChartScene<AaplRow, Date, number>,
  range: BrushRange<Date>,
  query: ConformanceGeometryQuery,
): readonly ConformanceGeometrySample[] {
  if (query.view !== undefined && query.view !== 'main') return []
  const svg = surface.querySelector<SVGSVGElement>('svg.ts-chart')
  if (!svg) return []
  const bounds = svg.getBoundingClientRect()
  const scaleX = bounds.width / scene.width
  const scaleY = bounds.height / scene.height
  const points = brushRows.map(
    (row) =>
      [scene.scales.x.map(row.Date), scene.scales.y.map(row.Close)] as const,
  )

  if (query.role === 'dot') {
    return points.map(([x, y]) => ({
      x: bounds.left + (x - 3.5) * scaleX,
      y: bounds.top + (y - 3.5) * scaleY,
      width: 7 * scaleX,
      height: 7 * scaleY,
      paint: color,
    }))
  }
  if (query.role === 'line') {
    const sample = clientPointBounds(points, bounds, {
      scaleX,
      scaleY,
      paint: color,
    })
    return sample ? [sample] : []
  }
  if (query.role !== 'rect') return []
  const band = surface.querySelector<SVGRectElement>(
    '[data-chart-brush-selection]',
  )
  if (band) {
    const bandBounds = band.getBoundingClientRect()
    return [
      {
        x: bandBounds.x,
        y: bandBounds.y,
        width: bandBounds.width,
        height: bandBounds.height,
        paint:
          normalizedElementFill(band) ?? 'invalid-tanstack-rendered-brush-fill',
      },
    ]
  }
  const start = scene.scales.x.map(range.start)
  const end = scene.scales.x.map(range.end)
  return [
    {
      x: bounds.left + Math.min(start, end) * scaleX,
      y: bounds.top + scene.chart.y * scaleY,
      width: Math.max(1, Math.abs(end - start) * scaleX),
      height: scene.chart.height * scaleY,
      paint: 'missing-tanstack-rendered-brush-fill',
    },
  ]
}

function createRangeStatus(document: Document) {
  const status = document.createElement('output')
  status.setAttribute('role', 'status')
  status.setAttribute('aria-live', 'polite')
  Object.assign(status.style, {
    position: 'absolute',
    right: '24px',
    top: '10px',
    zIndex: '4',
    padding: '4px 8px',
    border: '1px solid color-mix(in srgb, CanvasText 24%, transparent)',
    borderRadius: '999px',
    background: 'Canvas',
    color: 'CanvasText',
    font: '600 12px/1.2 system-ui, sans-serif',
    pointerEvents: 'none',
  })
  return status
}

function updateRangeStatus(status: HTMLOutputElement, range: BrushRange<Date>) {
  const summary = brushRangeSummary(brushRows, range)
  const label = `${brushShortDate(range.start)} → ${brushShortDate(range.end)} · ${summary.count} AAPL closes · avg $${summary.average.toFixed(1)}`
  status.value = label
  status.textContent = label
  status.setAttribute(
    'aria-label',
    `${brushDateKey(range.start)} through ${brushDateKey(range.end)}, ${summary.count} AAPL closing prices, average $${summary.average.toFixed(1)}`,
  )
}

function copyRange(range: BrushRange<Date>): BrushRange<Date> {
  return {
    start: new Date(range.start.getTime()),
    end: new Date(range.end.getTime()),
  }
}

function center(element: HTMLElement | SVGElement) {
  const bounds = element.getBoundingClientRect()
  return {
    x: bounds.left + bounds.width / 2,
    y: bounds.top + bounds.height / 2,
    focusElement: element,
  }
}

function sizeShell(
  shell: HTMLDivElement,
  chartFrame: HTMLDivElement,
  input: ConformanceInput,
) {
  shell.style.width = `${input.width}px`
  shell.style.height = `${input.height}px`
  chartFrame.style.width = `${input.width}px`
  chartFrame.style.height = `${input.height}px`
}
