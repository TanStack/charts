import { Chart } from '@tanstack/charts/react/tooltip'
import { tooltip as exampleTooltip } from '@tanstack/charts/tooltip'

import { defineChart } from '@tanstack/charts'
import { sunburst } from '@tanstack/charts/hierarchy/sunburst'
import { polar } from '@tanstack/charts/polar'
import { flare } from '@tanstack/charts-data/flare'
import { selectSunburstData } from './selection'

export const createExampleChart = (input: ChartOptions) => {
  const data = selectSunburstData(flare, input.revision)

  return defineChart(
    {
      marks: [
        polar({
          radiusRatio: 0.88,
          startAngle: Math.PI / 2,
          endAngle: Math.PI / 2 - Math.PI * 2,
          marks: [
            sunburst(data, {
              id: 'sunburst-arcs',
              path: 'name',
              delimiter: '.',
              value: 'size',
              innerRadius: ({ radius }) => radius * 0.14,
              outerRadius: ({ radius }) => {
                const innerRadius = radius * 0.14
                return innerRadius + ((radius - innerRadius) * 2) / 3 + 2
              },
              ringPadding: 2,
              color: 'branchId',
              stroke: '#ffffff',
              strokeWidth: 2,
            }),
          ],
        }),
      ],
      color: {
        range: ['#7c3aed', '#0ea5e9', '#14b8a6'],
      },
      margin: 0,
    },
    {
      keyboard: true,
      tooltip: {
        use: exampleTooltip,
        ...{
          format: ({ datum }) =>
            `${(datum.data?.name ?? datum.id).replaceAll('.', ' › ')} · ${datum.value.toLocaleString('en-US')}`,
        },
      },
    },
  )
}
export interface ChartOptions {
  revision: number
}

export const exampleAriaLabel = 'Flare analytics sunburst'

export const chart = createExampleChart({
  revision: 0,
})

export default function Example() {
  return <Chart ariaLabel={exampleAriaLabel} definition={chart} height={480} />
}
