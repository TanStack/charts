import type { IndustriesRow } from '@tanstack/charts-data/industries'

export const industryNames = ['Manufacturing', 'Construction', 'Finance']
export type IndustryName = (typeof industryNames)[number]
export type GroupedTooltipDatum = IndustriesRow & {
  readonly industry: IndustryName
}

export function selectGroupedTooltipData(
  rows: readonly IndustriesRow[],
  revision = 0,
): readonly GroupedTooltipDatum[] {
  const offset = Math.abs(revision) % 2
  const start = Date.UTC(2000, offset)
  const end = Date.UTC(2003, offset)

  return rows.filter(
    (row): row is GroupedTooltipDatum =>
      row.date.getTime() >= start &&
      row.date.getTime() < end &&
      industryNames.some((industry) => industry === row.industry),
  )
}
