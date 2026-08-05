import { defineChart } from '@tanstack/charts'
import {
  polar,
  radialArc,
  radialRule,
  radialText,
} from '@tanstack/charts/polar'
import { alphabet } from '@charts-poc/demo-data/alphabet'
import { scaleLinear } from 'd3-scale'
import { pie } from 'd3-shape'
import { selectLabeledPieData } from './selection'
import { tanstackCase } from '../../shared/mount'
import type { AlphabetRow } from '@charts-poc/demo-data/alphabet'
import type { ConformanceInput } from '../../types'

const tau = Math.PI * 2
const radiusRatio = 0.56
const labelOffset = 20
const pieLayout = pie<AlphabetRow>()
  .sort(null)
  .value(({ frequency }) => frequency)
const colors = ['#2563eb', '#7c3aed', '#db2777', '#f59e0b']

interface PieLabelDatum {
  letter: string
  angle: number
  radius: number
}

const definition = (input: ConformanceInput) => {
  const arcs = pieLayout([...selectLabeledPieData(alphabet, input.revision)])

  return defineChart(({ width, height }) => {
    const outerRadius = (Math.min(width, height) / 2) * radiusRatio
    const labels: readonly PieLabelDatum[] = arcs.map((slice) => ({
      letter: slice.data.letter,
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
              color: ({ data }) => data.letter,
            }),
            radialRule(labels, {
              angle: 'angle',
              radius1: 1,
              radius2: 'radius',
              stroke: '#94a3b8',
              strokeWidth: 1,
            }),
            radialText(labels, {
              angle: 'angle',
              radius: 'radius',
              text: 'letter',
              color: 'letter',
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
      color: { range: colors },
      margin: 0,
    }
  })
}

export const catalogCase = tanstackCase(
  definition,
  'Letter frequency pie with labels',
)

export const mount = catalogCase.mount
