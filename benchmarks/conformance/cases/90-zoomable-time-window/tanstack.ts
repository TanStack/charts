import { aapl } from '@charts-poc/demo-data/aapl'
import { defineChart, dot, lineY, mountChart } from '@tanstack/charts'
import { zoomX } from '@tanstack/charts/interaction/zoom'
import { controlledSignal } from '@tanstack/charts/interaction/signal'
import { decorative } from '@tanstack/charts/mark/decorative'
import { scaleLinear, scaleUtc } from 'd3-scale'
import {
  clientPointBounds,
  scenePointToClient,
} from '../../shared/driver-geometry'
import { tanstackCase } from '../../shared/mount'
import {
  initialZoomWindow,
  selectZoomRows,
  visibleZoomData,
  zoomDateFromAnchor,
  zoomDateKey,
  zoomFullDomain,
  zoomSpanDays,
} from './model'
import type { AaplRow } from '@charts-poc/demo-data/aapl'
import type {
  ZoomXAction,
  ZoomXChange,
  ZoomXWindow,
} from '@tanstack/charts/interaction/zoom'
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

interface ZoomState {
  window: ZoomXWindow<Date>
  lastAction: 'none' | ZoomXAction
  active: boolean
  wheelCaptured: boolean
}

const color = '#0f766e'
const zoomRows = selectZoomRows(aapl)
const zoomDateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
})

export function zoomTimeWindowDefinition(
  window: ZoomXWindow<Date>,
  onChange: (window: ZoomXWindow<Date>, reason: ZoomXChange<Date>) => void,
  onActiveChange?: (active: boolean) => void,
) {
  const rows = visibleZoomData(zoomRows, window)
  return defineChart({
    marks: [
      decorative(
        lineY(rows, {
          id: 'zoom-series-line',
          x: 'Date',
          y: 'Close',
          stroke: color,
          strokeWidth: 2.5,
        }),
      ),
      dot(rows, {
        id: 'zoom-series-points',
        x: 'Date',
        y: 'Close',
        fill: color,
        r: 3.5,
        stroke: '#ffffff',
        strokeWidth: 1,
      }),
    ],
    x: {
      scale: scaleUtc().domain([window.start, window.end]),
      axis: {
        ticks: { format: (value) => zoomDateFormatter.format(value) },
        label: 'Date',
      },
    },
    y: {
      scale: scaleLinear,
      grid: true,
      axis: { ticks: { count: 4 }, label: 'AAPL close ($)' },
    },
    controls: [
      zoomX({
        id: 'time-window',
        window: controlledSignal<ZoomXWindow<Date>, ZoomXChange<Date>>(
          window,
          (next, { reason }) => onChange(next, reason),
        ),
        extent: zoomFullDomain,
        scaleExtent: [1, 8],
        ariaLabel:
          'Zoomable time window. Focus the chart before wheel zoom; drag or use a horizontal wheel to pan; use plus, minus, arrow keys, or Home.',
        ariaDescription:
          'Wheel zoom; drag or horizontal wheel pan; plus and minus zoom; arrows pan; Home resets.',
        format: zoomDateKey,
        onActiveChange,
      }),
    ],
    svgAnimation: false,
    keyboard: false,
    focusRing: false,
    margin: { top: 56, right: 24, bottom: 44, left: 58 },
  })
}

export const catalogCase = tanstackCase(
  () => zoomTimeWindowDefinition(copyWindow(initialZoomWindow), () => {}),
  'Time series with a wheel-zoomable and pannable time viewport',
)

export const mount: ConformanceMount = (container, input) => {
  let currentInput = input
  let accepted = copyWindow(initialZoomWindow)
  let state: ZoomState = {
    window: copyWindow(accepted),
    lastAction: 'none',
    active: false,
    wheelCaptured: false,
  }
  let host: ChartHost<AaplRow, Date, number> | undefined

  const document = container.ownerDocument
  const shell = document.createElement('div')
  const chartFrame = document.createElement('div')
  const status = createZoomStatus(document)
  const reset = createResetButton(document)
  shell.dataset.conformanceView = 'main'
  shell.style.position = 'relative'
  chartFrame.style.position = 'relative'
  shell.append(chartFrame, status, reset)
  container.append(shell)
  sizeShell(shell, chartFrame, input)

  const updateStatus = () => {
    const label = state.active
      ? `${zoomDateKey(state.window.start)} → ${zoomDateKey(state.window.end)} · ${formatSpan(zoomSpanDays(state.window))} days`
      : 'Focus chart to zoom'
    status.value = label
    status.textContent = label
  }

  const handleZoomChange = (
    next: ZoomXWindow<Date>,
    reason: ZoomXChange<Date>,
  ) => {
    accepted = copyWindow(next)
    state = {
      ...state,
      window: copyWindow(next),
      lastAction: reason.action,
      wheelCaptured: state.wheelCaptured || reason.source === 'wheel',
    }
    updateStatus()
    host?.update(options())
  }

  const handleActiveChange = (active: boolean) => {
    state = { ...state, active }
    updateStatus()
  }

  const options = (): ChartHostOptions<AaplRow, Date, number> => ({
    definition: zoomTimeWindowDefinition(
      accepted,
      handleZoomChange,
      handleActiveChange,
    ),
    width: currentInput.width,
    height: currentInput.height,
    ariaLabel: 'Time series with a wheel-zoomable and pannable time viewport',
  })

  host = mountChart(chartFrame, options())
  updateStatus()

  const applyReset = () => {
    accepted = copyWindow(initialZoomWindow)
    state = {
      ...state,
      window: copyWindow(accepted),
      lastAction: 'reset',
    }
    host!.update(options())
    updateStatus()
    chartFrame.querySelector<SVGElement>('[data-chart-zoom-surface]')?.focus()
  }
  const preserveChartFocus = (event: PointerEvent) => event.preventDefault()
  reset.addEventListener('pointerdown', preserveChartFocus)
  reset.addEventListener('click', applyReset)

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
      updateStatus()
    },
    destroy() {
      reset.removeEventListener('pointerdown', preserveChartFocus)
      reset.removeEventListener('click', applyReset)
      host!.destroy()
      shell.remove()
    },
  }
}

function createDriver(
  shell: HTMLElement,
  surface: HTMLElement,
  getScene: () => ChartScene<AaplRow, Date, number>,
  getState: () => ZoomState,
): ConformanceTestDriver {
  return {
    resolveTarget(target) {
      return resolveTarget(surface, getScene(), target)
    },
    readState() {
      return interactionState(getState())
    },
    geometry(query) {
      return zoomGeometry(surface, getScene(), getState().window, query)
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
  if (target.anchor === 'control:reset') {
    const reset = surface.parentElement?.querySelector<HTMLButtonElement>(
      '[data-conformance-zoom-reset]',
    )
    return reset ? center(reset) : null
  }
  const date = zoomDateFromAnchor(zoomRows, target.anchor)
  const row = date
    ? zoomRows.find((datum) => datum.Date.getTime() === date.getTime())
    : null
  if (!date || !row) return null
  const point = scenePointToClient(
    surface,
    scene,
    scene.scales.x.map(date),
    scene.scales.y.map(row.Close),
  )
  if (!point) return null
  return {
    ...point,
    focusElement:
      surface.querySelector<SVGElement>('[data-chart-zoom-surface]') ??
      point.focusElement,
  }
}

function interactionState(state: ZoomState): ConformanceJsonObject {
  const visibleRows = visibleZoomData(zoomRows, state.window)
  const jan9Row = visibleRows.find(
    (row) => zoomDateKey(row.Date) === '2018-01-09',
  )
  return {
    viewport: {
      start: zoomDateKey(state.window.start),
      end: zoomDateKey(state.window.end),
      spanDays: zoomSpanDays(state.window),
    },
    visible: {
      count: visibleRows.length,
      ids: visibleRows.map((row) => zoomDateKey(row.Date)),
      jan9Close: jan9Row?.Close ?? null,
    },
    interaction: {
      last: state.lastAction,
      active: state.active,
      wheelCaptured: state.wheelCaptured,
    },
  }
}

function zoomGeometry(
  surface: HTMLElement,
  scene: ChartScene<AaplRow, Date, number>,
  window: ZoomXWindow<Date>,
  query: ConformanceGeometryQuery,
): readonly ConformanceGeometrySample[] {
  if (query.view !== undefined && query.view !== 'main') return []
  const svg = surface.querySelector<SVGSVGElement>('svg.ts-chart')
  if (!svg) return []
  const bounds = svg.getBoundingClientRect()
  const scaleX = bounds.width / scene.width
  const scaleY = bounds.height / scene.height
  const points = visibleZoomData(zoomRows, window).map(
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
  if (query.role !== 'line') return []
  const sample = clientPointBounds(points, bounds, {
    scaleX,
    scaleY,
    paint: color,
  })
  return sample ? [sample] : []
}

function createZoomStatus(document: Document) {
  const status = document.createElement('output')
  status.dataset.conformanceZoomStatus = 'true'
  status.setAttribute('role', 'status')
  status.setAttribute('aria-live', 'polite')
  Object.assign(status.style, {
    position: 'absolute',
    top: '10px',
    right: '76px',
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

function createResetButton(document: Document) {
  const reset = document.createElement('button')
  reset.type = 'button'
  reset.dataset.conformanceZoomReset = 'true'
  reset.textContent = '↺'
  reset.title = 'Reset zoom'
  reset.setAttribute('aria-label', 'Reset zoom')
  Object.assign(reset.style, {
    position: 'absolute',
    top: '6px',
    right: '20px',
    zIndex: '4',
    width: '44px',
    height: '44px',
    border: '1px solid color-mix(in srgb, CanvasText 24%, transparent)',
    borderRadius: '10px',
    background: 'Canvas',
    color: 'CanvasText',
    cursor: 'pointer',
    font: '700 20px/1 system-ui, sans-serif',
  })
  return reset
}

function copyWindow(window: ZoomXWindow<Date>): ZoomXWindow<Date> {
  return {
    start: new Date(window.start.getTime()),
    end: new Date(window.end.getTime()),
  }
}

function formatSpan(days: number) {
  return Number.isInteger(days) ? String(days) : days.toFixed(1)
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
