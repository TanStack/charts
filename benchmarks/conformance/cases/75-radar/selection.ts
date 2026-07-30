import type { DecathlonRow } from '@charts-poc/demo-data/decathlon'

export function selectRadarAthlete(rows: readonly DecathlonRow[]) {
  const firstAthlete = rows[0]
  if (!firstAthlete) throw new Error('The decathlon snapshot is empty')
  return firstAthlete
}
