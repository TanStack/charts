import type { AlphabetRow } from '@charts-poc/demo-data/alphabet'

export interface RadialBarLayoutDatum extends AlphabetRow {
  ring: number
}

export function radialBarLayout(
  rows: readonly AlphabetRow[],
): readonly RadialBarLayoutDatum[] {
  return rows.map((row, ring) => ({ ...row, ring }))
}
