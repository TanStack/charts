import { usCountyUnemployment } from '@charts-poc/demo-data/us-county-unemployment'
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
import {
  gaugeBands,
  gaugeMaximum,
  gaugeTicks,
  type GaugeBand,
} from './transform'
import { tanstackMount } from '../../shared/mount'
import type { ConformanceInput } from '../../types'

const startAngle = -Math.PI / 2
const endAngle = Math.PI / 2
const angleScale = scaleLinear().domain([0, gaugeMaximum])
const radiusScale = scaleLinear().domain([0, 1])
const pieLayout = pie<GaugeBand>()
  .sort(null)
  .value(({ value }) => value)
  .startAngle(startAngle)
  .endAngle(endAngle)
const bandIds: readonly GaugeBand['id'][] = ['low', 'elevated', 'high']
const bandColors = ['#22c55e', '#f59e0b', '#ef4444']

const definition = (input: ConformanceInput) => {
  const reading = usCountyUnemployment[(input.revision % 2) * 2]
  if (!reading) {
    throw new Error('County unemployment data is incomplete.')
  }
  const arcs = pieLayout([...gaugeBands])

  return defineChart({
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
            color: ({ data }) => data.id,
          }),
          radialRule(gaugeTicks, {
            angle: 'value',
            radius1: 0.76,
            radius2: 0.94,
            stroke: '#ffffff',
            strokeOpacity: 0.85,
            strokeWidth: 2,
          }),
          radialRule([reading], {
            angle: 'rate',
            radius1: 0,
            radius2: 0.64,
            stroke: 'currentColor',
            strokeWidth: 4,
          }),
          radialDot([reading], {
            angle: 'rate',
            radius: 0,
            r: 8,
            fill: 'currentColor',
          }),
          radialText([reading], {
            angle: 'rate',
            radius: 0,
            text: (row) => `${row.rate}%`,
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
    color: { domain: bandIds, range: bandColors },
    margin: 0,
  })
}

export const mount = tanstackMount(definition, 'County unemployment gauge', {
  format: ({ datum }) => {
    if ('data' in datum) {
      return `${datum.data.label} · ${datum.data.value} percentage-point band`
    }
    return `${datum.county}, ${datum.state} · ${datum.rate}% unemployment`
  },
})
