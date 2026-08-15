import { Chart } from '@tanstack/charts/react/tooltip'
import { tooltip as exampleTooltip } from '@tanstack/charts/tooltip'

import { aapl } from '@tanstack/charts-data/aapl'
import { barX, colorLegend, defineChart } from '@tanstack/charts'
import { scaleBand, scaleLinear } from 'd3-scale'

const colors = ['#10b981', '#ef4444']
const date = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
})

export const createExampleChart = (input: ChartOptions) => {
  const rows = aapl.slice(input.revision * 3, input.revision * 3 + 8)

  return defineChart(
    {
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
    },
    {
      keyboard: true,
      tooltip: {
        use: exampleTooltip,
        ...{
          format: (point) =>
            `${date.format(point.datum.Date)} · Open $${point.datum.Open.toFixed(2)} · Close $${point.datum.Close.toFixed(2)}`,
        },
      },
    },
  )
}
export interface ChartOptions {
  revision: number
}

export const exampleAriaLabel = 'Apple daily open-to-close price ranges'

export const chart = createExampleChart({
  revision: 0,
})

export default function Example() {
  return <Chart ariaLabel={exampleAriaLabel} definition={chart} height={480} />
}
