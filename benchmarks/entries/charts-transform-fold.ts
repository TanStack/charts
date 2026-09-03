import { fold } from '@tanstack/charts/transform/fold'

const rows = [
  { category: 'A', current: 4, previous: 2 },
  { category: 'B', current: 7, previous: 5 },
]

export const output = fold(rows, {
  fields: ['current', 'previous'],
  as: { key: 'period', value: 'value' },
})
