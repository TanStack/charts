import { colorLegend, defineChart, waffleY } from '@tanstack/charts'
import { alphabet } from '@charts-poc/demo-data/alphabet'
import { tanstackMount } from '../../shared/mount'

const colors = [
  '#8b5cf6',
  '#10b981',
  '#ec4899',
  '#f97316',
  '#2563eb',
  '#06b6d4',
]
const letters = alphabet.map((row) => row.letter)

const definition = () =>
  defineChart({
    marks: [
      waffleY(alphabet, {
        y: 'frequency',
        color: 'letter',
        key: 'letter',
        unit: 0.01,
        gap: 2,
        round: true,
        radius: 2,
      }),
    ],
    guides: false,
    color: {
      domain: letters,
      range: colors,
      legend: colorLegend({ label: 'Letter' }),
    },
  })

export const mount = tanstackMount(
  definition,
  'English letter frequency waffle chart',
)
