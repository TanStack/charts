import type { CitywagesRow } from '@charts-poc/demo-data/citywages'

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
  return rows.flatMap((row) => [
    {
      id: `${row.Metro}:1980`,
      Metro: row.Metro,
      nyt_display: row.nyt_display,
      year: '1980' as const,
      inequality: row.R90_10_1980,
    },
    {
      id: `${row.Metro}:2015`,
      Metro: row.Metro,
      nyt_display: row.nyt_display,
      year: '2015' as const,
      inequality: row.R90_10_2015,
    },
  ])
}
