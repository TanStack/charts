import type { CitywagesRow } from '@tanstack/charts-data/citywages'
import { wageFields, wageYear } from './selection'

export interface SlopePoint {
  id: string
  Metro: string
  nyt_display: string
  year: '1980' | '2015'
  inequality: number
}

export function toSlopePoints(
  rows: readonly CitywagesRow[],
): readonly SlopePoint[] {
  return rows.flatMap((row) =>
    wageFields.map((field) => ({
      id: `${row.Metro}:${field}`,
      Metro: row.Metro,
      nyt_display: row.nyt_display,
      year: wageYear(field),
      inequality: row[field],
    })),
  )
}
