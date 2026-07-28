import { utcDay } from 'd3-time'

export type EditableEventId = 'discovery' | 'design' | 'campaign' | 'release'

export type EditableLane = 'Product' | 'Design' | 'Marketing' | 'Engineering'

export interface EditableEvent {
  id: EditableEventId
  label: string
  lane: EditableLane
  start: Date
  end: Date
}

const day = 86_400_000

export const editableLanes: readonly EditableLane[] = [
  'Product',
  'Design',
  'Marketing',
  'Engineering',
]

export const editableDomain: readonly [Date, Date] = [
  utcDate(2025, 0, 1),
  utcDate(2025, 2, 1),
]

export const editableEventStart = utcDate(2025, 1, 3)
export const initialEditableEventEnd = utcDate(2025, 1, 12)

export function editableEvents(
  revision = 0,
  releaseEnd = initialEditableEventEnd,
): readonly EditableEvent[] {
  const updated = revision % 2 === 1
  return [
    {
      id: 'discovery',
      label: 'Discovery',
      lane: 'Product',
      start: utcDate(2025, 0, 4),
      end: utcDate(2025, 0, 13),
    },
    {
      id: 'design',
      label: 'Design system',
      lane: 'Design',
      start: utcDate(2025, 0, 10),
      end: utcDate(2025, 0, updated ? 26 : 24),
    },
    {
      id: 'campaign',
      label: 'Campaign',
      lane: 'Marketing',
      start: utcDate(2025, 0, updated ? 19 : 20),
      end: utcDate(2025, 1, 7),
    },
    {
      id: 'release',
      label: 'Release window',
      lane: 'Engineering',
      start: editableEventStart,
      end: releaseEnd,
    },
  ]
}

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

export function editableEventColor(id: EditableEventId) {
  return id === 'release' ? '#f97316' : '#2563eb'
}

function utcDate(year: number, month: number, date: number) {
  return new Date(Date.UTC(year, month, date))
}
