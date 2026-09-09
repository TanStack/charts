import { stackOrderInsideOut } from 'd3-shape'
import type { Series } from 'd3-shape'
import { valueKey } from './scales'
import type { StackOptions, StackOrder } from './stack'
import type { ChartKey, ChartValue } from './types'

interface StackEndInput {
  index: number
  position: ChartValue
  value: number
  series: ChartKey
}

export function stackOuterEnds(
  positions: readonly unknown[],
  values: readonly unknown[],
  series: readonly unknown[],
  options: Readonly<StackOptions> = {},
  fallbackSeries: 'value' | 'index' = 'value',
) {
  const input = stackEndInput(positions, values, series, fallbackSeries)
  const orderedSeries = resolveSeriesOrder(input, options.order)
  if (options.reverse) orderedSeries.reverse()
  const seriesRank = new Map(
    orderedSeries.map((value, index) => [valueKey(value), index]),
  )
  const orderedInput = [...input].sort(
    (left, right) =>
      seriesRank.get(valueKey(left.series))! -
      seriesRank.get(valueKey(right.series))!,
  )
  const outerEnds = Array.from({ length: positions.length }, () => false)
  const terminals = new Map<
    string,
    { positive?: number; negative?: number; final?: number }
  >()
  const diverging =
    options.offset === undefined || options.offset === 'diverging'

  for (const row of orderedInput) {
    if (row.value === 0) continue
    const position = valueKey(row.position)
    const terminal = terminals.get(position) ?? {}
    if (diverging) {
      if (row.value < 0) terminal.negative = row.index
      else terminal.positive = row.index
    } else {
      terminal.final = row.index
    }
    terminals.set(position, terminal)
  }

  for (const terminal of terminals.values()) {
    if (terminal.positive !== undefined) outerEnds[terminal.positive] = true
    if (terminal.negative !== undefined) outerEnds[terminal.negative] = true
    if (terminal.final !== undefined) outerEnds[terminal.final] = true
  }
  return outerEnds
}

function stackEndInput(
  positions: readonly unknown[],
  values: readonly unknown[],
  series: readonly unknown[],
  fallbackSeries: 'value' | 'index',
): StackEndInput[] {
  const input: StackEndInput[] = []
  for (let index = 0; index < positions.length; index += 1) {
    const position = positions[index]
    const value = values[index]
    if (!isChartValue(position) || !isFiniteNumber(value)) continue
    const seriesValue = series[index]
    input.push({
      index,
      position,
      value,
      series: isChartKey(seriesValue)
        ? seriesValue
        : fallbackSeries === 'index'
          ? index
          : 'value',
    })
  }
  return input
}

function resolveSeriesOrder(
  input: readonly StackEndInput[],
  order: StackOrder | undefined,
): ChartKey[] {
  const firstSeen: ChartKey[] = []
  const seen = new Set<string>()
  for (const row of input) {
    const identity = valueKey(row.series)
    if (seen.has(identity)) continue
    seen.add(identity)
    firstSeen.push(row.series)
  }
  if (Array.isArray(order)) {
    const explicit = [...order]
    const explicitKeys = new Set(explicit.map(valueKey))
    return [
      ...explicit,
      ...firstSeen.filter((value) => !explicitKeys.has(valueKey(value))),
    ]
  }
  if (order === 'inside-out') {
    const positions: ChartValue[] = []
    const positionIndex = new Map<string, number>()
    for (const row of input) {
      const identity = valueKey(row.position)
      if (positionIndex.has(identity)) continue
      positionIndex.set(identity, positions.length)
      positions.push(row.position)
    }
    const seriesValues = firstSeen.map((seriesValue) => {
      const identity = valueKey(seriesValue)
      const output = positions.map(() => [0, 0] as [number, number])
      for (const row of input) {
        if (valueKey(row.series) !== identity) continue
        output[positionIndex.get(valueKey(row.position))!]![1] = row.value
      }
      return output
    })
    return stackOrderInsideOut(
      seriesValues as unknown as Series<Record<string, number>, string>,
    ).map((index) => firstSeen[index]!)
  }
  if (order !== 'ascending' && order !== 'descending') return firstSeen
  const totals = new Map(firstSeen.map((value) => [valueKey(value), 0]))
  for (const row of input) {
    const key = valueKey(row.series)
    totals.set(key, (totals.get(key) ?? 0) + Math.abs(row.value))
  }
  return firstSeen.sort((left, right) => {
    const difference =
      (totals.get(valueKey(left)) ?? 0) - (totals.get(valueKey(right)) ?? 0)
    return order === 'ascending' ? difference : -difference
  })
}

function isChartKey(value: unknown): value is ChartKey {
  return typeof value === 'string' || typeof value === 'number'
}

function isChartValue(value: unknown): value is ChartValue {
  return (
    typeof value === 'string' ||
    isFiniteNumber(value) ||
    (value instanceof Date && Number.isFinite(value.getTime()))
  )
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}
