import { Chart } from '@tanstack/charts/react/tooltip'
import { tooltip as exampleTooltip } from '@tanstack/charts/tooltip'

import { defineChart } from '@tanstack/charts'
import { pie, polar, radialArc } from '@tanstack/charts/polar'
import { alphabet } from '@tanstack/charts-data/alphabet'
import { selectRoundedDonutData } from './selection'

const gapAngle = (Math.PI / 180) * 3
const colors = ['#0284c7', '#4f46e5', '#9333ea', '#db2777', '#ea580c']
const percentage = new Intl.NumberFormat('en-US', {
  style: 'percent',
  maximumFractionDigits: 2,
})

export const createExampleChart = (input: ChartOptions) => {
  const arcs = pie(selectRoundedDonutData(alphabet, input.revision), {
    value: 'frequency',
    gapAngle,
  })

  return defineChart(
    {
      marks: [
        polar({
          radiusRatio: 0.8,
          marks: [
            radialArc(arcs, {
              id: 'letter-slices',
              key: 'letter',
              innerRadius: ({ radius }) => radius * 0.58,
              cornerRadius: 8,
              color: 'letter',
            }),
          ],
        }),
      ],
      color: { range: colors },
      margin: 0,
    },
    {
      keyboard: true,
      tooltip: {
        use: exampleTooltip,
        ...{
          format: ({ datum }) =>
            `${datum.letter} · ${percentage.format(datum.frequency)}`,
        },
      },
    },
  )
}
export interface ChartOptions {
  revision: number
}

export const exampleAriaLabel = 'Rounded letter frequency donut'

export const chart = createExampleChart({
  revision: 0,
})

export default function Example() {
  return <Chart ariaLabel={exampleAriaLabel} definition={chart} height={480} />
}
