import * as Plot from '@observablehq/plot'
import { planForRevision, planGroups, statusDateForRevision } from './data'
import { planLayout } from './plan'
import { elbowRoute } from './route'
import { mountObservablePlot } from '../../shared/mount'
import type { ConformanceMount } from '../../types'

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

export const mount: ConformanceMount = (container, input) =>
  mountObservablePlot(container, input, (nextInput) => {
    const plan = planLayout(planForRevision(nextInput.revision))
    const statusDate = statusDateForRevision(nextInput.revision)
    const narrow = nextInput.width < 520
    const labelWidth = narrow ? 128 : 156
    // Assumes about 72 px of combined top and bottom margin for the x axis.
    const gutter = Math.max(
      6,
      ((nextInput.height - 72) / plan.lanes.length) * 0.5,
    )
    const [domainStart, domainEnd] = plan.domain
    const groups = plan.items.filter((item) => item.kind === 'group')
    const connector = {
      x1: 'from',
      y1: 'fromLane',
      x2: 'to',
      y2: 'toLane',
      stroke: 'currentColor',
      strokeOpacity: 0.6,
      strokeWidth: 1.25,
    } as const

    return Plot.plot({
      width: nextInput.width,
      height: nextInput.height,
      ariaLabel:
        'Website relaunch plan: three phases, ten tasks, a go-live milestone, and finish-to-start dependencies',
      marginLeft: labelWidth,
      x: {
        type: 'utc',
        domain: plan.domain,
        grid: true,
        label: null,
        ticks: Math.max(3, Math.floor((nextInput.width - labelWidth) / 90)),
        tickFormat: (value: Date) =>
          narrow ? monthDay.format(value) : shortDate.format(value),
      },
      y: {
        type: 'band',
        domain: plan.lanes,
        paddingInner: 0.32,
        paddingOuter: 0.2,
        label: null,
        axis: null,
      },
      color: { domain: planGroups, range: groupColors },
      marks: [
        Plot.axisY(
          plan.lanes.filter((lane) => plan.groupLanes.has(lane)),
          {
            tickSize: 0,
            tickPadding: labelWidth - 8,
            textAnchor: 'start',
            fontWeight: 'bold',
          },
        ),
        Plot.axisY(
          plan.lanes.filter((lane) => !plan.groupLanes.has(lane)),
          {
            tickSize: 0,
            tickPadding: labelWidth - 20,
            textAnchor: 'start',
          },
        ),
        Plot.barX(groups, {
          x1: () => domainStart,
          x2: () => domainEnd,
          y: 'lane',
          fill: 'currentColor',
          fillOpacity: 0.06,
          inset: 0,
        }),
        Plot.barX(
          plan.items.filter((item) => item.kind === 'task'),
          {
            x1: 'start',
            x2: 'end',
            y: 'lane',
            fill: 'group',
            fillOpacity: 0.3,
            inset: 0,
          },
        ),
        Plot.barX(plan.progress, {
          x1: 'start',
          x2: 'end',
          y: 'lane',
          fill: 'group',
          inset: 0,
        }),
        Plot.barX(groups, {
          x1: 'start',
          x2: 'end',
          y: 'lane',
          fill: 'currentColor',
          fillOpacity: 0.2,
          stroke: 'currentColor',
          strokeWidth: 1.5,
          inset: 0,
        }),
        Plot.link(
          plan.dependencies.filter((entry) => !entry.toMilestone),
          { ...connector, curve: elbowRoute({ gutter }) },
        ),
        Plot.link(
          plan.dependencies.filter((entry) => entry.toMilestone),
          {
            ...connector,
            curve: elbowRoute({ gutter, endGap: milestoneRadius + 2 }),
          },
        ),
        Plot.dot(
          plan.items.filter((item) => item.kind === 'milestone'),
          {
            x: 'start',
            y: 'lane',
            fill: 'group',
            r: milestoneRadius,
            stroke: 'currentColor',
            strokeWidth: 1.5,
          },
        ),
        Plot.ruleX([statusDate], {
          stroke: 'currentColor',
          strokeOpacity: 0.7,
          strokeDasharray: '4 3',
        }),
      ],
    })
  })
