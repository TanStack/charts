export interface ZoomDatum {
  id: string
  date: Date
  value: number
}

export interface ZoomWindow {
  start: Date
  end: Date
}

export const millisecondsPerDay = 24 * 60 * 60 * 1_000

export const zoomDates: readonly Date[] = Array.from(
  { length: 17 },
  (_, index) => new Date(Date.UTC(2025, 0, index + 1)),
)

export const zoomFullDomain: readonly [Date, Date] = [
  zoomDates[0] ?? new Date(Date.UTC(2025, 0, 1)),
  zoomDates[16] ?? new Date(Date.UTC(2025, 0, 17)),
]

export const initialZoomWindow: ZoomWindow = {
  start: zoomFullDomain[0],
  end: zoomFullDomain[1],
}

const values = [
  32, 37, 35, 42, 47, 44, 51, 55, 52, 59, 63, 60, 67, 65, 71, 74, 77,
] as const

export function zoomData(revision = 0): readonly ZoomDatum[] {
  const updated = revision % 2 === 1
  return zoomDates.map((date, index) => {
    const value = values[index] ?? 0
    return {
      id: zoomDateKey(date),
      date,
      value: updated && (index === 7 || index === 12) ? value + 4 : value,
    }
  })
}

export function zoomDateKey(date: Date) {
  return date.toISOString().slice(0, 10)
}

export function zoomDateFromAnchor(anchor: string) {
  const key = anchor.startsWith('date:') ? anchor.slice(5) : ''
  return zoomDates.find((date) => zoomDateKey(date) === key) ?? null
}

export function visibleZoomData(
  rows: readonly ZoomDatum[],
  window: ZoomWindow,
) {
  const start = window.start.getTime()
  const end = window.end.getTime()
  return rows.filter((row) => {
    const timestamp = row.date.getTime()
    return timestamp >= start && timestamp <= end
  })
}

export function zoomSpanDays(window: ZoomWindow) {
  return (window.end.getTime() - window.start.getTime()) / millisecondsPerDay
}

export function zoomWindowAt(
  window: ZoomWindow,
  anchor: Date,
  factor: number,
): ZoomWindow {
  const start = window.start.getTime()
  const end = window.end.getTime()
  const span = end - start
  const fullSpan = zoomFullDomain[1].getTime() - zoomFullDomain[0].getTime()
  const nextSpan = Math.min(
    fullSpan,
    Math.max(2 * millisecondsPerDay, span * factor),
  )
  if (nextSpan >= fullSpan) return { ...initialZoomWindow }
  const anchorTime = Math.min(end, Math.max(start, anchor.getTime()))
  const ratio = span === 0 ? 0.5 : (anchorTime - start) / span
  return clampZoomWindow(anchorTime - ratio * nextSpan, nextSpan)
}

export function panZoomWindow(
  window: ZoomWindow,
  direction: -1 | 1,
): ZoomWindow {
  const span = window.end.getTime() - window.start.getTime()
  return clampZoomWindow(window.start.getTime() + direction * span * 0.25, span)
}

function clampZoomWindow(start: number, span: number): ZoomWindow {
  const domainStart = zoomFullDomain[0].getTime()
  const domainEnd = zoomFullDomain[1].getTime()
  let nextStart = start
  let nextEnd = start + span
  if (nextStart < domainStart) {
    nextEnd += domainStart - nextStart
    nextStart = domainStart
  }
  if (nextEnd > domainEnd) {
    nextStart -= nextEnd - domainEnd
    nextEnd = domainEnd
  }
  return {
    start: new Date(Math.max(domainStart, nextStart)),
    end: new Date(Math.min(domainEnd, nextEnd)),
  }
}
