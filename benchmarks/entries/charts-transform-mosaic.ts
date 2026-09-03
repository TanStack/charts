import { mosaicX, mosaicY } from '@tanstack/charts/transform/mosaic'

const rows = [
  { question: 'A', response: 'No', count: 1 },
  { question: 'A', response: 'Yes', count: 3 },
  { question: 'B', response: 'No', count: 2 },
  { question: 'B', response: 'Yes', count: 2 },
]

const options = {
  x: 'question',
  y: 'response',
  value: 'count',
  xOrder: ['A', 'B'],
  yOrder: ['No', 'Yes'],
} as const

export const output = {
  x: mosaicX(rows, options),
  y: mosaicY(rows, options),
}
