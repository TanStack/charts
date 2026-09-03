import { mountChart } from '@tanstack/charts'
import type { ChartHostOptions } from '@tanstack/charts'
import type { AaplRow } from '@tanstack/charts-data/aapl'
import type {
  ConformanceHandle,
  ConformanceInput,
  ConformanceTestDriver,
} from '../../types'
import { tanstackExampleMount } from '../../shared/mount'
import { createExampleChart, exampleAriaLabel } from './example'

export * from './example'

export const catalogCase = tanstackExampleMount(
  createExampleChart,
  exampleAriaLabel,
  {
    focus(scene) {
      return (
        scene.points.find(
          (point) =>
            point.markId === 'apple-points' &&
            dateKey(point.datum.Date) === '2013-06-06',
        ) ?? null
      )
    },
  },
)

export function mount(
  container: HTMLElement,
  input: ConformanceInput,
): ConformanceHandle {
  let focusedDates: string[] = []
  const options: ChartHostOptions<AaplRow> = {
    definition: createExampleChart(input),
    width: input.width,
    height: input.height,
    ariaLabel: exampleAriaLabel,
    onFocusGroupChange(points) {
      focusedDates = points.map((point) => dateKey(point.datum.Date))
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
        .points.find((candidate) => dateKey(candidate.datum.Date) === date)
      const svg = container.querySelector('svg')
      if (!point || !svg) return null
      const matrix = svg.getScreenCTM()
      if (!matrix) {
        const bounds = svg.getBoundingClientRect()
        const scene = host.getScene()
        return {
          x: bounds.left + (point.x / scene.width) * bounds.width,
          y: bounds.top + (point.y / scene.height) * bounds.height,
          focusElement: svg,
        }
      }
      return {
        x: matrix.a * point.x + matrix.c * point.y + matrix.e,
        y: matrix.b * point.x + matrix.d * point.y + matrix.f,
        focusElement: svg,
      }
    },
    readState() {
      const tooltip = container.querySelector<HTMLElement>('.ts-chart-tooltip')
      return {
        focus: { dates: [...focusedDates] },
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
