import { cars } from '@charts-poc/demo-data/cars'
import { defineChart, dot, mountChart } from '@tanstack/charts'
import { voronoi } from '@tanstack/charts/spatial/voronoi'
import { tooltip } from '@tanstack/charts/tooltip'
import { scaleLinear } from 'd3-scale'
import type { CarsRow } from '@charts-poc/demo-data/cars'
import type { ChartHostOptions, ChartTooltipOptions } from '@tanstack/charts'
import type {
  ConformanceHandle,
  ConformanceInput,
  ConformanceMount,
  ConformanceTestDriver,
} from '../../types'
import { tanstackCase } from '../../shared/mount'

type CompleteCar = CarsRow & {
  readonly 'economy (mpg)': number
}

const colors = ['#2563eb', '#0d9488', '#d97706']

const definition = (rows: readonly CompleteCar[]) =>
  defineChart({
    marks: [
      voronoi(rows, {
        x: 'weight (lb)',
        y: 'economy (mpg)',
        key: carKey,
        color: cylinderLabel,
        fillOpacity: 0.14,
        stroke: '#ffffff',
        strokeWidth: 1,
      }),
      dot(rows, {
        x: 'weight (lb)',
        y: 'economy (mpg)',
        key: carKey,
        color: cylinderLabel,
        stroke: '#ffffff',
        strokeWidth: 1,
        r: 4,
      }),
    ],
    x: { scale: scaleLinear, grid: true, axis: { label: 'Weight (lb)' } },
    y: {
      scale: scaleLinear,
      grid: true,
      axis: { label: 'Fuel economy (mpg)' },
    },
    color: {
      range: colors,
    },
  })

const interactiveTooltip: ChartTooltipOptions<CompleteCar> = {
  anchor: 'pointer',
  items: [
    {
      id: 'car',
      label: 'Car',
      text: (point) => `${point.datum.name} · ${cylinderLabel(point.datum)}`,
    },
  ],
}

export const catalogCase = tanstackCase(
  (input) => definition(selectedCars(input.revision)),
  'Voronoi nearest-point interaction',
  interactiveTooltip,
)

const configuredDefinition = (rows: readonly CompleteCar[]) =>
  defineChart(definition(rows), {
    animate: false,
    keyboard: true,
    tooltip: {
      use: tooltip,
      ...interactiveTooltip,
    },
  })

export const mount: ConformanceMount = (
  container,
  input,
): ConformanceHandle => {
  let rows = selectedCars(input.revision)
  let focusedIds: string[] = []
  const options: ChartHostOptions<CompleteCar> = {
    definition: configuredDefinition(rows),
    width: input.width,
    height: input.height,
    ariaLabel: 'Voronoi nearest-point interaction',
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
        definition: configuredDefinition(rows),
        width: nextInput.width,
        height: nextInput.height,
      })
    },
    destroy() {
      host.destroy()
    },
  }
}

function selectedCars(revision: number): CompleteCar[] {
  return cars
    .filter((row): row is CompleteCar => row['economy (mpg)'] !== null)
    .slice(revision * 3, revision * 3 + 18)
}

function cylinderLabel(row: CarsRow): string {
  return `${row.cylinders} cylinders`
}

function carKey(row: CarsRow): string {
  return `${row.name}:${row.year}:${row['weight (lb)']}`
}
