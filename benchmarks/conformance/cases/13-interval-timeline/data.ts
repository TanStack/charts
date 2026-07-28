export interface TimelinePoint {
  id: string
  task: string
  start: number
  end: number
  phase: 'Plan' | 'Build' | 'Ship'
}

const tasks = [
  'Research',
  'Schema',
  'Prototype',
  'Core API',
  'Adapters',
  'Documentation',
  'Hardening',
  'Release',
] as const
const phases: readonly TimelinePoint['phase'][] = ['Plan', 'Build', 'Ship']

export function timelineData(revision = 0): readonly TimelinePoint[] {
  return tasks.map((task, index) => {
    const start = index * 4 + (index > 3 ? 2 : 0)
    return {
      id: task,
      task,
      start,
      end: start + 5 + ((index + revision) % 4),
      phase: phases[Math.min(2, Math.floor(index / 3))] ?? 'Ship',
    }
  })
}
