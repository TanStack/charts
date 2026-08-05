import { penguins } from '@charts-poc/demo-data/penguins'
import { barX, defineChart } from '@tanstack/charts'
import { scaleBand, scaleLinear } from 'd3-scale'
import { countPenguinsBySpecies, divergeMaleCounts } from './transform'
import { tanstackCase } from '../../shared/mount'
import type { ConformanceInput } from '../../types'

const definition = (input: ConformanceInput) => {
  const sourceRows = input.revision % 2 === 0 ? penguins : penguins.slice(0, -8)
  const rows = divergeMaleCounts(countPenguinsBySpecies(sourceRows))

  return defineChart({
    marks: [
      barX(rows, {
        x: 'male',
        y: 'species',
        fill: '#2563eb',
        inset: 0.5,
      }),
      barX(rows, {
        x: 'female',
        y: 'species',
        fill: '#db2777',
        inset: 0.5,
      }),
    ],
    x: {
      scale: scaleLinear().domain([-80, 80]),
      grid: true,
      axis: {
        ticks: {
          count: 5,
          format: (value) => Math.abs(value).toLocaleString('en-US'),
        },
        label: 'Penguins observed',
      },
    },
    y: {
      scale: () => scaleBand<string>().paddingInner(0.02).paddingOuter(0.01),
    },
    margin: { top: 20, right: 20, bottom: 70, left: 80 },
  })
}

export const catalogCase = tanstackCase(
  definition,
  'Palmer penguins by species and sex',
)

export const mount = catalogCase.mount
