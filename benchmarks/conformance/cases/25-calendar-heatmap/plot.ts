import * as Plot from '@observablehq/plot'
import { utcSunday } from 'd3-time'
import { calendarData, calendarStart } from './data'
import { mountObservablePlot } from '../../shared/mount'
import type { ConformanceMount } from '../../types'

const weeks = Array.from({ length: 14 }, (_, index) => index)
const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export const mount: ConformanceMount = (container, input) =>
  mountObservablePlot(container, input, (nextInput) =>
    Plot.plot({
      width: nextInput.width,
      height: nextInput.height,
      ariaLabel: 'Fourteen-week calendar activity heatmap',
      x: {
        domain: weeks,
        label: 'Week',
        tickFormat: (value) => `W${Number(value) + 1}`,
      },
      y: {
        domain: weekdays,
        label: null,
      },
      color: {
        type: 'linear',
        domain: [4, 79],
        range: ['#ecfdf5', '#047857'],
        legend: true,
      },
      marks: [
        Plot.cell(calendarData(nextInput.revision), {
          x: (row) => utcSunday.count(calendarStart, row.date),
          y: (row) => weekdays[row.date.getUTCDay()],
          fill: 'count',
          inset: 1,
          rx: 2,
        }),
      ],
    }),
  )
