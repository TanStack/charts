import { stackOrderInsideOut } from 'd3-shape'
import type { Series } from 'd3-shape'
import { valueKey } from './scales'
import type { StackOptions, StackOrder } from './stack'
import { createStackInput, type StackInput } from './stack-internal'
import { orderedSeries } from './stack-order-internal'
import { isFiniteNumber } from './mark'
import type { ChartKey, ChartValue } from './types'

interface StackEndInput extends StackInput {
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
  for (const row of createStackInput(
    positions,
    values,
    series,
    fallbackSeries,
  )) {
    const start = starts[row.index]
    const end = ends[row.index]
    if (!isFiniteNumber(start) || !isFiniteNumber(end)) continue

    input.push({ ...row, start, end })
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
  return orderedSeries(input, firstSeen, order)
}
