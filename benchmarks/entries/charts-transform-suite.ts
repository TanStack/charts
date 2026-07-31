import { binX } from '@tanstack/charts/transform/bin'
import { groupBy } from '@tanstack/charts/transform/group'
import { normalize } from '@tanstack/charts/transform/normalize'
import { select } from '@tanstack/charts/transform/select'
import { stackRowsY } from '@tanstack/charts/transform/stack'
import { window } from '@tanstack/charts/transform/window'

const rows = [
  { category: 'A', series: 'one', value: 1 },
  { category: 'A', series: 'two', value: 2 },
  { category: 'B', series: 'one', value: 3 },
  { category: 'B', series: 'two', value: 4 },
]

export const transformed = {
  bins: binX(rows, { value: 'value', thresholds: 2 }),
  groups: groupBy(rows, {
    by: 'category',
    outputs: { total: { value: 'value', reduce: 'sum' } },
  }),
  normalized: normalize(rows, { value: 'value', by: 'category' }),
  selected: select(rows, { value: 'value', select: 'max' }),
  stacked: stackRowsY(rows, { x: 'category', y: 'value', z: 'series' }),
  rolling: window(rows, { value: 'value', size: 2 }),
}
