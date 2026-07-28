import { defineChart, dot, lineY, mountChart } from '@tanstack/charts'
import { focusDisabled } from '@tanstack/charts/focus/disabled'
import { scaleLinear } from 'd3-scale'
import {
  freeCursorData,
  freeCursorFractionFromAnchor,
  freeCursorXDomain,
  freeCursorYDomain,
} from './data'
import type {
  ChartRenderContext,
  ChartScene,
  DynamicChartHostOptions,
} from '@tanstack/charts'
import type { FreeCursorDatum } from './data'
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
}

interface CursorElements {
  overlay: SVGSVGElement
  xLine: SVGLineElement
  yLine: SVGLineElement
}

const definition = defineChart<ConformanceInput>()(({ input }) => {
  const rows = freeCursorData(input.revision)
  return {
    marks: [
      lineY(rows, {
        id: 'free-cursor-line',
        x: 'x',
        y: 'y',
        key: 'id',
        stroke: '#0f766e',
        strokeWidth: 2,
      }),
      dot(rows, {
        id: 'free-cursor-dots',
        x: 'x',
        y: 'y',
        key: 'id',
        fill: '#0f766e',
        r: 3.5,
        stroke: '#ffffff',
        strokeWidth: 1,
      }),
    ],
    x: {
      scale: scaleLinear().domain(freeCursorXDomain),
      label: 'X',
    },
    y: {
      scale: scaleLinear().domain(freeCursorYDomain),
      grid: true,
      label: 'Y',
    },
    margin: {
      top: 22,
      right: 24,
      bottom: 44,
      left: 58,
    },
  }
})

export function mount(
  container: HTMLElement,
  input: ConformanceInput,
): ConformanceHandle {
  let currentInput = input
  let scene: ChartScene<FreeCursorDatum> | null = null
  let elements: CursorElements | null = null
  let renderCount = 0
  const state: CursorState = {
    visible: false,
    xNormalized: null,
    yNormalized: null,
  }
  const surface = container.ownerDocument.createElement('div')
  surface.dataset.conformanceView = 'main'
  surface.style.position = 'relative'
  setSurfaceSize(surface, input)
  container.append(surface)

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
  }

  const onRender = (context: ChartRenderContext<FreeCursorDatum>) => {
    renderCount += 1
    scene = context.scene
    paintCursor()
  }

  const options = (
    nextInput: ConformanceInput,
  ): DynamicChartHostOptions<FreeCursorDatum, ConformanceInput> => ({
    definition,
    input: nextInput,
    width: nextInput.width,
    height: nextInput.height,
    ariaLabel: 'Line chart with a free two-dimensional cursor',
    animate: false,
    keyboard: false,
    focus: focusDisabled,
    onRender,
  })

  const host = mountChart(surface, options(input))
  scene = host.getScene()
  elements = createCursorElements(surface)
  paintCursor()

  const handlePointerMove = (event: PointerEvent) => {
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
      paintCursor()
      return
    }
    state.visible = true
    state.xNormalized = (sceneX - scene.chart.x) / scene.chart.width
    state.yNormalized = (sceneY - scene.chart.y) / scene.chart.height
    paintCursor()
  }

  const handlePointerLeave = () => {
    clearCursor(state)
    paintCursor()
  }

  surface.addEventListener('pointermove', handlePointerMove)
  surface.addEventListener('mouseleave', handlePointerLeave)

  const driver = createDriver(
    surface,
    () => currentInput,
    () => scene,
    state,
    () => renderCount,
  )

  return {
    driver,
    update(nextInput) {
      currentInput = nextInput
      setSurfaceSize(surface, nextInput)
      host.update(options(nextInput))
      paintCursor()
    },
    destroy() {
      surface.removeEventListener('pointermove', handlePointerMove)
      surface.removeEventListener('mouseleave', handlePointerLeave)
      host.destroy()
      surface.remove()
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
  overlay.append(xLine, yLine)
  surface.append(overlay)
  return { overlay, xLine, yLine }
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
}

function createDriver(
  surface: HTMLDivElement,
  getInput: () => ConformanceInput,
  getScene: () => ChartScene<FreeCursorDatum> | null,
  state: CursorState,
  getRenderCount: () => number,
): ConformanceTestDriver {
  return {
    resolveTarget(target) {
      return resolveTarget(surface, getScene(), target)
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
  scene: ChartScene<FreeCursorDatum> | null,
  target: ConformanceTarget,
) {
  if (target.view !== undefined && target.view !== 'main') return null
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
  scene: ChartScene<FreeCursorDatum> | null,
  input: ConformanceInput,
  query: ConformanceGeometryQuery,
): readonly ConformanceGeometrySample[] {
  if (query.view !== undefined && query.view !== 'main') return []
  const svg = surface.querySelector<SVGSVGElement>('svg.ts-chart')
  if (!scene || !svg) return []
  const svgBounds = svg.getBoundingClientRect()
  const scaleX = svgBounds.width / scene.width
  const scaleY = svgBounds.height / scene.height
  const rows = freeCursorData(input.revision)

  if (query.role === 'dot') {
    return rows.map((datum) => ({
      x: svgBounds.left + scene.scales.x.map(datum.x) * scaleX - 3.5 * scaleX,
      y: svgBounds.top + scene.scales.y.map(datum.y) * scaleY - 3.5 * scaleY,
      width: 7 * scaleX,
      height: 7 * scaleY,
      paint: '#0f766e',
    }))
  }

  if (query.role === 'line') {
    const points = rows.map((datum): readonly [number, number] => [
      scene.scales.x.map(datum.x),
      scene.scales.y.map(datum.y),
    ])
    const sample = pointsBounds(points, svgBounds, scaleX, scaleY, '#0f766e')
    return sample ? [sample] : []
  }

  return []
}

function scenePointToClient(
  surface: HTMLDivElement,
  scene: ChartScene<FreeCursorDatum>,
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
  surface.style.height = `${input.height}px`
}
