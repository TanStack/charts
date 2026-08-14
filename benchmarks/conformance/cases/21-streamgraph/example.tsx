import { Chart } from '@tanstack/charts/react/tooltip'
import { tooltip as exampleTooltip } from '@tanstack/charts/tooltip'

import { areaY, colorLegend, defineChart, stack } from '@tanstack/charts'
import { scaleLinear, scaleUtc } from 'd3-scale'
import { industries } from '@charts-poc/demo-data/industries'
import type { IndustriesRow } from '@charts-poc/demo-data/industries'

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

function streamgraphChart(rows: readonly IndustriesRow[], showLegend: boolean) {
  return defineChart({
    marks: [
      areaY(rows, {
        x: 'date',
        y: 'unemployed',
        z: 'industry',
        color: 'industry',
        layout: stack({ offset: 'wiggle', order: 'inside-out' }),
        fillOpacity: 0.85,
      }),
    ],
    x: { scale: scaleUtc, axis: { label: 'Month' } },
    y: {
      scale: scaleLinear,
      grid: true,
      axis: { label: 'Unemployed (thousands)' },
    },
    color: {
      range: colors,
      ...(showLegend ? { legend: colorLegend({ label: 'Industry' }) } : {}),
    },
  })
}

export const streamgraphDefinition = () => streamgraphChart(industries, true)

export const exampleAriaLabel = 'Unemployment by industry as a streamgraph'

export const createExampleChart = () =>
  defineChart(streamgraphDefinition(), {
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
  })

export const chart = createExampleChart()

export default function Example() {
  return <Chart ariaLabel={exampleAriaLabel} definition={chart} height={480} />
}
