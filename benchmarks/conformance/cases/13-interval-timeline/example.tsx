import { Chart } from '@tanstack/charts/react/tooltip'
import { tooltip as exampleTooltip } from '@tanstack/charts/tooltip'

import { aapl } from '@charts-poc/demo-data/aapl'
import { barX, colorLegend, defineChart } from '@tanstack/charts'
import { scaleBand, scaleLinear } from 'd3-scale'

const colors = ['#10b981', '#ef4444']
const date = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
})

export const definition = (input: ExampleOptions) => {
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
export interface ExampleOptions {
  width: number
  height: number
  revision: number
  preview?: boolean
}

export const exampleAriaLabel = 'Apple daily open-to-close price ranges'

export const createExampleChart = (options: ExampleOptions) =>
  defineChart(definition(options), {
    keyboard: true,
    tooltip: {
      use: exampleTooltip,
      ...{
        format: (point) =>
          `${date.format(point.datum.Date)} · Open $${point.datum.Open.toFixed(2)} · Close $${point.datum.Close.toFixed(2)}`,
      },
    },
  })

export const chart = createExampleChart({
  width: 640,
  height: 480,
  revision: 0,
  preview: false,
})

export default function Example() {
  return <Chart ariaLabel={exampleAriaLabel} definition={chart} height={480} />
}
