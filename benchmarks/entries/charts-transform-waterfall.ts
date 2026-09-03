import { waterfall } from '@tanstack/charts/transform/waterfall'

export const output = waterfall(
  [
    { group: 'A', order: 2, value: -1 },
    { group: 'A', order: 1, value: 3 },
  ],
  {
    value: 'value',
    by: 'group',
    orderBy: 'order',
    total: true,
  },
)
