import { compareChartKey, valueKey } from './scales'
import type { ChartKey } from './types'

export interface SpatialGroupedRow {
  readonly group: ChartKey | null
}

export interface SpatialRowGroup<TRow> {
  readonly group: ChartKey | null
  readonly identity: string
  readonly rows: readonly TRow[]
}

/** Partitions spatial rows by canonical ChartKey identity and order. */
export function groupRowsByChartKey<TRow extends SpatialGroupedRow>(
  rows: readonly TRow[],
): readonly SpatialRowGroup<TRow>[] {
  const groups = new Map<string, { group: ChartKey | null; rows: TRow[] }>()

  for (const row of rows) {
    const identity = valueKey(row.group)
    const existing = groups.get(identity)
    if (existing) existing.rows.push(row)
    else groups.set(identity, { group: row.group, rows: [row] })
  }

  return [...groups.entries()]
    .sort(([, left], [, right]) => compareChartKey(left.group, right.group))
    .map(([identity, group]) => ({ identity, ...group }))
}
