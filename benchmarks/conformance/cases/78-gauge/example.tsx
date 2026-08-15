import { Chart } from '@tanstack/charts/react/tooltip'
import { tooltip as exampleTooltip } from '@tanstack/charts/tooltip'

import { survey } from '@tanstack/charts-data/survey'
import { defineChart } from '@tanstack/charts'
import { pie, polar, radialArc } from '@tanstack/charts/polar'
import { agreementPercent, gaugeSegments } from './transform'
import type { GaugeDatum } from './transform'

const startAngle = (-Math.PI * 3) / 4
const endAngle = (Math.PI * 3) / 4
const ids: readonly GaugeDatum['id'][] = ['value', 'remainder']
const colors = ['#ef4444', '#e2e8f0']

export const createExampleChart = (input: ChartOptions) => {
  const question = `Q${(input.revision % 2) + 1}`
  const agreement = agreementPercent(survey, question)
  const segments = gaugeSegments(agreement)
  const arcs = pie(segments, {
    value: 'value',
    startAngle,
    endAngle,
  })

  return defineChart(
    {
      marks: [
        polar({
          inset: 0,
          radiusRatio: 0.8,
          marks: [
            radialArc(arcs, {
              id: 'gauge-segments',
              key: 'id',
              innerRadius: ({ radius }) => radius * 0.72,
              color: 'id',
            }),
          ],
        }),
      ],
      color: { domain: ids, range: colors },
      margin: 0,
    },
    {
      keyboard: true,
      tooltip: {
        use: exampleTooltip,
        ...{
          format: ({ datum }) => `${datum.label} · ${datum.value}%`,
        },
      },
    },
  )
}
export interface ChartOptions {
  revision: number
}

export const exampleAriaLabel = 'Survey agreement share gauge'

export const chart = createExampleChart({
  revision: 0,
})

export default function Example() {
  return <Chart ariaLabel={exampleAriaLabel} definition={chart} height={480} />
}
