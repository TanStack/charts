import { penguins } from '@tanstack/charts-data/penguins'
import type { PenguinsRow } from '@tanstack/charts-data/penguins'

export type BubblePenguin = PenguinsRow & {
  culmen_length_mm: number
  culmen_depth_mm: number
  body_mass_g: number
}

const completePenguins = penguins.filter(isBubblePenguin)

export function bubbleRows(revision: number): readonly BubblePenguin[] {
  return completePenguins
    .slice(revision * 8, revision * 8 + 320)
    .sort((left, right) => right.body_mass_g - left.body_mass_g)
}

function isBubblePenguin(row: PenguinsRow): row is BubblePenguin {
  return (
    row.culmen_length_mm !== null &&
    row.culmen_depth_mm !== null &&
    row.body_mass_g !== null
  )
}
