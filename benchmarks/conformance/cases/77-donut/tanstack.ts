import { defineChart } from '@tanstack/charts'
import { pie, polar, radialArc } from '@tanstack/charts/polar'
import { alphabet } from '@charts-poc/demo-data/alphabet'
import { selectDonutData } from './selection'
import { tanstackMount } from '../../shared/mount'
import type { ConformanceInput } from '../../types'

const colors = ['#0ea5e9', '#6366f1', '#a855f7', '#ec4899', '#f97316']
const percentage = new Intl.NumberFormat('en-US', {
  style: 'percent',
  maximumFractionDigits: 2,
})

export const donutDefinition = (input: ConformanceInput) => {
  const arcs = pie(selectDonutData(alphabet, input.revision), {
    value: 'frequency',
  })

  return defineChart({
    marks: [
      polar({
        inset: 0,
        radiusRatio: 0.8,
        marks: [
          radialArc(arcs, {
            id: 'letter-slices',
            key: 'letter',
            innerRadius: ({ radius }) => radius * 0.58,
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
  donutDefinition,
  'English letter frequency donut',
  {
    format: ({ datum }) =>
      `${datum.letter} · ${percentage.format(datum.frequency)}`,
  },
)
