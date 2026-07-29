import { defineChart } from '@tanstack/charts'
import { polar, radialArc } from '@tanstack/charts/polar'
import { arc, pie } from 'd3-shape'
import { roseData } from './data'
import { tanstackMount } from '../../shared/mount'
import type { RoseDatum } from './data'
import type { ConformanceInput } from '../../types'
import type { PieArcDatum } from 'd3-shape'

const maximumValue = 100
const pieLayout = pie<RoseDatum>()
  .sort(null)
  .value(() => 1)

function outerRadius(value: number, radius: number): number {
  return radius * (0.3 + (0.7 * value) / maximumValue)
}

const definition = defineChart<ConformanceInput>()(({ input }) => {
  const arcs = pieLayout([...roseData(input.revision)])

  return {
    marks: [
      polar({
        radiusRatio: 0.8,
        marks: [
          radialArc(arcs, {
            key: ({ data }: PieArcDatum<RoseDatum>) => data.id,
            generator: ({ radius }) =>
              arc<PieArcDatum<RoseDatum>>()
                .startAngle((slice) => slice.startAngle)
                .endAngle((slice) => slice.endAngle)
                .innerRadius(0)
                .outerRadius((slice) => outerRadius(slice.data.value, radius)),
            fill: ({ data }: PieArcDatum<RoseDatum>) => data.fill,
            stroke: '#ffffff',
            strokeWidth: 1,
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

export const mount = tanstackMount(definition, 'Nightingale rose chart')
