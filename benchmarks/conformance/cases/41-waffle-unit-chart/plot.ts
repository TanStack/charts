import * as Plot from '@observablehq/plot'
import { alphabet } from '@charts-poc/demo-data/alphabet'
import { mountObservablePlot } from '../../shared/mount'
import type { ConformanceMount } from '../../types'

const colors = [
  '#8b5cf6',
  '#10b981',
  '#ec4899',
  '#f97316',
  '#2563eb',
  '#06b6d4',
]
const letters = alphabet.map((row) => row.letter)

export const mount: ConformanceMount = (container, input) =>
  mountObservablePlot(container, input, (nextInput) => {
    return Plot.plot({
      width: nextInput.width,
      height: nextInput.height,
      ariaLabel: 'English letter frequency waffle chart',
      y: { axis: null },
      color: {
        domain: letters,
        range: colors,
        legend: true,
      },
      marks: [
        Plot.waffleY(alphabet, {
          y: 'frequency',
          fill: 'letter',
          unit: 0.01,
          gap: 2,
          round: true,
          rx: 2,
        }),
      ],
    })
  })
