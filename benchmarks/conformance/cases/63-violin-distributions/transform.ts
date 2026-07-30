import { bin, median } from 'd3-array'
import type { PenguinsRow } from '@charts-poc/demo-data/penguins'

export const violinSpecies = ['Adelie', 'Chinstrap', 'Gentoo'] as const
export type ViolinSpecies = (typeof violinSpecies)[number]

export type PenguinMass = PenguinsRow & {
  readonly species: ViolinSpecies
  readonly body_mass_g: number
}

export interface ViolinPoint {
  id: string
  species: ViolinSpecies
  body_mass_g: number
  x1: number
  x2: number
}

export interface ViolinMedian {
  id: string
  species: ViolinSpecies
  x1: number
  x2: number
  body_mass_g: number
  center: number
}

const boundaries = [
  2500, 2750, 3000, 3250, 3500, 3750, 4000, 4250, 4500, 4750, 5000, 5250, 5500,
  5750, 6000, 6250, 6500,
]
const createBins = bin<PenguinMass, number>()
  .value((row) => row.body_mass_g)
  .domain([2500, 6500])
  .thresholds(boundaries.slice(1, -1))

export function isPenguinMass(row: PenguinsRow): row is PenguinMass {
  return (
    row.body_mass_g !== null &&
    violinSpecies.includes(row.species as ViolinSpecies)
  )
}

export function violinDensity(
  rows: readonly PenguinMass[],
): readonly ViolinPoint[] {
  return violinSpecies.flatMap((species, speciesIndex) => {
    const buckets = createBins(rows.filter((row) => row.species === species))
    const maximum = Math.max(...buckets.map((bucket) => bucket.length), 1)
    const center = speciesIndex + 1

    return buckets.flatMap((bucket, index) => {
      if (bucket.x0 === undefined || bucket.x1 === undefined) return []
      const halfWidth = (bucket.length / maximum) * 0.38
      return [
        {
          id: `${species}:${index}`,
          species,
          body_mass_g: (bucket.x0 + bucket.x1) / 2,
          x1: center - halfWidth,
          x2: center + halfWidth,
        },
      ]
    })
  })
}

export function violinMedians(
  rows: readonly PenguinMass[],
): readonly ViolinMedian[] {
  return violinSpecies.flatMap((species, index) => {
    const bodyMass = median(
      rows.filter((row) => row.species === species),
      (row) => row.body_mass_g,
    )
    if (bodyMass === undefined) return []

    return [
      {
        id: species,
        species,
        x1: index + 0.82,
        x2: index + 1.18,
        body_mass_g: bodyMass,
        center: index + 1,
      },
    ]
  })
}
