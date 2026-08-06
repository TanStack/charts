import { defineChart } from '@tanstack/charts'
import { pie, polar, radialArc } from '@tanstack/charts/polar'
import { alphabet } from '@charts-poc/demo-data/alphabet'
import { selectRoundedDonutData } from './selection'
import { tanstackMount } from '../../shared/mount'
import type { ConformanceInput } from '../../types'

const gapAngle = (Math.PI / 180) * 3
const colors = ['#0284c7', '#4f46e5', '#9333ea', '#db2777', '#ea580c']
const percentage = new Intl.NumberFormat('en-US', {
  style: 'percent',
  maximumFractionDigits: 2,
})

export const roundedDonutDefinition = (input: ConformanceInput) => {
  const arcs = pie(selectRoundedDonutData(alphabet, input.revision), {
    value: 'frequency',
    gapAngle,
  })

  return defineChart({
    marks: [
      polar({
        radiusRatio: 0.8,
        marks: [
          radialArc(arcs, {
            id: 'letter-slices',
            key: 'letter',
            innerRadius: ({ radius }) => radius * 0.58,
            cornerRadius: 8,
            color: 'letter',
          }),
        ],
      }),
    ],
    color: { range: colors },
    margin: 0,
  })
}

export const mount = tanstackMount(
  roundedDonutDefinition,
  'Rounded letter frequency donut',
  {
    format: ({ datum }) =>
      `${datum.letter} · ${percentage.format(datum.frequency)}`,
  },
)
