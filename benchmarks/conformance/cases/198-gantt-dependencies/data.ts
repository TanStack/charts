export const planGroups = ['Plan', 'Build', 'Launch'] as const

export type PlanGroup = (typeof planGroups)[number]

export interface PlanTask {
  id: string
  label: string
  group: PlanGroup
  start: Date
  /** Equal to `start` for a milestone. */
  end: Date
  /** Completed share of the scheduled duration, from 0 to 1. */
  progress: number
  /** Finish-to-start predecessors by task id. */
  after: readonly string[]
}

const day = (value: string) => new Date(`${value}T00:00:00Z`)

const tasks = [
  ['research', 'User research', 'Plan', '2026-03-02', '2026-03-13', 1, []],
  ['audit', 'Content audit', 'Plan', '2026-03-04', '2026-03-18', 1, []],
  [
    'sitemap',
    'Site map',
    'Plan',
    '2026-03-19',
    '2026-03-27',
    1,
    ['research', 'audit'],
  ],
  [
    'wireframes',
    'Wireframes',
    'Plan',
    '2026-03-30',
    '2026-04-10',
    0.7,
    ['sitemap'],
  ],
  [
    'visual',
    'Visual design',
    'Build',
    '2026-03-30',
    '2026-04-17',
    0.4,
    ['sitemap'],
  ],
  ['cms', 'CMS setup', 'Build', '2026-03-23', '2026-04-10', 0.5, ['audit']],
  [
    'frontend',
    'Front end',
    'Build',
    '2026-04-20',
    '2026-05-15',
    0.1,
    ['wireframes', 'visual'],
  ],
  [
    'migration',
    'Content migration',
    'Build',
    '2026-04-13',
    '2026-05-08',
    0.2,
    ['cms'],
  ],
  [
    'qa',
    'QA and fixes',
    'Launch',
    '2026-05-18',
    '2026-05-29',
    0,
    ['frontend', 'migration'],
  ],
  [
    'accessibility',
    'Accessibility review',
    'Launch',
    '2026-05-18',
    '2026-05-26',
    0,
    ['frontend'],
  ],
  [
    'launch',
    'Go live',
    'Launch',
    '2026-06-01',
    '2026-06-01',
    0,
    ['qa', 'accessibility'],
  ],
] as const satisfies readonly (readonly [
  string,
  string,
  PlanGroup,
  string,
  string,
  number,
  readonly string[],
])[]

/** Status dates for the initial plan and one revised weekly status update. */
export const statusDates = [day('2026-04-15'), day('2026-04-22')] as const

/**
 * Returns the project plan as reported on one status date. The revision keeps
 * every task identity and dependency, advances progress, and slips one task.
 */
export function planForRevision(revision: number): PlanTask[] {
  const revised = revision % 2 === 1
  return tasks.map(([id, label, group, start, end, progress, after]) => ({
    id,
    label,
    group,
    start: day(start),
    end: revised && id === 'migration' ? day('2026-05-13') : day(end),
    progress: revised ? revisedProgress(id, progress) : progress,
    after,
  }))
}

export function statusDateForRevision(revision: number): Date {
  return statusDates[revision % 2 === 1 ? 1 : 0]
}

function revisedProgress(id: string, progress: number) {
  if (id === 'wireframes') return 1
  if (id === 'visual') return 0.75
  if (id === 'cms') return 0.9
  if (id === 'frontend') return 0.2
  if (id === 'migration') return 0.3
  return progress
}
