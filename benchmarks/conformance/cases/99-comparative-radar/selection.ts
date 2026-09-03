import type { DecathlonRow } from '@tanstack/charts-data/decathlon'

export const radarEvents = [
  '100 Meters',
  'Long Jump',
  'High Jump',
  '100 Meter Hurdles',
] as const
export const radarCountries = ['USA', 'GBR'] as const

export type RadarCountry = (typeof radarCountries)[number]
export type RadarEvent = (typeof radarEvents)[number]

export const timedEvents: ReadonlySet<RadarEvent> = new Set([
  '100 Meters',
  '100 Meter Hurdles',
])

export function selectRadarProfiles(
  rows: readonly DecathlonRow[],
): Readonly<Record<RadarCountry, DecathlonRow>> {
  const USA = rows.find((row) => row.Country === 'USA')
  const GBR = rows.find((row) => row.Country === 'GBR')
  if (!USA || !GBR) {
    throw new Error('The decathlon snapshot is missing USA or GBR results')
  }

  return { USA, GBR }
}
