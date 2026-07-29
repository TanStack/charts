import { defineChart } from '@tanstack/charts'
import {
  polar,
  radialArc,
  radialRule,
  radialText,
} from '@tanstack/charts/polar'
import { scaleLinear } from 'd3-scale'
import { pie } from 'd3-shape'
import { labeledPieData } from './data'
import { tanstackMount } from '../../shared/mount'
import type { LabeledPieDatum } from './data'
import type { ConformanceInput } from '../../types'
import type { PieArcDatum } from 'd3-shape'

const tau = Math.PI * 2
const radiusRatio = 0.56
const labelOffset = 20
const pieLayout = pie<LabeledPieDatum>()
  .sort(null)
  .value(({ value }) => value)

interface PieLabelDatum {
  id: LabeledPieDatum['id']
  label: string
  fill: string
  angle: number
  radius: number
}

const definition = defineChart<ConformanceInput>()(({ input }) => {
  const arcs = pieLayout([...labeledPieData(input.revision)])
  const outerRadius = (Math.min(input.width, input.height) / 2) * radiusRatio
  const labels: readonly PieLabelDatum[] = arcs.map((slice) => ({
    id: slice.data.id,
    label: slice.data.label,
    fill: slice.data.fill,
    angle: (slice.startAngle + slice.endAngle) / 2,
    radius: 1 + labelOffset / Math.max(1, outerRadius),
  }))

  return {
    marks: [
      polar({
        radiusRatio,
        angle: { scale: scaleLinear().domain([0, tau]) },
        radius: { scale: scaleLinear().domain([0, 1]) },
        marks: [
          radialArc(arcs, {
            key: ({ data }: PieArcDatum<LabeledPieDatum>) => data.id,
            fill: ({ data }: PieArcDatum<LabeledPieDatum>) => data.fill,
          }),
          radialRule(labels, {
            angle: 'angle',
            radius1: 1,
            radius2: 'radius',
            key: 'id',
            stroke: '#94a3b8',
            strokeWidth: 1,
          }),
          radialText(labels, {
            angle: 'angle',
            radius: 'radius',
            text: 'label',
            key: 'id',
            fill: ({ fill }) => fill,
            fontSize: 12,
            fontWeight: 500,
            anchor: ({ angle }) => {
              const horizontal = Math.sin(angle)
              return Math.abs(horizontal) < 1e-6
                ? 'middle'
                : horizontal < 0
                  ? 'end'
                  : 'start'
            },
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

export const mount = tanstackMount(definition, 'Pie with outside labels')
