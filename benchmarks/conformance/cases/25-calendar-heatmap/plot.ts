import * as Plot from '@observablehq/plot'
import { weather } from '@charts-poc/demo-data/weather'
import { utcSunday } from 'd3-time'
import { selectCalendarData } from './selection'
import { mountObservablePlot } from '../../shared/mount'
import type { ConformanceMount } from '../../types'

const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export const mount: ConformanceMount = (container, input) =>
  mountObservablePlot(container, input, (nextInput) => {
    const rows = selectCalendarData(weather, nextInput.revision)
    const calendarStart = rows[0]?.date
    if (calendarStart === undefined) {
      throw new TypeError('The weather calendar selection is empty')
    }

    return Plot.plot({
      width: nextInput.width,
      height: nextInput.height,
      ariaLabel: 'Fourteen-week Seattle precipitation heatmap',
      x: {
        label: 'Week',
        tickFormat: (value) => `W${Number(value) + 1}`,
      },
      y: {
        domain: weekdays,
        label: null,
      },
      color: {
        type: 'linear',
        range: ['#ecfdf5', '#047857'],
        legend: true,
      },
      marks: [
        Plot.cell(rows, {
          x: (row) => utcSunday.count(calendarStart, row.date),
          y: (row) => weekdays[row.date.getUTCDay()],
          fill: 'precipitation',
          inset: 1,
          rx: 2,
        }),
      ],
    })
  })
