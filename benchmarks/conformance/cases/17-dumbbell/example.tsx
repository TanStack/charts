import { Chart } from '@tanstack/charts/react/tooltip'
import { tooltip as exampleTooltip } from '@tanstack/charts/tooltip'

import { citywages } from '@charts-poc/demo-data/citywages'
import { defineChart, dot, link } from '@tanstack/charts'
import { scaleBand, scaleLinear } from 'd3-scale'

export const definition = (input: ExampleOptions) => {
  const rows = citywages.slice(input.revision * 4, input.revision * 4 + 8)
  return defineChart({
    marks: [
      link(rows, {
        x1: 'R90_10_1980',
        y1: 'nyt_display',
        x2: 'R90_10_2015',
        y2: 'nyt_display',
        stroke: '#94a3b8',
        strokeWidth: 2,
      }),
      dot(rows, {
        x: 'R90_10_1980',
        y: 'nyt_display',
        fill: '#2563eb',
        r: 4,
      }),
      dot(rows, {
        x: 'R90_10_2015',
        y: 'nyt_display',
        fill: '#f97316',
        r: 4,
      }),
    ],
    x: {
      scale: scaleLinear,
      grid: true,
      axis: { label: '90th/10th percentile wage ratio' },
    },
    y: {
      scale: () => scaleBand<string>().padding(0.22),
    },
  })
}
export interface ExampleOptions {
  width: number
  height: number
  revision: number
  preview?: boolean
}

export const exampleAriaLabel = 'Metropolitan wage inequality in 1980 and 2015'

export const createExampleChart = (options: ExampleOptions) =>
  defineChart(definition(options), {
    keyboard: true,
    tooltip: {
      use: exampleTooltip,
      ...{
        format: ({ datum }) =>
          `${datum.nyt_display} · 1980 ${datum.R90_10_1980.toLocaleString(
            'en-US',
          )} · 2015 ${datum.R90_10_2015.toLocaleString('en-US')}`,
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
