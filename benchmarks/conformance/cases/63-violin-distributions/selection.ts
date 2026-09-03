import type { PenguinsRow } from '@tanstack/charts-data/penguins'

export const violinSpecies = ['Adelie', 'Chinstrap', 'Gentoo'] as const
export type ViolinSpecies = (typeof violinSpecies)[number]

export type PenguinMass = PenguinsRow & {
  readonly species: ViolinSpecies
  readonly body_mass_g: number
}

export const massBoundaries = [
  2500, 2750, 3000, 3250, 3500, 3750, 4000, 4250, 4500, 4750, 5000, 5250, 5500,
  5750, 6000, 6250, 6500,
] as const

export function isPenguinMass(row: PenguinsRow): row is PenguinMass {
  return (
    row.body_mass_g !== null &&
    violinSpecies.includes(row.species as ViolinSpecies)
  )
}
