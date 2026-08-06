import { binX } from '@tanstack/charts/transform/bin'
import { groupBy } from '@tanstack/charts/transform/group'
import { normalize } from '@tanstack/charts/transform/normalize'
import { select } from '@tanstack/charts/transform/select'
import { stackRowsY } from '@tanstack/charts/transform/stack'
import { waterfall } from '@tanstack/charts/transform/waterfall'
import { window } from '@tanstack/charts/transform/window'
import { binXY } from '@tanstack/charts/transform/bin-xy'
import { cumulative } from '@tanstack/charts/transform/cumulative'
import { fold } from '@tanstack/charts/transform/fold'
import { mosaicY } from '@tanstack/charts/transform/mosaic'
import { rank } from '@tanstack/charts/transform/rank'

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
  waterfall: waterfall(rows, {
    value: 'value',
    orderBy: 'value',
    total: true,
  }),
  rolling: window(rows, {
    size: 2,
    outputs: { average: { value: 'value', reduce: 'mean' } },
  }),
  cells: binXY(rows, {
    x: 'value',
    y: 'value',
    xThresholds: 2,
    yThresholds: 2,
  }),
  cumulative: cumulative(rows, {
    outputs: { total: { value: 'value', reduce: 'sum' } },
  }),
  folded: fold(rows, { fields: ['value', 'category'] }),
  mosaic: mosaicY(rows, {
    x: 'category',
    y: 'series',
    value: 'value',
  }),
  ranked: rank(rows, { value: 'value' }),
}
