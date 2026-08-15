import { Chart } from '@tanstack/charts/react/tooltip'
import { tooltip as exampleTooltip } from '@tanstack/charts/tooltip'

import { areaY, defineChart, groupBy, lineY, quantile } from '@tanstack/charts'
import { scaleLinear, scaleUtc } from 'd3-scale'
import { industries } from '@tanstack/charts-data/industries'

export const quantileRows = groupBy(industries, {
  by: 'date',
  outputs: {
    lower: { value: 'unemployed', reduce: quantile(0.1) },
    median: { value: 'unemployed', reduce: quantile(0.5) },
    upper: { value: 'unemployed', reduce: quantile(0.9) },
  },
})

const dateKey = ({ date }: (typeof quantileRows)[number]) => date.getTime()

export const createExampleChart = () => {
  const rows = quantileRows
  const showAxisLabels = true

  return defineChart(
    {
      marks: [
        areaY(rows, {
          id: 'quantile-ribbon',
          x: 'date',
          y1: 'lower',
          y2: 'upper',
          key: dateKey,
          fill: '#0ea5e9',
          fillOpacity: 0.22,
        }),
        lineY(rows, {
          id: 'median-line',
          x: 'date',
          y: 'median',
          key: dateKey,
          stroke: '#0369a1',
          strokeWidth: 2.25,
        }),
      ],
      x: {
        scale: scaleUtc,
        axis: showAxisLabels ? { label: 'Month' } : {},
      },
      y: {
        scale: scaleLinear,
        grid: true,
        axis: showAxisLabels
          ? { label: 'Unemployed people by industry (thousands)' }
          : {},
      },
    },
    { keyboard: true, tooltip: exampleTooltip },
  )
}

export const exampleAriaLabel = 'Monthly industry unemployment distribution'

export const chart = createExampleChart()

export default function Example() {
  return <Chart ariaLabel={exampleAriaLabel} definition={chart} height={480} />
}
