import { utcDay } from 'd3-time'
import { editableDomain, editableEventStart } from './scenario'

const day = 86_400_000

export const editableEventEndValues = utcDay.range(
  utcDay.offset(editableEventStart, 1),
  utcDay.offset(editableDomain[1], 1),
)

export function editableDateKey(date: Date) {
  return date.toISOString().slice(0, 10)
}

export function editableDateFromAnchor(anchor: string) {
  const key = anchor.startsWith('date:') ? anchor.slice(5) : ''
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return null
  const date = new Date(`${key}T00:00:00.000Z`)
  if (
    !Number.isFinite(date.getTime()) ||
    editableDateKey(date) !== key ||
    date < editableDomain[0] ||
    date > editableDomain[1]
  ) {
    return null
  }
  return date
}

export function clampEditableEventEnd(date: Date) {
  const minimum = editableEventStart.getTime() + day
  const timestamp = Math.min(
    editableDomain[1].getTime(),
    Math.max(minimum, utcDay.round(date).getTime()),
  )
  return new Date(timestamp)
}

export function editableDurationDays(start: Date, end: Date) {
  return (end.getTime() - start.getTime()) / day
}
