import { window } from '@tanstack/charts/transform/window'
export const output = window([{ order: 1, value: 1 }], {
  orderBy: 'order',
  size: 2,
  outputs: { average: { value: 'value', reduce: 'mean' } },
})
