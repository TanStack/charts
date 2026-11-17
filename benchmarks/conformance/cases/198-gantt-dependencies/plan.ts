import { planGroups } from './data'
import type { PlanGroup, PlanTask } from './data'

/** One focusable schedule row: a group summary, a task, or a milestone. */
export interface PlanItem {
  id: string
  label: string
  kind: 'group' | 'task' | 'milestone'
  group: PlanGroup
  /** Band-scale lane. Group lanes use the group name; child lanes use the label. */
  lane: string
  start: Date
  end: Date
  progress: number
  /** Predecessor labels, for descriptions. */
  after: readonly string[]
}

/** A completed share drawn over its task. */
export interface ProgressSpan {
  id: string
  group: PlanGroup
  lane: string
  start: Date
  end: Date
}

/** One finish-to-start dependency from a predecessor's end to a successor's start. */
export interface Dependency {
  id: string
  fromLane: string
  toLane: string
  from: Date
  to: Date
  toMilestone: boolean
}

export interface PlanLayout {
  lanes: string[]
  groupLanes: ReadonlySet<string>
  items: PlanItem[]
  progress: ProgressSpan[]
  dependencies: Dependency[]
  domain: [Date, Date]
}

const dayMs = 86_400_000

/**
 * Orders lanes as group header followed by its child rows, rolls child dates
 * and duration-weighted progress into each group summary, and resolves every
 * finish-to-start dependency into lane and date endpoints.
 */
export function planLayout(tasks: readonly PlanTask[]): PlanLayout {
  const byId = new Map(tasks.map((task) => [task.id, task]))
  const lanes: string[] = []
  const items: PlanItem[] = []

  for (const group of planGroups) {
    const children = tasks.filter((task) => task.group === group)
    if (!children.length) continue
    const start = new Date(Math.min(...children.map((task) => +task.start)))
    const end = new Date(Math.max(...children.map((task) => +task.end)))
    const duration = children.reduce((sum, task) => sum + span(task), 0)
    const done = children.reduce(
      (sum, task) => sum + span(task) * task.progress,
      0,
    )
    lanes.push(group)
    items.push({
      id: `group:${group}`,
      label: group,
      kind: 'group',
      group,
      lane: group,
      start,
      end,
      progress: duration > 0 ? done / duration : 0,
      after: [],
    })
    for (const task of children) {
      lanes.push(task.label)
      items.push({
        id: task.id,
        label: task.label,
        kind: +task.start === +task.end ? 'milestone' : 'task',
        group,
        lane: task.label,
        start: task.start,
        end: task.end,
        progress: task.progress,
        after: task.after.map((id) => byId.get(id)?.label ?? id),
      })
    }
  }

  const progress = items
    .filter((item) => item.kind === 'task' && item.progress > 0)
    .map((item) => ({
      id: item.id,
      group: item.group,
      lane: item.lane,
      start: item.start,
      end: new Date(+item.start + (+item.end - +item.start) * item.progress),
    }))

  const dependencies = tasks.flatMap((task) =>
    task.after.flatMap((id) => {
      const predecessor = byId.get(id)
      if (!predecessor) return []
      return [
        {
          id: `${id}->${task.id}`,
          fromLane: predecessor.label,
          toLane: task.label,
          from: predecessor.end,
          to: task.start,
          toMilestone: +task.start === +task.end,
        },
      ]
    }),
  )

  const first = Math.min(...tasks.map((task) => +task.start))
  const last = Math.max(...tasks.map((task) => +task.end))

  return {
    lanes,
    groupLanes: new Set(planGroups),
    items,
    progress,
    dependencies,
    domain: [new Date(first - 3 * dayMs), new Date(last + 4 * dayMs)],
  }
}

function span(task: PlanTask) {
  return Math.max(0, +task.end - +task.start)
}
