import { Chart } from '@tanstack/charts/react/tooltip'
import { tooltip as exampleTooltip } from '@tanstack/charts/tooltip'

import { defineChart } from '@tanstack/charts'
import { pie, polar, radialArc } from '@tanstack/charts/polar'
import { alphabet } from '@tanstack/charts-data/alphabet'
import { selectPieData } from './selection'

const colors = ['#2563eb', '#7c3aed', '#db2777', '#f59e0b']
const percentage = new Intl.NumberFormat('en-US', {
  style: 'percent',
  maximumFractionDigits: 2,
})

export const createExampleChart = (input: ChartOptions) => {
  const arcs = pie(selectPieData(alphabet, input.revision), {
    value: 'frequency',
  })

  return defineChart(
    {
      marks: [
        polar({
          inset: 0,
          radiusRatio: 0.8,
          marks: [
            radialArc(arcs, {
              id: 'letter-slices',
              key: 'letter',
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

export const exampleAriaLabel = 'English letter frequency pie'

export const chart = createExampleChart({
  revision: 0,
})

export default function Example() {
  return <Chart ariaLabel={exampleAriaLabel} definition={chart} height={480} />
}
