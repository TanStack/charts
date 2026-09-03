import { mountChart } from '@tanstack/charts'
import type { ChartHostOptions } from '@tanstack/charts'
import type {
  ConformanceHandle,
  ConformanceInput,
  ConformanceTestDriver,
} from '../../types'
import { industryNames } from './selection'
import type { GroupedTooltipDatum } from './selection'
import { createExampleChart, exampleAriaLabel } from './example'
import { tanstackExampleMount } from '../../shared/mount'

export * from './example'

export const catalogCase = tanstackExampleMount(
  createExampleChart,
  exampleAriaLabel,
  {
    focus(scene) {
      return (
        scene.points.find(
          (point) =>
            point.markId === 'grouped-points' &&
            point.datum.industry === industryNames[0] &&
            dateKey(point.datum.date) === '2001-07-01',
        ) ?? null
      )
    },
  },
)

export function mount(
  container: HTMLElement,
  input: ConformanceInput,
): ConformanceHandle {
  let focusedRows: string[] = []
  const options: ChartHostOptions<GroupedTooltipDatum> = {
    definition: createExampleChart(input),
    width: input.width,
    height: input.height,
    ariaLabel: exampleAriaLabel,
    onFocusGroupChange(points) {
      focusedRows = points.map(
        (point) => `${dateKey(point.datum.date)}:${point.datum.industry}`,
      )
    },
  }
  const host = mountChart(container, options)
  const driver: ConformanceTestDriver = {
    resolveTarget(target) {
      if (target.view && target.view !== 'main') return null
      const date = target.anchor.startsWith('date:')
        ? target.anchor.slice('date:'.length)
        : null
      const point = host
        .getScene()
        .points.find(
          (candidate) =>
            dateKey(candidate.datum.date) === date &&
            candidate.datum.industry === industryNames[0],
        )
      const svg = container.querySelector('svg')
      if (!point || !svg) return null
      const scene = host.getScene()
      const bounds = svg.getBoundingClientRect()
      return {
        x: bounds.left + (point.x / scene.width) * bounds.width,
        y: bounds.top + (point.y / scene.height) * bounds.height,
        focusElement: svg,
      }
    },
    readState() {
      const tooltip = container.querySelector<HTMLElement>('.ts-chart-tooltip')
      return {
        focus: { rows: [...focusedRows] },
        tooltip: {
          visible: Boolean(tooltip && !tooltip.hidden),
          text: tooltip?.textContent?.trim() ?? '',
        },
      }
    },
  }

  return {
    driver,
    update(nextInput) {
      host.update({
        ...options,
        definition: createExampleChart(nextInput),
        width: nextInput.width,
        height: nextInput.height,
      })
    },
    destroy() {
      host.destroy()
    },
  }
}

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10)
}
