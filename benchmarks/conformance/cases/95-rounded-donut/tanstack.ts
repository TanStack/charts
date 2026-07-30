import { defineChart } from '@tanstack/charts'
import { polar, radialArc } from '@tanstack/charts/polar'
import { alphabet } from '@charts-poc/demo-data/alphabet'
import { pie } from 'd3-shape'
import { selectRoundedDonutData } from './selection'
import { tanstackMount } from '../../shared/mount'
import type { AlphabetRow } from '@charts-poc/demo-data/alphabet'
import type { ConformanceInput } from '../../types'

const paddingAngle = (Math.PI / 180) * 3
const pieLayout = pie<AlphabetRow>()
  .sort(null)
  .value(({ frequency }) => frequency)
  .padAngle(paddingAngle)
const colors = ['#0284c7', '#4f46e5', '#9333ea', '#db2777', '#ea580c']

const definition = (input: ConformanceInput) => {
  const arcs = pieLayout([...selectRoundedDonutData(alphabet, input.revision)])

  return defineChart({
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
            color: ({ data }) => data.letter,
          }),
        ],
      }),
    ],
    color: { range: colors },
    margin: 0,
  })
}

export const mount = tanstackMount(definition, 'Rounded letter frequency donut')
