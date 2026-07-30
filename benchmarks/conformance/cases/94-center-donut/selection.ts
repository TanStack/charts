import type { AlphabetRow } from '@charts-poc/demo-data/alphabet'

const sliceSize = 3

export function selectCenterDonutData(
  rows: readonly AlphabetRow[],
  revision = 0,
) {
  const start = Math.abs(revision % 2) * sliceSize
  return rows.slice(start, start + sliceSize)
}
