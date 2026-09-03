import type { TravelersRow } from '@tanstack/charts-data/travelers'

export function selectSynchronizedCursorData(
  rows: readonly TravelersRow[],
  revision = 0,
): readonly TravelersRow[] {
  const advanced = Math.abs(Math.trunc(revision)) % 2
  return rows.slice(8 - advanced, 16 - advanced).reverse()
}

export function synchronizedCursorDates(
  rows: readonly TravelersRow[],
): readonly Date[] {
  return rows.map((row) => row.date)
}
