import { aapl } from '@tanstack/charts-data/aapl'
import * as Plot from '@observablehq/plot'
import { mountObservablePlot } from '../../shared/mount'
import type { ConformanceMount } from '../../types'

const colors = ['#10b981', '#ef4444']
const date = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
})

export const mount: ConformanceMount = (container, input) =>
  mountObservablePlot(container, input, (nextInput) => {
    const rows = aapl.slice(nextInput.revision * 3, nextInput.revision * 3 + 8)

    return Plot.plot({
      width: nextInput.width,
      height: nextInput.height,
      ariaLabel: 'Apple daily open-to-close price ranges',
      marginLeft: 72,
      x: { grid: true, label: 'Share price ($)' },
      y: {
        type: 'band',
        domain: rows.map((row) => row.Date),
        label: null,
        tickFormat: (value: Date) => date.format(value),
      },
      color: { range: colors, legend: true },
      marks: [
        Plot.barX(rows, {
          x1: 'Open',
          x2: 'Close',
          y: 'Date',
          fill: (row) => (row.Close >= row.Open ? 'Gain' : 'Loss'),
          inset: 1,
        }),
      ],
    })
  })
