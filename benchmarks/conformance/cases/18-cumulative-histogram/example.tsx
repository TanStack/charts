import { Chart } from '@tanstack/charts/react/tooltip'
import { tooltip as exampleTooltip } from '@tanstack/charts/tooltip'

import { olympians } from '@tanstack/charts-data/olympians'
import { binX, cumulative, defineChart, rect } from '@tanstack/charts'
import { thresholdScott } from 'd3-array'
import { scaleLinear } from 'd3-scale'
import type { OlympiansRow } from '@tanstack/charts-data/olympians'

type OlympianWithWeight = OlympiansRow & { weight: number }

const completeOlympians = olympians.filter(
  (row): row is OlympianWithWeight => row.weight !== null,
)
export const createExampleChart = (input: ChartOptions) => {
  const bins = binX(completeOlympians.slice(input.revision * 8), {
    value: 'weight',
    thresholds: thresholdScott,
    outputs: { count: { reduce: 'count' } },
  })
  const cumulativeBins = cumulative(bins, {
    orderBy: 'x1',
    outputs: { cumulativeCount: { value: 'count', reduce: 'sum' } },
  })

  return defineChart(
    {
      marks: [
        rect(cumulativeBins, {
          x1: 'x1',
          x2: 'x2',
          y1: () => 0,
          y2: 'cumulativeCount',
          fill: '#2563eb',
          inset: 1,
        }),
      ],
      x: { scale: scaleLinear, grid: true, axis: { label: 'Weight (kg)' } },
      y: {
        scale: scaleLinear,
        grid: true,
        axis: { label: 'Cumulative count' },
      },
    },
    { keyboard: true, tooltip: exampleTooltip },
  )
}
export interface ChartOptions {
  revision: number
}

export const exampleAriaLabel = 'Cumulative histogram'

export const chart = createExampleChart({
  revision: 0,
})

export default function Example() {
  return <Chart ariaLabel={exampleAriaLabel} definition={chart} height={480} />
}
