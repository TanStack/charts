import { mountChartRenderer } from '@tanstack/charts/renderer'
import { createStackedCursorRenderer, stackedCursorDefinition } from './example'
import { catalogPreviewDefinition } from '../../shared/preview'
import { tanstackCase } from '../../shared/mount'
import {
  formatStackedCursorEndpoint,
  stackedCursorRowsForRevision,
} from './model'
import type { ChartPoint } from '@tanstack/charts'
import type { StackedCursorRow } from './model'
import type {
  ConformanceInput,
  ConformanceMount,
  ConformanceTestDriver,
} from '../../types'

export { default as Example } from './example'

export const catalogCase = tanstackCase(
  (input) =>
    stackedCursorDefinition(stackedCursorRowsForRevision(input.revision)),
  'Crimean War deaths with x band and y rule cursors',
  true,
  {
    focus(scene) {
      return (
        scene.points.find(
          (point) =>
            point.markId === 'stacked-cursor-bars' &&
            point.datum.period === 'Nov' &&
            point.datum.cause === 'wounds',
        ) ?? null
      )
    },
  },
)

export const mount: ConformanceMount = (container, input) => {
  const renderer = createStackedCursorRenderer()
  let focused: readonly ChartPoint<StackedCursorRow, string, number>[] = []
  let rows = stackedCursorRowsForRevision(input.revision)
  const options = (nextInput: ConformanceInput) => {
    rows = stackedCursorRowsForRevision(nextInput.revision)
    return {
      definition:
        nextInput.preview === true
          ? catalogPreviewDefinition(stackedCursorDefinition(rows))
          : stackedCursorDefinition(rows),
      renderer,
      width: nextInput.width,
      height: nextInput.height,
      ariaLabel: 'Crimean War deaths with x band and y rule cursors',
      ariaDescription:
        'Move over a stacked bar. The x cursor highlights the full stack and the dotted y cursor marks the focused segment endpoint.',
      onFocusGroupChange(
        points: readonly ChartPoint<StackedCursorRow, string, number>[],
      ) {
        focused = points.filter(isStackedBarPoint)
      },
    }
  }
  const host = mountChartRenderer(container, options(input))
  applyPreviewFocus(host, input)

  const driver: ConformanceTestDriver = {
    resolveTarget(target) {
      if (target.view && target.view !== 'main') return null
      const identity = target.anchor.match(/^period:(.+):cause:(.+)$/)
      if (!identity) return null
      const row = rows.find(
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
      const band = elementWithKey(
        container,
        'stacked-cursor-band:x-band',
        'rect',
      )
      const bandLayer = band?.closest<SVGGElement>(
        '[data-ts-focus-guide-layer="under"]',
      )
      const yRule = elementWithKey(
        container,
        'stacked-cursor-rule:y-rule',
        'line',
      )
      const xLabel = elementWithKey(
        container,
        'stacked-cursor-band:x-label:text',
        'text',
      )
      const yLabel = elementWithKey(
        container,
        'stacked-cursor-rule:y-label:text',
        'text',
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
      const xLabelVisible = Boolean(
        xLabel && bandLayer?.getAttribute('visibility') !== 'hidden',
      )
      const yLabelVisible = Boolean(
        yLabel && guideLayer?.getAttribute('visibility') !== 'hidden',
      )
      const bandX = numberAttribute(band, 'x')
      const bandWidth = numberAttribute(band, 'width')
      const barX = numberAttribute(bar, 'x')
      const barWidth = numberAttribute(bar, 'width')
      const barY = numberAttribute(bar, 'y')
      const ruleY = numberAttribute(yRule, 'y1')
      const xLabelX = numberAttribute(xLabel, 'x')
      const yLabelY = numberAttribute(yLabel, 'y')
      const guideMotionState = motionState(bandLayer, guideLayer)

      return {
        focus: {
          period: primary?.datum.period ?? null,
          cause: primary?.datum.cause ?? null,
          deaths: primary?.datum.deaths ?? null,
          end: primary?.datum.end ?? null,
          groupSize: focused.length,
        },
        cursor: {
          bandVisible,
          yRuleVisible,
          xLabelVisible,
          yLabelVisible,
          xLabelText: xLabelVisible ? (xLabel?.textContent ?? null) : null,
          yLabelText: yLabelVisible ? (yLabel?.textContent ?? null) : null,
          labelsMatchFocus: Boolean(
            primary &&
            xLabel?.textContent === primary.datum.period &&
            yLabel?.textContent ===
              formatStackedCursorEndpoint(primary.datum.end),
          ),
          yRuleDotted: yRule?.getAttribute('stroke-dasharray') === '4 4',
          bandWider: Boolean(
            bandWidth !== null && barWidth !== null && bandWidth > barWidth,
          ),
          bandCentered: Boolean(
            bandX !== null &&
            bandWidth !== null &&
            barX !== null &&
            barWidth !== null &&
            Math.abs(bandX + bandWidth / 2 - barX - barWidth / 2) < 0.05,
          ),
          leftOutset: difference(barX, bandX),
          rightOutset: difference(add(bandX, bandWidth), add(barX, barWidth)),
          widthDelta: difference(bandWidth, barWidth),
          xLabelCentered: Boolean(
            xLabelVisible &&
            xLabelX !== null &&
            bandX !== null &&
            bandWidth !== null &&
            Math.abs(xLabelX - bandX - bandWidth / 2) < 0.05,
          ),
          yLabelAligned: Boolean(
            yLabelVisible &&
            yLabelY !== null &&
            ruleY !== null &&
            Math.abs(yLabelY - ruleY) < 0.05,
          ),
          motionState: guideMotionState,
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
    settle: () => settleMotion(container, 5_000),
  }

  return {
    driver,
    update(nextInput) {
      host.update(options(nextInput))
      applyPreviewFocus(host, nextInput)
    },
    destroy() {
      host.destroy()
    },
  }
}

function applyPreviewFocus(
  host: ReturnType<typeof mountChartRenderer<StackedCursorRow, string, number>>,
  input: ConformanceInput,
) {
  if (input.preview !== true) return
  const point = host
    .getScene()
    .points.find(
      (candidate) =>
        candidate.markId === 'stacked-cursor-bars' &&
        candidate.datum.period === 'Nov' &&
        candidate.datum.cause === 'wounds',
    )
  host.interaction.setControlledFocus(point ?? null, {
    source: 'programmatic',
  })
}

function isStackedBarPoint(
  point: ChartPoint<StackedCursorRow, string, number>,
) {
  return point.markId === 'stacked-cursor-bars'
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

function difference(
  left: number | null | undefined,
  right: number | null | undefined,
) {
  return left === null ||
    left === undefined ||
    right === null ||
    right === undefined
    ? null
    : left - right
}

function add(left: number | null, right: number | null) {
  return left === null || right === null ? null : left + right
}

function motionState(...layers: (SVGGElement | null | undefined)[]) {
  const states = layers.map((layer) =>
    layer?.getAttribute('data-ts-motion-state'),
  )
  if (states.some((state) => state === 'running')) return 'running'
  if (states.some((state) => state === 'finished')) return 'finished'
  return null
}

function settleMotion(chart: HTMLElement, timeout: number) {
  const view = chart.ownerDocument.defaultView
  if (!view) return Promise.resolve()
  const started = view.performance.now()
  return new Promise<void>((resolve) => {
    const check = () => {
      const running = chart.querySelector('[data-ts-motion-state="running"]')
      if (!running || view.performance.now() - started >= timeout) {
        resolve()
        return
      }
      view.requestAnimationFrame(check)
    }
    check()
  })
}
