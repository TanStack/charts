import { defineChart } from '@tanstack/charts'
import { polar, radialArc } from '@tanstack/charts/polar'
import { pie } from 'd3-shape'
import { gaugeData } from './data'
import { tanstackMount } from '../../shared/mount'
import type { GaugeDatum } from './data'
import type { ConformanceInput } from '../../types'
import type { PieArcDatum } from 'd3-shape'

const startAngle = (-Math.PI * 3) / 4
const endAngle = (Math.PI * 3) / 4
const pieLayout = pie<GaugeDatum>()
  .sort(null)
  .value(({ value }) => value)
  .startAngle(startAngle)
  .endAngle(endAngle)

const definition = (input: ConformanceInput) =>
  defineChart(() => {
    const arcs = pieLayout([...gaugeData(input.revision)])

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
              innerRadius: ({ radius }: { radius: number }) => radius * 0.72,
              key: ({ data }: PieArcDatum<GaugeDatum>) => data.id,
              fill: ({ data }: PieArcDatum<GaugeDatum>) => data.fill,
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

export const mount = tanstackMount(definition, 'Partial-circle gauge')
