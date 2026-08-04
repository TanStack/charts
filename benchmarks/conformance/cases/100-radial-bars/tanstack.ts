import { defineChart } from '@tanstack/charts'
import { polar, radialArc } from '@tanstack/charts/polar'
import { alphabet } from '@charts-poc/demo-data/alphabet'
import { arc } from 'd3-shape'
import { selectRadialBarData } from './selection'
import { radialBarLayout } from './transform'
import { tanstackCase } from '../../shared/mount'
import type { RadialBarLayoutDatum } from './transform'
import type { ConformanceInput } from '../../types'

const innerRadiusRatio = 0.2
const barRatio = 0.62
const colors = ['#7c3aed', '#0ea5e9', '#14b8a6', '#f59e0b']
const maximumFrequency = alphabet[0]?.frequency ?? 1

const definition = (input: ConformanceInput) => {
  const data = radialBarLayout(selectRadialBarData(alphabet, input.revision))

  return defineChart({
    marks: [
      polar({
        radiusRatio: 0.84,
        marks: [
          radialArc(data, {
            className: 'ts-chart__radial-bars',
            generator: ({ radius }) => {
              const innerRadius = radius * innerRadiusRatio
              const band = (radius - innerRadius) / data.length
              const barSize = band * barRatio
              const offset = Math.round((band - barSize) / 2)

              return arc<unknown, RadialBarLayoutDatum>()
                .startAngle(0)
                .endAngle(
                  (row) => (row.frequency / maximumFrequency) * Math.PI * 2,
                )
                .innerRadius((row) => innerRadius + row.ring * band + offset)
                .outerRadius(
                  (row) => innerRadius + row.ring * band + offset + barSize,
                )
                .cornerRadius(barSize / 2)
            },
            color: 'letter',
          }),
        ],
      }),
    ],
    color: { range: colors },
    margin: 0,
  })
}

export const catalogCase = tanstackCase(
  definition,
  'Concentric letter frequency bars',
)

export const mount = catalogCase.mount
