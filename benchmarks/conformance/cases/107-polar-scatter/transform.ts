import { wind } from '@charts-poc/demo-data/wind'
import type { WindRow } from '@charts-poc/demo-data/wind'

const selectableLatitudeBands = [48.125, 55.125] as const

export function windLatitudeBand(revision = 0): readonly WindRow[] {
  const latitude =
    selectableLatitudeBands[revision % selectableLatitudeBands.length] ??
    selectableLatitudeBands[0]
  return wind.filter((row) => row.latitude === latitude)
}

export function windDirection(row: WindRow): number {
  return (Math.atan2(row.v, row.u) * (180 / Math.PI) + 360) % 360
}

export function windSpeed(row: WindRow): number {
  return Math.hypot(row.u, row.v)
}
