import { Chart } from '@tanstack/charts/react/tooltip'
import { tooltip as exampleTooltip } from '@tanstack/charts/tooltip'

import { boxY, defineChart } from '@tanstack/charts'
import { scaleBand, scaleLinear } from 'd3-scale'
import { morley } from '@tanstack/charts-data/morley'

export const createExampleChart = () =>
  defineChart(
    {
      marks: [
        boxY(morley, {
          id: 'morley-boxplot',
          x: 'Expt',
          y: 'Speed',
          key: (row) => `${row.Expt}:${row.Run}`,
          fill: '#bfdbfe',
          stroke: '#2563eb',
          inset: 18,
          r: 2.5,
        }),
      ],
      x: {
        scale: () => scaleBand<number>().padding(0.22),
        axis: { label: 'Experiment' },
      },
      y: {
        scale: scaleLinear,
        grid: true,
        axis: { label: 'Speed of light (km/s minus 299,000)' },
      },
    },
    {
      keyboard: true,
      tooltip: {
        use: exampleTooltip,
        ...{
          format: ({ datum }) =>
            datum.kind === 'summary'
              ? `Experiment ${datum.category} · median ${datum.median.toLocaleString(
                  'en-US',
                  {
                    maximumFractionDigits: 1,
                  },
                )} · IQR ${datum.q1.toLocaleString('en-US', {
                  maximumFractionDigits: 1,
                })}–${datum.q3.toLocaleString('en-US', {
                  maximumFractionDigits: 1,
                })}`
              : `Experiment ${datum.category} outlier · ${datum.value.toLocaleString(
                  'en-US',
                  {
                    maximumFractionDigits: 1,
                  },
                )}`,
        },
      },
    },
  )

export const exampleAriaLabel = 'Grouped boxplots'

export const chart = createExampleChart()

export default function Example() {
  return <Chart ariaLabel={exampleAriaLabel} definition={chart} height={480} />
}
