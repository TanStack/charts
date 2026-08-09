import { rollingWindow } from '@tanstack/charts/transform/rolling-window'
export const output = rollingWindow([{ order: 1, value: 1 }], {
  orderBy: 'order',
  size: 2,
  outputs: { average: { value: 'value', reduce: 'mean' } },
})
