export const indexedSeries = ['Atlas', 'Beacon', 'Comet', 'Delta'] as const

export type IndexedSeries = (typeof indexedSeries)[number]

export interface IndexedValue {
  id: string
  date: Date
  series: IndexedSeries
  value: number
}

const monthCount = 15
const start = Date.UTC(2022, 0, 1)

export const indexedDateDomain: readonly [Date, Date] = [
  new Date(start),
  new Date(Date.UTC(2023, 2, 1)),
]

const startingValues: Record<IndexedSeries, number> = {
  Atlas: 100,
  Beacon: 86,
  Comet: 120,
  Delta: 72,
}

export function indexedData(revision = 0): readonly IndexedValue[] {
  const updated = revision % 2 === 1

  return indexedSeries.flatMap((series, seriesIndex) =>
    Array.from({ length: monthCount }, (_, monthIndex) => {
      const trend = [0.026, 0.014, -0.006, 0.034][seriesIndex] ?? 0
      const wave =
        Math.sin(monthIndex / (1.7 + seriesIndex * 0.25) + seriesIndex) *
        (0.035 + seriesIndex * 0.006)
      const revisionDelta = updated
        ? (seriesIndex - 1.5) * 0.006 * monthIndex
        : 0
      const value =
        startingValues[series] * (1 + trend * monthIndex + wave + revisionDelta)

      return {
        id: `${series}:${monthIndex}`,
        date: new Date(Date.UTC(2022, monthIndex, 1)),
        series,
        value: Math.round(value * 100) / 100,
      }
    }),
  )
}
