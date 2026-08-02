import { cell, defineChart } from '@tanstack/charts'
import { portal } from '@tanstack/charts/tooltip/portal'
import { scaleBand, scaleOrdinal } from 'd3-scale'
import {
  calendarMonthTicks,
  calendarWeekCount,
  formatTokenUsage,
  tokenUsageCalendar,
  usageColors,
  usageLevels,
  weekdays,
} from './model'
import {
  calendarBandPaddingInner,
  calendarBandPaddingOuter,
  calendarBottomMargin,
  calendarMargin,
} from './layout'
import { withTokenActivityShell } from './shell'
import { tanstackMount } from '../../shared/mount'
import type { ConformanceInput } from '../../types'

const weekDomain = Array.from(
  { length: calendarWeekCount },
  (_value, index) => index,
)

export const tokenUsageCalendarDefinition = (input: ConformanceInput) => {
  const days = tokenUsageCalendar(input.revision)
  const monthTicks = calendarMonthTicks()

  return defineChart(({ width, height }) => {
    return {
      marks: [
        cell(days, {
          x: 'week',
          y: 'weekday',
          color: 'level',
          key: 'dateKey',
          inset: 0,
          radius: 3,
        }),
      ],
      x: {
        scale: scaleBand<number>()
          .domain(weekDomain)
          .paddingInner(calendarBandPaddingInner)
          .paddingOuter(calendarBandPaddingOuter),
        axis: {
          line: false,
          ticks: {
            values: monthTicks.values,
            size: 0,
            padding: 7,
            format: (week: number) => monthTicks.labels.get(week) ?? '',
          },
          tickLabels: { thin: { minGap: 8, priority: 'ends' } },
        },
      },
      y: {
        scale: scaleBand<string>()
          .domain(weekdays)
          .paddingInner(calendarBandPaddingInner)
          .paddingOuter(calendarBandPaddingOuter),
        axis: false,
      },
      color: {
        scale: scaleOrdinal<string, string>()
          .domain(usageLevels)
          .range(usageColors),
      },
      margin: {
        ...calendarMargin,
        bottom: calendarBottomMargin(width, height),
      },
    }
  })
}

export const mount = withTokenActivityShell(
  tanstackMount(
    tokenUsageCalendarDefinition,
    'Token activity from August 2025 through July 2026. Weeks are columns and Sunday through Saturday are rows. Pale gray means no usage; blue intensity ranges from up to 25 million through over 150 million tokens.',
    {
      anchor: 'point',
      className: 'token-activity-tooltip',
      format: ({ datum }) => formatTokenUsage(datum),
      offset: 5,
      portal,
    },
  ),
)
