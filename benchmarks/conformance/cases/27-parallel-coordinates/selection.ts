import type { DecathlonRow } from '@charts-poc/demo-data/decathlon'

export const decathlonEvents = [
  '100 Meters',
  'Long Jump',
  'High Jump',
  '100 Meter Hurdles',
] as const

export function selectRepresentativeDecathletes(rows: readonly DecathlonRow[]) {
  return [...new Map(rows.map((row) => [row.Country, row])).values()]
}
