import {
  bandX,
  barY,
  colorLegend,
  crosshair,
  defineChart,
  mountChart,
  stack,
  whenFocused,
} from '@tanstack/charts'
import { scaleBand, scaleLinear } from 'd3-scale'
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
import type { ChartPoint } from '@tanstack/charts'
import type { StackedCursorDatum, StackedCursorRow } from './model'
import type {
  ConformanceInput,
  ConformanceMount,
  ConformanceTestDriver,
} from '../../types'

const bandCursor = whenFocused(
  bandX(stackedCursorBands, {
    id: 'stacked-cursor-band',
    x: 'period',
    key: 'period',
    fill: '#64748b',
    fillOpacity: 0.16,
    inset: stackedCursorBandInset,
    radius: 3,
  }),
  { match: 'x' },
)

const definition = defineChart({
  marks: [
    bandCursor,
    barY(stackedCursorRows, {
      id: 'stacked-cursor-bars',
      x: 'period',
      y: 'deaths',
      z: 'cause',
      color: 'cause',
      key: 'id',
      layout: stack({ order: stackedCursorCauses }),
      inset: stackedCursorBarInset,
      radius: 2,
    }),
    crosshair<string, number>({
      id: 'stacked-cursor-crosshair',
      x: false,
      y: {
        stroke: '#475569',
        strokeOpacity: 0.82,
        strokeWidth: 1,
        strokeDasharray: '4 4',
      },
    }),
  ],
  x: {
    scale: scaleBand<string>().domain(stackedCursorPeriods).padding(0.18),
  },
  y: {
    scale: scaleLinear().domain([0, stackedCursorMaximum]),
    grid: true,
    axis: { ticks: { count: 5 }, label: 'Deaths' },
  },
  color: {
    domain: stackedCursorCauses,
    range: stackedCursorColors,
    legend: colorLegend({ label: 'Cause' }),
  },
  focus: 'group-x',
  focusRing: false,
  maxFocusDistance: Number.POSITIVE_INFINITY,
  tooltip: false,
  keyboard: true,
  animate: false,
})

export const mount: ConformanceMount = (container, input) => {
  let focused: readonly ChartPoint<StackedCursorRow, string, number>[] = []
  const options = (nextInput: ConformanceInput) => ({
    definition,
    width: nextInput.width,
    height: nextInput.height,
    ariaLabel: 'Crimean War deaths with x band and y rule cursors',
    ariaDescription:
      'Move over a stacked bar. The x cursor highlights the full stack and the dotted y cursor marks the focused segment endpoint.',
    onFocusGroupChange(
      points: readonly ChartPoint<StackedCursorDatum, string, number>[],
    ) {
      focused = points.filter(isStackedBarPoint)
    },
  })
  const host = mountChart(container, options(input))

  const driver: ConformanceTestDriver = {
    resolveTarget(target) {
      if (target.view && target.view !== 'main') return null
      const identity = target.anchor.match(/^period:(.+):cause:(.+)$/)
      if (!identity) return null
      const row = stackedCursorRows.find(
        (candidate) =>
          candidate.period === identity[1] && candidate.cause === identity[2],
      )
      const point = host
        .getScene()
        .points.find((candidate) => candidate.datum === row)
      const bar = point ? elementWithKey(container, point.key, 'rect') : null
      const svg = container.querySelector<SVGSVGElement>('svg.ts-chart')
      if (!bar || !svg) return null
      const bounds = bar.getBoundingClientRect()
      return {
        x: bounds.left + bounds.width / 2,
        y: bounds.top + bounds.height / 2,
        focusElement: svg,
      }
    },
    readState() {
      const primary = focused[0]
      const band = container.querySelector<SVGRectElement>(
        '.ts-chart__band-x rect[visibility="visible"]',
      )
      const bandLayer = band?.closest<SVGGElement>('[data-ts-focus-layer]')
      const yRule = elementWithKey(
        container,
        'stacked-cursor-crosshair:y-rule',
        'line',
      )
      const guideLayer = yRule?.closest<SVGGElement>(
        '[data-ts-focus-guide-layer="over"]',
      )
      const bar = primary
        ? elementWithKey(container, primary.key, 'rect')
        : null
      const bandVisible = Boolean(
        band && bandLayer?.getAttribute('visibility') !== 'hidden',
      )
      const yRuleVisible = Boolean(
        yRule && guideLayer?.getAttribute('visibility') !== 'hidden',
      )
      const bandX = numberAttribute(band, 'x')
      const bandWidth = numberAttribute(band, 'width')
      const barX = numberAttribute(bar, 'x')
      const barY = numberAttribute(bar, 'y')
      const barWidth = numberAttribute(bar, 'width')
      const ruleY = numberAttribute(yRule, 'y1')

      return {
        focus: {
          period: primary?.datum.period ?? null,
          cause: primary?.datum.cause ?? null,
          groupSize: focused.length,
        },
        cursor: {
          bandVisible,
          yRuleVisible,
          yRuleDotted: yRule?.getAttribute('stroke-dasharray') === '4 4',
          leftOutset: difference(barX, bandX),
          rightOutset: difference(add(bandX, bandWidth), add(barX, barWidth)),
          widthDelta: difference(bandWidth, barWidth),
          ySettled:
            yRuleVisible &&
            barY !== null &&
            ruleY !== null &&
            Math.abs(ruleY - barY) < 0.1,
        },
      }
    },
    viewBounds(view) {
      if (view && view !== 'main') return null
      const svg = container.querySelector<SVGSVGElement>('svg.ts-chart')
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
      host.update(options(nextInput))
    },
    destroy() {
      host.destroy()
    },
  }
}

function isStackedBarPoint(
  point: ChartPoint<StackedCursorDatum, string, number>,
): point is ChartPoint<StackedCursorRow, string, number> {
  return point.markId === 'stacked-cursor-bars' && 'cause' in point.datum
}

function elementWithKey<TName extends keyof SVGElementTagNameMap>(
  container: HTMLElement,
  key: string,
  tagName: TName,
): SVGElementTagNameMap[TName] | null {
  return (
    [...container.querySelectorAll<SVGElementTagNameMap[TName]>(tagName)].find(
      (element) => element.dataset.tsKey === key,
    ) ?? null
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
