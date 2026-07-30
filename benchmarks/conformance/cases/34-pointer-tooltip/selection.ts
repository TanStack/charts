import type { AaplRow } from '@charts-poc/demo-data/aapl'

export function selectPointerTooltipData(
  rows: readonly AaplRow[],
  revision = 0,
) {
  const offset = Math.abs(revision) % 2
  return rows.slice(offset, offset + 36)
}
