import { bin as d3Bin } from 'd3-array'
import type { TransformOutputRow, TransformOutputs } from './transform-reduce'
import {
  type TransformKey,
  type TransformLineage,
  type TransformValue,
  type TransformValueOutput,
} from './transform'
import { toArray, transformKey, transformValues } from './transform-internal'
import {
  assertTransformOutputNames,
  prepareOutputs,
  reducePreparedOutputs,
  type ContextualTransformOutputs,
} from './transform-reduce-internal'

interface BinInput<TDatum, TKey extends TransformKey> {
  datum: TDatum
  index: number
  value: number
  key: TKey
}

interface BinOptionsBase<
  TDatum,
  TValue extends TransformValue<TDatum, number | null | undefined>,
  TBy extends TransformValue<TDatum, TransformKey> | undefined,
> {
  value: TValue
  by?: TBy
  thresholds?: number | readonly number[]
  domain?: readonly [number, number]
}

export type BinOptions<TDatum> = BinOptionsBase<
  TDatum,
  TransformValue<TDatum, number | null | undefined>,
  TransformValue<TDatum, TransformKey> | undefined
> & {
  outputs?: TransformOutputs<TDatum>
}

type DefaultBinOptions<
  TDatum,
  TValue extends TransformValue<TDatum, number | null | undefined>,
  TBy extends TransformValue<TDatum, TransformKey> | undefined,
> = BinOptionsBase<TDatum, TValue, TBy> & {
  outputs?: never
}

type InferredBinOptions<
  TDatum,
  TValue extends TransformValue<TDatum, number | null | undefined>,
  TBy extends TransformValue<TDatum, TransformKey> | undefined,
  TOutputs extends TransformOutputs<TDatum>,
> = BinOptionsBase<TDatum, TValue, TBy> & {
  outputs: ContextualTransformOutputs<TDatum, TOutputs>
}

export type BinKey<TDatum, TBy> =
  TBy extends TransformValue<TDatum, TransformKey>
    ? Extract<TransformValueOutput<TDatum, TBy>, TransformKey>
    : null

export type BinXDatum<
  TDatum,
  TKey extends TransformKey,
  TOutputs,
> = TransformLineage<TDatum> &
  TransformOutputRow<TOutputs> & {
    readonly key: TKey
    readonly x: number
    readonly x1: number
    readonly x2: number
  }

export type BinYDatum<
  TDatum,
  TKey extends TransformKey,
  TOutputs,
> = TransformLineage<TDatum> &
  TransformOutputRow<TOutputs> & {
    readonly key: TKey
    readonly y: number
    readonly y1: number
    readonly y2: number
  }

type DefaultBinOutput = { readonly value: number }

export function binX<
  TDatum,
  const TValue extends TransformValue<TDatum, number | null | undefined>,
  const TBy extends TransformValue<TDatum, TransformKey> | undefined =
    undefined,
>(
  source: Iterable<TDatum>,
  options: DefaultBinOptions<TDatum, TValue, TBy>,
): BinXDatum<TDatum, BinKey<TDatum, TBy>, DefaultBinOutput>[]
export function binX<
  TDatum,
  const TValue extends TransformValue<TDatum, number | null | undefined>,
  const TBy extends TransformValue<TDatum, TransformKey> | undefined,
  const TOutputs extends TransformOutputs<TDatum>,
>(
  source: Iterable<TDatum>,
  options: InferredBinOptions<TDatum, TValue, TBy, TOutputs>,
): BinXDatum<TDatum, BinKey<TDatum, TBy>, TOutputs>[]
export function binX<TDatum>(source: Iterable<TDatum>, options: any): any[] {
  return bins(source, options).map(({ lower, upper, ...datum }) => ({
    ...datum,
    x: (lower + upper) / 2,
    x1: lower,
    x2: upper,
  }))
}

export function binY<
  TDatum,
  const TValue extends TransformValue<TDatum, number | null | undefined>,
  const TBy extends TransformValue<TDatum, TransformKey> | undefined =
    undefined,
>(
  source: Iterable<TDatum>,
  options: DefaultBinOptions<TDatum, TValue, TBy>,
): BinYDatum<TDatum, BinKey<TDatum, TBy>, DefaultBinOutput>[]
export function binY<
  TDatum,
  const TValue extends TransformValue<TDatum, number | null | undefined>,
  const TBy extends TransformValue<TDatum, TransformKey> | undefined,
  const TOutputs extends TransformOutputs<TDatum>,
>(
  source: Iterable<TDatum>,
  options: InferredBinOptions<TDatum, TValue, TBy, TOutputs>,
): BinYDatum<TDatum, BinKey<TDatum, TBy>, TOutputs>[]
export function binY<TDatum>(source: Iterable<TDatum>, options: any): any[] {
  return bins(source, options).map(({ lower, upper, ...datum }) => ({
    ...datum,
    y: (lower + upper) / 2,
    y1: lower,
    y2: upper,
  }))
}

function bins<TDatum>(
  source: Iterable<TDatum>,
  options: BinOptionsBase<
    TDatum,
    TransformValue<TDatum, number | null | undefined>,
    TransformValue<TDatum, TransformKey> | undefined
  > & { outputs?: TransformOutputs<TDatum> },
) {
  const data = toArray(source)
  const values = transformValues(data, options.value)
  const keys =
    options.by !== undefined
      ? transformValues(data, options.by)
      : data.map(() => null)
  const rows: BinInput<TDatum, TransformKey>[] = []
  const groups = new Map<
    string,
    { key: TransformKey; rows: BinInput<TDatum, TransformKey>[] }
  >()
  data.forEach((datum, index) => {
    const key = keys[index]
    const identity = transformKey(key)
    let group = groups.get(identity)
    if (!group) {
      group = { key, rows: [] }
      groups.set(identity, group)
    }
    const value = values[index]
    if (!isFiniteNumber(value)) return
    const row = { datum, index, value, key }
    rows.push(row)
    group.rows.push(row)
  })
  if (!groups.size && options.by === undefined) {
    groups.set(transformKey(null), { key: null, rows: [] })
  }
  const template = createHistogram(options)(rows)
  const first = template[0]
  const last = template.at(-1)
  if (!first || !last || first.x0 === undefined || last.x1 === undefined) {
    return []
  }
  const lower = first.x0
  const upper = last.x1
  const thresholds = template
    .slice(0, -1)
    .flatMap((entry) => (entry.x1 === undefined ? [] : [entry.x1]))
  const histogram = d3Bin<BinInput<TDatum, TransformKey>, number>()
    .value((row) => row.value)
    .domain([lower, upper])
    .thresholds(thresholds)
  const outputs = options.outputs ?? ({ value: { reduce: 'count' } } as const)
  assertTransformOutputNames(
    outputs,
    ['key', 'x', 'x1', 'x2', 'y', 'y1', 'y2', 'source', 'sourceIndexes'],
    'bin',
  )
  const preparedOutputs = prepareOutputs(data, outputs)

  return [...groups.values()].flatMap(({ key, rows: groupRows }) =>
    histogram(groupRows).map((entry) => {
      const indexes = entry.map((row) => row.index)
      const entryLower = entry.x0 ?? lower
      const entryUpper = entry.x1 ?? entryLower
      return {
        key,
        lower: entryLower,
        upper: entryUpper,
        source: indexes.map((index) => data[index] as TDatum),
        sourceIndexes: indexes,
        ...reducePreparedOutputs(data, indexes, key, preparedOutputs),
      }
    }),
  )
}

function createHistogram<TDatum>(
  options: Pick<BinOptionsBase<TDatum, any, any>, 'domain' | 'thresholds'>,
) {
  const histogram = d3Bin<BinInput<TDatum, TransformKey>, number>().value(
    (row) => row.value,
  )
  if (Array.isArray(options.thresholds)) {
    const boundaries = [...new Set(options.thresholds)]
      .filter(isFiniteNumber)
      .sort((left, right) => left - right)
    if (boundaries.length < 2) {
      throw new TypeError(
        'bin: an explicit boundary sequence requires two values',
      )
    }
    const domain: [number, number] = [boundaries[0]!, boundaries.at(-1)!]
    if (options.domain) {
      const configuredDomain = normalizedDomain(options.domain)
      if (
        configuredDomain[0] !== domain[0] ||
        configuredDomain[1] !== domain[1]
      ) {
        throw new TypeError(
          'bin: domain must match the first and last explicit boundaries',
        )
      }
    }
    histogram.domain(domain)
    histogram.thresholds(boundaries.slice(1, -1))
  } else if (typeof options.thresholds === 'number') {
    if (!Number.isFinite(options.thresholds) || options.thresholds <= 0) {
      throw new TypeError('bin: thresholds must be a positive finite number')
    }
    if (options.domain) histogram.domain(normalizedDomain(options.domain))
    histogram.thresholds(Math.floor(options.thresholds))
  } else if (options.domain) {
    histogram.domain(normalizedDomain(options.domain))
  }
  return histogram
}

function normalizedDomain(domain: readonly [number, number]): [number, number] {
  if (!domain.every(isFiniteNumber)) {
    throw new TypeError('bin: domain values must be finite numbers')
  }
  if (domain[0] < domain[1]) return [domain[0], domain[1]]
  if (domain[1] < domain[0]) return [domain[1], domain[0]]
  const padding = Math.abs(domain[0]) * 0.05 || 1
  return [domain[0] - padding, domain[1] + padding]
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}
