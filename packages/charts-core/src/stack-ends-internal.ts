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
  start: number
  end: number
}

export interface StackOuterEnd {
  readonly start: boolean
  readonly end: boolean
}

export function stackOuterEnds(
  positions: readonly unknown[],
  values: readonly unknown[],
  series: readonly unknown[],
  starts: readonly unknown[],
  ends: readonly unknown[],
  options: Readonly<StackOptions> = {},
  fallbackSeries: 'value' | 'index' = 'value',
) {
  const input = stackEndInput(
    positions,
    values,
    series,
    starts,
    ends,
    fallbackSeries,
  )
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
  const outerEnds: (StackOuterEnd | undefined)[] = Array.from({
    length: positions.length,
  })
  const paintGroups = groupStackEnds(input)
  const orderedGroups = groupStackEnds(orderedInput)
  const diverging =
    options.offset === undefined || options.offset === 'diverging'

  for (const [position, rows] of orderedGroups) {
    const paintRows = paintGroups.get(position)!
    if (diverging) {
      const minimum = Math.min(...rows.flatMap((row) => [row.start, row.end]))
      const maximum = Math.max(...rows.flatMap((row) => [row.start, row.end]))
      if (maximum > 0) markExtremeEnd(rows, paintRows, 'max', outerEnds)
      if (minimum < 0) markExtremeEnd(rows, paintRows, 'min', outerEnds)
    } else {
      const baseline = rows[0]!.start
      const terminal = rows.at(-1)!.end
      let extreme: 'min' | 'max'
      if (terminal < baseline) extreme = 'min'
      else if (terminal > baseline) extreme = 'max'
      else {
        const minimum = Math.min(...rows.flatMap((row) => [row.start, row.end]))
        const maximum = Math.max(...rows.flatMap((row) => [row.start, row.end]))
        extreme = baseline - minimum > maximum - baseline ? 'min' : 'max'
      }
      markExtremeEnd(rows, paintRows, extreme, outerEnds)
    }
  }
  return outerEnds
}

function groupStackEnds(input: readonly StackEndInput[]) {
  const groups = new Map<string, StackEndInput[]>()
  for (const row of input) {
    if (row.value === 0 || row.start === row.end) continue
    const position = valueKey(row.position)
    const group = groups.get(position)
    if (group) group.push(row)
    else groups.set(position, [row])
  }
  return groups
}

function markExtremeEnd(
  geometryRows: readonly StackEndInput[],
  paintRows: readonly StackEndInput[],
  extreme: 'min' | 'max',
  outerEnds: (StackOuterEnd | undefined)[],
) {
  if (geometryRows.length === 0) return
  const target = Math[extreme](
    ...geometryRows.flatMap((row) => [row.start, row.end]),
  )
  for (const row of paintRows) {
    const start = row.start === target
    const end = row.end === target
    if (!start && !end) continue
    const existing = outerEnds[row.index]
    outerEnds[row.index] = {
      start: existing?.start === true || start,
      end: existing?.end === true || end,
    }
  }
}

function stackEndInput(
  positions: readonly unknown[],
  values: readonly unknown[],
  series: readonly unknown[],
  starts: readonly unknown[],
  ends: readonly unknown[],
  fallbackSeries: 'value' | 'index',
): StackEndInput[] {
  const input: StackEndInput[] = []
  for (let index = 0; index < positions.length; index += 1) {
    const position = positions[index]
    const value = values[index]
    const start = starts[index]
    const end = ends[index]
    if (
      !isChartValue(position) ||
      !isFiniteNumber(value) ||
      !isFiniteNumber(start) ||
      !isFiniteNumber(end)
    )
      continue
    const seriesValue = series[index]
    input.push({
      index,
      position,
      value,
      start,
      end,
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
