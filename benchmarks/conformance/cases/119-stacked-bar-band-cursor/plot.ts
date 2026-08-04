import * as Plot from '@observablehq/plot'
import {
  stackedCursorBandInset,
  stackedCursorBands,
  stackedCursorBarInset,
  stackedCursorCauses,
  stackedCursorColors,
  stackedCursorMaximum,
  stackedCursorPeriods,
  stackedCursorRows,
} from './model'
import type { StackedCursorRow } from './model'
import type {
  ConformanceInput,
  ConformanceMount,
  ConformanceTarget,
  ConformanceTestDriver,
} from '../../types'

const ariaLabel = 'Crimean War deaths with x band and y rule cursors'

const render = (input: ConformanceInput) =>
  Plot.plot({
    width: input.width,
    height: input.height,
    ariaLabel,
    marginLeft: 54,
    marginBottom: 36,
    x: {
      domain: stackedCursorPeriods,
      padding: 0.18,
      label: null,
    },
    y: {
      domain: [0, stackedCursorMaximum],
      grid: true,
      label: 'Deaths',
    },
    color: {
      domain: stackedCursorCauses,
      range: stackedCursorColors,
      legend: true,
    },
    marks: [
      Plot.barY(
        stackedCursorBands,
        Plot.pointerX({
          x: 'period',
          y1: 0,
          y2: 'total',
          maxRadius: Number.POSITIVE_INFINITY,
          insetLeft: stackedCursorBandInset,
          insetRight: stackedCursorBandInset,
          fill: '#64748b',
          fillOpacity: 0.16,
          className: 'stacked-cursor-band',
        }),
      ),
      Plot.barY(stackedCursorRows, {
        x: 'period',
        y1: 'start',
        y2: 'end',
        fill: 'cause',
        insetLeft: stackedCursorBarInset,
        insetRight: stackedCursorBarInset,
        rx: 2,
        className: 'stacked-cursor-bars',
      }),
      Plot.ruleY(
        stackedCursorRows,
        Plot.pointerX({
          px: 'period',
          y: 'end',
          py: (row: StackedCursorRow) => (row.start + row.end) / 2,
          maxRadius: Number.POSITIVE_INFINITY,
          stroke: '#475569',
          strokeOpacity: 0.82,
          strokeWidth: 1,
          strokeDasharray: '4 4',
          className: 'stacked-cursor-y-rule',
        }),
      ),
    ],
  })

type PlotElement = ReturnType<typeof render> & { value?: unknown }

export const mount: ConformanceMount = (container, input) => {
  let element = render(input) as PlotElement
  let focused: StackedCursorRow | null = null

  const handleInput = (event: Event) => {
    const value = (event.currentTarget as PlotElement).value
    if (isStackedCursorRow(value)) focused = value
    else if (value === null) focused = null
  }

  element.addEventListener('input', handleInput)
  container.append(element)

  const driver: ConformanceTestDriver = {
    resolveTarget(target) {
      return resolveTarget(container, element, target)
    },
    readState() {
      const band = container.querySelector<SVGRectElement>(
        '.stacked-cursor-band rect',
      )
      const yRule = container.querySelector<SVGLineElement>(
        '.stacked-cursor-y-rule line',
      )
      const bar = focused ? barForRow(container, focused) : null
      const bandX = numberAttribute(band, 'x')
      const bandWidth = numberAttribute(band, 'width')
      const barX = numberAttribute(bar, 'x')
      const barY = numberAttribute(bar, 'y')
      const barWidth = numberAttribute(bar, 'width')
      const ruleY = numberAttribute(yRule, 'y1')

      return {
        focus: {
          period: focused?.period ?? null,
          cause: focused?.cause ?? null,
          groupSize: focused ? stackedCursorCauses.length : 0,
        },
        cursor: {
          bandVisible: band !== null,
          yRuleVisible: yRule !== null,
          yRuleDotted: dashArray(yRule) === '4 4',
          leftOutset: difference(barX, bandX),
          rightOutset: difference(add(bandX, bandWidth), add(barX, barWidth)),
          widthDelta: difference(bandWidth, barWidth),
          ySettled:
            yRule !== null &&
            barY !== null &&
            ruleY !== null &&
            Math.abs(ruleY - barY) < 0.1,
        },
      }
    },
    viewBounds(view) {
      if (view && view !== 'main') return null
      const svg = chartSvg(element)
      if (!svg) return null
      const bounds = svg.getBoundingClientRect()
      return {
        x: bounds.left,
        y: bounds.top,
        width: bounds.width,
        height: bounds.height,
      }
    },
  }

  return {
    driver,
    update(nextInput) {
      const nextElement = render(nextInput) as PlotElement
      nextElement.addEventListener('input', handleInput)
      element.removeEventListener('input', handleInput)
      element.replaceWith(nextElement)
      element = nextElement
      focused = null
    },
    destroy() {
      element.removeEventListener('input', handleInput)
      element.remove()
    },
  }
}

function resolveTarget(
  container: HTMLElement,
  element: PlotElement,
  target: ConformanceTarget,
) {
  if (target.view && target.view !== 'main') return null
  const identity = target.anchor.match(/^period:(.+):cause:(.+)$/)
  if (!identity) return null
  const row = stackedCursorRows.find(
    (candidate) =>
      candidate.period === identity[1] && candidate.cause === identity[2],
  )
  const bar = row ? barForRow(container, row) : null
  const svg = chartSvg(element)
  if (!bar || !svg) return null
  const bounds = bar.getBoundingClientRect()
  return {
    x: bounds.left + bounds.width / 2,
    y: bounds.top + bounds.height / 2,
    focusElement: svg,
  }
}

function barForRow(container: HTMLElement, row: StackedCursorRow) {
  const index = stackedCursorRows.indexOf(row)
  return index < 0
    ? null
    : (container.querySelectorAll<SVGRectElement>('.stacked-cursor-bars rect')[
        index
      ] ?? null)
}

function chartSvg(element: PlotElement) {
  return element instanceof SVGSVGElement
    ? element
    : element.querySelector<SVGSVGElement>('svg')
}

function isStackedCursorRow(value: unknown): value is StackedCursorRow {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<StackedCursorRow>
  return (
    typeof candidate.period === 'string' &&
    stackedCursorCauses.some((cause) => cause === candidate.cause) &&
    typeof candidate.start === 'number' &&
    typeof candidate.end === 'number'
  )
}

function numberAttribute(
  element: Element | null | undefined,
  name: string,
): number | null {
  const value = element?.getAttribute(name)
  if (value === null || value === undefined) return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

function add(left: number | null, right: number | null) {
  return left === null || right === null ? null : left + right
}

function difference(left: number | null, right: number | null) {
  return left === null || right === null ? null : left - right
}

function dashArray(element: SVGLineElement | null) {
  const value =
    element?.getAttribute('stroke-dasharray') ??
    element?.closest('g')?.getAttribute('stroke-dasharray')
  return (
    value
      ?.split(/[\s,]+/)
      .filter(Boolean)
      .join(' ') ?? null
  )
}
