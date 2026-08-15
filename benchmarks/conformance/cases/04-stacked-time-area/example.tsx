import { Chart } from '@tanstack/charts/react/tooltip'
import { tooltip as exampleTooltip } from '@tanstack/charts/tooltip'

import { areaY, colorLegend, defineChart, ruleY } from '@tanstack/charts'
import { scaleLinear, scaleUtc } from 'd3-scale'
import { industries } from '@tanstack/charts-data/industries'

const colors = [
  '#4e79a7',
  '#f28e2c',
  '#e15759',
  '#76b7b2',
  '#59a14f',
  '#edc949',
  '#af7aa1',
  '#ff9da7',
  '#9c755f',
  '#bab0ab',
]

export const createExampleChart = (input: ChartOptions) =>
  defineChart(
    {
      marks: [
        areaY(industries, {
          x: 'date',
          y: 'unemployed',
          color: 'industry',
          fillOpacity: 0.78,
        }),
        ruleY([0]),
      ],
      x: { scale: scaleUtc, axis: { label: 'Month' } },
      y: {
        scale: scaleLinear,
        grid: true,
        axis: { label: 'Unemployed (thousands)' },
      },
      color: {
        range: colors,
        ...(input.preview === true
          ? {}
          : { legend: colorLegend({ label: 'Industry' }) }),
      },
    },
    {
      keyboard: true,
      tooltip: {
        use: exampleTooltip,
        ...{
          format: ({ datum }) =>
            `${datum.industry} · ${datum.date.toLocaleDateString('en-US', {
              month: 'short',
              year: 'numeric',
              timeZone: 'UTC',
            })} · ${datum.unemployed.toLocaleString('en-US')} thousand unemployed`,
        },
      },
    },
  )
export interface ChartOptions {
  preview?: boolean
}

export const exampleAriaLabel = 'Unemployment by industry as stacked areas'

export const chart = createExampleChart({
  preview: false,
})

export default function Example() {
  return <Chart ariaLabel={exampleAriaLabel} definition={chart} height={480} />
}
