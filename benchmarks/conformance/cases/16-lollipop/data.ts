import { rollup, sum } from 'd3-array'
import { categoryData } from '../../shared/data'

export interface LollipopPoint {
  id: string
  category: string
  value: number
}

export function lollipopData(revision = 0): readonly LollipopPoint[] {
  return [
    ...rollup(
      categoryData(revision),
      (rows) => sum(rows, (row) => row.value),
      (row) => row.category,
    ),
  ]
    .map(([category, value]) => ({ id: category, category, value }))
    .sort((left, right) => right.value - left.value)
}
