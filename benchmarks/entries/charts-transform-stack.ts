import { stackRowsY } from '@tanstack/charts/transform/stack'

export const output = stackRowsY([{ x: 'a', y: 1, z: 'one' }], {
  x: 'x',
  y: 'y',
  z: 'z',
  order: 'inside-out',
  offset: 'wiggle',
})

export const anchored = stackRowsY(
  [
    { x: 'a', y: 2, z: 'Disagree' },
    { x: 'a', y: 2, z: 'Neutral' },
    { x: 'a', y: 3, z: 'Agree' },
  ],
  {
    x: 'x',
    y: 'y',
    z: 'z',
    order: ['Disagree', 'Neutral', 'Agree'],
    anchor: { series: 'Neutral', fraction: 0.5 },
  },
)
