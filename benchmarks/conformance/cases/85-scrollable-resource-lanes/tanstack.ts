import { resourceTimelineDefinition } from './example'
export { resourceTimelineDefinition } from './example'
import { tanstackCase } from '../../shared/mount'

export { default as Example } from './example'

export { mount } from './view'

export const catalogCase = tanstackCase(
  resourceTimelineDefinition,
  'Tasks scheduled across five resource lanes',
  {
    format: (point) =>
      `${point.datum.resource} · ${point.datum.label} · ${
        point.datum.status
      } · ${formatTaskDate(point.datum.start)}–${formatTaskDate(
        point.datum.end,
      )}`,
  },
)

function formatTaskDate(date: Date) {
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })
}
