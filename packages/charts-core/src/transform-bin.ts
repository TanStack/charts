import { bin as d3Bin } from 'd3-array'
import type { TransformOutputRow, TransformOutputs } from './transform-reduce'
import {
  type TransformGroupRow,
  type TransformGroupSpec,
  type TransformLineage,
  type TransformValue,
} from './transform'
import {
  materializeGroups,
  toArray,
  transformValues,
} from './transform-internal'
import {
  assertTransformOutputNames,
  prepareOutputs,
  reducePreparedOutputs,
} from './transform-reduce-internal'

interface BinInput<TDatum> {
  datum: TDatum
  index: number
  value: number
}

interface BinOptionsBase<
  TDatum,
  TValue extends TransformValue<TDatum, number | null | undefined>,
  TBy extends TransformGroupSpec<TDatum> | undefined,
> {
  value: TValue
  by?: TBy
  thresholds?:
    | number
    | readonly number[]
    | ((values: readonly number[], minimum: number, maximum: number) => number)
  domain?: readonly [number, number]
}

export type BinOptions<TDatum> = BinOptionsBase<
  TDatum,
  TransformValue<TDatum, number | null | undefined>,
  TransformGroupSpec<TDatum> | undefined
> & {
  outputs?: TransformOutputs<TDatum>
}

type DefaultBinOptions<
  TDatum,
  TValue extends TransformValue<TDatum, number | null | undefined>,
  TBy extends TransformGroupSpec<TDatum> | undefined,
> = BinOptionsBase<TDatum, TValue, TBy> & {
  outputs?: never
}

type InferredBinOptions<
  TDatum,
  TValue extends TransformValue<TDatum, number | null | undefined>,
  TBy extends TransformGroupSpec<TDatum> | undefined,
  TOutputs extends TransformOutputs<TDatum>,
> = BinOptionsBase<TDatum, TValue, TBy> & {
  outputs: TOutputs
}

export type BinXDatum<TDatum, TBy, TOutputs> = TransformLineage<TDatum> &
  TransformGroupRow<TDatum, TBy> &
  TransformOutputRow<TOutputs> & {
    readonly x: number
    readonly x1: number
    readonly x2: number
  }

export type BinYDatum<TDatum, TBy, TOutputs> = TransformLineage<TDatum> &
  TransformGroupRow<TDatum, TBy> &
  TransformOutputRow<TOutputs> & {
    readonly y: number
    readonly y1: number
    readonly y2: number
  }

type DefaultBinOutput = { readonly value: number }

export function binX<
  TDatum,
  const TValue extends TransformValue<TDatum, number | null | undefined>,
  const TBy extends TransformGroupSpec<TDatum> | undefined = undefined,
>(
  source: Iterable<TDatum>,
  options: DefaultBinOptions<TDatum, TValue, TBy>,
): BinXDatum<TDatum, TBy, DefaultBinOutput>[]
export function binX<
  TDatum,
  const TValue extends TransformValue<TDatum, number | null | undefined>,
  const TBy extends TransformGroupSpec<TDatum> | undefined,
  const TOutputs extends TransformOutputs<TDatum>,
>(
  source: Iterable<TDatum>,
  options: InferredBinOptions<TDatum, TValue, TBy, TOutputs>,
): BinXDatum<TDatum, TBy, TOutputs>[]
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
  const TBy extends TransformGroupSpec<TDatum> | undefined = undefined,
>(
  source: Iterable<TDatum>,
  options: DefaultBinOptions<TDatum, TValue, TBy>,
): BinYDatum<TDatum, TBy, DefaultBinOutput>[]
export function binY<
  TDatum,
  const TValue extends TransformValue<TDatum, number | null | undefined>,
  const TBy extends TransformGroupSpec<TDatum> | undefined,
  const TOutputs extends TransformOutputs<TDatum>,
>(
  source: Iterable<TDatum>,
  options: InferredBinOptions<TDatum, TValue, TBy, TOutputs>,
): BinYDatum<TDatum, TBy, TOutputs>[]
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
    TransformGroupSpec<TDatum> | undefined
  > & { outputs?: TransformOutputs<TDatum> },
) {
  const data = toArray(source)
  const values = transformValues(data, options.value)
  const rowsByIndex: (BinInput<TDatum> | undefined)[] = []
  const rows = data.flatMap((datum, index) => {
    const value = values[index]
    if (!isFiniteNumber(value)) return []
    const row = { datum, index, value }
    rowsByIndex[index] = row
    return [row]
  })
  const groups = materializeGroups(data, options.by).map(
    ({ group, indexes }) => ({
      group,
      rows: indexes.flatMap((index) => {
        const row = rowsByIndex[index]
        return row ? [row] : []
      }),
    }),
  )
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
  const histogram = d3Bin<BinInput<TDatum>, number>()
    .value((row) => row.value)
    .domain([lower, upper])
    .thresholds(thresholds)
  const outputs = options.outputs ?? ({ value: { reduce: 'count' } } as const)
  assertTransformOutputNames(
    outputs,
    [
      ...Object.keys(groups[0]?.group ?? {}),
      'x',
      'x1',
      'x2',
      'y',
      'y1',
      'y2',
      'source',
      'sourceIndexes',
    ],
    'bin',
  )
  const preparedOutputs = prepareOutputs(data, outputs)

  return groups.flatMap(({ group, rows: groupRows }) =>
    histogram(groupRows).map((entry) => {
      const indexes = entry.map((row) => row.index)
      const entryLower = entry.x0 ?? lower
      const entryUpper = entry.x1 ?? entryLower
      return {
        ...group,
        lower: entryLower,
        upper: entryUpper,
        source: indexes.map((index) => data[index] as TDatum),
        sourceIndexes: indexes,
        ...reducePreparedOutputs(data, indexes, group, preparedOutputs),
      }
    }),
  )
}

function createHistogram<TDatum>(
  options: Pick<BinOptionsBase<TDatum, any, any>, 'domain' | 'thresholds'>,
) {
  const histogram = d3Bin<BinInput<TDatum>, number>().value((row) => row.value)
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
  } else if (typeof options.thresholds === 'function') {
    const threshold = options.thresholds
    histogram.thresholds((values, minimum, maximum) =>
      threshold(Array.from(values), minimum, maximum),
    )
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
