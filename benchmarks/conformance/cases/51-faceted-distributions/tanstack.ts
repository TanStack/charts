import { penguins } from '@charts-poc/demo-data/penguins'
import { defineChart, facet, rect } from '@tanstack/charts'
import { bin } from 'd3-array'
import { scaleLinear } from 'd3-scale'
import { tanstackMount } from '../../shared/mount'
import type { PenguinsRow } from '@charts-poc/demo-data/penguins'
import type { ConformanceInput } from '../../types'

export const species = ['Adelie', 'Chinstrap', 'Gentoo'] as const
export type PenguinSpecies = (typeof species)[number]
export type PenguinMass = PenguinsRow & {
  readonly species: PenguinSpecies
  readonly body_mass_g: number
}

export interface DistributionBin {
  id: string
  species: PenguinSpecies
  x1: number
  x2: number
  count: number
  proportion: number
}

const boundaries = [2500, 3000, 3500, 4000, 4500, 5000, 5500, 6000, 6500]
const createBins = bin<PenguinMass, number>()
  .value((row) => row.body_mass_g)
  .domain([2500, 6500])
  .thresholds(boundaries.slice(1, -1))
const percent = new Intl.NumberFormat('en-US', {
  style: 'percent',
  maximumFractionDigits: 0,
})

export function prepareFacetedDistributionBins(
  rows: readonly PenguinMass[],
): readonly DistributionBin[] {
  return species.flatMap((speciesName) => {
    const groupRows = rows.filter((row) => row.species === speciesName)
    if (groupRows.length === 0) return []

    return createBins(groupRows).flatMap((bucket, index) =>
      bucket.x0 === undefined || bucket.x1 === undefined || bucket.length === 0
        ? []
        : [
            {
              id: `${speciesName}:${index}`,
              species: speciesName,
              x1: bucket.x0,
              x2: bucket.x1,
              count: bucket.length,
              proportion: bucket.length / groupRows.length,
            },
          ],
    )
  })
}

const definition = (input: ConformanceInput) => {
  const rows = penguins
    .filter((row): row is PenguinMass => {
      return (
        row.body_mass_g !== null &&
        species.includes(row.species as PenguinSpecies)
      )
    })
    .slice(input.revision * 8, input.revision * 8 + 320)
  const bins = prepareFacetedDistributionBins(rows)

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
            label: 'Body mass (g)',
          },
          y: {
            scale: scaleLinear().domain([0, 0.4]),
            grid: true,
            ticks: 3,
            label: 'Proportion',
            format: (value) => percent.format(value),
          },
        }),
      }),
    ],
    margin: 0,
  })
}

export const mount = tanstackMount(
  definition,
  'Faceted distribution comparison',
  {
    format: (point) =>
      `${point.datum.species} · Body mass: ${point.datum.x1}–${point.datum.x2} g · Proportion: ${percent.format(point.datum.proportion)}`,
  },
)
