import type { ChartValue } from './types'

export function sameChartValue(
  left: ChartValue | undefined,
  right: ChartValue,
): boolean {
  return left instanceof Date && right instanceof Date
    ? left.getTime() === right.getTime()
    : Object.is(left, right)
}
