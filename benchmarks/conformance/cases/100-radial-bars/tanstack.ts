import { defineChart } from '@tanstack/charts'
import { polar, radialBarAngle } from '@tanstack/charts/polar'
import { alphabet } from '@charts-poc/demo-data/alphabet'
import { scaleBand, scaleLinear } from 'd3-scale'
import { selectRadialBarData } from './selection'
import { tanstackCase } from '../../shared/mount'
import type { ConformanceInput } from '../../types'

const innerRadiusRatio = 0.2
const colors = ['#7c3aed', '#0ea5e9', '#14b8a6', '#f59e0b']
const maximumFrequency = alphabet[0]?.frequency ?? 1

export const radialBarsDefinition = (input: ConformanceInput) => {
  const data = selectRadialBarData(alphabet, input.revision)

  return defineChart({
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
  })
}

export const catalogCase = tanstackCase(
  radialBarsDefinition,
  'Concentric letter frequency bars',
)

export const mount = catalogCase.mount
