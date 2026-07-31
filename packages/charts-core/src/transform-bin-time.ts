import type {
  TransformGroupRow,
  TransformGroupSpec,
  TransformLineage,
  TransformValue,
} from './transform'
import type { TransformOutputRow, TransformOutputs } from './transform-reduce'
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

export interface TimeIntervalLike {
  floor(date: Date): Date
  offset(date: Date, step?: number): Date
  range(start: Date, stop: Date, step?: number): Date[]
}

export interface BinTimeOptions<TDatum> {
  value: TransformValue<TDatum, Date | null | undefined>
  interval: TimeIntervalLike
  by?: TransformGroupSpec<TDatum>
  domain?: readonly [Date, Date]
  outputs?: TransformOutputs<TDatum>
}

export type BinTimeDatum<
  TDatum,
  TBy,
  TOutputs,
  TAxis extends 'x' | 'y',
> = TransformGroupRow<TDatum, TBy> &
  TransformLineage<TDatum> &
  TransformOutputRow<TOutputs> &
  (TAxis extends 'x'
    ? { readonly x: Date; readonly x1: Date; readonly x2: Date }
    : { readonly y: Date; readonly y1: Date; readonly y2: Date })

type DefaultOutputs = { readonly value: { readonly reduce: 'count' } }

export function binTimeX<
  TDatum,
  const TBy extends TransformGroupSpec<TDatum> | undefined = undefined,
  const TOutputs extends TransformOutputs<TDatum> = DefaultOutputs,
>(
  source: Iterable<TDatum>,
  options: BinTimeOptions<TDatum> & { by?: TBy; outputs?: TOutputs },
): BinTimeDatum<TDatum, TBy, TOutputs, 'x'>[] {
  return binTime(source, options, 'x') as unknown as BinTimeDatum<
    TDatum,
    TBy,
    TOutputs,
    'x'
  >[]
}
export function binTimeY<
  TDatum,
  const TBy extends TransformGroupSpec<TDatum> | undefined = undefined,
  const TOutputs extends TransformOutputs<TDatum> = DefaultOutputs,
>(
  source: Iterable<TDatum>,
  options: BinTimeOptions<TDatum> & { by?: TBy; outputs?: TOutputs },
): BinTimeDatum<TDatum, TBy, TOutputs, 'y'>[] {
  return binTime(source, options, 'y') as unknown as BinTimeDatum<
    TDatum,
    TBy,
    TOutputs,
    'y'
  >[]
}

function binTime<TDatum>(
  source: Iterable<TDatum>,
  options: BinTimeOptions<TDatum>,
  axis: 'x' | 'y',
) {
  const data = toArray(source)
  const values = transformValues(data, options.value)
  const valid = values.flatMap((value, index) =>
    value instanceof Date && Number.isFinite(value.getTime())
      ? [{ value, index }]
      : [],
  )
  if (!valid.length && !options.domain) return []
  const domainStart =
    options.domain?.[0] ??
    new Date(Math.min(...valid.map(({ value }) => value.getTime())))
  const domainEnd =
    options.domain?.[1] ??
    new Date(Math.max(...valid.map(({ value }) => value.getTime())))
  const minimum = domainStart < domainEnd ? domainStart : domainEnd
  const maximum = domainStart < domainEnd ? domainEnd : domainStart
  const start = options.interval.floor(new Date(minimum))
  const stop = options.interval.offset(
    options.interval.floor(new Date(maximum)),
    1,
  )
  const boundaries = options.interval.range(
    start,
    options.interval.offset(stop, 1),
  )
  const outputs = options.outputs ?? ({ value: { reduce: 'count' } } as const)
  const groups = materializeGroups(data, options.by)
  assertTransformOutputNames(
    outputs,
    [
      ...Object.keys(groups[0]?.group ?? {}),
      axis,
      `${axis}1`,
      `${axis}2`,
      'source',
      'sourceIndexes',
    ],
    'binTime',
  )
  const prepared = prepareOutputs(data, outputs)
  return groups.flatMap(({ group, indexes }) => {
    const binIndexes = new Map<number, number[]>()
    for (const index of indexes) {
      const value = values[index]
      if (!(value instanceof Date)) continue
      const identity = options.interval.floor(value).getTime()
      const bucket = binIndexes.get(identity)
      if (bucket) bucket.push(index)
      else binIndexes.set(identity, [index])
    }
    return boundaries.slice(0, -1).map((lower, position) => {
      const upper = boundaries[position + 1] as Date
      const sourceIndexes = binIndexes.get(lower.getTime()) ?? []
      return {
        ...group,
        [axis]: new Date((lower.getTime() + upper.getTime()) / 2),
        [`${axis}1`]: lower,
        [`${axis}2`]: upper,
        source: sourceIndexes.map((index) => data[index] as TDatum),
        sourceIndexes,
        ...reducePreparedOutputs(data, sourceIndexes, group, prepared),
      }
    })
  })
}
