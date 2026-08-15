import { Chart } from '@tanstack/charts/react/tooltip'
import { tooltip as exampleTooltip } from '@tanstack/charts/tooltip'

import { defineChart } from '@tanstack/charts'
import { polar, radialBarAngle } from '@tanstack/charts/polar'
import { alphabet } from '@tanstack/charts-data/alphabet'
import { scaleBand, scaleLinear } from 'd3-scale'
import { selectRadialBarData } from './selection'

const innerRadiusRatio = 0.2
const colors = ['#7c3aed', '#0ea5e9', '#14b8a6', '#f59e0b']
const maximumFrequency = alphabet[0]?.frequency ?? 1

export const createExampleChart = (input: ChartOptions) => {
  const data = selectRadialBarData(alphabet, input.revision)

  return defineChart(
    {
      marks: [
        polar({
          radiusRatio: 0.84,
          angle: {
            scale: scaleLinear().domain([0, maximumFrequency]),
          },
          radius: {
            scale: () =>
              scaleBand<string>().paddingInner(0.38).paddingOuter(0.19),
            range: [
              ({ radius }) => radius * innerRadiusRatio,
              ({ radius }) => radius,
            ],
          },
          marks: [
            radialBarAngle(data, {
              id: 'letter-bars',
              className: 'ts-chart__radial-bars',
              angle: 'frequency',
              radius: 'letter',
              key: 'letter',
              color: 'letter',
              cornerRadius: 'full',
            }),
          ],
        }),
      ],
      color: { range: colors },
      margin: 0,
    },
    { keyboard: true, tooltip: exampleTooltip },
  )
}
export interface ChartOptions {
  revision: number
}

export const exampleAriaLabel = 'Concentric letter frequency bars'

export const chart = createExampleChart({
  revision: 0,
})

export default function Example() {
  return <Chart ariaLabel={exampleAriaLabel} definition={chart} height={480} />
}
