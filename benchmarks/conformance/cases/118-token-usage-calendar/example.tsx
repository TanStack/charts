import { cell, defineChart } from '@tanstack/charts'
import { Chart } from '@tanstack/charts/react/tooltip'
import { tooltip } from '@tanstack/charts/tooltip'
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

export interface ChartOptions {
  width: number
  height: number
  revision: number
  preview?: boolean
}

const weekDomain = Array.from(
  { length: calendarWeekCount },
  (_value, index) => index,
)

export const exampleAriaLabel =
  'Token activity from August 2025 through July 2026. Weeks are columns and Sunday through Saturday are rows. Pale gray means no usage; blue intensity ranges from up to 25 million through over 150 million tokens.'

export const exampleTooltip = {
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

export function createExampleChart(input: ChartOptions) {
  const days = tokenUsageCalendar(input.revision)
  const monthTicks = calendarMonthTicks()

  return defineChart(
    {
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
            padding: input.preview ? 3 : 7,
            format: (week: number) => monthTicks.labels.get(week) ?? '',
          },
          tickLabels: {
            fontSize: input.preview ? 8 : 13,
            opacity: 0.62,
            anchor: ({ index }) => (index === 0 ? 'start' : undefined),
            dx: ({ index, bandwidth }) =>
              index === 0 ? -bandwidth / 2 : undefined,
            thin: { minGap: input.preview ? 2 : 8, priority: 'ends' },
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
      margin: input.preview
        ? { top: 0, right: 0, bottom: 16, left: 0 }
        : {
            ...calendarMargin,
            bottom: calendarBottomMargin(input.width, input.height),
          },
    },
    {
      keyboard: true,
      tooltip: { use: tooltip, ...exampleTooltip },
    },
  )
}

export const chart = createExampleChart({
  width: 720,
  height: 300,
  revision: 0,
})

export default function Example() {
  return (
    <div style={{ height: 300 }}>
      <style>{`
        .ts-chart-tooltip.token-activity-tooltip {
          padding: 6px 9px !important;
          border: 1px solid #e5e7eb !important;
          border-radius: 9px !important;
          background: #fff !important;
          color: #202124 !important;
          box-shadow: none !important;
          white-space: nowrap !important;
        }
      `}</style>
      <Chart definition={chart} ariaLabel={exampleAriaLabel} height={300} />
    </div>
  )
}
