import { defineChart } from '@tanstack/charts'
import { polar, radialBarRadius } from '@tanstack/charts/polar'
import { alphabet } from '@charts-poc/demo-data/alphabet'
import { scaleBand, scaleLinear } from 'd3-scale'
import { selectRoseData } from './selection'
import { tanstackMount } from '../../shared/mount'
import type { ConformanceInput } from '../../types'

const colors = [
  '#0369a1',
  '#2563eb',
  '#4f46e5',
  '#7c3aed',
  '#c026d3',
  '#db2777',
]
const maximumFrequency = alphabet[0]?.frequency ?? 1

export const roseDefinition = (input: ConformanceInput) => {
  const data = selectRoseData(alphabet, input.revision)

  return defineChart({
    marks: [
      polar({
        radiusRatio: 0.8,
        angle: { scale: () => scaleBand<string>() },
        radius: {
          scale: scaleLinear().domain([0, maximumFrequency]),
          range: [({ radius }) => radius * 0.3, ({ radius }) => radius],
        },
        marks: [
          radialBarRadius(data, {
            id: 'letter-bars',
            angle: 'letter',
            radius: 'frequency',
            key: 'letter',
            color: 'letter',
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

export const mount = tanstackMount(
  roseDefinition,
  'English letter frequency rose',
)
