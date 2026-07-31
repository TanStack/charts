import { aapl } from '@charts-poc/demo-data/aapl'
import { barX, colorLegend, defineChart } from '@tanstack/charts'
import { scaleBand, scaleLinear } from 'd3-scale'
import { tanstackMount } from '../../shared/mount'
import type { ConformanceInput } from '../../types'

const colors = ['#10b981', '#ef4444']
const date = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
})

const definition = (input: ConformanceInput) => {
  const rows = aapl.slice(input.revision * 3, input.revision * 3 + 8)

  return defineChart({
    marks: [
      barX(rows, {
        x1: 'Open',
        x2: 'Close',
        y: 'Date',
        color: (row) => (row.Close >= row.Open ? 'Gain' : 'Loss'),
        inset: 1,
        radius: 3,
      }),
    ],
    x: { scale: scaleLinear, grid: true, axis: { label: 'Share price ($)' } },
    y: {
      scale: () => scaleBand<Date>().paddingInner(0.16),
      axis: { ticks: { format: (value) => date.format(value) } },
    },
    color: {
      range: colors,
      legend: colorLegend({ label: 'Session' }),
    },
  })
}

export const mount = tanstackMount(
  definition,
  'Apple daily open-to-close price ranges',
  {
    format: (point) =>
      `${date.format(point.datum.Date)} · Open $${point.datum.Open.toFixed(2)} · Close $${point.datum.Close.toFixed(2)}`,
  },
)
