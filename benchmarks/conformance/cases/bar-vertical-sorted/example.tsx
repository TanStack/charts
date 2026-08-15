import { alphabet } from '@tanstack/charts-data/alphabet'
import { barY, defineChart } from '@tanstack/charts'
import { Chart } from '@tanstack/charts/react/tooltip'
import { tooltip } from '@tanstack/charts/tooltip'
import { scaleBand, scaleLinear } from 'd3-scale'

const percent = new Intl.NumberFormat('en-US', {
  style: 'percent',
  maximumFractionDigits: 1,
})

export const createExampleChart = () =>
  defineChart(
    ({ width }) => ({
      marks: [
        barY(alphabet, {
          x: 'letter',
          y: 'frequency',
          fill: '#2563eb',
          inset: 1,
        }),
      ],
      x: {
        scale: () => scaleBand<string>().paddingInner(0.1).paddingOuter(0.05),
        axis: { tickLabels: { rotate: width < 560 ? -32 : 0 } },
      },
      y: {
        scale: scaleLinear,
        grid: true,
        axis: {
          ticks: {
            count: 5,
            format: (value: number) => percent.format(value),
          },
          label: 'Frequency',
        },
      },
    }),
    {
      keyboard: true,
      tooltip: {
        use: tooltip,
        format: ({ datum }) =>
          `${datum.letter} · ${percent.format(datum.frequency)} frequency`,
      },
    },
  )

export const exampleAriaLabel = 'Sorted vertical bars'

export const definition = createExampleChart()

export default function AlphabetFrequencyChart() {
  return (
    <Chart ariaLabel={exampleAriaLabel} definition={definition} height={480} />
  )
}
