import { survey } from '@charts-poc/demo-data/survey'
import { defineChart } from '@tanstack/charts'
import { polar, radialArc } from '@tanstack/charts/polar'
import { pie } from 'd3-shape'
import { agreementPercent, gaugeSegments } from './transform'
import { tanstackCase } from '../../shared/mount'
import type { GaugeDatum } from './transform'
import type { ConformanceInput } from '../../types'

const startAngle = (-Math.PI * 3) / 4
const endAngle = (Math.PI * 3) / 4
const pieLayout = pie<GaugeDatum>()
  .sort(null)
  .value(({ value }) => value)
  .startAngle(startAngle)
  .endAngle(endAngle)
const ids: readonly GaugeDatum['id'][] = ['value', 'remainder']
const colors = ['#ef4444', '#e2e8f0']

const definition = (input: ConformanceInput) => {
  const question = `Q${(input.revision % 2) + 1}`
  const arcs = pieLayout([...gaugeSegments(agreementPercent(survey, question))])

  return defineChart({
    marks: [
      polar({
        inset: 0,
        radiusRatio: 0.8,
        marks: [
          radialArc(arcs, {
            startAngle: 'startAngle',
            endAngle: 'endAngle',
            padAngle: 'padAngle',
            innerRadius: ({ radius }: { radius: number }) => radius * 0.72,
            color: ({ data }) => data.id,
          }),
        ],
      }),
    ],
    color: { domain: ids, range: colors },
    margin: 0,
  })
}

export const catalogCase = tanstackCase(
  definition,
  'Survey agreement share gauge',
)

export const mount = catalogCase.mount
