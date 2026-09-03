import type { PenguinsRow } from '@tanstack/charts-data/penguins'

export const pyramidSexes = ['MALE', 'FEMALE'] as const

export type PyramidSex = (typeof pyramidSexes)[number]

export type SexedPenguin = PenguinsRow & {
  readonly sex: PyramidSex
}

export function isSexedPenguin(row: PenguinsRow): row is SexedPenguin {
  return row.sex === 'MALE' || row.sex === 'FEMALE'
}
