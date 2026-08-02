import * as Plot from '@observablehq/plot'
import { focusMotionPeriods, focusMotionRows, focusMotionSeries } from './model'
import type {
  ConformanceInput,
  ConformanceMount,
  ConformanceTarget,
} from '../../types'

const colors = ['#7c3aed', '#0891b2', '#ea580c']
const ariaLabel = 'Grouped line chart with animated focus and crosshair'

const render = (input: ConformanceInput) =>
  Plot.plot({
    width: input.width,
    height: input.height,
    marginLeft: 46,
    marginBottom: 36,
    y: { domain: [20, 90], grid: true },
    color: { domain: focusMotionSeries, range: colors, legend: false },
    marks: [
      Plot.lineY(focusMotionRows, {
        x: 'period',
        y: 'value',
        stroke: 'series',
        strokeWidth: 2.5,
      }),
      Plot.dot(focusMotionRows, {
        x: 'period',
        y: 'value',
        fill: 'series',
        r: 4,
      }),
      Plot.crosshairX(focusMotionRows, {
        x: 'period',
        y: 'value',
        maxRadius: Number.POSITIVE_INFINITY,
        ruleStroke: 'currentColor',
        ruleStrokeOpacity: 0.48,
        ruleStrokeWidth: 1,
      }),
    ],
  })

interface PlotFocusState {
  period: string | null
  value: number | null
  crosshairX: number
  crosshairY: number
}

export const mount: ConformanceMount = (container, input) => {
  let element = render(input)
  let state: PlotFocusState = {
    period: null,
    value: null,
    crosshairX: 0,
    crosshairY: 0,
  }
  container.append(element)
  prepareElement(element)

  const clear = () => {
    state = { period: null, value: null, crosshairX: 0, crosshairY: 0 }
  }
  const move = (event: Event) => {
    if (!(event instanceof PointerEvent)) return
    const point = nearestPeriodPoint(element, event.clientX)
    if (!point) return clear()
    state = point
  }
  element.addEventListener('pointermove', move)
  element.addEventListener('pointerleave', clear)

  return {
    driver: {
      resolveTarget(target) {
        return resolveTarget(element, target)
      },
      readState() {
        const visible = state.period !== null
        return {
          focused: state.period ? `Alpha:${state.period}` : null,
          groupSize: visible ? 3 : 0,
          crosshairVisible: visible,
          crosshairX: state.crosshairX,
          crosshairY: state.crosshairY,
          crosshairXLabel: state.period ?? '',
          crosshairYLabel: state.value === null ? '' : String(state.value),
          crosshairFinite:
            Number.isFinite(state.crosshairX) &&
            Number.isFinite(state.crosshairY),
          crosshairSettled: visible,
          focusMotionState: 'finished',
        }
      },
    },
    update(nextInput) {
      const nextElement = render(nextInput)
      prepareElement(nextElement)
      nextElement.addEventListener('pointermove', move)
      nextElement.addEventListener('pointerleave', clear)
      element.replaceWith(nextElement)
      element = nextElement
      clear()
    },
    destroy() {
      element.remove()
    },
  }
}

function prepareElement(element: HTMLElement | SVGSVGElement) {
  element.setAttribute('role', 'img')
  element.setAttribute('aria-label', ariaLabel)
  element.setAttribute('tabindex', '0')
}

function resolveTarget(
  element: HTMLElement | SVGSVGElement,
  target: ConformanceTarget,
) {
  if (target.view && target.view !== 'main') return null
  const period = target.anchor.startsWith('period:')
    ? target.anchor.slice('period:'.length)
    : focusMotionPeriods[Number(target.anchor.split(':').at(-1))]
  const index = focusMotionPeriods.indexOf(
    period as (typeof focusMotionPeriods)[number],
  )
  const circle = element.querySelectorAll('circle')[index]
  if (!circle) return null
  const bounds = circle.getBoundingClientRect()
  return {
    x: bounds.left + bounds.width / 2,
    y: bounds.top + bounds.height / 2,
    focusElement: element,
  }
}

function nearestPeriodPoint(
  element: HTMLElement | SVGSVGElement,
  clientX: number,
): PlotFocusState | null {
  const circles = [...element.querySelectorAll('circle')].slice(
    0,
    focusMotionPeriods.length,
  )
  let closest:
    | {
        period: string
        value: number
        crosshairX: number
        crosshairY: number
        distance: number
      }
    | undefined
  for (const [index, circle] of circles.entries()) {
    const period = focusMotionPeriods[index]
    if (!period) continue
    const row = focusMotionRows[index]
    if (!row) continue
    const bounds = circle.getBoundingClientRect()
    const x = bounds.left + bounds.width / 2
    const y = bounds.top + bounds.height / 2
    const distance = Math.abs(clientX - x)
    if (!closest || distance < closest.distance) {
      closest = {
        period,
        value: row.value,
        crosshairX: x,
        crosshairY: y,
        distance,
      }
    }
  }
  return closest ?? null
}
