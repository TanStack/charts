import { defineChart, rect } from '@tanstack/charts'
import { tooltip } from '@tanstack/charts/tooltip'
import { scaleBand, scaleUtc } from 'd3-scale'
import { timelineStatusColors } from './colors'
import { timelineMargin } from './layout'
import {
  resourceLanes,
  resourceTasks,
  resourceTimelineDomain,
  timelineStatuses,
} from './scenario'
import { tanstackCase } from '../../shared/mount'
import type { ConformanceInput } from '../../types'

const taskInset = 5

export { mount } from './view'

export const resourceTimelineDefinition = (input: ConformanceInput) => {
  const rows = resourceTasks(input.revision)

  return defineChart(
    defineChart(({ width }) => {
      return {
        marks: [
          rect(rows, {
            key: 'id',
            x1: 'start',
            x2: 'end',
            y: 'resource',
            color: 'status',
            inset: taskInset,
            radius: 4,
            stroke: '#ffffff',
            strokeWidth: 1,
          }),
        ],
        x: {
          scale: scaleUtc().domain(resourceTimelineDomain),
          grid: true,
          axis: { ticks: { count: Math.max(6, Math.floor(width / 84)) } },
        },
        y: {
          scale: scaleBand<string>()
            .domain(resourceLanes)
            .paddingInner(0.08)
            .paddingOuter(0.04),
          grid: false,
          axis: false,
        },
        color: {
          domain: timelineStatuses,
          range: timelineStatuses.map((status) => timelineStatusColors[status]),
        },
        margin: timelineMargin,
      }
    }),
    {
      svgAnimation: false,
      keyboard: true,
      tooltip: {
        use: tooltip,
        format: (point) =>
          `${point.datum.resource} · ${point.datum.label} · ${
            point.datum.status
          } · ${formatTaskDate(point.datum.start)}–${formatTaskDate(
            point.datum.end,
          )}`,
      },
    },
  )
}

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
