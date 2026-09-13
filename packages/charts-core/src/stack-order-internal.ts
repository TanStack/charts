import { valueKey } from './scales'
import type { StackInput } from './stack-internal'
import type { StackOrder } from './stack'
import type { ChartKey } from './types'

export function orderedSeries(
  rows: readonly StackInput[],
  input: readonly ChartKey[],
  order: StackOrder | undefined,
): ChartKey[] {
  if (Array.isArray(order)) {
    const explicit = [...order]
    const explicitKeys = new Set(explicit.map(valueKey))
    return [
      ...explicit,
      ...input.filter((value) => !explicitKeys.has(valueKey(value))),
    ]
  }
  if (order !== 'ascending' && order !== 'descending') return [...input]
  const totals = new Map(input.map((value) => [valueKey(value), 0]))
  for (const row of rows) {
    const key = valueKey(row.series)
    totals.set(key, (totals.get(key) ?? 0) + Math.abs(row.value))
  }
  return [...input].sort((left, right) => {
    const difference =
      (totals.get(valueKey(left)) ?? 0) - (totals.get(valueKey(right)) ?? 0)
    return order === 'ascending' ? difference : -difference
  })
}
