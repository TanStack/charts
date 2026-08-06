import { bin, median } from 'd3-array'
import { massBoundaries, violinSpecies } from './selection'
import type { PenguinMass, ViolinSpecies } from './selection'

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

const createBins = bin<PenguinMass, number>()
  .value((row) => row.body_mass_g)
  .domain([massBoundaries[0], massBoundaries.at(-1)!])
  .thresholds(massBoundaries.slice(1, -1))

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
