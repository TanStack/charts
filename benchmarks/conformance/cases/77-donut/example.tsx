import { Chart } from '@tanstack/charts/react/tooltip'
import { tooltip as exampleTooltip } from '@tanstack/charts/tooltip'

import { defineChart } from '@tanstack/charts'
import { pie, polar, radialArc } from '@tanstack/charts/polar'
import { alphabet } from '@charts-poc/demo-data/alphabet'
import { selectDonutData } from './selection'

const colors = ['#0ea5e9', '#6366f1', '#a855f7', '#ec4899', '#f97316']
const percentage = new Intl.NumberFormat('en-US', {
  style: 'percent',
  maximumFractionDigits: 2,
})

export const donutDefinition = (input: ExampleOptions) => {
  const arcs = pie(selectDonutData(alphabet, input.revision), {
    value: 'frequency',
  })

  return defineChart({
    marks: [
      polar({
        inset: 0,
        radiusRatio: 0.8,
        marks: [
          radialArc(arcs, {
            id: 'letter-slices',
            key: 'letter',
            innerRadius: ({ radius }) => radius * 0.58,
            color: 'letter',
          }),
        ],
      }),
    ],
    color: { range: colors },
    margin: 0,
  })
}
export interface ExampleOptions {
  width: number
  height: number
  revision: number
  preview?: boolean
}

export const exampleAriaLabel = 'English letter frequency donut'

export const createExampleChart = (options: ExampleOptions) =>
  defineChart(donutDefinition(options), {
    keyboard: true,
    tooltip: {
      use: exampleTooltip,
      ...{
        format: ({ datum }) =>
          `${datum.letter} · ${percentage.format(datum.frequency)}`,
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
