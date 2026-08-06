import { survey } from '@charts-poc/demo-data/survey'
import { defineChart } from '@tanstack/charts'
import { pie, polar, radialArc } from '@tanstack/charts/polar'
import { agreementPercent, gaugeSegments } from './transform'
import { tanstackMount } from '../../shared/mount'
import type { GaugeDatum } from './transform'
import type { ConformanceInput } from '../../types'

const startAngle = (-Math.PI * 3) / 4
const endAngle = (Math.PI * 3) / 4
const ids: readonly GaugeDatum['id'][] = ['value', 'remainder']
const colors = ['#ef4444', '#e2e8f0']

export const gaugeDefinition = (input: ConformanceInput) => {
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

export const mount = tanstackMount(
  gaugeDefinition,
  'Survey agreement share gauge',
  {
    format: ({ datum }) => `${datum.label} · ${datum.value}%`,
  },
)
