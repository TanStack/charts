import { Chart } from '@tanstack/charts/react/tooltip'
import { tooltip as exampleTooltip } from '@tanstack/charts/tooltip'

import { survey } from '@charts-poc/demo-data/survey'
import { defineChart } from '@tanstack/charts'
import { pie, polar, radialArc } from '@tanstack/charts/polar'
import { agreementPercent, gaugeSegments } from './transform'
import type { GaugeDatum } from './transform'

const startAngle = (-Math.PI * 3) / 4
const endAngle = (Math.PI * 3) / 4
const ids: readonly GaugeDatum['id'][] = ['value', 'remainder']
const colors = ['#ef4444', '#e2e8f0']

export const gaugeDefinition = (input: ExampleOptions) => {
  const question = `Q${(input.revision % 2) + 1}`
  const agreement = agreementPercent(survey, question)
  const segments = gaugeSegments(agreement)
  const arcs = pie(segments, {
    value: 'value',
    startAngle,
    endAngle,
  })

  return defineChart({
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
  })
}
export interface ExampleOptions {
  width: number
  height: number
  revision: number
  preview?: boolean
}

export const exampleAriaLabel = 'Survey agreement share gauge'

export const createExampleChart = (options: ExampleOptions) =>
  defineChart(gaugeDefinition(options), {
    keyboard: true,
    tooltip: {
      use: exampleTooltip,
      ...{
        format: ({ datum }) => `${datum.label} · ${datum.value}%`,
      },
    },
  })

export const chart = createExampleChart({
  width: 640,
  height: 480,
  revision: 0,
  preview: false,
})

export default function Example() {
  return <Chart ariaLabel={exampleAriaLabel} definition={chart} height={480} />
}
