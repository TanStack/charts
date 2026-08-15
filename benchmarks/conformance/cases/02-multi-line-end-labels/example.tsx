import { Chart } from '@tanstack/charts/react/tooltip'
import { tooltip as exampleTooltip } from '@tanstack/charts/tooltip'

import { defineChart, lineY, select, text } from '@tanstack/charts'
import { scaleLinear, scaleUtc } from 'd3-scale'
import { industries } from '@tanstack/charts-data/industries'
import { selectMultiLineData } from './selection'
import type { MultiLineDatum } from './selection'

const colors = ['#2563eb', '#ea580c', '#059669']

export const createExampleChart = (input: ChartOptions) => {
  const rows: readonly MultiLineDatum[] = selectMultiLineData(
    industries,
    input.revision,
  )
  const preview = input.preview === true
  const endpoints = select(rows, {
    by: 'industry',
    value: (datum) => datum.date.getTime(),
    select: 'max',
  })

  return defineChart(
    {
      marks: [
        lineY(rows, {
          id: 'industry-lines',
          x: 'date',
          y: 'unemployed',
          color: 'industry',
          strokeWidth: 2.25,
        }),
        text(endpoints, {
          id: 'industry-end-labels',
          x: 'date',
          y: 'unemployed',
          text: 'industry',
          color: 'industry',
          anchor: preview ? 'end' : 'start',
          dx: preview ? -5 : 5,
          fontWeight: 600,
        }),
      ],
      x: { scale: scaleUtc, axis: { label: 'Week' } },
      y: {
        scale: scaleLinear,
        grid: true,
        axis: { label: 'Unemployed (thousands)' },
      },
      color: {
        range: colors,
      },
      margin: { right: 112 },
    },
    { keyboard: true, tooltip: exampleTooltip },
  )
}

export interface ChartOptions {
  revision: number
  preview?: boolean
}

export const exampleAriaLabel =
  'Unemployment by industry with direct end labels'

export const chart = createExampleChart({
  revision: 0,
  preview: false,
})

export default function Example() {
  return <Chart ariaLabel={exampleAriaLabel} definition={chart} height={480} />
}
