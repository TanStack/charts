import type { EditableEventId } from './scenario'

export function editableEventColor(id: EditableEventId) {
  return id === 'release' ? '#f97316' : '#2563eb'
}
