import { Chart } from '@tanstack/charts/react/tooltip'
import { tooltip as exampleTooltip } from '@tanstack/charts/tooltip'

import { arrow, defineChart } from '@tanstack/charts'
import { scaleLinear } from 'd3-scale'
import { citywages } from '@tanstack/charts-data/citywages'

const metroChanges = citywages.filter(
  (row) =>
    row.highlight === 1 ||
    row.R90_10_2015 < row.R90_10_1980 ||
    row.nyt_display === 'Los Angeles',
)

export const createExampleChart = () => {
  const increases = metroChanges.filter(
    (row) => row.R90_10_2015 >= row.R90_10_1980,
  )
  const decreases = metroChanges.filter(
    (row) => row.R90_10_2015 < row.R90_10_1980,
  )
  return defineChart(
    {
      marks: [
        arrow(increases, {
          x1: 'LPOP_1980',
          y1: 'R90_10_1980',
          x2: 'LPOP_2015',
          y2: 'R90_10_2015',
          stroke: '#ef4444',
          headLength: 8,
        }),
        arrow(decreases, {
          x1: 'LPOP_1980',
          y1: 'R90_10_1980',
          x2: 'LPOP_2015',
          y2: 'R90_10_2015',
          stroke: '#10b981',
          headLength: 8,
        }),
      ],
      x: {
        scale: scaleLinear,
        grid: true,
        axis: { label: 'Log₁₀ population' },
      },
      y: {
        scale: scaleLinear,
        grid: true,
        axis: { label: '90th-to-10th-percentile wage ratio' },
      },
    },
    { keyboard: true, tooltip: exampleTooltip },
  )
}

export const exampleAriaLabel =
  'Metro population and wage inequality, 1980–2015'

export const chart = createExampleChart()

export default function Example() {
  return <Chart ariaLabel={exampleAriaLabel} definition={chart} height={480} />
}
