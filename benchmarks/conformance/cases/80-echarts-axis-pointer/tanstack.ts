import { defineChart, dot, lineY, mountChart } from '@tanstack/charts'
import { industries } from '@charts-poc/demo-data/industries'
import { focusX } from '@tanstack/charts/focus'
import { scaleLinear, scaleUtc } from 'd3-scale'
import { axisPointerColors } from './colors'
import { axisPointerData, axisPointerIndustries } from './selection'
import {
  axisPointerAnchorDate,
  axisPointerDateKey,
  axisPointerRowsAtDate,
  axisPointerTargetValue,
} from './model'
import type { AxisPointerDatum } from './selection'
import type {
  ChartPoint,
  ChartRenderContext,
  ChartScene,
  ChartHostOptions,
} from '@tanstack/charts'
import type {
  ConformanceGeometryQuery,
  ConformanceGeometrySample,
  ConformanceHandle,
  ConformanceInput,
  ConformanceJsonObject,
  ConformanceTarget,
  ConformanceTestDriver,
} from '../../types'

const definition = (input: ConformanceInput) => {
  const rows = axisPointerData(industries, input.revision)
  return defineChart({
    marks: [
      lineY(rows, {
        x: 'date',
        y: 'unemployed',
        color: 'industry',
        strokeWidth: 2,
      }),
      dot(rows, {
        x: 'date',
        y: 'unemployed',
        z: 'industry',
        color: 'industry',
        r: 3,
        stroke: '#ffffff',
        strokeWidth: 1,
      }),
    ],
    x: {
      scale: scaleUtc,
      format: (value) =>
        value.toLocaleDateString(undefined, {
          month: 'short',
          timeZone: 'UTC',
        }),
    },
    y: {
      scale: scaleLinear,
      ticks: 5,
      grid: true,
      label: 'Unemployed (thousands)',
    },
    color: {
      domain: axisPointerIndustries,
      range: axisPointerIndustries.map(
        (industry) => axisPointerColors[industry],
      ),
    },
    margin: {
      top: 20,
      right: 24,
      bottom: 45,
      left: 60,
    },
  })
}

interface InteractionState {
  date: string | null
  industries: readonly string[]
  values: readonly number[]
  visible: boolean
}

interface InteractionElements {
  overlay: SVGSVGElement
  crosshair: SVGLineElement
  tooltip: HTMLDivElement
}

export function mount(
  container: HTMLElement,
  input: ConformanceInput,
): ConformanceHandle {
  let currentInput = input
  let focusedPoints: readonly ChartPoint<AxisPointerDatum>[] = []
  let elements: InteractionElements | undefined
  let latestScene: ChartScene<AxisPointerDatum> | undefined
  const state: InteractionState = {
    date: null,
    industries: [],
    values: [],
    visible: false,
  }
  const surface = container.ownerDocument.createElement('div')
  surface.dataset.conformanceView = 'main'
  surface.style.position = 'relative'
  setSurfaceSize(surface, input)
  container.append(surface)

  const onFocusGroupChange = (
    points: readonly ChartPoint<AxisPointerDatum>[],
  ) => {
    focusedPoints = points
    updateInteractionState(state, points)
    if (latestScene && elements) {
      paintInteraction(elements, latestScene, points)
    }
  }

  const onRender = (context: ChartRenderContext<AxisPointerDatum>) => {
    latestScene = context.scene
    if (elements) {
      paintInteraction(elements, context.scene, focusedPoints)
    }
  }

  const chartOptions = (
    nextInput: ConformanceInput,
  ): ChartHostOptions<AxisPointerDatum> => ({
    definition: defineChart(definition(nextInput), {
      animate: false,
      keyboard: true,
      focus: focusX,
      maxFocusDistance: Number.POSITIVE_INFINITY,
    }),
    width: nextInput.width,
    height: nextInput.height,
    ariaLabel: 'Snapped axis pointer with grouped tooltip',
    ariaDescription:
      'Move across the chart or use the arrow keys to compare all three industries at the nearest month.',
    onFocusGroupChange,
    onRender,
  })

  const host = mountChart(surface, chartOptions(input))
  elements = createInteractionElements(surface)
  latestScene = host.getScene()
  paintInteraction(elements, latestScene, focusedPoints)

  const driver = createDriver(
    surface,
    () => currentInput,
    () => host.getScene(),
    state,
  )

  return {
    driver,
    update(nextInput) {
      currentInput = nextInput
      setSurfaceSize(surface, nextInput)
      host.update(chartOptions(nextInput))
    },
    destroy() {
      host.destroy()
      surface.remove()
    },
  }
}

function createInteractionElements(
  surface: HTMLDivElement,
): InteractionElements {
  const document = surface.ownerDocument
  const overlay = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  overlay.setAttribute('aria-hidden', 'true')
  overlay.dataset.conformanceOverlay = 'crosshair'
  Object.assign(overlay.style, {
    position: 'absolute',
    inset: '0',
    width: '100%',
    height: '100%',
    overflow: 'visible',
    pointerEvents: 'none',
  })
  const crosshair = document.createElementNS(
    'http://www.w3.org/2000/svg',
    'line',
  )
  crosshair.dataset.conformanceCrosshair = 'x'
  crosshair.setAttribute('stroke', '#64748b')
  crosshair.setAttribute('stroke-width', '1')
  crosshair.setAttribute('stroke-dasharray', '4 4')
  crosshair.setAttribute('visibility', 'hidden')
  overlay.append(crosshair)

  const tooltip = document.createElement('div')
  tooltip.dataset.conformanceTooltip = 'grouped'
  tooltip.setAttribute('role', 'status')
  tooltip.setAttribute('aria-live', 'polite')
  Object.assign(tooltip.style, {
    position: 'absolute',
    zIndex: '2',
    minWidth: '9rem',
    padding: '0.45rem 0.55rem',
    border: '1px solid color-mix(in srgb, CanvasText 18%, transparent)',
    borderRadius: '0.45rem',
    background: 'Canvas',
    color: 'CanvasText',
    boxShadow: '0 6px 24px rgb(0 0 0 / 0.14)',
    font: '500 0.75rem/1.3 system-ui, sans-serif',
    pointerEvents: 'none',
  })
  tooltip.hidden = true

  const legend = document.createElement('div')
  legend.setAttribute('aria-label', 'Industries')
  Object.assign(legend.style, {
    position: 'absolute',
    top: '2px',
    right: '24px',
    zIndex: '1',
    display: 'flex',
    gap: '10px',
    color: 'CanvasText',
    font: '600 10px/1.4 system-ui, sans-serif',
    pointerEvents: 'none',
  })
  for (const industry of axisPointerIndustries) {
    const item = document.createElement('span')
    Object.assign(item.style, {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
    })
    const swatch = document.createElement('span')
    Object.assign(swatch.style, {
      width: '7px',
      height: '7px',
      borderRadius: '2px',
      background: axisPointerColors[industry],
    })
    item.append(swatch, industry)
    legend.append(item)
  }

  const instructions = document.createElement('div')
  instructions.textContent = 'Hover or use ← → to compare months'
  Object.assign(instructions.style, {
    position: 'absolute',
    right: '24px',
    bottom: '2px',
    zIndex: '1',
    color: 'CanvasText',
    opacity: '0.72',
    font: '500 10px/1.4 system-ui, sans-serif',
    pointerEvents: 'none',
  })
  surface.append(legend, instructions, overlay, tooltip)
  return { overlay, crosshair, tooltip }
}

function paintInteraction(
  elements: InteractionElements,
  scene: ChartScene<AxisPointerDatum>,
  points: readonly ChartPoint<AxisPointerDatum>[],
) {
  elements.overlay.setAttribute('viewBox', `0 0 ${scene.width} ${scene.height}`)
  const point = points[0]
  if (!point) {
    elements.crosshair.setAttribute('visibility', 'hidden')
    elements.tooltip.hidden = true
    elements.tooltip.replaceChildren()
    return
  }

  elements.crosshair.setAttribute('x1', String(point.x))
  elements.crosshair.setAttribute('x2', String(point.x))
  elements.crosshair.setAttribute('y1', String(scene.chart.y))
  elements.crosshair.setAttribute(
    'y2',
    String(scene.chart.y + scene.chart.height),
  )
  elements.crosshair.setAttribute('visibility', 'visible')
  renderTooltip(elements.tooltip, points)
  elements.tooltip.hidden = false
  positionTooltip(elements.tooltip, scene, point.x)
}

function positionTooltip(
  tooltip: HTMLDivElement,
  scene: ChartScene<AxisPointerDatum>,
  pointX: number,
) {
  const gap = 10
  const edge = 8
  const width = tooltip.offsetWidth || 160
  const preferredRight = pointX + gap
  const left =
    preferredRight + width <= scene.width - edge
      ? preferredRight
      : pointX - gap - width
  tooltip.style.left = `${Math.max(edge, Math.min(scene.width - width - edge, left))}px`
  tooltip.style.top = `${scene.chart.y + 8}px`
  tooltip.dataset.placement = left === preferredRight ? 'right' : 'left'
}

function renderTooltip(
  tooltip: HTMLDivElement,
  points: readonly ChartPoint<AxisPointerDatum>[],
) {
  const document = tooltip.ownerDocument
  const ordered = axisPointerIndustries.flatMap((industry) => {
    const point = points.find(
      (candidate) => candidate.datum.industry === industry,
    )
    return point ? [point] : []
  })
  const date = ordered[0]?.datum.date
  tooltip.replaceChildren()
  if (!date) return

  const title = document.createElement('strong')
  title.textContent = date.toLocaleDateString(undefined, {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
  tooltip.append(title)

  for (const point of ordered) {
    const row = document.createElement('div')
    Object.assign(row.style, {
      display: 'flex',
      alignItems: 'center',
      gap: '0.375rem',
      marginTop: '0.25rem',
    })
    const swatch = document.createElement('span')
    Object.assign(swatch.style, {
      width: '0.5rem',
      height: '0.5rem',
      borderRadius: '0.125rem',
      background: axisPointerColors[point.datum.industry],
    })
    const label = document.createElement('span')
    label.textContent = point.datum.industry
    const value = document.createElement('strong')
    value.style.marginLeft = 'auto'
    value.textContent = point.datum.unemployed.toLocaleString()
    row.append(swatch, label, value)
    tooltip.append(row)
  }
}

function updateInteractionState(
  state: InteractionState,
  points: readonly ChartPoint<AxisPointerDatum>[],
) {
  const ordered = axisPointerIndustries.flatMap((industry) => {
    const point = points.find(
      (candidate) => candidate.datum.industry === industry,
    )
    return point ? [point] : []
  })
  const date = ordered[0]?.datum.date
  state.date = date ? axisPointerDateKey(date) : null
  state.industries = ordered.map((point) => point.datum.industry)
  state.values = ordered.map((point) => point.datum.unemployed)
  state.visible = ordered.length > 0
}

function createDriver(
  surface: HTMLDivElement,
  getInput: () => ConformanceInput,
  getScene: () => ChartScene<AxisPointerDatum>,
  state: InteractionState,
): ConformanceTestDriver {
  return {
    resolveTarget(target) {
      return resolveTarget(surface, getInput(), getScene(), target)
    },
    readState() {
      return interactionState(state)
    },
    geometry(query) {
      return geometry(surface, getInput(), getScene(), query)
    },
  }
}

function resolveTarget(
  surface: HTMLDivElement,
  input: ConformanceInput,
  scene: ChartScene<AxisPointerDatum>,
  target: ConformanceTarget,
) {
  if (target.view && target.view !== 'main') return null
  const rows = axisPointerData(industries, input.revision)
  const date = axisPointerAnchorDate(target.anchor, rows)
  if (!date) return null
  const focusedRows = axisPointerRowsAtDate(rows, date)
  const targetValue = axisPointerTargetValue(focusedRows)
  if (targetValue === null) return null
  return scenePointToClient(
    surface,
    scene,
    scene.scales.x.map(date),
    scene.scales.y.map(targetValue),
  )
}

function geometry(
  surface: HTMLDivElement,
  input: ConformanceInput,
  scene: ChartScene<AxisPointerDatum>,
  query: ConformanceGeometryQuery,
): readonly ConformanceGeometrySample[] {
  if (query.view && query.view !== 'main') return []
  const svg = surface.querySelector<SVGSVGElement>('svg.ts-chart')
  if (!svg) return []
  const svgBounds = svg.getBoundingClientRect()
  const scaleX = svgBounds.width / scene.width
  const scaleY = svgBounds.height / scene.height
  const rows = axisPointerData(industries, input.revision)

  if (query.role === 'dot') {
    return rows.map((row) => ({
      x: svgBounds.left + scene.scales.x.map(row.date) * scaleX - 3 * scaleX,
      y:
        svgBounds.top +
        scene.scales.y.map(row.unemployed) * scaleY -
        3 * scaleY,
      width: 6 * scaleX,
      height: 6 * scaleY,
      paint: axisPointerColors[row.industry],
    }))
  }

  if (query.role === 'line') {
    return axisPointerIndustries.flatMap((industry) => {
      const points = rows
        .filter((row) => row.industry === industry)
        .map((row): readonly [number, number] => [
          scene.scales.x.map(row.date),
          scene.scales.y.map(row.unemployed),
        ])
      const sample = pointsBounds(
        points,
        svgBounds,
        scaleX,
        scaleY,
        axisPointerColors[industry],
      )
      return sample ? [sample] : []
    })
  }

  return []
}

function scenePointToClient(
  surface: HTMLDivElement,
  scene: ChartScene<AxisPointerDatum>,
  x: number,
  y: number,
) {
  const svg = surface.querySelector<SVGSVGElement>('svg.ts-chart')
  if (!svg) return null
  const bounds = svg.getBoundingClientRect()
  return {
    x: bounds.left + (x / scene.width) * bounds.width,
    y: bounds.top + (y / scene.height) * bounds.height,
    focusElement: svg,
  }
}

function pointsBounds(
  points: readonly (readonly [number, number])[],
  svgBounds: DOMRect,
  scaleX: number,
  scaleY: number,
  paint: string,
): ConformanceGeometrySample | null {
  if (!points.length) return null
  const xs = points.map((point) => point[0])
  const ys = points.map((point) => point[1])
  const left = Math.min(...xs)
  const right = Math.max(...xs)
  const top = Math.min(...ys)
  const bottom = Math.max(...ys)
  return {
    x: svgBounds.left + left * scaleX,
    y: svgBounds.top + top * scaleY,
    width: Math.max(1, (right - left) * scaleX),
    height: Math.max(1, (bottom - top) * scaleY),
    paint,
  }
}

function interactionState(state: InteractionState): ConformanceJsonObject {
  return {
    focus: {
      date: state.date,
      industries: state.industries,
      values: state.values,
    },
    crosshair: {
      visible: state.visible,
    },
    tooltip: {
      visible: state.visible,
    },
  }
}

function setSurfaceSize(surface: HTMLDivElement, input: ConformanceInput) {
  surface.style.width = `${input.width}px`
  surface.style.height = `${input.height}px`
}
