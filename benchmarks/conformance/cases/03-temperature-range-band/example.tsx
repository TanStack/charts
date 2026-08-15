import { Chart } from '@tanstack/charts/react/tooltip'
import { tooltip as exampleTooltip } from '@tanstack/charts/tooltip'

import { areaY, defineChart, lineY } from '@tanstack/charts'
import { sfTemperatures } from '@tanstack/charts-data/sf-temperatures'
import { scaleLinear, scaleUtc } from 'd3-scale'

export const createExampleChart = () => {
  const rows = sfTemperatures
  return defineChart(
    {
      marks: [
        areaY(rows, {
          x: 'date',
          y1: 'low',
          y2: 'high',
          fill: '#60a5fa',
          fillOpacity: 0.24,
        }),
        lineY(rows, {
          x: 'date',
          y: 'low',
          stroke: '#2563eb',
          strokeWidth: 1.75,
        }),
        lineY(rows, {
          x: 'date',
          y: 'high',
          stroke: '#dc2626',
          strokeWidth: 1.75,
        }),
      ],
      x: { scale: scaleUtc, axis: { label: 'Week' } },
      y: {
        scale: scaleLinear,
        grid: true,
        axis: { label: 'Temperature (°F)' },
      },
    },
    {
      keyboard: true,
      tooltip: {
        use: exampleTooltip,
        ...{
          format: ({ datum }) =>
            `${datum.date.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
              timeZone: 'UTC',
            })} · ${datum.low.toLocaleString('en-US', {
              maximumFractionDigits: 1,
            })}–${datum.high.toLocaleString('en-US', {
              maximumFractionDigits: 1,
            })} °F`,
        },
      },
    },
  )
}
export const exampleAriaLabel =
  'San Francisco daily low-to-high temperature range'

export const chart = createExampleChart()

export default function Example() {
  return <Chart ariaLabel={exampleAriaLabel} definition={chart} height={480} />
}
