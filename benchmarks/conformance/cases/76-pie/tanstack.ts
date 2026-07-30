import { defineChart } from '@tanstack/charts'
import { polar, radialArc } from '@tanstack/charts/polar'
import { pie } from 'd3-shape'
import { pieData } from './data'
import { tanstackMount } from '../../shared/mount'
import type { PieDatum } from './data'
import type { ConformanceInput } from '../../types'
import type { PieArcDatum } from 'd3-shape'

const pieLayout = pie<PieDatum>()
  .sort(null)
  .value(({ value }) => value)

const definition = (input: ConformanceInput) =>
  defineChart(() => {
    const arcs = pieLayout([...pieData(input.revision)])

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
              key: ({ data }: PieArcDatum<PieDatum>) => data.id,
              fill: ({ data }: PieArcDatum<PieDatum>) => data.fill,
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

export const mount = tanstackMount(definition, 'Categorical pie chart', {
  format: ({ datum }) => `${datum.data.label} · ${datum.data.value}%`,
})
