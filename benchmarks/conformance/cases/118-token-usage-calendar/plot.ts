import * as Plot from '@observablehq/plot'
import {
  calendarMonthTicks,
  calendarWeekCount,
  formatTokenUsage,
  tokenUsageCalendar,
  usageColors,
  usageLevels,
  weekdays,
} from './model'
import { withTokenActivityShell } from './shell'
import { mountObservablePlot } from '../../shared/mount'
import type { ConformanceMount } from '../../types'

const weekDomain = Array.from(
  { length: calendarWeekCount },
  (_value, index) => index,
)

const mountPlot: ConformanceMount = (container, input) =>
  mountObservablePlot(container, input, (nextInput) => {
    const days = tokenUsageCalendar(nextInput.revision)
    const monthTicks = calendarMonthTicks()

    return Plot.plot({
      width: nextInput.width,
      height: nextInput.height,
      ariaLabel:
        'Token activity from August 2025 through July 2026. Weeks are columns and Sunday through Saturday are rows. Pale gray means no usage and blue intensity shows token usage.',
      x: {
        domain: weekDomain,
        ticks: monthTicks.values,
        tickFormat: (week) => monthTicks.labels.get(Number(week)) ?? '',
        tickSize: 0,
        label: null,
      },
      y: {
        domain: weekdays,
        axis: null,
      },
      color: {
        type: 'ordinal',
        domain: usageLevels,
        range: usageColors,
        label: 'Daily token usage',
      },
      marks: [
        Plot.cell(days, {
          className: 'token-usage-cells',
          x: 'week',
          y: 'weekday',
          fill: 'level',
          inset: 0,
          rx: 3,
          title: formatTokenUsage,
        }),
      ],
    })
  })

export const mount = withTokenActivityShell(mountPlot)
