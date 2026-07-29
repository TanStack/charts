import { defineChart } from '@tanstack/charts'
import { polar, radialArc } from '@tanstack/charts/polar'
import { arc } from 'd3-shape'
import { radialBarData } from './data'
import { tanstackMount } from '../../shared/mount'
import type { RadialBarDatum } from './data'
import type { ConformanceInput } from '../../types'

const maximumValue = 100
const innerRadiusRatio = 0.2
const barRatio = 0.62

const definition = defineChart<ConformanceInput>()(({ input }) => {
  const data = radialBarData(input.revision)

  return {
    marks: [
      polar({
        radiusRatio: 0.84,
        marks: [
          radialArc(data, {
            key: 'id',
            className: 'ts-chart__radial-bars',
            generator: ({ radius }) => {
              const innerRadius = radius * innerRadiusRatio
              const band = (radius - innerRadius) / data.length
              const barSize = band * barRatio
              const offset = Math.round((band - barSize) / 2)

              return arc<unknown, RadialBarDatum>()
                .startAngle(0)
                .endAngle((row) => (row.value / maximumValue) * Math.PI * 2)
                .innerRadius((row) => innerRadius + row.ring * band + offset)
                .outerRadius(
                  (row) => innerRadius + row.ring * band + offset + barSize,
                )
                .cornerRadius(barSize / 2)
            },
            fill: (row: RadialBarDatum) => row.fill,
          }),
        ],
      }),
    ],
    x: null,
    y: null,
    guides: false,
    margin: 0,
  }
})

export const mount = tanstackMount(definition, 'Concentric radial bars')
