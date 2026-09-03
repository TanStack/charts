import type { FlareRow } from '@tanstack/charts-data/flare'

const subtree = 'flare.analytics'

export function selectTreemapData(rows: readonly FlareRow[]) {
  return rows.filter(
    (row) => row.name === subtree || row.name.startsWith(`${subtree}.`),
  )
}
