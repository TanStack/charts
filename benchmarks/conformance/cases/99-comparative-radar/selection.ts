import type { DecathlonRow } from '@charts-poc/demo-data/decathlon'
import type { RadarCountry } from './transform'

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
