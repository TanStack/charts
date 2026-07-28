export interface BrushDatum {
  id: string
  date: Date
  value: number
}

export interface BrushRange {
  start: Date
  end: Date
}

export const brushDates: readonly Date[] = Array.from(
  { length: 12 },
  (_, index) => new Date(Date.UTC(2025, index, 1)),
)

export const brushDomain: readonly [Date, Date] = [
  brushDates[0] ?? new Date(Date.UTC(2025, 0, 1)),
  brushDates[11] ?? new Date(Date.UTC(2025, 11, 1)),
]

export const initialBrushRange: BrushRange = {
  start: brushDates[3] ?? brushDomain[0],
  end: brushDates[5] ?? brushDomain[1],
}

const values = [31, 37, 35, 46, 42, 55, 61, 58, 66, 63, 72, 76] as const

export function brushData(revision = 0): readonly BrushDatum[] {
  const updated = revision % 2 === 1
  return brushDates.map((date, index) => {
    const value = values[index] ?? 0
    return {
      id: brushDateKey(date),
      date,
      value: updated && (index === 4 || index === 8) ? value + 5 : value,
    }
  })
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

export function brushDateFromAnchor(anchor: string) {
  const key = anchor.startsWith('date:') ? anchor.slice(5) : ''
  return brushDates.find((date) => brushDateKey(date) === key) ?? null
}

export function clampBrushDate(date: Date) {
  const timestamp = Math.min(
    brushDomain[1].getTime(),
    Math.max(brushDomain[0].getTime(), utcMonth.round(date).getTime()),
  )
  return new Date(timestamp)
}

export function normalizedBrushRange(a: Date, b: Date): BrushRange {
  return a.getTime() <= b.getTime()
    ? { start: a, end: b }
    : { start: b, end: a }
}

export function brushRowsInRange(
  rows: readonly BrushDatum[],
  range: BrushRange,
) {
  const start = range.start.getTime()
  const end = range.end.getTime()
  return rows.filter((row) => {
    const timestamp = row.date.getTime()
    return timestamp >= start && timestamp <= end
  })
}

export function brushRangeSummary(
  rows: readonly BrushDatum[],
  range: BrushRange,
) {
  const selected = brushRowsInRange(rows, range)
  const total = selected.reduce((sum, row) => sum + row.value, 0)
  return {
    count: selected.length,
    total,
    average: selected.length ? total / selected.length : 0,
  }
}
import { utcMonth } from 'd3-time'
