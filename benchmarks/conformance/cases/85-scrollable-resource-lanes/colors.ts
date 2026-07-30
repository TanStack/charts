import type { TimelineStatus } from './scenario'

export const timelineStatusColors: Readonly<Record<TimelineStatus, string>> = {
  planned: '#64748b',
  active: '#2563eb',
  review: '#c2410c',
}
