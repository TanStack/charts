import { binXY } from '@tanstack/charts/transform/bin-xy'
const rows = [
  { x: 1, y: 2 },
  { x: 2, y: 1 },
]
export const output = binXY(rows, {
  x: 'x',
  y: 'y',
  xThresholds: 2,
  yThresholds: 2,
})
