import type { FlareRow } from '@tanstack/charts-data/flare'

export function selectSunburstData(rows: readonly FlareRow[], revision = 0) {
  return revision % 2 === 0
    ? rows.slice(1, 12)
    : [...rows.slice(1, 8), ...rows.slice(9, 13)]
}
