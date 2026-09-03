import type { AaplRow } from '@tanstack/charts-data/aapl'

export interface FocusContextWindow {
  selected: Date
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

export function focusContextDomain(
  rows: readonly AaplRow[],
): readonly [Date, Date] {
  const first = rows[0]
  const last = rows.at(-1)
  if (!first || !last) throw new Error('Focus/context requires AAPL rows.')
  return [first.Date, last.Date]
}

export function initialFocusContextWindow(
  dates: readonly Date[],
): FocusContextWindow {
  const selected = dates[5] ?? dates[0]
  if (!selected) throw new Error('Focus/context requires observed dates.')
  return windowForDate(dates, selected)
}

export function windowForDate(
  dates: readonly Date[],
  selected: Date,
): FocusContextWindow {
  const selectedIndex = Math.max(
    0,
    dates.findIndex((date) => date.getTime() === selected.getTime()),
  )
  const startIndex = Math.min(dates.length - 4, Math.max(0, selectedIndex - 1))
  const selectedDate = dates[selectedIndex]
  const start = dates[startIndex]
  const end = dates[startIndex + 3]
  if (!selectedDate || !start || !end) {
    throw new Error('Focus/context requires at least four observed dates.')
  }
  return {
    selected: selectedDate,
    start,
    end,
  }
}

export function rowsInWindow(
  rows: readonly AaplRow[],
  window: FocusContextWindow,
) {
  const start = window.start.getTime()
  const end = window.end.getTime()
  return rows.filter((row) => {
    const timestamp = row.Date.getTime()
    return timestamp >= start && timestamp <= end
  })
}

export function dateKey(date: Date) {
  return date.toISOString().slice(0, 10)
}

export function dateFromAnchor(dates: readonly Date[], anchor: string) {
  const key = anchor.startsWith('date:') ? anchor.slice(5) : ''
  return dates.find((date) => dateKey(date) === key) ?? null
}
