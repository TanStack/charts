export const resourceLanes = [
  'Design',
  'Infrastructure',
  'API',
  'Quality',
  'Docs',
] as const

export type ResourceLane = (typeof resourceLanes)[number]

export const timelineStatuses = ['planned', 'active', 'review'] as const

export type TimelineStatus = (typeof timelineStatuses)[number]

export interface ResourceTask {
  id: string
  resource: ResourceLane
  label: string
  start: Date
  end: Date
  status: TimelineStatus
}

const day = 86_400_000

export const resourceTimelineDomain: readonly [Date, Date] = [
  utcDay(1),
  utcDay(74),
]

const initialTasks: readonly ResourceTask[] = [
  task('design-plan', 'Design', 'Experience plan', 2, 11, 'planned'),
  task('design-system', 'Design', 'Interface system', 34, 49, 'active'),
  task(
    'infra-foundation',
    'Infrastructure',
    'Runtime foundation',
    4,
    16,
    'active',
  ),
  task(
    'infra-hardening',
    'Infrastructure',
    'Runtime hardening',
    55,
    68,
    'review',
  ),
  task('api-contract', 'API', 'Contract review', 1, 9, 'review'),
  task('api-build', 'API', 'Endpoint build', 27, 44, 'active'),
  task('quality-fixtures', 'Quality', 'Fixture suite', 7, 18, 'planned'),
  task('quality-release', 'Quality', 'Release checks', 46, 59, 'review'),
  task('docs-outline', 'Docs', 'Guide outline', 3, 14, 'planned'),
  task('docs-publish', 'Docs', 'Publish guides', 60, 72, 'active'),
]

export function resourceTasks(revision = 0): readonly ResourceTask[] {
  if (revision % 2 === 0) return initialTasks

  return initialTasks.map((row) => {
    if (row.id === 'api-build') {
      return { ...row, end: new Date(row.end.getTime() + day * 3) }
    }
    if (row.id === 'quality-release') {
      return { ...row, start: new Date(row.start.getTime() - day * 2) }
    }
    return row
  })
}

function task(
  id: string,
  resource: ResourceLane,
  label: string,
  startDay: number,
  endDay: number,
  status: TimelineStatus,
): ResourceTask {
  return {
    id,
    resource,
    label,
    start: utcDay(startDay),
    end: utcDay(endDay),
    status,
  }
}

function utcDay(dayOfYear: number) {
  return new Date(Date.UTC(2025, 0, dayOfYear))
}
