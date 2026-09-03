import {
  stack as d3Stack,
  stackOffsetExpand,
  stackOffsetNone,
  stackOffsetSilhouette,
  stackOffsetWiggle,
  stackOrderInsideOut,
} from 'd3-shape'
import type { Series } from 'd3-shape'
import { valueKey } from './scales'
import type { StackOptions, StackOrder } from './stack'
import type { ChartKey, ChartValue } from './types'

export interface StackInput {
  index: number
  position: ChartValue
  value: number
  series: ChartKey
}

export interface StackExtent {
  start: number
  end: number
}

export function stackExtents(
  input: readonly StackInput[],
  options: Readonly<StackOptions> = {},
): Map<number, StackExtent> {
  const anchorFraction = resolveAnchorFraction(options)
  if (input.length === 0) return new Map()
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

  const insideOut = options.order === 'inside-out'
  if (anchorFraction !== undefined && input.some(({ value }) => value < 0)) {
    throw new TypeError('A stack anchor requires nonnegative values')
  }
  const series = orderedSeries(input, seriesInput, options.order)
  if (options.reverse && !insideOut) series.reverse()
  const identities = series.map(valueKey)
  const offset = options.anchor
    ? stackOffsetNone
    : options.offset === 'normalize'
      ? stackOffsetExpand
      : options.offset === 'center'
        ? stackOffsetSilhouette
        : options.offset === 'wiggle'
          ? stackOffsetWiggle
          : stackOffsetDivergingZeroAware
  const generator = d3Stack<Record<string, number>, string>()
    .keys(identities)
    .value((row, key) => row[key] ?? 0)
    .offset(offset)
  if (insideOut) {
    generator.order(
      options.reverse
        ? (seriesValues) => stackOrderInsideOut(seriesValues).reverse()
        : stackOrderInsideOut,
    )
  }
  const stacked = generator(rows)
  if (options.anchor && anchorFraction !== undefined) {
    translateAnchorToZero(stacked, options.anchor.series, anchorFraction)
  }
  if (options.offset === 'wiggle') translateWiggleToZero(stacked)
  const output = new Map<number, StackExtent>()

  stacked.forEach((seriesValues) => {
    const seriesIdentity = seriesValues.key
    seriesValues.forEach((extent, position) => {
      const sourceIndex = sourceIndices.get(`${position}:${seriesIdentity}`)
      if (sourceIndex === undefined) return
      output.set(sourceIndex, { start: extent[0], end: extent[1] })
    })
  })
  return output
}

/**
 * D3 parks exact zeros at the axis. That is invisible for bars, but an area or
 * line interpolates through the zero and cuts across the layers below it.
 * Keep a zero on the running baseline for the side its series occupies.
 */
function stackOffsetDivergingZeroAware(
  series: Series<Record<string, number>, string>[],
  order: number[],
): void {
  if (series.length === 0) return

  // A zero has no sign. Treat only exclusively negative series as negative;
  // positive, mixed, and all-zero series use the positive baseline.
  const negativeSide = series.map((values) => {
    let negative = false
    let positive = false
    for (const [start, end] of values) {
      const value = end - start
      if (value < 0) negative = true
      else if (value > 0) positive = true
    }
    return negative && !positive
  })

  const positionCount = series[order[0]!]!.length
  for (let position = 0; position < positionCount; position += 1) {
    let positiveBaseline = 0
    let negativeBaseline = 0
    for (const seriesIndex of order) {
      const extent = series[seriesIndex]![position]!
      const value = extent[1] - extent[0]
      if (value > 0) {
        extent[0] = positiveBaseline
        extent[1] = positiveBaseline += value
      } else if (value < 0) {
        extent[1] = negativeBaseline
        extent[0] = negativeBaseline += value
      } else if (value === 0) {
        extent[0] = extent[1] = negativeSide[seriesIndex]
          ? negativeBaseline
          : positiveBaseline
      } else {
        // Preserve D3's non-finite behavior so downstream marks keep the gap.
        extent[0] = 0
        extent[1] = value
      }
    }
  }
}

function resolveAnchorFraction(options: Readonly<StackOptions>) {
  const anchor = options.anchor
  if (!anchor) return undefined
  if (options.offset !== undefined && options.offset !== 'diverging') {
    throw new TypeError(
      'A stack anchor can only be used with the diverging offset',
    )
  }
  const fraction = anchor.fraction ?? 0.5
  if (!Number.isFinite(fraction) || fraction < 0 || fraction > 1) {
    throw new TypeError('A stack anchor fraction must be between zero and one')
  }
  return fraction
}

function translateAnchorToZero<TDatum>(
  stacked: readonly Series<TDatum, string>[],
  series: ChartKey,
  fraction: number,
): void {
  const anchorIdentity = valueKey(series)
  const anchorSeries = stacked.find(
    (seriesValues) => seriesValues.key === anchorIdentity,
  )
  if (!anchorSeries) {
    throw new TypeError(
      `Stack anchor series "${String(series)}" is not in the resolved series order`,
    )
  }
  anchorSeries.forEach((anchorExtent, position) => {
    const shift =
      anchorExtent[0] + (anchorExtent[1] - anchorExtent[0]) * fraction
    for (const seriesValues of stacked) {
      const extent = seriesValues[position]
      if (!extent) continue
      extent[0] -= shift
      extent[1] -= shift
    }
  })
}

function translateWiggleToZero<TDatum, TKey>(
  stacked: readonly Series<TDatum, TKey>[],
): void {
  let baseline = Number.POSITIVE_INFINITY
  for (const series of stacked) {
    for (const extent of series) baseline = Math.min(baseline, extent[0])
  }
  if (!Number.isFinite(baseline) || baseline === 0) return
  for (const series of stacked) {
    for (const extent of series) {
      extent[0] -= baseline
      extent[1] -= baseline
    }
  }
}

export function stackValues(
  positions: readonly unknown[],
  values: readonly unknown[],
  series: readonly unknown[],
  options: Readonly<StackOptions> = {},
  fallbackSeries: 'value' | 'index' = 'value',
) {
  const input: StackInput[] = []
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
  const extents = stackExtents(input, options)
  const starts: (number | undefined)[] = Array.from(
    { length: positions.length },
    () => undefined,
  )
  const ends: (number | undefined)[] = Array.from(
    { length: positions.length },
    () => undefined,
  )
  for (const [index, extent] of extents) {
    starts[index] = extent.start
    ends[index] = extent.end
  }
  return { starts, ends }
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
