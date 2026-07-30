import { defineChart } from '@tanstack/charts'
import {
  polar,
  radialArc,
  radialDot,
  radialRule,
  radialText,
} from '@tanstack/charts/polar'
import { scaleLinear } from 'd3-scale'
import { pie } from 'd3-shape'
import { gaugeBands, gaugeReading, gaugeTicks } from './data'
import { tanstackMount } from '../../shared/mount'
import type { GaugeBand } from './data'
import type { ConformanceInput } from '../../types'
import type { PieArcDatum } from 'd3-shape'

const startAngle = -Math.PI / 2
const endAngle = Math.PI / 2
const angleScale = scaleLinear().domain([0, 100])
const radiusScale = scaleLinear().domain([0, 1])
const pieLayout = pie<GaugeBand>()
  .sort(null)
  .value(({ value }) => value)
  .startAngle(startAngle)
  .endAngle(endAngle)

const definition = (input: ConformanceInput) =>
  defineChart(() => {
    const reading = gaugeReading(input.revision)
    const arcs = pieLayout([...gaugeBands])

    return {
      marks: [
        polar({
          angle: { scale: angleScale },
          radius: { scale: radiusScale },
          startAngle,
          endAngle,
          inset: 0,
          radiusRatio: 0.82,
          marks: [
            radialArc(arcs, {
              startAngle: 'startAngle',
              endAngle: 'endAngle',
              padAngle: 'padAngle',
              innerRadius: ({ radius }) => radius * 0.72,
              key: ({ data }: PieArcDatum<GaugeBand>) => data.id,
              fill: ({ data }: PieArcDatum<GaugeBand>) => data.fill,
            }),
            radialRule(gaugeTicks, {
              angle: 'value',
              radius1: 0.76,
              radius2: 0.94,
              key: 'id',
              stroke: '#ffffff',
              strokeOpacity: 0.85,
              strokeWidth: 2,
            }),
            radialRule([reading], {
              angle: 'value',
              radius1: 0,
              radius2: 0.64,
              key: 'id',
              stroke: 'currentColor',
              strokeWidth: 4,
            }),
            radialDot([reading], {
              angle: 'value',
              radius: 0,
              r: 8,
              key: 'id',
              fill: 'currentColor',
            }),
            radialText([reading], {
              angle: 'value',
              radius: 0,
              text: 'label',
              key: 'id',
              dy: 34,
              anchor: 'middle',
              baseline: 'middle',
              fill: 'currentColor',
              fontSize: 18,
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

export const mount = tanstackMount(definition, 'Threshold gauge with needle', {
  format: ({ datum }) => {
    if ('data' in datum) {
      return `${datum.data.label} · ${datum.data.value}% band`
    }
    return `Reading · ${datum.label}`
  },
})
