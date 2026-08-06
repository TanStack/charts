import { penguins } from '@charts-poc/demo-data/penguins'
import { binX, defineChart, facet, normalize, rect } from '@tanstack/charts'
import { scaleLinear } from 'd3-scale'
import { tanstackCase } from '../../shared/mount'
import type { PenguinsRow } from '@charts-poc/demo-data/penguins'
import type { ConformanceInput } from '../../types'

export const species = ['Adelie', 'Chinstrap', 'Gentoo'] as const
export type PenguinSpecies = (typeof species)[number]
export type PenguinMass = PenguinsRow & {
  readonly species: PenguinSpecies
  readonly body_mass_g: number
}

const boundaries = [2500, 3000, 3500, 4000, 4500, 5000, 5500, 6000, 6500]
const percent = new Intl.NumberFormat('en-US', {
  style: 'percent',
  maximumFractionDigits: 0,
})

export const facetedDistributionDefinition = (input: ConformanceInput) => {
  const rows = penguins
    .filter((row): row is PenguinMass => {
      return (
        row.body_mass_g !== null &&
        species.includes(row.species as PenguinSpecies)
      )
    })
    .slice(input.revision * 8, input.revision * 8 + 320)
  const bins = normalize(
    binX(rows, {
      value: 'body_mass_g',
      by: 'species',
      thresholds: boundaries,
      outputs: { count: { reduce: 'count' } },
    }),
    {
      value: 'count',
      by: 'species',
      basis: 'sum',
      as: 'proportion',
    },
  )
    .filter(({ count }) => count > 0)
    .sort(
      (left, right) =>
        species.indexOf(left.species) - species.indexOf(right.species),
    )

  return defineChart({
    marks: [
      facet(bins, {
        by: 'species',
        columns: 1,
        gap: 8,
        label: (group) => String(group),
        chart: (facetBins) => ({
          marks: [
            rect(facetBins, {
              x1: 'x1',
              x2: 'x2',
              y1: () => 0,
              y2: 'proportion',
              fill: '#8b5cf6',
              inset: 0.75,
            }),
          ],
          x: {
            scale: scaleLinear().domain([2500, 6500]),
            grid: true,
            axis: { label: 'Body mass (g)' },
          },
          y: {
            scale: scaleLinear().domain([0, 0.4]),
            grid: true,
            axis: {
              ticks: { count: 3, format: (value) => percent.format(value) },
              label: 'Proportion',
            },
          },
        }),
      }),
    ],
    margin: 0,
  })
}

export const catalogCase = tanstackCase(
  facetedDistributionDefinition,
  'Faceted distribution comparison',
  {
    format: (point) =>
      `${point.datum.species} · Body mass: ${point.datum.x1}–${point.datum.x2} g · Proportion: ${percent.format(point.datum.proportion)}`,
  },
)

export const mount = catalogCase.mount
