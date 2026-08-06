import { defineChart } from '@tanstack/charts'
import { pie, polar, radialArc } from '@tanstack/charts/polar'
import { alphabet } from '@charts-poc/demo-data/alphabet'
import { selectPieData } from './selection'
import { tanstackMount } from '../../shared/mount'
import type { ConformanceInput } from '../../types'

const colors = ['#2563eb', '#7c3aed', '#db2777', '#f59e0b']
const percentage = new Intl.NumberFormat('en-US', {
  style: 'percent',
  maximumFractionDigits: 2,
})

export const pieDefinition = (input: ConformanceInput) => {
  const arcs = pie(selectPieData(alphabet, input.revision), {
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
  pieDefinition,
  'English letter frequency pie',
  {
    format: ({ datum }) =>
      `${datum.letter} · ${percentage.format(datum.frequency)}`,
  },
)
