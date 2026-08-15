import { Chart } from '@tanstack/charts/react/tooltip'
import { tooltip as exampleTooltip } from '@tanstack/charts/tooltip'

import { cars } from '@tanstack/charts-data/cars'
import { defineChart, dot, frame } from '@tanstack/charts'
import { scaleLinear } from 'd3-scale'

export const createExampleChart = (input: ChartOptions) => {
  const rows = cars
    .filter((row) => row['economy (mpg)'] !== null)
    .slice(input.revision * 8, input.revision * 8 + 320)
  const scatterRows = rows

  return defineChart(
    {
      marks: [
        frame({
          inset: 4,
          radius: 6,
          fill: '#eff6ff',
          stroke: '#2563eb',
          strokeOpacity: 0.7,
        }),
        dot(scatterRows, {
          key: (row) =>
            `${row.name}:${row.year}:${row['weight (lb)']}:${row['economy (mpg)']}`,
          x: 'weight (lb)',
          y: 'economy (mpg)',
          fill: '#2563eb',
          fillOpacity: 0.65,
          r: 3,
        }),
      ],
      x: { scale: scaleLinear },
      y: { scale: scaleLinear },
      guides: false,
      margin: 20,
    },
    { keyboard: true, tooltip: exampleTooltip },
  )
}
export interface ChartOptions {
  revision: number
}

export const exampleAriaLabel =
  'Guide-free scatterplot with a framed plotting region'

export const chart = createExampleChart({
  revision: 0,
})

export default function Example() {
  return <Chart ariaLabel={exampleAriaLabel} definition={chart} height={480} />
}
