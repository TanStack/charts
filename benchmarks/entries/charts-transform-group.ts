import { groupBy } from '@tanstack/charts/transform/group'
export const output = groupBy([{ group: 'a', value: 1 }], {
  by: 'group',
  outputs: { total: { value: 'value', reduce: 'sum' } },
})
