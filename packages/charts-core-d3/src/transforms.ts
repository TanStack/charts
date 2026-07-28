import { bin as d3Bin, group as d3Group, max, mean, min, sum } from 'd3-array'
import { stack, stackOffsetDiverging } from 'd3-shape'
import type { Channel, ChartKey, ChartValue } from './types'

export type NumericReducer<TDatum = unknown> =
  | 'count'
  | 'sum'
  | 'mean'
  | 'min'
  | 'max'
  | ((values: readonly number[], data: readonly TDatum[]) => number)

export interface GroupOptions<TDatum> {
  by: Channel<TDatum, ChartKey>
  value?: Channel<TDatum, number | null | undefined>
  reduce?: NumericReducer<TDatum>
}

export interface GroupDatum<TDatum> {
  key: ChartKey
  value: number
  data: readonly TDatum[]
}

export interface BinOptions<TDatum> {
  value: Channel<TDatum, number | null | undefined>
  weight?: Channel<TDatum, number | null | undefined>
  thresholds?: number | readonly number[]
  domain?: readonly [number, number]
  reduce?: NumericReducer<TDatum>
}

export interface BinDatum<TDatum> {
  x: number
  x1: number
  x2: number
  value: number
  data: readonly TDatum[]
}

export interface StackYOptions<TDatum> {
  x: Channel<TDatum, ChartValue>
  y: Channel<TDatum, number | null | undefined>
  z?: Channel<TDatum, ChartKey>
  order?: 'input' | 'ascending' | 'descending' | readonly ChartKey[]
}

export interface StackYDatum<TDatum> {
  datum: TDatum
  x: ChartValue
  y: number
  y1: number
  y2: number
  z: ChartKey
}

interface GroupRow<TDatum> {
  datum: TDatum
  key: ChartKey
  value?: number
}

interface BinRow<TDatum> {
  datum: TDatum
  dimension: number
  weight?: number
}

interface StackRow<TDatum> {
  datum: TDatum
  x: ChartValue
  y: number
  z: ChartKey
  sourceIndex: number
}

export function group<TDatum>(
  source: Iterable<TDatum>,
  options: GroupOptions<TDatum>,
): GroupDatum<TDatum>[] {
  const data = toArray(source)
  const keys = materialize(data, options.by)
  const values = options.value
    ? materialize(data, options.value)
    : data.map(() => undefined)
  const rows: GroupRow<TDatum>[] = []

  data.forEach((datum, index) => {
    const key = keys[index]
    if (!isKey(key)) return
    const value = values[index]
    rows.push({
      datum,
      key,
      value: isNumber(value) ? value : undefined,
    })
  })

  const reducer = options.reduce ?? (options.value ? 'sum' : 'count')
  return [...d3Group(rows, (row) => row.key)].map(([key, entries]) => {
    const entryData = entries.map((entry) => entry.datum)
    const entryValues = entries.flatMap((entry) =>
      entry.value === undefined ? [] : [entry.value],
    )
    return {
      key,
      value: reduce(entryValues, entryData, reducer),
      data: entryData,
    }
  })
}

export function bin<TDatum>(
  source: Iterable<TDatum>,
  options: BinOptions<TDatum>,
): BinDatum<TDatum>[] {
  const data = toArray(source)
  const dimensions = materialize(data, options.value)
  const weights = options.weight
    ? materialize(data, options.weight)
    : data.map(() => undefined)
  const rows: BinRow<TDatum>[] = []

  data.forEach((datum, index) => {
    const dimension = dimensions[index]
    if (!isNumber(dimension)) return
    const weight = weights[index]
    rows.push({
      datum,
      dimension,
      weight: isNumber(weight) ? weight : undefined,
    })
  })

  const histogram = d3Bin<BinRow<TDatum>, number>().value(
    (row) => row.dimension,
  )
  const boundaries = Array.isArray(options.thresholds)
    ? normalizedBoundaries(options.thresholds)
    : undefined
  if (boundaries) {
    histogram
      .domain([boundaries[0] as number, boundaries.at(-1) as number])
      .thresholds(boundaries.slice(1, -1))
  } else {
    if (options.domain) {
      histogram.domain(normalizedDomain(options.domain))
    }
    histogram.thresholds(
      typeof options.thresholds === 'number'
        ? Math.max(1, Math.floor(options.thresholds))
        : 10,
    )
  }

  const reducer = options.reduce ?? (options.weight ? 'sum' : 'count')
  return histogram(rows).map((entries) => {
    const entryData = entries.map((entry) => entry.datum)
    const entryValues = entries.flatMap((entry) =>
      entry.weight === undefined ? [] : [entry.weight],
    )
    const x1 = entries.x0 ?? 0
    const x2 = entries.x1 ?? x1
    return {
      x: (x1 + x2) / 2,
      x1,
      x2,
      value: reduce(entryValues, entryData, reducer),
      data: entryData,
    }
  })
}

export function stackY<TDatum>(
  source: Iterable<TDatum>,
  options: StackYOptions<TDatum>,
): StackYDatum<TDatum>[] {
  const data = toArray(source)
  const xValues = materialize(data, options.x)
  const yValues = materialize(data, options.y)
  const zValues = options.z
    ? materialize(data, options.z)
    : data.map(() => 'value' as const)
  const rows: StackRow<TDatum>[] = []

  data.forEach((datum, sourceIndex) => {
    const x = xValues[sourceIndex]
    const y = yValues[sourceIndex]
    const z = zValues[sourceIndex]
    if (!isValue(x) || !isNumber(y) || !isKey(z)) return
    rows.push({ datum, x, y, z, sourceIndex })
  })

  const series = orderedSeries(zValues, options.order)
  const seriesIndex = new Map(
    series.map((value, index) => [valueKey(value), index]),
  )
  const groups = d3Group(rows, (row) => valueKey(row.x))
  const output: StackYDatum<TDatum>[] = []

  for (const entries of groups.values()) {
    entries.sort(
      (left, right) =>
        (seriesIndex.get(valueKey(left.z)) ?? 0) -
          (seriesIndex.get(valueKey(right.z)) ?? 0) ||
        left.sourceIndex - right.sourceIndex,
    )
    const keys = entries.map((_entry, index) => String(index))
    const wide = Object.fromEntries(
      entries.map((entry, index) => [String(index), entry.y]),
    )
    const stacked = stack<Record<string, number>, string>()
      .keys(keys)
      .value((row, key) => row[key] ?? 0)
      .offset(stackOffsetDiverging)([wide])

    entries.forEach((entry, index) => {
      const point = stacked[index]?.[0]
      output.push({
        datum: entry.datum,
        x: entry.x,
        y: entry.y,
        y1: entry.y < 0 ? (point?.[1] ?? 0) : (point?.[0] ?? 0),
        y2: entry.y < 0 ? (point?.[0] ?? entry.y) : (point?.[1] ?? entry.y),
        z: entry.z,
      })
    })
  }

  return output
}

function reduce<TDatum>(
  values: readonly number[],
  data: readonly TDatum[],
  reducer: NumericReducer<TDatum>,
): number {
  if (typeof reducer === 'function') return reducer(values, data)
  if (reducer === 'count') return data.length
  if (!values.length) return 0
  if (reducer === 'sum') return sum(values)
  if (reducer === 'mean') return mean(values) ?? 0
  if (reducer === 'min') return min(values) ?? 0
  return max(values) ?? 0
}

function normalizedBoundaries(thresholds: readonly number[]): number[] {
  const boundaries = [...new Set(thresholds.filter(isNumber))].sort(
    (left, right) => left - right,
  )
  if (boundaries.length < 2) {
    throw new RangeError('Bin thresholds require at least two boundaries')
  }
  return boundaries
}

function normalizedDomain(domain: readonly [number, number]): [number, number] {
  const normalized: [number, number] =
    domain[0] <= domain[1] ? [domain[0], domain[1]] : [domain[1], domain[0]]
  if (normalized[0] !== normalized[1]) return normalized
  const offset = Math.abs(normalized[0]) * 0.05 || 1
  return [normalized[0] - offset, normalized[1] + offset]
}

function orderedSeries(
  values: readonly unknown[],
  order: StackYOptions<unknown>['order'],
): ChartKey[] {
  const input: ChartKey[] = []
  const seen = new Set<string>()
  for (const value of values) {
    if (!isKey(value)) continue
    const key = valueKey(value)
    if (seen.has(key)) continue
    seen.add(key)
    input.push(value)
  }
  if (Array.isArray(order)) {
    const explicit = [...order]
    const explicitKeys = new Set(explicit.map(valueKey))
    return [
      ...explicit,
      ...input.filter((value) => !explicitKeys.has(valueKey(value))),
    ]
  }
  if (order === 'ascending') {
    return [...input].sort((left, right) =>
      String(left).localeCompare(String(right)),
    )
  }
  if (order === 'descending') {
    return [...input].sort((left, right) =>
      String(right).localeCompare(String(left)),
    )
  }
  return input
}

function materialize<TDatum, TValue>(
  data: readonly TDatum[],
  channel: Channel<TDatum, TValue>,
): TValue[] {
  return typeof channel === 'function'
    ? data.map((datum, index) => channel(datum, index, data))
    : (data.map((datum) =>
        datum != null && typeof datum === 'object'
          ? (datum as Record<string, TValue>)[channel]
          : undefined,
      ) as TValue[])
}

function toArray<TDatum>(source: Iterable<TDatum>): readonly TDatum[] {
  return Array.isArray(source) ? source : Array.from(source)
}

function valueKey(value: unknown): string {
  if (value instanceof Date) return `date:${value.getTime()}`
  return `${typeof value}:${String(value)}`
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isKey(value: unknown): value is ChartKey {
  return typeof value === 'string' || typeof value === 'number'
}

function isValue(value: unknown): value is ChartValue {
  return isKey(value) || value instanceof Date
}
