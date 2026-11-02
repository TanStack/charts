import { Chart } from '@tanstack/charts/react/tooltip'
import { tooltip as exampleTooltip } from '@tanstack/charts/tooltip'

import {
  d3Curve,
  defineChart,
  dot,
  link,
  rect,
  ruleX,
  type ChartPoint,
} from '@tanstack/charts'
import { focusNearestY } from '@tanstack/charts/focus'
import { decorative } from '@tanstack/charts/mark/decorative'
import { scaleBand, scaleUtc } from 'd3-scale'
import { planForRevision, planGroups, statusDateForRevision } from './data'
import { planLayout } from './plan'
import { elbowRoute } from './route'
import type { PlanItem } from './plan'

const groupColors = [
  'var(--ts-chart-1, #2563eb)',
  'var(--ts-chart-2, #f97316)',
  'var(--ts-chart-3, #10b981)',
]
const milestoneRadius = 6
const shortDate = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
})
const monthDay = new Intl.DateTimeFormat('en-US', {
  month: 'numeric',
  day: 'numeric',
  timeZone: 'UTC',
})
const percent = new Intl.NumberFormat('en-US', { style: 'percent' })

export interface ChartOptions {
  revision: number
}

export function describePlanItem(item: PlanItem) {
  const after = item.after.length ? ` · after ${item.after.join(', ')}` : ''
  if (item.kind === 'milestone') {
    return `${item.label} milestone · ${shortDate.format(item.start)}${after}`
  }
  const dates = `${shortDate.format(item.start)} – ${shortDate.format(item.end)}`
  const done = `${percent.format(item.progress)} complete`
  return item.kind === 'group'
    ? `${item.label} phase · ${dates} · ${done}`
    : `${item.label} · ${item.group} · ${dates} · ${done}${after}`
}

// Pointer focus snaps to the hovered lane. Arrow keys walk the lane tree from
// top to bottom instead of the default left-to-right order.
const laneFocus = {
  ...focusNearestY,
  navigation: <TPoint extends { x: number; y: number }>(
    points: readonly TPoint[],
  ) => [...points].sort((left, right) => left.y - right.y || left.x - right.x),
}

export const createExampleChart = (input: ChartOptions) => {
  const plan = planLayout(planForRevision(input.revision))
  const statusDate = statusDateForRevision(input.revision)
  const tasks = plan.items.filter((item) => item.kind === 'task')
  const groups = plan.items.filter((item) => item.kind === 'group')
  const milestones = plan.items.filter((item) => item.kind === 'milestone')
  const [domainStart, domainEnd] = plan.domain

  return defineChart(
    ({ width, height }) => {
      const narrow = width < 520
      const labelWidth = narrow ? 128 : 156
      const lanes = scaleBand<string>()
        .domain(plan.lanes)
        .paddingInner(0.32)
        .paddingOuter(0.2)
      // Half of one lane step keeps backward connectors in the lane gutter.
      // Assumes about 72 px of combined top and bottom margin for the x axis.
      const gutter = Math.max(6, ((height - 72) / plan.lanes.length) * 0.5)
      const connector = {
        x1: 'from',
        y1: 'fromLane',
        x2: 'to',
        y2: 'toLane',
        key: 'id',
        stroke: 'currentColor',
        strokeOpacity: 0.6,
        strokeWidth: 1.25,
      } as const

      return {
        marks: [
          decorative(
            rect(groups, {
              id: 'group-lanes',
              key: 'id',
              x1: () => domainStart,
              x2: () => domainEnd,
              y: 'lane',
              fill: 'currentColor',
              fillOpacity: 0.06,
              inset: 0,
            }),
          ),
          rect(tasks, {
            id: 'tasks',
            key: 'id',
            x1: 'start',
            x2: 'end',
            y: 'lane',
            color: 'group',
            fillOpacity: 0.3,
            inset: 0,
            radius: 3,
          }),
          decorative(
            rect(plan.progress, {
              id: 'progress',
              key: 'id',
              x1: 'start',
              x2: 'end',
              y: 'lane',
              color: 'group',
              inset: 0,
              radius: 3,
            }),
          ),
          // An outlined, lightly filled summary keeps crossing connectors visible.
          rect(groups, {
            id: 'group-summaries',
            key: 'id',
            x1: 'start',
            x2: 'end',
            y: 'lane',
            fill: 'currentColor',
            fillOpacity: 0.2,
            stroke: 'currentColor',
            strokeWidth: 1.5,
            inset: 0,
            radius: 2,
          }),
          decorative(
            link(
              plan.dependencies.filter((entry) => !entry.toMilestone),
              {
                ...connector,
                id: 'task-dependencies',
                curve: d3Curve(elbowRoute({ gutter })),
              },
            ),
          ),
          decorative(
            link(
              plan.dependencies.filter((entry) => entry.toMilestone),
              {
                ...connector,
                id: 'milestone-dependencies',
                curve: d3Curve(
                  elbowRoute({ gutter, endGap: milestoneRadius + 2 }),
                ),
              },
            ),
          ),
          dot(milestones, {
            id: 'milestones',
            key: 'id',
            x: 'start',
            y: 'lane',
            color: 'group',
            r: milestoneRadius,
            stroke: 'currentColor',
            strokeWidth: 1.5,
          }),
          decorative(
            ruleX([statusDate], {
              id: 'status-date',
              stroke: 'currentColor',
              strokeOpacity: 0.7,
              strokeDasharray: '4 3',
            }),
          ),
        ] as const,
        scales: {
          x: {
            scale: scaleUtc().domain(plan.domain),
            grid: true,
            axis: {
              ticks: {
                count: Math.max(3, Math.floor((width - labelWidth) / 90)),
                format: (value: Date) =>
                  narrow ? monthDay.format(value) : shortDate.format(value),
              },
            },
          },
          y: {
            scale: lanes,
            axis: {
              line: false,
              ticks: { size: 0, padding: 0 },
              tickLabels: {
                anchor: 'start',
                // Left-align the lane tree inside the fixed label column.
                dx: ({ value }) =>
                  (plan.groupLanes.has(value) ? 8 : 20) - labelWidth,
                fontWeight: ({ value }) =>
                  plan.groupLanes.has(value) ? 700 : 400,
                opacity: ({ value }) => (plan.groupLanes.has(value) ? 1 : 0.8),
              },
            },
          },
        },
        color: {
          domain: planGroups,
          range: groupColors,
        },
        margin: { left: labelWidth },
      }
    },
    {
      keyboard: true,
      focus: laneFocus,
      tooltip: {
        use: exampleTooltip,
        format: ({ datum }: ChartPoint<PlanItem>) => describePlanItem(datum),
      },
    },
  )
}

export const exampleAriaLabel =
  'Website relaunch plan: three phases, ten tasks, a go-live milestone, and finish-to-start dependencies'

export const chart = createExampleChart({ revision: 0 })

export default function Example() {
  return <Chart ariaLabel={exampleAriaLabel} definition={chart} height={520} />
}
