import type { AaplRow } from '@tanstack/charts-data/aapl'

export interface ZoomWindow {
  start: Date
  end: Date
}

export const zoomFullDomain: readonly [Date, Date] = [
  new Date(Date.UTC(2018, 0, 2)),
  new Date(Date.UTC(2018, 0, 18)),
]

export function selectZoomRows(rows: readonly AaplRow[]): readonly AaplRow[] {
  const start = zoomFullDomain[0].getTime()
  const end = zoomFullDomain[1].getTime()
  return rows.filter((row) => {
    const timestamp = row.Date.getTime()
    return timestamp >= start && timestamp <= end
  })
}

export const millisecondsPerDay = 24 * 60 * 60 * 1_000

export const initialZoomWindow: ZoomWindow = {
  start: zoomFullDomain[0],
  end: zoomFullDomain[1],
}

export function zoomDateKey(date: Date) {
  return date.toISOString().slice(0, 10)
}

export function zoomDateFromAnchor(rows: readonly AaplRow[], anchor: string) {
  const key = anchor.startsWith('date:') ? anchor.slice(5) : ''
  return rows.find((row) => zoomDateKey(row.Date) === key)?.Date ?? null
}

export function visibleZoomData(rows: readonly AaplRow[], window: ZoomWindow) {
  const start = window.start.getTime()
  const end = window.end.getTime()
  return rows.filter((row) => {
    const timestamp = row.Date.getTime()
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

export function shiftZoomWindow(
  window: ZoomWindow,
  deltaMilliseconds: number,
): ZoomWindow {
  const span = window.end.getTime() - window.start.getTime()
  return clampZoomWindow(window.start.getTime() + deltaMilliseconds, span)
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
