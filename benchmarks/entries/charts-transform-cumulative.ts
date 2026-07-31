import { cumulative } from '@tanstack/charts/transform/cumulative'
export const output = cumulative([{ value: 1 }], {
  outputs: { total: { value: 'value', reduce: 'sum' } },
})
