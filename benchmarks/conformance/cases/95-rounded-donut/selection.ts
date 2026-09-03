import type { AlphabetRow } from '@tanstack/charts-data/alphabet'

const sliceSize = 5

export function selectRoundedDonutData(
  rows: readonly AlphabetRow[],
  revision = 0,
) {
  const start = Math.abs(revision % 2) * sliceSize
  return rows.slice(start, start + sliceSize)
}
