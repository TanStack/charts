import { defineChart, dot, lineY } from '@tanstack/charts'
import { focusX } from '@tanstack/charts/focus'
import { focusGuideX } from '@tanstack/charts/focus/guide'
import { motion } from '@tanstack/charts/motion'
import { mountChartRenderer } from '@tanstack/charts/renderer'
import { scaleBand, scaleLinear } from 'd3-scale'
import { readChartMotionState } from '../../shared/motion'
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
const guideSpring = {
  type: 'spring' as const,
  stiffness: 320,
  damping: 28,
  mass: 0.72,
  restDelta: 0.02,
  restSpeed: 0.02,
}
const renderer = motion<FocusMotionRow, string, number>({ initial: false })

export const mount: ConformanceMount = (container, input) => {
  let currentInput = input
  let scene: ChartScene<FocusMotionRow, string, number> | undefined
  let host: ChartRendererHost<FocusMotionRow, string, number> | undefined
  let focused: readonly ChartPoint<FocusMotionRow, string, number>[] = []
  const surface = container.ownerDocument.createElement('div')
  surface.dataset.conformanceView = 'main'
  surface.style.position = 'relative'
  surface.style.width = `${input.width}px`
  surface.style.height = `${input.height}px`
  const chartRoot = container.ownerDocument.createElement('div')
  Object.assign(chartRoot.style, {
    width: '100%',
    height: '100%',
  })
  surface.append(chartRoot)
  const status = createStatus(surface)
  container.append(surface)

  const options = () => ({
    definition: focusCursorMotionDefinition(),
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
      paintStatus(status, points)
    },
  })

  host = mountChartRenderer(chartRoot, options())
  scene = host.getScene()

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
      const guide = surface.querySelector<SVGGElement>(
        '[data-ts-focus-retarget="true"]',
      )
      const xRule = guide?.querySelector<SVGLineElement>(
        '.ts-chart__focus-guide-x-rule',
      )
      const marker = guide?.querySelector<SVGCircleElement>(
        '.ts-chart__focus-guide-marker',
      )
      const xLabel = guide?.querySelector<SVGTextElement>(
        '.ts-chart__focus-guide-x-label-text',
      )
      const yLabel = guide?.querySelector<SVGTextElement>(
        '.ts-chart__focus-guide-y-label-text',
      )
      const crosshairX = Number(xRule?.getAttribute('x1'))
      const crosshairY = Number(marker?.getAttribute('cy'))
      return {
        focused: primary?.datum.id ?? null,
        groupSize: focused.length,
        crosshairVisible:
          Boolean(xRule && marker) &&
          guide?.getAttribute('visibility') !== 'hidden',
        crosshairX,
        crosshairY,
        crosshairXLabel: xLabel?.textContent ?? '',
        crosshairYLabel: yLabel?.textContent ?? '',
        crosshairFinite:
          Number.isFinite(crosshairX) && Number.isFinite(crosshairY),
        crosshairSettled:
          Boolean(primary) &&
          Math.abs(crosshairX - (primary?.x ?? 0)) < 0.1 &&
          Math.abs(crosshairY - (primary?.y ?? 0)) < 0.1,
        focusMotionState: readChartMotionState(surface),
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
    },
    destroy() {
      host?.destroy()
      surface.remove()
    },
  }
}

export function focusCursorMotionDefinition() {
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
      focusGuideX(focusMotionRows, {
        id: 'focus-guide',
        x: 'period',
        y: 'value',
        z: 'series',
        key: 'id',
        xRule: {},
        yRule: {},
        marker: {},
        xLabel: { format: (period) => period },
        yLabel: {
          side: 'start',
          format: (value) => String(value),
        },
        motion: { transition: guideSpring },
      }),
    ],
    x: {
      scale: scaleBand<string>().domain(focusMotionPeriods).padding(0.1),
    },
    y: { scale: scaleLinear().domain([20, 90]), grid: true },
    color: { domain: focusMotionSeries, range: colors },
    focus: focusX,
    focusRing: false,
    maxFocusDistance: Number.POSITIVE_INFINITY,
    tooltip: false,
    keyboard: true,
    margin: { top: 24, right: 26, bottom: 38, left: 46 },
  })
}

function createStatus(surface: HTMLElement) {
  const status = surface.ownerDocument.createElement('output')
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
  surface.append(status)
  return status
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
