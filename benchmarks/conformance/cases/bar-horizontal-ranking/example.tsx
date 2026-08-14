import { Chart } from '@tanstack/charts/react/tooltip'
import { tooltip as exampleTooltip } from '@tanstack/charts/tooltip'

import { citywages } from '@charts-poc/demo-data/citywages'
import { barX, defineChart, ruleX } from '@tanstack/charts'
import { scaleBand, scaleLinear } from 'd3-scale'

export const definition = (input: ExampleOptions) => {
  const rows = citywages
    .slice(input.revision * 4, input.revision * 4 + 8)
    .sort((left, right) => right.POP_2015 - left.POP_2015)

  return defineChart({
    marks: [
      barX(rows, {
        x: 'POP_2015',
        y: 'Metro',
        fill: '#7c3aed',
        inset: 1,
      }),
      ruleX([0]),
    ],
    x: {
      scale: scaleLinear,
      grid: input.preview !== true,
      axis:
        input.preview === true
          ? false
          : { ticks: { count: 5 }, label: '2015 population' },
    },
    y: {
      scale: () => scaleBand<string>().paddingInner(0.1).paddingOuter(0.05),
    },
  })
}
export interface ExampleOptions {
  width: number
  height: number
  revision: number
  preview?: boolean
}

export const exampleAriaLabel = 'Horizontal ranking with long labels'

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
