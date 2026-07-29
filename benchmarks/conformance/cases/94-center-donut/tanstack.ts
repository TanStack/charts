import { defineChart } from '@tanstack/charts'
import { polar, radialArc, radialText } from '@tanstack/charts/polar'
import { scaleLinear } from 'd3-scale'
import { pie } from 'd3-shape'
import { centerDonutData } from './data'
import { tanstackMount } from '../../shared/mount'
import type { CenterDonutDatum } from './data'
import type { ConformanceInput } from '../../types'
import type { PieArcDatum } from 'd3-shape'

const tau = Math.PI * 2
const pieLayout = pie<CenterDonutDatum>()
  .sort(null)
  .value(({ value }) => value)

const definition = defineChart<ConformanceInput>()(({ input }) => {
  const data = centerDonutData(input.revision)
  const arcs = pieLayout([...data])
  const total = data.reduce((sum, row) => sum + row.value, 0)
  const center = [{ id: 'total', angle: 0, radius: 0, text: `${total}k` }]

  return {
    marks: [
      polar({
        radiusRatio: 0.8,
        angle: { scale: scaleLinear().domain([0, tau]) },
        radius: { scale: scaleLinear().domain([0, 1]) },
        marks: [
          radialArc(arcs, {
            innerRadius: ({ radius }) => radius * 0.62,
            key: ({ data }: PieArcDatum<CenterDonutDatum>) => data.id,
            fill: ({ data }: PieArcDatum<CenterDonutDatum>) => data.fill,
          }),
          radialText(center, {
            angle: 'angle',
            radius: 'radius',
            text: 'text',
            key: 'id',
            fill: '#0f172a',
            fontSize: 20,
            fontWeight: 700,
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

export const mount = tanstackMount(definition, 'Donut with center total', {
  format: ({ datum }) =>
    'data' in datum
      ? `${datum.data.label} · ${datum.data.value}k`
      : `Total · ${datum.text}`,
})
