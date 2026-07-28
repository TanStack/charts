export type SynchronizedCursorView = 'primary' | 'secondary'

export type SynchronizedCursorSeries = 'Throughput' | 'Error rate'

export interface SynchronizedCursorDatum {
  id: string
  date: Date
  value: number
  view: SynchronizedCursorView
  series: SynchronizedCursorSeries
}

export const synchronizedCursorViews: readonly SynchronizedCursorView[] = [
  'primary',
  'secondary',
]

export const synchronizedCursorDates: readonly Date[] = [
  new Date(Date.UTC(2025, 0, 1)),
  new Date(Date.UTC(2025, 1, 1)),
  new Date(Date.UTC(2025, 2, 1)),
  new Date(Date.UTC(2025, 3, 1)),
  new Date(Date.UTC(2025, 4, 1)),
  new Date(Date.UTC(2025, 5, 1)),
  new Date(Date.UTC(2025, 6, 1)),
  new Date(Date.UTC(2025, 7, 1)),
]

export const synchronizedCursorDateDomain: readonly [Date, Date] = [
  new Date(Date.UTC(2024, 11, 20)),
  new Date(Date.UTC(2025, 7, 12)),
]

export const synchronizedCursorYDomains: Readonly<
  Record<SynchronizedCursorView, readonly [number, number]>
> = {
  primary: [40, 100],
  secondary: [0, 6],
}

export const synchronizedCursorColors: Readonly<
  Record<SynchronizedCursorView, string>
> = {
  primary: '#2563eb',
  secondary: '#e11d48',
}

const initialValues: Readonly<
  Record<SynchronizedCursorView, readonly number[]>
> = {
  primary: [52, 61, 58, 72, 79, 75, 88, 92],
  secondary: [4.9, 4.5, 4.1, 3.6, 3.2, 2.8, 2.3, 1.9],
}

export function synchronizedCursorData(
  view: SynchronizedCursorView,
  revision = 0,
): readonly SynchronizedCursorDatum[] {
  const series: SynchronizedCursorSeries =
    view === 'primary' ? 'Throughput' : 'Error rate'
  const updated = revision % 2 === 1
  return synchronizedCursorDates.map((date, index) => {
    const initialValue = initialValues[view][index] ?? 0
    const value =
      updated && index === 5
        ? initialValue + (view === 'primary' ? 7 : -0.4)
        : initialValue
    return {
      id: `${view}-${date.toISOString()}`,
      date,
      value,
      view,
      series,
    }
  })
}

export function synchronizedCursorDateKey(date: Date) {
  return date.toISOString().slice(0, 10)
}

export function synchronizedCursorAnchorDate(anchor: string) {
  const key = anchor.startsWith('date:') ? anchor.slice(5) : ''
  const timestamp = Date.parse(`${key}T00:00:00.000Z`)
  if (!Number.isFinite(timestamp)) return null
  const date = new Date(timestamp)
  return date >= synchronizedCursorDateDomain[0] &&
    date <= synchronizedCursorDateDomain[1]
    ? date
    : null
}

export function synchronizedCursorDatumAtDate(
  view: SynchronizedCursorView,
  revision: number,
  date: Date,
) {
  const timestamp = date.getTime()
  return (
    synchronizedCursorData(view, revision).find(
      (datum) => datum.date.getTime() === timestamp,
    ) ?? null
  )
}

export function synchronizedCursorNearestDatum(
  view: SynchronizedCursorView,
  revision: number,
  date: Date,
) {
  const timestamp = date.getTime()
  return synchronizedCursorData(view, revision).reduce<
    SynchronizedCursorDatum | undefined
  >((nearest, datum) => {
    if (!nearest) return datum
    return Math.abs(datum.date.getTime() - timestamp) <
      Math.abs(nearest.date.getTime() - timestamp)
      ? datum
      : nearest
  }, undefined)
}
