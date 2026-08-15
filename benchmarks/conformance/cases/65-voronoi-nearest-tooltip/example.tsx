import { cars } from '@tanstack/charts-data/cars'
import type { CarsRow } from '@tanstack/charts-data/cars'
import { defineChart, dot } from '@tanstack/charts'
import { Chart } from '@tanstack/charts/react/tooltip'
import { voronoi } from '@tanstack/charts/spatial/voronoi'
import { tooltip } from '@tanstack/charts/tooltip'
import { scaleLinear } from 'd3-scale'
import type { ChartTooltipOptions } from '@tanstack/charts'

export type CompleteCar = CarsRow & { readonly 'economy (mpg)': number }
export interface ChartOptions {
  revision?: number
}

const colors = ['#2563eb', '#0d9488', '#d97706']
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

export function createExampleChart({ revision = 0 }: ChartOptions = {}) {
  const rows = selectedCars(revision)
  return defineChart(
    {
      marks: [
        voronoi(rows, {
          id: 'nearest-cells',
          x: 'weight (lb)',
          y: 'economy (mpg)',
          key: carKey,
          color: cylinderLabel,
          fillOpacity: 0.14,
          stroke: '#ffffff',
          strokeWidth: 1,
        }),
        dot(rows, {
          id: 'voronoi-points',
          x: 'weight (lb)',
          y: 'economy (mpg)',
          key: carKey,
          color: cylinderLabel,
          stroke: '#ffffff',
          strokeWidth: 1,
          r: 4,
          states: [
            {
              when: { focus: 'primary' },
              style: { r: 7, stroke: 'Canvas', strokeWidth: 2 },
            },
            { when: { focus: 'unmatched' }, style: { opacity: 0.45 } },
          ],
        }),
      ],
      x: { scale: scaleLinear, grid: true, axis: { label: 'Weight (lb)' } },
      y: {
        scale: scaleLinear,
        grid: true,
        axis: { label: 'Fuel economy (mpg)' },
      },
      color: { range: colors },
    },
    {
      keyboard: true,
      tooltip: { use: tooltip, ...interactiveTooltip },
    },
  )
}

export const exampleAriaLabel = 'Voronoi nearest-point interaction'
export const chart = createExampleChart()

export default function Example() {
  return <Chart definition={chart} ariaLabel={exampleAriaLabel} height={480} />
}

export function selectedCars(revision: number): CompleteCar[] {
  return cars
    .filter((row): row is CompleteCar => row['economy (mpg)'] !== null)
    .slice(revision * 3, revision * 3 + 18)
}

export function cylinderLabel(row: CarsRow): string {
  return `${row.cylinders} cylinders`
}

export function carKey(row: CarsRow): string {
  return `${row.name}:${row.year}:${row['weight (lb)']}`
}
