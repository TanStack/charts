import type { IndustriesRow } from '@tanstack/charts-data/industries'

export const axisPointerIndustries = [
  'Manufacturing',
  'Construction',
  'Finance',
]
export type AxisPointerIndustry = (typeof axisPointerIndustries)[number]
export type AxisPointerDatum = IndustriesRow & {
  readonly industry: AxisPointerIndustry
}

export function axisPointerData(
  rows: readonly IndustriesRow[],
  revision = 0,
): readonly AxisPointerDatum[] {
  const offset = Math.abs(revision) % 2
  const start = Date.UTC(2005, offset)
  const end = Date.UTC(2005, offset + 8)

  return rows.filter(
    (row): row is AxisPointerDatum =>
      row.date.getTime() >= start &&
      row.date.getTime() < end &&
      axisPointerIndustries.some((industry) => industry === row.industry),
  )
}

export function axisPointerDates(rows: readonly AxisPointerDatum[]) {
  return Array.from(
    new Set(rows.map((row) => row.date.getTime())),
    (timestamp) => new Date(timestamp),
  )
}
