export interface FocusContextDatum {
  id: string
  date: Date
  value: number
}

export interface FocusContextWindow {
  selected: Date
  start: Date
  end: Date
}

export const focusContextDates: readonly Date[] = Array.from(
  { length: 12 },
  (_, index) => new Date(Date.UTC(2025, index, 1)),
)

export const focusContextDomain: readonly [Date, Date] = [
  focusContextDates[0] ?? new Date(Date.UTC(2025, 0, 1)),
  focusContextDates[11] ?? new Date(Date.UTC(2025, 11, 1)),
]

const initialValues = [38, 44, 41, 53, 58, 55, 66, 62, 71, 75, 69, 82] as const

export function focusContextData(revision = 0): readonly FocusContextDatum[] {
  const updated = revision % 2 === 1
  return focusContextDates.map((date, index) => {
    const initialValue = initialValues[index] ?? 0
    return {
      id: dateKey(date),
      date,
      value:
        updated && (index === 6 || index === 9)
          ? initialValue + (index === 6 ? 5 : -4)
          : initialValue,
    }
  })
}

export function initialFocusContextWindow(): FocusContextWindow {
  return windowForDate(focusContextDates[5] ?? focusContextDomain[0])
}

export function windowForDate(selected: Date): FocusContextWindow {
  const selectedIndex = Math.max(
    0,
    focusContextDates.findIndex(
      (date) => date.getTime() === selected.getTime(),
    ),
  )
  const startIndex = Math.min(
    focusContextDates.length - 4,
    Math.max(0, selectedIndex - 1),
  )
  return {
    selected: focusContextDates[selectedIndex] ?? focusContextDomain[0],
    start: focusContextDates[startIndex] ?? focusContextDomain[0],
    end: focusContextDates[startIndex + 3] ?? focusContextDomain[1],
  }
}

export function rowsInWindow(
  rows: readonly FocusContextDatum[],
  window: FocusContextWindow,
) {
  const start = window.start.getTime()
  const end = window.end.getTime()
  return rows.filter((row) => {
    const timestamp = row.date.getTime()
    return timestamp >= start && timestamp <= end
  })
}

export function dateKey(date: Date) {
  return date.toISOString().slice(0, 10)
}

export function dateFromAnchor(anchor: string) {
  const key = anchor.startsWith('date:') ? anchor.slice(5) : ''
  return focusContextDates.find((date) => dateKey(date) === key) ?? null
}
