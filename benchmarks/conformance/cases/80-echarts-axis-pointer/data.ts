export type AxisPointerSeries = 'Atlas' | 'Beacon' | 'Comet'

export interface AxisPointerDatum {
  id: string
  date: Date
  series: AxisPointerSeries
  value: number
}

export const axisPointerSeries: readonly AxisPointerSeries[] = [
  'Atlas',
  'Beacon',
  'Comet',
]

export const axisPointerColors: Readonly<Record<AxisPointerSeries, string>> = {
  Atlas: '#2563eb',
  Beacon: '#f97316',
  Comet: '#10b981',
}

export const axisPointerDates: readonly Date[] = [
  new Date(Date.UTC(2025, 0, 1)),
  new Date(Date.UTC(2025, 1, 1)),
  new Date(Date.UTC(2025, 2, 1)),
  new Date(Date.UTC(2025, 3, 1)),
  new Date(Date.UTC(2025, 4, 1)),
  new Date(Date.UTC(2025, 5, 1)),
  new Date(Date.UTC(2025, 6, 1)),
  new Date(Date.UTC(2025, 7, 1)),
]

export const axisPointerDomain: readonly [Date, Date] = [
  new Date(Date.UTC(2024, 11, 20)),
  new Date(Date.UTC(2025, 7, 12)),
]

const initialValues: Readonly<Record<AxisPointerSeries, readonly number[]>> = {
  Atlas: [42, 48, 45, 53, 58, 55, 62, 66],
  Beacon: [31, 35, 39, 38, 44, 49, 47, 54],
  Comet: [22, 27, 26, 32, 35, 37, 43, 46],
}

export function axisPointerData(revision = 0): readonly AxisPointerDatum[] {
  const updated = revision % 2 === 1
  return axisPointerSeries.flatMap((series) =>
    axisPointerDates.map((date, index) => {
      const initialValue = initialValues[series][index] ?? 0
      const value =
        updated && index === 5
          ? initialValue +
            (series === 'Atlas' ? 6 : series === 'Beacon' ? -3 : 4)
          : initialValue
      return {
        id: `${series}-${date.toISOString()}`,
        date,
        series,
        value,
      }
    }),
  )
}

export function axisPointerDateKey(date: Date) {
  return date.toISOString().slice(0, 10)
}

export function axisPointerRowsAtDate(
  rows: readonly AxisPointerDatum[],
  date: Date,
) {
  const timestamp = date.getTime()
  return axisPointerSeries.flatMap((series) => {
    const row = rows.find(
      (candidate) =>
        candidate.series === series && candidate.date.getTime() === timestamp,
    )
    return row ? [row] : []
  })
}

export function axisPointerAnchorDate(anchor: string) {
  const key = anchor.startsWith('date:') ? anchor.slice(5) : ''
  return (
    axisPointerDates.find((date) => axisPointerDateKey(date) === key) ?? null
  )
}
