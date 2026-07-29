import { defineChart } from '@tanstack/charts'
import { polar, radialArc } from '@tanstack/charts/polar'
import { pie } from 'd3-shape'
import { roundedDonutData } from './data'
import { tanstackMount } from '../../shared/mount'
import type { RoundedDonutDatum } from './data'
import type { ConformanceInput } from '../../types'
import type { PieArcDatum } from 'd3-shape'

const paddingAngle = (Math.PI / 180) * 3
const pieLayout = pie<RoundedDonutDatum>()
  .sort(null)
  .value(({ value }) => value)
  .padAngle(paddingAngle)

const definition = defineChart<ConformanceInput>()(({ input }) => {
  const arcs = pieLayout([...roundedDonutData(input.revision)])

  return {
    marks: [
      polar({
        radiusRatio: 0.8,
        marks: [
          radialArc(arcs, {
            startAngle: 'startAngle',
            endAngle: (slice) => slice.endAngle - slice.padAngle,
            padAngle: () => 0,
            innerRadius: ({ radius }) => radius * 0.58,
            cornerRadius: 8,
            key: ({ data }: PieArcDatum<RoundedDonutDatum>) => data.id,
            fill: ({ data }: PieArcDatum<RoundedDonutDatum>) => data.fill,
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

export const mount = tanstackMount(definition, 'Rounded donut with gaps')
