import { defineChart } from '@tanstack/charts'
import { polar, radialArc } from '@tanstack/charts/polar'
import { alphabet } from '@charts-poc/demo-data/alphabet'
import { arc, pie } from 'd3-shape'
import { selectRoseData } from './selection'
import { tanstackMount } from '../../shared/mount'
import type { AlphabetRow } from '@charts-poc/demo-data/alphabet'
import type { ConformanceInput } from '../../types'
import type { PieArcDatum } from 'd3-shape'

const pieLayout = pie<AlphabetRow>()
  .sort(null)
  .value(() => 1)
const colors = [
  '#0369a1',
  '#2563eb',
  '#4f46e5',
  '#7c3aed',
  '#c026d3',
  '#db2777',
]
const maximumFrequency = alphabet[0]?.frequency ?? 1

function outerRadius(value: number, radius: number): number {
  return radius * (0.3 + (0.7 * value) / maximumFrequency)
}

const definition = (input: ConformanceInput) => {
  const arcs = pieLayout([...selectRoseData(alphabet, input.revision)])

  return defineChart({
    marks: [
      polar({
        radiusRatio: 0.8,
        marks: [
          radialArc(arcs, {
            generator: ({ radius }) =>
              arc<PieArcDatum<AlphabetRow>>()
                .startAngle((slice) => slice.startAngle)
                .endAngle((slice) => slice.endAngle)
                .innerRadius(0)
                .outerRadius((slice) =>
                  outerRadius(slice.data.frequency, radius),
                ),
            color: ({ data }: PieArcDatum<AlphabetRow>) => data.letter,
            stroke: '#ffffff',
            strokeWidth: 1,
          }),
        ],
      }),
    ],
    color: { range: colors },
    margin: 0,
  })
}

export const mount = tanstackMount(definition, 'English letter frequency rose')
