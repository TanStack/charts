import { barY, defineChart, groupBy, text } from '@tanstack/charts'
import { scaleBand, scaleLinear } from 'd3-scale'
import { penguins } from '@charts-poc/demo-data/penguins'
import type { PenguinsRow } from '@charts-poc/demo-data/penguins'
import { tanstackMount } from '../../shared/mount'

type PenguinWithMass = PenguinsRow & { body_mass_g: number }

const observations = penguins.filter(
  (row): row is PenguinWithMass => row.body_mass_g !== null,
)
const formatMass = (value: number) =>
  value.toLocaleString('en-US', { maximumFractionDigits: 3 })

const definition = () => {
  const rows = groupBy(observations, {
    by: 'species',
    outputs: {
      meanBodyMass: { value: 'body_mass_g', reduce: 'mean' },
    },
  })

  return defineChart({
    marks: [
      barY(rows, {
        x: 'species',
        y: 'meanBodyMass',
        fill: '#0ea5e9',
        inset: 1,
      }),
      text(rows, {
        x: 'species',
        y: 'meanBodyMass',
        text: (row) => formatMass(row.meanBodyMass),
        fill: '#0c4a6e',
        dy: -8,
      }),
    ],
    x: {
      scale: () => scaleBand<string>().paddingInner(0.1).paddingOuter(0.05),
    },
    y: {
      scale: scaleLinear,
      grid: true,
      axis: { label: 'Mean body mass (g)' },
    },
  })
}

export const mount = tanstackMount(
  definition,
  'Mean penguin body mass by species',
)
