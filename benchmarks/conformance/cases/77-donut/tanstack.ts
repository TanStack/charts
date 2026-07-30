import { defineChart } from '@tanstack/charts'
import { polar, radialArc } from '@tanstack/charts/polar'
import { pie } from 'd3-shape'
import { donutData } from './data'
import { tanstackMount } from '../../shared/mount'
import type { DonutDatum } from './data'
import type { ConformanceInput } from '../../types'
import type { PieArcDatum } from 'd3-shape'

const pieLayout = pie<DonutDatum>()
  .sort(null)
  .value(({ value }) => value)

const definition = (input: ConformanceInput) =>
  defineChart(() => {
    const arcs = pieLayout([...donutData(input.revision)])

    return {
      marks: [
        polar({
          inset: 0,
          radiusRatio: 0.8,
          marks: [
            radialArc(arcs, {
              startAngle: 'startAngle',
              endAngle: 'endAngle',
              padAngle: 'padAngle',
              innerRadius: ({ radius }: { radius: number }) => radius * 0.58,
              key: ({ data }: PieArcDatum<DonutDatum>) => data.id,
              fill: ({ data }: PieArcDatum<DonutDatum>) => data.fill,
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

export const mount = tanstackMount(definition, 'Categorical donut chart')
