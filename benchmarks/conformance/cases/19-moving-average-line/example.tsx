import { Chart } from '@tanstack/charts/react/tooltip'
import { tooltip as exampleTooltip } from '@tanstack/charts/tooltip'

import { defineChart, lineY, ruleY, rollingWindow } from '@tanstack/charts'
import { scaleLinear, scaleUtc } from 'd3-scale'
import { sfTemperatures } from '@tanstack/charts-data/sf-temperatures'

const windowSize = 14

export const createExampleChart = () => {
  const completeRows = rollingWindow(sfTemperatures, {
    size: windowSize,
    partial: false,
    outputs: {
      high: { value: 'high', reduce: 'mean' },
      low: { value: 'low', reduce: 'mean' },
    },
  })
  const rows = completeRows

  return defineChart(
    {
      marks: [
        lineY(rows, {
          x: 'date',
          y: 'low',
          stroke: '#4e79a7',
          strokeWidth: 2.25,
        }),
        lineY(rows, {
          x: 'date',
          y: 'high',
          stroke: '#e15759',
          strokeWidth: 2.25,
        }),
        ruleY([32], {
          stroke: '#64748b',
          strokeDasharray: '4 4',
        }),
      ],
      x: { scale: scaleUtc, axis: { label: 'Date' } },
      y: {
        scale: scaleLinear,
        grid: true,
        axis: { label: 'Fourteen-day average temperature (°F)' },
      },
    },
    { keyboard: true, tooltip: exampleTooltip },
  )
}
export const exampleAriaLabel =
  'Fourteen-day average high and low temperature in San Francisco'

export const chart = createExampleChart()

export default function Example() {
  return <Chart ariaLabel={exampleAriaLabel} definition={chart} height={480} />
}
