import type { AlphabetRow } from '@charts-poc/demo-data/alphabet'

const sliceSize = 4

export function selectRadialBarData(
  rows: readonly AlphabetRow[],
  revision = 0,
) {
  const start = Math.abs(revision % 2) * sliceSize
  return rows.slice(start, start + sliceSize)
}
