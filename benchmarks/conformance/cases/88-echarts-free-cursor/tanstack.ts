import { defineChart, dot, lineY, mountChart } from '@tanstack/charts'
import { focusDisabled } from '@tanstack/charts/focus/disabled'
import { cars } from '@charts-poc/demo-data/cars'
import { scaleLinear } from 'd3-scale'
import {
  freeCursorFractionFromAnchor,
  freeCursorRows,
  freeCursorXDomain,
  freeCursorYDomain,
} from './model'
import { createFreeCursorControls, updateFreeCursorControls } from './controls'
import type {
  ChartRenderContext,
  ChartScene,
  ChartHostOptions,
} from '@tanstack/charts'
import type { CompleteCar } from './model'
import type { FreeCursorControls } from './controls'
import type {
  ConformanceGeometryQuery,
  ConformanceGeometrySample,
  ConformanceHandle,
  ConformanceInput,
  ConformanceJsonObject,
  ConformanceTarget,
  ConformanceTestDriver,
} from '../../types'

interface CursorState {
  visible: boolean
  xNormalized: number | null
  yNormalized: number | null
  xValue: number | null
  yValue: number | null
  pinned: boolean
}

interface CursorElements {
  overlay: SVGSVGElement
  xLine: SVGLineElement
  yLine: SVGLineElement
  marker: SVGCircleElement
  xBadge: HTMLDivElement
  yBadge: HTMLDivElement
}

const configuredXScale = scaleLinear().domain(freeCursorXDomain)
const configuredYScale = scaleLinear().domain(freeCursorYDomain)

const definition = (input: ConformanceInput) => {
  const rows = freeCursorRows(cars)
  return defineChart({
    marks: [
      lineY(rows, {
        x: 'power (hp)',
        y: 'economy (mpg)',
        stroke: '#0f766e',
        strokeWidth: 2,
      }),
      dot(rows, {
        x: 'power (hp)',
        y: 'economy (mpg)',
        fill: '#0f766e',
        r: 3.5,
        stroke: '#ffffff',
        strokeWidth: 1,
      }),
    ],
    x: { scale: configuredXScale, axis: { label: 'Horsepower' } },
    y: {
      scale: configuredYScale,
      grid: true,
      axis: { ticks: { count: 7 }, label: 'Fuel economy (mpg)' },
    },
    margin: {
      top: 22,
      right: 24,
      bottom: 44,
      left: 58,
    },
  })
}

export function mount(
  container: HTMLElement,
  input: ConformanceInput,
): ConformanceHandle {
  let currentInput = input
  let scene: ChartScene<CompleteCar> | null = null
  let elements: CursorElements | null = null
  let renderCount = 0
  const state: CursorState = {
    visible: false,
    xNormalized: null,
    yNormalized: null,
    xValue: null,
    yValue: null,
    pinned: false,
  }
  const shell = container.ownerDocument.createElement('div')
  shell.style.display = 'grid'
  shell.style.gridTemplateRows = '68px minmax(0, 1fr)'
  const surface = container.ownerDocument.createElement('div')
  surface.dataset.conformanceView = 'main'
  surface.style.position = 'relative'
  setSurfaceSize(surface, input)
  let controls: FreeCursorControls

  const updateInteraction = () => {
    paintCursor()
    updateFreeCursorControls(controls, {
      visible: state.visible,
      x: state.xValue,
      y: state.yValue,
      pinned: state.pinned,
    })
  }

  controls = createFreeCursorControls(
    container.ownerDocument,
    (xValue, yValue) => {
      state.visible = true
      state.xNormalized =
        (xValue - freeCursorXDomain[0]) /
        (freeCursorXDomain[1] - freeCursorXDomain[0])
      state.yNormalized =
        1 -
        (yValue - freeCursorYDomain[0]) /
          (freeCursorYDomain[1] - freeCursorYDomain[0])
      state.xValue = xValue
      state.yValue = yValue
      state.pinned = true
      updateInteraction()
    },
    {
      xDomain: freeCursorXDomain,
      yDomain: freeCursorYDomain,
      xLabel: 'Horsepower',
      yLabel: 'Fuel economy',
      xStep: 0.1,
      yStep: 0.1,
    },
  )
  shell.append(controls.root, surface)
  container.append(shell)
  sizeShell(shell, input)

  const paintCursor = () => {
    if (!scene || !elements) return
    elements.overlay.setAttribute(
      'viewBox',
      `0 0 ${scene.width} ${scene.height}`,
    )
    if (
      !state.visible ||
      state.xNormalized === null ||
      state.yNormalized === null
    ) {
      elements.xLine.setAttribute('visibility', 'hidden')
      elements.yLine.setAttribute('visibility', 'hidden')
      elements.marker.setAttribute('visibility', 'hidden')
      elements.xBadge.hidden = true
      elements.yBadge.hidden = true
      return
    }
    const x = scene.chart.x + scene.chart.width * state.xNormalized
    const y = scene.chart.y + scene.chart.height * state.yNormalized
    elements.xLine.setAttribute('x1', String(x))
    elements.xLine.setAttribute('x2', String(x))
    elements.xLine.setAttribute('y1', String(scene.chart.y))
    elements.xLine.setAttribute(
      'y2',
      String(scene.chart.y + scene.chart.height),
    )
    elements.yLine.setAttribute('x1', String(scene.chart.x))
    elements.yLine.setAttribute('x2', String(scene.chart.x + scene.chart.width))
    elements.yLine.setAttribute('y1', String(y))
    elements.yLine.setAttribute('y2', String(y))
    elements.xLine.setAttribute('visibility', 'visible')
    elements.yLine.setAttribute('visibility', 'visible')
    elements.marker.setAttribute('cx', String(x))
    elements.marker.setAttribute('cy', String(y))
    elements.marker.setAttribute('visibility', 'visible')
    elements.xBadge.textContent = formatCursorValue('HP', state.xValue)
    elements.yBadge.textContent = formatCursorValue('MPG', state.yValue)
    elements.xBadge.style.left = `${(x / scene.width) * 100}%`
    elements.xBadge.style.top = `${((scene.chart.y + scene.chart.height + 4) / scene.height) * 100}%`
    elements.yBadge.style.left = `${Math.max(2, scene.chart.x - 48)}px`
    elements.yBadge.style.top = `${(y / scene.height) * 100}%`
    elements.xBadge.hidden = false
    elements.yBadge.hidden = false
  }

  const onRender = (context: ChartRenderContext<CompleteCar>) => {
    renderCount += 1
    scene = context.scene
    paintCursor()
  }

  const options = (
    nextInput: ConformanceInput,
  ): ChartHostOptions<CompleteCar> => ({
    definition: defineChart(definition(nextInput), {
      animate: false,
      keyboard: false,
      focus: focusDisabled,
    }),
    width: nextInput.width,
    height: freeCursorChartHeight(nextInput.height),
    ariaLabel: 'Line chart with a free two-dimensional cursor',
    onRender,
  })

  const host = mountChart(surface, options(input))
  scene = host.getScene()
  elements = createCursorElements(surface)
  updateInteraction()

  const handlePointerMove = (event: PointerEvent) => {
    if (state.pinned) return
    if (!scene) return
    const svg = surface.querySelector<SVGSVGElement>('svg.ts-chart')
    if (!svg) return
    const bounds = svg.getBoundingClientRect()
    const sceneX = ((event.clientX - bounds.left) / bounds.width) * scene.width
    const sceneY = ((event.clientY - bounds.top) / bounds.height) * scene.height
    if (
      sceneX < scene.chart.x ||
      sceneX > scene.chart.x + scene.chart.width ||
      sceneY < scene.chart.y ||
      sceneY > scene.chart.y + scene.chart.height
    ) {
      clearCursor(state)
      updateInteraction()
      return
    }
    state.visible = true
    state.xNormalized = (sceneX - scene.chart.x) / scene.chart.width
    state.yNormalized = (sceneY - scene.chart.y) / scene.chart.height
    state.xValue = roundCursorValue(
      configuredXScale
        .copy()
        .range([scene.chart.x, scene.chart.x + scene.chart.width])
        .invert(sceneX),
    )
    state.yValue = roundCursorValue(
      configuredYScale
        .copy()
        .range([scene.chart.y + scene.chart.height, scene.chart.y])
        .invert(sceneY),
    )
    updateInteraction()
  }

  const handlePointerLeave = () => {
    if (state.pinned) return
    clearCursor(state)
    updateInteraction()
  }

  const handlePointerCancel = () => {
    if (state.pinned) return
    clearCursor(state)
    updateInteraction()
  }

  const handleClick = () => {
    if (!state.visible) return
    if (state.pinned) {
      clearCursor(state)
    } else {
      state.pinned = true
    }
    updateInteraction()
  }

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'Escape' || !state.visible) return
    event.preventDefault()
    clearCursor(state)
    updateInteraction()
  }

  surface.addEventListener('pointermove', handlePointerMove)
  surface.addEventListener('pointerdown', handlePointerMove)
  surface.addEventListener('mouseleave', handlePointerLeave)
  surface.addEventListener('pointercancel', handlePointerCancel)
  surface.addEventListener('click', handleClick)
  shell.addEventListener('keydown', handleKeyDown)

  const driver = createDriver(
    surface,
    () => currentInput,
    () => scene,
    state,
    controls,
    () => renderCount,
  )

  return {
    driver,
    update(nextInput) {
      currentInput = nextInput
      sizeShell(shell, nextInput)
      setSurfaceSize(surface, nextInput)
      host.update(options(nextInput))
      updateInteraction()
    },
    destroy() {
      surface.removeEventListener('pointermove', handlePointerMove)
      surface.removeEventListener('pointerdown', handlePointerMove)
      surface.removeEventListener('mouseleave', handlePointerLeave)
      surface.removeEventListener('pointercancel', handlePointerCancel)
      surface.removeEventListener('click', handleClick)
      shell.removeEventListener('keydown', handleKeyDown)
      host.destroy()
      shell.remove()
    },
  }
}

function createCursorElements(surface: HTMLDivElement): CursorElements {
  const document = surface.ownerDocument
  const overlay = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  overlay.dataset.conformanceOverlay = 'free-cursor'
  overlay.setAttribute('aria-hidden', 'true')
  Object.assign(overlay.style, {
    position: 'absolute',
    inset: '0',
    width: '100%',
    height: '100%',
    overflow: 'visible',
    pointerEvents: 'none',
  })
  const xLine = cursorLine(document, 'x')
  const yLine = cursorLine(document, 'y')
  const marker = document.createElementNS(
    'http://www.w3.org/2000/svg',
    'circle',
  )
  marker.dataset.conformanceCrosshair = 'marker'
  marker.setAttribute('r', '4')
  marker.setAttribute('fill', '#ffffff')
  marker.setAttribute('stroke', '#0f766e')
  marker.setAttribute('stroke-width', '2')
  marker.setAttribute('visibility', 'hidden')
  const xBadge = cursorBadge(document, 'x')
  const yBadge = cursorBadge(document, 'y')
  overlay.append(xLine, yLine, marker)
  surface.append(overlay, xBadge, yBadge)
  return { overlay, xLine, yLine, marker, xBadge, yBadge }
}

function cursorLine(document: Document, axis: 'x' | 'y') {
  const line = document.createElementNS('http://www.w3.org/2000/svg', 'line')
  line.dataset.conformanceCrosshair = axis
  line.setAttribute('stroke', '#64748b')
  line.setAttribute('stroke-width', '1')
  line.setAttribute('stroke-dasharray', '4 4')
  line.setAttribute('visibility', 'hidden')
  return line
}

function clearCursor(state: CursorState) {
  state.visible = false
  state.xNormalized = null
  state.yNormalized = null
  state.xValue = null
  state.yValue = null
  state.pinned = false
}

function createDriver(
  surface: HTMLDivElement,
  getInput: () => ConformanceInput,
  getScene: () => ChartScene<CompleteCar> | null,
  state: CursorState,
  controls: FreeCursorControls,
  getRenderCount: () => number,
): ConformanceTestDriver {
  return {
    resolveTarget(target) {
      return resolveTarget(surface, getScene(), controls, target)
    },
    readState() {
      return interactionState(state, getRenderCount())
    },
    geometry(query) {
      return geometry(surface, getScene(), getInput(), query)
    },
  }
}

function resolveTarget(
  surface: HTMLDivElement,
  scene: ChartScene<CompleteCar> | null,
  controls: FreeCursorControls,
  target: ConformanceTarget,
) {
  if (target.view !== undefined && target.view !== 'main') return null
  const control =
    target.anchor === 'control:x'
      ? controls.x
      : target.anchor === 'control:y'
        ? controls.y
        : null
  if (control) {
    const bounds = control.getBoundingClientRect()
    return {
      x: bounds.left + bounds.width / 2,
      y: bounds.top + bounds.height / 2,
      focusElement: control,
    }
  }
  const fraction = freeCursorFractionFromAnchor(target.anchor)
  if (!scene || !fraction) return null
  return scenePointToClient(
    surface,
    scene,
    scene.chart.x + scene.chart.width * fraction.x,
    scene.chart.y + scene.chart.height * fraction.y,
  )
}

function geometry(
  surface: HTMLDivElement,
  scene: ChartScene<CompleteCar> | null,
  input: ConformanceInput,
  query: ConformanceGeometryQuery,
): readonly ConformanceGeometrySample[] {
  if (query.view !== undefined && query.view !== 'main') return []
  const svg = surface.querySelector<SVGSVGElement>('svg.ts-chart')
  if (!scene || !svg) return []
  const svgBounds = svg.getBoundingClientRect()
  const scaleX = svgBounds.width / scene.width
  const scaleY = svgBounds.height / scene.height
  const rows = freeCursorRows(cars)

  if (query.role === 'dot') {
    return rows.map((datum) => ({
      x:
        svgBounds.left +
        scene.scales.x.map(datum['power (hp)']) * scaleX -
        3.5 * scaleX,
      y:
        svgBounds.top +
        scene.scales.y.map(datum['economy (mpg)']) * scaleY -
        3.5 * scaleY,
      width: 7 * scaleX,
      height: 7 * scaleY,
      paint: '#0f766e',
    }))
  }

  if (query.role === 'line') {
    const points = rows.map((datum): readonly [number, number] => [
      scene.scales.x.map(datum['power (hp)']),
      scene.scales.y.map(datum['economy (mpg)']),
    ])
    const sample = pointsBounds(points, svgBounds, scaleX, scaleY, '#0f766e')
    return sample ? [sample] : []
  }

  return []
}

function scenePointToClient(
  surface: HTMLDivElement,
  scene: ChartScene<CompleteCar>,
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

function interactionState(
  state: CursorState,
  renderCount: number,
): ConformanceJsonObject {
  return {
    cursor: {
      visible: state.visible,
      xNormalized: state.xNormalized,
      yNormalized: state.yNormalized,
      xValue: state.xValue,
      yValue: state.yValue,
      pinned: state.pinned,
      snapped: false,
      datum: null,
    },
    render: {
      count: renderCount,
    },
  }
}

function setSurfaceSize(surface: HTMLDivElement, input: ConformanceInput) {
  surface.style.width = `${input.width}px`
  surface.style.height = `${freeCursorChartHeight(input.height)}px`
}

function sizeShell(shell: HTMLDivElement, input: ConformanceInput) {
  shell.style.width = `${input.width}px`
  shell.style.height = `${input.height}px`
}

function freeCursorChartHeight(height: number) {
  return Math.max(180, height - 68)
}

function cursorBadge(document: Document, axis: 'x' | 'y') {
  const badge = document.createElement('div')
  badge.dataset.conformanceCursorBadge = axis
  badge.hidden = true
  Object.assign(badge.style, {
    position: 'absolute',
    zIndex: '2',
    padding: '2px 5px',
    borderRadius: '4px',
    background: 'CanvasText',
    color: 'Canvas',
    font: '600 10px/1.2 system-ui, sans-serif',
    pointerEvents: 'none',
    transform: axis === 'x' ? 'translateX(-50%)' : 'translateY(-50%)',
    whiteSpace: 'nowrap',
  })
  return badge
}

function formatCursorValue(axis: string, value: number | null) {
  return `${axis} ${
    value?.toLocaleString(undefined, { maximumFractionDigits: 1 }) ?? '—'
  }`
}

function roundCursorValue(value: number) {
  return Math.round(value * 10) / 10
}
