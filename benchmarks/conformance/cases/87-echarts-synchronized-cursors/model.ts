import type { TravelersRow } from '@tanstack/charts-data/travelers'

export type SynchronizedCursorView = 'current' | 'previous'

export const synchronizedCursorViews: readonly SynchronizedCursorView[] = [
  'current',
  'previous',
]

export const synchronizedCursorYDomains: Readonly<
  Record<SynchronizedCursorView, readonly [number, number]>
> = {
  current: [0, 1_200_000],
  previous: [0, 3_000_000],
}

export function synchronizedCursorDateKey(date: Date) {
  return date.toISOString().slice(0, 10)
}

export function synchronizedCursorAnchorDate(anchor: string) {
  const key = anchor.startsWith('date:') ? anchor.slice(5) : ''
  const timestamp = Date.parse(key.includes('T') ? key : `${key}T00:00:00.000Z`)
  if (!Number.isFinite(timestamp)) return null
  return new Date(timestamp)
}

export function synchronizedCursorDatumAtDate(
  rows: readonly TravelersRow[],
  date: Date,
) {
  const timestamp = date.getTime()
  return rows.find((datum) => datum.date.getTime() === timestamp) ?? null
}

export function synchronizedCursorNearestDatum(
  rows: readonly TravelersRow[],
  date: Date,
) {
  const timestamp = date.getTime()
  return rows.reduce<TravelersRow | undefined>((nearest, datum) => {
    if (!nearest) return datum
    return Math.abs(datum.date.getTime() - timestamp) <
      Math.abs(nearest.date.getTime() - timestamp)
      ? datum
      : nearest
  }, undefined)
}
