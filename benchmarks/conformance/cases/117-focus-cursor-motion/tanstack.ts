import { defineChart, dot, lineY } from '@tanstack/charts'
import { focusX } from '@tanstack/charts/focus'
import { motion } from '@tanstack/charts/motion'
import { mountChartRenderer } from '@tanstack/charts/renderer'
import { createChartSpring } from '@tanstack/charts/spring'
import { scaleBand, scaleLinear } from 'd3-scale'
import { focusMotionPeriods, focusMotionRows, focusMotionSeries } from './model'
import type {
  ChartPoint,
  ChartRendererHost,
  ChartScene,
} from '@tanstack/charts'
import type { FocusMotionRow } from './model'
import type {
  ConformanceInput,
  ConformanceMount,
  ConformanceTestDriver,
} from '../../types'

const colors = ['#7c3aed', '#0891b2', '#ea580c']
const focusSpring = {
  type: 'spring' as const,
  stiffness: 240,
  damping: 22,
  mass: 0.72,
}
const renderer = motion<FocusMotionRow, string, number>({ initial: false })

export const mount: ConformanceMount = (container, input) => {
  let currentInput = input
  let scene: ChartScene<FocusMotionRow, string, number> | undefined
  let host: ChartRendererHost<FocusMotionRow, string, number> | undefined
  let focused: readonly ChartPoint<FocusMotionRow, string, number>[] = []
  const surface = container.ownerDocument.createElement('div')
  let overlay: CrosshairOverlay
  let cursor: ReturnType<typeof createSpringCrosshair> | undefined
  surface.dataset.conformanceView = 'main'
  surface.style.position = 'relative'
  surface.style.width = `${input.width}px`
  surface.style.height = `${input.height}px`
  container.append(surface)

  const options = () => ({
    definition: chartDefinition(),
    renderer,
    width: currentInput.width,
    height: currentInput.height,
    ariaLabel: 'Grouped line chart with animated focus and crosshair',
    ariaDescription:
      'Move across the chart or use the arrow keys. The nearest point, shared period, focused series, and remaining marks animate separately.',
    onFocusGroupChange(
      points: readonly ChartPoint<FocusMotionRow, string, number>[],
    ) {
      focused = points
      const primary = points[0]
      if (primary) cursor?.move(primary)
      else cursor?.clear()
      if (overlay) paintStatus(overlay.status, points)
    },
    onRender(context: { scene: ChartScene<FocusMotionRow, string, number> }) {
      scene = context.scene
      cursor?.repaint()
    },
  })

  host = mountChartRenderer(surface, options())
  scene = host.getScene()
  overlay = createCrosshairOverlay(surface)
  cursor = createSpringCrosshair(
    container.ownerDocument.defaultView,
    overlay,
    () => scene,
  )
  cursor.repaint()

  const driver: ConformanceTestDriver = {
    resolveTarget(target) {
      if (target.view && target.view !== 'main') return null
      const period = target.anchor.startsWith('period:')
        ? target.anchor.slice('period:'.length)
        : focusMotionPeriods[Number(target.anchor.split(':').at(-1))]
      const point = scene?.points.find(
        (candidate) =>
          candidate.datum.period === period &&
          candidate.datum.series === focusMotionSeries[0],
      )
      const svg = surface.querySelector<SVGSVGElement>('svg.ts-chart')
      if (!point || !scene || !svg) return null
      const bounds = svg.getBoundingClientRect()
      return {
        x: bounds.left + (point.x / scene.width) * bounds.width,
        y: bounds.top + (point.y / scene.height) * bounds.height,
        focusElement: svg,
      }
    },
    readState() {
      const primary = focused[0]
      const crosshairX = Number(overlay.xLine.getAttribute('x1'))
      const crosshairY = Number(overlay.marker.getAttribute('cy'))
      return {
        focused: primary?.datum.id ?? null,
        groupSize: focused.length,
        crosshairVisible: overlay.root.dataset.visible === 'true',
        crosshairX,
        crosshairY,
        crosshairXLabel: overlay.xLabel.text.textContent ?? '',
        crosshairYLabel: overlay.yLabel.text.textContent ?? '',
        crosshairFinite:
          Number.isFinite(crosshairX) && Number.isFinite(crosshairY),
        crosshairSettled:
          Boolean(primary) &&
          Math.abs(crosshairX - (primary?.x ?? 0)) < 0.1 &&
          Math.abs(crosshairY - (primary?.y ?? 0)) < 0.1,
        focusMotionState:
          surface
            .querySelector('svg.ts-chart')
            ?.getAttribute('data-ts-motion-state') ?? null,
      }
    },
  }

  return {
    driver,
    update(nextInput: ConformanceInput) {
      currentInput = nextInput
      surface.style.width = `${nextInput.width}px`
      surface.style.height = `${nextInput.height}px`
      host?.update(options())
      scene = host?.getScene()
      cursor.repaint()
    },
    destroy() {
      cursor?.destroy()
      host?.destroy()
      surface.remove()
    },
  }
}

function chartDefinition() {
  return defineChart({
    marks: [
      lineY(focusMotionRows, {
        id: 'series-lines',
        x: 'period',
        y: 'value',
        z: 'series',
        color: 'series',
        key: 'id',
        strokeWidth: 2.5,
        strokeOpacity: 0.68,
        states: [
          {
            when: { focus: 'unmatched' },
            style: { opacity: 0.12, strokeWidth: 1.5 },
            transition: focusSpring,
          },
          {
            when: { focus: 'series' },
            style: { opacity: 1, strokeOpacity: 1, strokeWidth: 4.5 },
            transition: focusSpring,
          },
        ],
      }),
      dot(focusMotionRows, {
        id: 'series-points',
        x: 'period',
        y: 'value',
        z: 'series',
        color: 'series',
        key: 'id',
        r: 4,
        stroke: 'Canvas',
        strokeWidth: 1.5,
        states: [
          {
            when: { focus: 'unmatched' },
            style: { opacity: 0.14, r: 2.5 },
            transition: focusSpring,
          },
          {
            when: { focus: 'group' },
            style: { opacity: 0.88, r: 5.5 },
            transition: focusSpring,
          },
          {
            when: { focus: 'primary' },
            style: { opacity: 1, r: 9, strokeWidth: 3 },
            transition: focusSpring,
          },
        ],
      }),
    ],
    x: {
      scale: scaleBand<string>().domain(focusMotionPeriods).padding(0.1),
    },
    y: { scale: scaleLinear().domain([20, 90]), grid: true },
    color: { domain: focusMotionSeries, range: colors },
    focus: focusX,
    maxFocusDistance: Number.POSITIVE_INFINITY,
    tooltip: false,
    keyboard: true,
    margin: { top: 24, right: 26, bottom: 38, left: 46 },
  })
}

interface CrosshairOverlay {
  root: SVGSVGElement
  xLine: SVGLineElement
  yLine: SVGLineElement
  marker: SVGCircleElement
  xLabel: CrosshairLabel
  yLabel: CrosshairLabel
  status: HTMLOutputElement
}

interface CrosshairLabel {
  root: SVGGElement
  text: SVGTextElement
}

function createCrosshairOverlay(surface: HTMLElement): CrosshairOverlay {
  const document = surface.ownerDocument
  const root = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  root.setAttribute('aria-hidden', 'true')
  root.dataset.focusCrosshair = ''
  root.dataset.visible = 'false'
  Object.assign(root.style, {
    position: 'absolute',
    inset: '0',
    width: '100%',
    height: '100%',
    overflow: 'visible',
    pointerEvents: 'none',
    opacity: '0',
    transition: 'opacity 120ms ease-out',
  })
  const xLine = crosshairLine(document)
  const yLine = crosshairLine(document)
  const marker = document.createElementNS(
    'http://www.w3.org/2000/svg',
    'circle',
  )
  marker.setAttribute('r', '5')
  marker.setAttribute('fill', 'Canvas')
  marker.setAttribute('stroke', 'CanvasText')
  marker.setAttribute('stroke-width', '1.5')
  const xLabel = createCrosshairLabel(document, 'x')
  const yLabel = createCrosshairLabel(document, 'y')
  root.append(xLine, yLine, marker, xLabel.root, yLabel.root)

  const status = document.createElement('output')
  status.setAttribute('aria-live', 'polite')
  status.textContent = 'Hover or use ← →'
  Object.assign(status.style, {
    position: 'absolute',
    top: '4px',
    left: '50%',
    zIndex: '2',
    width: '180px',
    marginLeft: '-90px',
    overflow: 'hidden',
    color: 'CanvasText',
    font: '600 10px/1.4 system-ui, sans-serif',
    textAlign: 'center',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    pointerEvents: 'none',
  })
  surface.append(root, status)
  return { root, xLine, yLine, marker, xLabel, yLabel, status }
}

function crosshairLine(document: Document) {
  const line = document.createElementNS('http://www.w3.org/2000/svg', 'line')
  line.setAttribute('stroke', 'CanvasText')
  line.setAttribute('stroke-opacity', '0.48')
  line.setAttribute('stroke-width', '1')
  line.setAttribute('stroke-dasharray', '4 4')
  return line
}

function createCrosshairLabel(
  document: Document,
  axis: 'x' | 'y',
): CrosshairLabel {
  const root = document.createElementNS('http://www.w3.org/2000/svg', 'g')
  root.dataset.conformanceCrosshairLabel = axis
  const background = document.createElementNS(
    'http://www.w3.org/2000/svg',
    'rect',
  )
  const width = axis === 'x' ? 42 : 36
  background.setAttribute('x', String(-width / 2))
  background.setAttribute('y', '-10')
  background.setAttribute('width', String(width))
  background.setAttribute('height', '20')
  background.setAttribute('rx', '4')
  background.setAttribute('fill', 'CanvasText')
  background.setAttribute('stroke', 'Canvas')
  background.setAttribute('stroke-width', '1')
  const text = document.createElementNS('http://www.w3.org/2000/svg', 'text')
  text.setAttribute('fill', 'Canvas')
  text.setAttribute('text-anchor', 'middle')
  text.setAttribute('dominant-baseline', 'middle')
  text.setAttribute('font-family', 'system-ui, sans-serif')
  text.setAttribute('font-size', '10')
  text.setAttribute('font-weight', '700')
  root.append(background, text)
  return { root, text }
}

function createSpringCrosshair(
  view: Window | null,
  overlay: CrosshairOverlay,
  scene: () => ChartScene<FocusMotionRow, string, number> | undefined,
) {
  const spring = createChartSpring({
    stiffness: 320,
    damping: 28,
    mass: 0.72,
    restDelta: 0.02,
    restSpeed: 0.02,
  })
  let value: { x: number; y: number } | undefined
  let target: { x: number; y: number } | undefined
  let velocity = { x: 0, y: 0 }
  let frame: number | undefined
  let previousTime: number | undefined

  const paint = () => {
    const currentScene = scene()
    if (!currentScene) return
    overlay.root.setAttribute(
      'viewBox',
      `0 0 ${currentScene.width} ${currentScene.height}`,
    )
    if (!value) return
    overlay.xLine.setAttribute('x1', String(value.x))
    overlay.xLine.setAttribute('x2', String(value.x))
    overlay.xLine.setAttribute('y1', String(currentScene.chart.y))
    overlay.xLine.setAttribute(
      'y2',
      String(currentScene.chart.y + currentScene.chart.height),
    )
    overlay.yLine.setAttribute('x1', String(currentScene.chart.x))
    overlay.yLine.setAttribute(
      'x2',
      String(currentScene.chart.x + currentScene.chart.width),
    )
    overlay.yLine.setAttribute('y1', String(value.y))
    overlay.yLine.setAttribute('y2', String(value.y))
    overlay.marker.setAttribute('cx', String(value.x))
    overlay.marker.setAttribute('cy', String(value.y))
    overlay.xLabel.root.setAttribute(
      'transform',
      `translate(${value.x} ${currentScene.chart.y + currentScene.chart.height + 16})`,
    )
    overlay.yLabel.root.setAttribute(
      'transform',
      `translate(${currentScene.chart.x - 22} ${value.y})`,
    )
  }

  const tick = (time: number) => {
    frame = undefined
    if (!view || !value || !target) return
    const elapsed = Math.min(32, Math.max(0, time - (previousTime ?? time)))
    previousTime = time
    const x = spring.sample(elapsed, {
      from: value.x,
      to: target.x,
      velocity: velocity.x,
    })
    const y = spring.sample(elapsed, {
      from: value.y,
      to: target.y,
      velocity: velocity.y,
    })
    value = { x: x.value, y: y.value }
    velocity = { x: x.velocity, y: y.velocity }
    paint()
    if (!x.done || !y.done) frame = view.requestAnimationFrame(tick)
  }

  const schedule = () => {
    if (view && frame === undefined) frame = view.requestAnimationFrame(tick)
  }

  return {
    move(point: ChartPoint<FocusMotionRow, string, number>) {
      target = { x: point.x, y: point.y }
      if (!value) value = target
      overlay.xLabel.text.textContent = point.datum.period
      overlay.yLabel.text.textContent = String(point.datum.value)
      overlay.root.dataset.visible = 'true'
      overlay.root.style.opacity = '1'
      paint()
      schedule()
    },
    clear() {
      target = undefined
      value = undefined
      velocity = { x: 0, y: 0 }
      previousTime = undefined
      if (view && frame !== undefined) view.cancelAnimationFrame(frame)
      frame = undefined
      overlay.root.dataset.visible = 'false'
      overlay.root.style.opacity = '0'
    },
    repaint: paint,
    destroy() {
      if (view && frame !== undefined) view.cancelAnimationFrame(frame)
      overlay.root.remove()
      overlay.status.remove()
    },
  }
}

function paintStatus(
  status: HTMLOutputElement,
  points: readonly ChartPoint<FocusMotionRow, string, number>[],
) {
  const primary = points[0]
  status.textContent = primary
    ? `${primary.datum.period} · ${primary.datum.series} · ${points.length} grouped`
    : 'Hover or use ← →'
}
