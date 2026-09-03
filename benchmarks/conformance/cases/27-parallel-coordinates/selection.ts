import type { DecathlonRow } from '@tanstack/charts-data/decathlon'

export const decathlonEvents = [
  '100 Meters',
  'Long Jump',
  'High Jump',
  '100 Meter Hurdles',
] as const

export type DecathlonEvent = (typeof decathlonEvents)[number]

export const timedEvents: ReadonlySet<DecathlonEvent> = new Set([
  '100 Meters',
  '100 Meter Hurdles',
])

export function selectRepresentativeDecathletes(rows: readonly DecathlonRow[]) {
  return [...new Map(rows.map((row) => [row.Country, row])).values()]
}
