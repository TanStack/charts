import type { IndustriesRow } from '@tanstack/charts-data/industries'

export const legendSeries = [
  { id: 'Manufacturing', label: 'Manufacturing' },
  { id: 'Construction', label: 'Construction' },
] as const

export type LegendSeriesId = (typeof legendSeries)[number]['id']

export interface WideLegendRow {
  date: Date
  Manufacturing: number
  Construction: number
}

export function isLegendSeriesId(value: unknown): value is LegendSeriesId {
  return value === 'Manufacturing' || value === 'Construction'
}

export function toggleLegendSeries(
  visibleSeries: readonly LegendSeriesId[],
  seriesId: LegendSeriesId,
): readonly LegendSeriesId[] {
  const visible = visibleSeries.includes(seriesId)
  return legendSeries
    .map((series) => series.id)
    .filter((id) => (id === seriesId ? !visible : visibleSeries.includes(id)))
}

export function legendRows(
  rows: readonly IndustriesRow[],
  revision = 0,
): readonly IndustriesRow[] {
  const firstMonth = revision % 2 === 0 ? 0 : 6
  const lastMonth = firstMonth + 5
  return rows.filter(
    (row) =>
      row.date.getUTCFullYear() === 2000 &&
      row.date.getUTCMonth() >= firstMonth &&
      row.date.getUTCMonth() <= lastMonth &&
      isLegendSeriesId(row.industry),
  )
}

// Recharts requires one wide row per x value for multiple line series.
export function wideLegendRows(
  rows: readonly IndustriesRow[],
): readonly WideLegendRow[] {
  const grouped = new Map<number, Partial<WideLegendRow>>()
  for (const row of rows) {
    if (!isLegendSeriesId(row.industry)) continue
    const timestamp = row.date.getTime()
    const current = grouped.get(timestamp) ?? { date: row.date }
    current[row.industry] = row.unemployed
    grouped.set(timestamp, current)
  }
  return [...grouped.values()].flatMap((row) =>
    row.date &&
    row.Manufacturing !== undefined &&
    row.Construction !== undefined
      ? [
          {
            date: row.date,
            Manufacturing: row.Manufacturing,
            Construction: row.Construction,
          },
        ]
      : [],
  )
}
