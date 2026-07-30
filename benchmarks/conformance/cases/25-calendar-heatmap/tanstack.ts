import { cell, colorGradientLegend, defineChart } from '@tanstack/charts'
import { scaleBand, scaleSequential } from 'd3-scale'
import { utcSunday } from 'd3-time'
import { calendarData, calendarStart } from './data'
import { tanstackMount } from '../../shared/mount'
import type { ConformanceInput } from '../../types'

const weeks = Array.from({ length: 14 }, (_, index) => index)
const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const definition = (input: ConformanceInput) =>
  defineChart(() => {
    const rows = calendarData(input.revision)

    return {
      marks: [
        cell(rows, {
          x: (row) => utcSunday.count(calendarStart, row.date),
          y: (row) => weekdays[row.date.getUTCDay()],
          z: 'count',
          key: 'id',
          inset: 1,
          radius: 2,
        }),
      ],
      x: {
        scale: scaleBand<number>()
          .domain(weeks)
          .paddingInner(0.06)
          .paddingOuter(0.03),
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
        scale: scaleSequential<string>()
          .domain([4, 79])
          .range(['#ecfdf5', '#047857']),
        legend: colorGradientLegend({ label: 'Activity', steps: 6 }),
      },
    }
  })

export const mount = tanstackMount(
  definition,
  'Fourteen-week calendar activity heatmap',
)
