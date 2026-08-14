import { Chart } from '@tanstack/charts/react/tooltip'
import { tooltip as exampleTooltip } from '@tanstack/charts/tooltip'

import { olympians } from '@charts-poc/demo-data/olympians'
import { binX, cumulative, defineChart, rect } from '@tanstack/charts'
import { thresholdScott } from 'd3-array'
import { scaleLinear } from 'd3-scale'
import type { OlympiansRow } from '@charts-poc/demo-data/olympians'

type OlympianWithWeight = OlympiansRow & { weight: number }

const completeOlympians = olympians.filter(
  (row): row is OlympianWithWeight => row.weight !== null,
)
export const definition = (input: ExampleOptions) => {
  const bins = binX(completeOlympians.slice(input.revision * 8), {
    value: 'weight',
    thresholds: thresholdScott,
    outputs: { count: { reduce: 'count' } },
  })
  const cumulativeBins = cumulative(bins, {
    orderBy: 'x1',
    outputs: { cumulativeCount: { value: 'count', reduce: 'sum' } },
  })

  return defineChart({
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
    y: { scale: scaleLinear, grid: true, axis: { label: 'Cumulative count' } },
  })
}
export interface ExampleOptions {
  width: number
  height: number
  revision: number
  preview?: boolean
}

export const exampleAriaLabel = 'Cumulative histogram'

export const createExampleChart = (options: ExampleOptions) =>
  defineChart(definition(options), {
    keyboard: true,
    tooltip: exampleTooltip,
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
