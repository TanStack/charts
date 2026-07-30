import { defineChart } from '@tanstack/charts'
import { polar, radialArc } from '@tanstack/charts/polar'
import { alphabet } from '@charts-poc/demo-data/alphabet'
import { pie } from 'd3-shape'
import { selectDonutData } from './selection'
import { tanstackMount } from '../../shared/mount'
import type { AlphabetRow } from '@charts-poc/demo-data/alphabet'
import type { ConformanceInput } from '../../types'

const pieLayout = pie<AlphabetRow>()
  .sort(null)
  .value(({ frequency }) => frequency)
const colors = ['#0ea5e9', '#6366f1', '#a855f7', '#ec4899', '#f97316']

const definition = (input: ConformanceInput) => {
  const arcs = pieLayout([...selectDonutData(alphabet, input.revision)])

  return defineChart({
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
            color: ({ data }) => data.letter,
          }),
        ],
      }),
    ],
    color: { range: colors },
    margin: 0,
  })
}

export const mount = tanstackMount(definition, 'English letter frequency donut')
