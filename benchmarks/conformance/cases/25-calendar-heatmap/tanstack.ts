import { cell, colorGradientLegend, defineChart } from '@tanstack/charts'
import { weather } from '@charts-poc/demo-data/weather'
import { scaleBand, scaleSequential } from 'd3-scale'
import { utcSunday } from 'd3-time'
import { selectCalendarData } from './selection'
import { tanstackMount } from '../../shared/mount'
import type { ConformanceInput } from '../../types'

const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const definition = (input: ConformanceInput) => {
  const rows = selectCalendarData(weather, input.revision)
  const calendarStart = rows[0]?.date
  if (calendarStart === undefined) {
    throw new TypeError('The weather calendar selection is empty')
  }

  return defineChart({
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
      label: 'Week',
      format: (value) => `W${value + 1}`,
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
  })
}

export const mount = tanstackMount(
  definition,
  'Fourteen-week Seattle precipitation heatmap',
)
