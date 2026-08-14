import { Chart } from '@tanstack/charts/react/tooltip'
import { tooltip as exampleTooltip } from '@tanstack/charts/tooltip'

import { alphabet } from '@charts-poc/demo-data/alphabet'
import { defineChart, dot, link } from '@tanstack/charts'
import { scaleBand, scaleLinear } from 'd3-scale'

const percent = new Intl.NumberFormat('en-US', {
  style: 'percent',
  maximumFractionDigits: 1,
})

export const definition = (_input: ExampleOptions) => {
  return defineChart({
    marks: [
      link(alphabet, {
        x1: 'letter',
        y1: () => 0,
        x2: 'letter',
        y2: 'frequency',
        stroke: '#94a3b8',
        strokeWidth: 1.5,
      }),
      dot(alphabet, {
        x: 'letter',
        y: 'frequency',
        fill: '#2563eb',
        r: 4,
      }),
    ],
    x: {
      scale: () => scaleBand<string>().padding(0.3),
    },
    y: {
      scale: scaleLinear,
      grid: true,
      axis: {
        ticks: { format: (value) => percent.format(value) },
        label: 'Frequency',
      },
    },
  })
}
export interface ExampleOptions {
  width: number
  height: number
  revision: number
  preview?: boolean
}

export const exampleAriaLabel = 'Ranked lollipop chart'

export const createExampleChart = (options: ExampleOptions) =>
  defineChart(definition(options), {
    keyboard: true,
    tooltip: {
      use: exampleTooltip,
      ...{
        format: ({ datum }) =>
          `${datum.letter} · ${percent.format(datum.frequency)} frequency`,
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
