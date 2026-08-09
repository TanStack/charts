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
import { tanstackCase, tanstackMount } from '../../shared/mount'
import type { ConformanceInput } from '../../types'

const weekDomain = Array.from(
  { length: calendarWeekCount },
  (_value, index) => index,
)

export const tokenUsageCalendarDefinition = (input: ConformanceInput) => {
  const days = tokenUsageCalendar(input.revision)
  const monthTicks = calendarMonthTicks()

  return defineChart({
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
          padding: input.preview === true ? 3 : 7,
          format: (week: number) => monthTicks.labels.get(week) ?? '',
        },
        tickLabels: {
          fontSize: 13,
          ...(input.preview === true ? { fontSize: 8 } : {}),
          opacity: 0.62,
          anchor: ({ index }) => (index === 0 ? 'start' : undefined),
          dx: ({ index, bandwidth }) =>
            index === 0 ? -bandwidth / 2 : undefined,
          thin: {
            minGap: input.preview === true ? 2 : 8,
            priority: 'ends',
          },
        },
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
    margin:
      input.preview === true
        ? { top: 0, right: 0, bottom: 16, left: 0 }
        : {
            ...calendarMargin,
            bottom: calendarBottomMargin(input.width, input.height),
          },
  })
}

const ariaLabel =
  'Token activity from August 2025 through July 2026. Weeks are columns and Sunday through Saturday are rows. Pale gray means no usage; blue intensity ranges from up to 25 million through over 150 million tokens.'
const interactiveTooltip = {
  anchor: 'point' as const,
  className: 'token-activity-tooltip',
  format: ({
    datum,
  }: {
    datum: ReturnType<typeof tokenUsageCalendar>[number]
  }) => formatTokenUsage(datum),
  offset: 5,
  portal,
}

export const catalogCase = tanstackCase(
  tokenUsageCalendarDefinition,
  ariaLabel,
  interactiveTooltip,
  { guides: true, margin: true },
)

export const mount = withTokenActivityShell(
  tanstackMount(tokenUsageCalendarDefinition, ariaLabel, interactiveTooltip),
)
