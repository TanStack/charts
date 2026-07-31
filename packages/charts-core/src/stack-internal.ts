import {
  stack as d3Stack,
  stackOffsetDiverging,
  stackOffsetExpand,
  stackOffsetSilhouette,
  stackOffsetWiggle,
} from 'd3-shape'
import { valueKey } from './scales'
import type { StackOptions, StackOrder } from './stack'
import type { ChartKey, ChartValue } from './types'

const optionStore = new WeakMap<object, Readonly<StackOptions>>()

export function registerStackOptions(
  channels: object,
  options: Readonly<StackOptions>,
) {
  optionStore.set(channels, options)
}

export function stackOptions(options: object): Readonly<StackOptions> {
  return optionStore.get(options) ?? {}
}

interface StackInput {
  index: number
  position: ChartValue
  value: number
  series: ChartKey
}

interface StackExtent {
  start: number
  end: number
}

export function stackExtents(
  input: readonly StackInput[],
  options: Readonly<StackOptions> = {},
): Map<number, StackExtent> {
  const positions: ChartValue[] = []
  const positionIndex = new Map<string, number>()
  const seriesInput: ChartKey[] = []
  const seriesSeen = new Set<string>()

  for (const row of input) {
    const positionIdentity = valueKey(row.position)
    if (!positionIndex.has(positionIdentity)) {
      positionIndex.set(positionIdentity, positions.length)
      positions.push(row.position)
    }
    const seriesIdentity = valueKey(row.series)
    if (!seriesSeen.has(seriesIdentity)) {
      seriesSeen.add(seriesIdentity)
      seriesInput.push(row.series)
    }
  }

  const series = orderedSeries(input, seriesInput, options.order)
  if (options.reverse) series.reverse()
  const rows = positions.map(
    () => Object.create(null) as Record<string, number>,
  )
  const sourceIndices = new Map<string, number>()

  for (const row of input) {
    const position = positionIndex.get(valueKey(row.position))!
    const seriesIdentity = valueKey(row.series)
    const identity = `${position}:${seriesIdentity}`
    if (sourceIndices.has(identity)) {
      throw new TypeError(
        `A stack requires at most one value for each position and series; duplicate ${String(row.position)} / ${String(row.series)}`,
      )
    }
    sourceIndices.set(identity, row.index)
    rows[position]![seriesIdentity] = row.value
  }

  const identities = series.map(valueKey)
  const offset =
    options.offset === 'normalize'
      ? stackOffsetExpand
      : options.offset === 'center'
        ? stackOffsetSilhouette
        : options.offset === 'wiggle'
          ? stackOffsetWiggle
          : stackOffsetDiverging
  const stacked = d3Stack<Record<string, number>, string>()
    .keys(identities)
    .value((row, key) => row[key] ?? 0)
    .offset(offset)(rows)
  const output = new Map<number, StackExtent>()

  stacked.forEach((seriesValues, seriesIndex) => {
    const seriesIdentity = identities[seriesIndex]!
    seriesValues.forEach((extent, position) => {
      const sourceIndex = sourceIndices.get(`${position}:${seriesIdentity}`)
      if (sourceIndex === undefined) return
      output.set(sourceIndex, { start: extent[0], end: extent[1] })
    })
  })
  return output
}

function orderedSeries(
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
