import type { DecathlonRow } from '@tanstack/charts-data/decathlon'

export const radarEvents = [
  '100 Meters',
  'Long Jump',
  'High Jump',
  '100 Meter Hurdles',
] as const

export type RadarEvent = (typeof radarEvents)[number]

export const timedEvents: ReadonlySet<RadarEvent> = new Set([
  '100 Meters',
  '100 Meter Hurdles',
])

export function selectRadarAthlete(rows: readonly DecathlonRow[]) {
  const firstAthlete = rows[0]
  if (!firstAthlete) throw new Error('The decathlon snapshot is empty')
  return firstAthlete
}
