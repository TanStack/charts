import type { AaplRow } from '@tanstack/charts-data/aapl'

export interface BrushRange {
  start: Date
  end: Date
}

export function monthlyAaplRows(rows: readonly AaplRow[]): readonly AaplRow[] {
  const byMonth = new Map<number, AaplRow>()
  for (const row of rows) {
    if (row.Date.getUTCFullYear() === 2017) {
      byMonth.set(row.Date.getUTCMonth(), row)
    }
  }
  return [...byMonth.values()]
}

export function observedBrushDates(rows: readonly AaplRow[]) {
  return rows.map((row) => row.Date)
}

export function brushDomain(dates: readonly Date[]): readonly [Date, Date] {
  const first = dates[0]
  const last = dates.at(-1)
  if (!first || !last) throw new Error('Brush selection requires dates.')
  return [first, last]
}

export function initialBrushRange(dates: readonly Date[]): BrushRange {
  const start = dates[3]
  const end = dates[5]
  if (!start || !end) throw new Error('Brush selection requires six dates.')
  return { start, end }
}

export function brushDateKey(date: Date) {
  return date.toISOString().slice(0, 10)
}

export function brushShortDate(date: Date) {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

export function brushDateFromAnchor(dates: readonly Date[], anchor: string) {
  const key = anchor.startsWith('date:') ? anchor.slice(5) : ''
  return dates.find((date) => brushDateKey(date) === key) ?? null
}

export function clampBrushDate(dates: readonly Date[], date: Date) {
  const first = dates[0]
  if (!first) throw new Error('Brush selection requires dates.')
  return dates.reduce((nearest, candidate) =>
    Math.abs(candidate.getTime() - date.getTime()) <
    Math.abs(nearest.getTime() - date.getTime())
      ? candidate
      : nearest,
  )
}

export function normalizedBrushRange(a: Date, b: Date): BrushRange {
  return a.getTime() <= b.getTime()
    ? { start: a, end: b }
    : { start: b, end: a }
}

export function brushRowsInRange(rows: readonly AaplRow[], range: BrushRange) {
  const start = range.start.getTime()
  const end = range.end.getTime()
  return rows.filter((row) => {
    const timestamp = row.Date.getTime()
    return timestamp >= start && timestamp <= end
  })
}

export function brushRangeSummary(rows: readonly AaplRow[], range: BrushRange) {
  const selected = brushRowsInRange(rows, range)
  const total = selected.reduce((sum, row) => sum + row.Close, 0)
  const first = selected[0]
  const last = selected.at(-1)
  return {
    count: selected.length,
    average: selected.length ? total / selected.length : 0,
    change: first && last ? last.Close - first.Close : 0,
  }
}
