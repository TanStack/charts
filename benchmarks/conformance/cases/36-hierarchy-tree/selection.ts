import type { FlareRow } from '@charts-poc/demo-data/flare'

export function selectHierarchyData(rows: readonly FlareRow[], revision = 0) {
  return revision % 2 === 0
    ? rows.slice(1, 11)
    : [...rows.slice(1, 8), ...rows.slice(10, 13)]
}
