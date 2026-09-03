import { mountChart } from '@tanstack/charts'
import type { ChartHostOptions } from '@tanstack/charts'
import type {
  ConformanceHandle,
  ConformanceMount,
  ConformanceTestDriver,
} from '../../types'
import {
  carKey,
  createExampleChart,
  exampleAriaLabel,
  selectedCars,
} from './example'
import type { CompleteCar } from './example'
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
            point.markId === 'voronoi-points' &&
            carKey(point.datum) === 'AMC Gremlin:71:2634',
        ) ?? null
      )
    },
  },
)

export const mount: ConformanceMount = (
  container,
  input,
): ConformanceHandle => {
  let rows = selectedCars(input.revision)
  let focusedIds: string[] = []
  const options: ChartHostOptions<CompleteCar> = {
    definition: createExampleChart(input),
    width: input.width,
    height: input.height,
    ariaLabel: exampleAriaLabel,
    onFocusGroupChange(points) {
      focusedIds = points.map((point) => carKey(point.datum))
    },
  }
  const host = mountChart(container, options)
  const driver: ConformanceTestDriver = {
    resolveTarget(target) {
      if (target.view && target.view !== 'main') return null
      const key = target.anchor.startsWith('car:')
        ? target.anchor.slice('car:'.length)
        : ''
      const row = rows.find((candidate) => carKey(candidate) === key)
      const point = host
        .getScene()
        .points.find((candidate) => candidate.datum === row)
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
        focus: { ids: [...focusedIds] },
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
      rows = selectedCars(nextInput.revision)
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
