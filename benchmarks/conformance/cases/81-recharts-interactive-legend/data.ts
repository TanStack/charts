export const legendSeries = [
  { id: 'revenue', label: 'Revenue', color: '#2563eb' },
  { id: 'profit', label: 'Profit', color: '#f97316' },
] as const

export type LegendSeriesId = (typeof legendSeries)[number]['id']

export const legendPeriods = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'] as const

export type LegendPeriod = (typeof legendPeriods)[number]

export interface LegendDatum {
  period: LegendPeriod
  revenue: number
  profit: number
}

const initialData: readonly LegendDatum[] = [
  { period: 'Jan', revenue: 52, profit: 24 },
  { period: 'Feb', revenue: 68, profit: 30 },
  { period: 'Mar', revenue: 61, profit: 28 },
  { period: 'Apr', revenue: 84, profit: 42 },
  { period: 'May', revenue: 91, profit: 47 },
  { period: 'Jun', revenue: 103, profit: 55 },
]

export function interactiveLegendData(revision = 0): readonly LegendDatum[] {
  if (revision % 2 === 0) return initialData

  return initialData.map((row) =>
    row.period === 'Mar'
      ? { ...row, revenue: 75, profit: 35 }
      : row.period === 'Jun'
        ? { ...row, revenue: 110, profit: 61 }
        : row,
  )
}

export function isLegendSeriesId(value: unknown): value is LegendSeriesId {
  return value === 'revenue' || value === 'profit'
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
