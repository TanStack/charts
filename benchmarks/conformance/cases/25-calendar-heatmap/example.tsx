import { Chart } from '@tanstack/charts/react/tooltip'
import { tooltip as exampleTooltip } from '@tanstack/charts/tooltip'

import { cell, colorGradientLegend, defineChart } from '@tanstack/charts'
import { weather } from '@tanstack/charts-data/weather'
import { scaleBand, scaleSequential } from 'd3-scale'
import { utcSunday } from 'd3-time'
import { selectCalendarData } from './selection'

const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export const createExampleChart = (input: ChartOptions) => {
  const rows = selectCalendarData(weather, input.revision)
  const calendarStart = rows[0]?.date
  if (calendarStart === undefined) {
    throw new TypeError('The weather calendar selection is empty')
  }

  return defineChart(
    {
      marks: [
        cell(rows, {
          x: (row) => utcSunday.count(calendarStart, row.date),
          y: (row) => weekdays[row.date.getUTCDay()],
          color: 'precipitation',
          inset: 1,
          radius: 2,
        }),
      ],
      x: {
        scale: () => scaleBand<number>().paddingInner(0.06).paddingOuter(0.03),
        axis: { ticks: { format: (value) => `W${value + 1}` }, label: 'Week' },
      },
      y: {
        scale: scaleBand<string>()
          .domain(weekdays)
          .paddingInner(0.06)
          .paddingOuter(0.03),
      },
      color: {
        scale: scaleSequential<string>,
        range: ['#ecfdf5', '#047857'],
        legend: colorGradientLegend({ label: 'Precipitation (mm)', steps: 6 }),
      },
    },
    { keyboard: true, tooltip: exampleTooltip },
  )
}
export interface ChartOptions {
  revision: number
}

export const exampleAriaLabel = 'Fourteen-week Seattle precipitation heatmap'

export const chart = createExampleChart({
  revision: 0,
})

export default function Example() {
  return <Chart ariaLabel={exampleAriaLabel} definition={chart} height={480} />
}
