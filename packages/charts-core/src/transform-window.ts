import type {
  TransformNumericReducer,
  TransformOutputRow,
  TransformOutputs,
  TransformReducer,
} from './transform-reduce'
import {
  type TransformKey,
  type TransformLineage,
  type TransformValue,
  type TransformValueOutput,
} from './transform'
import { groupedIndexes, toArray, transformValues } from './transform-internal'
import {
  assertTransformOutputNames,
  prepareOutputs,
  reducePreparedOutputs,
  type ContextualTransformOutputs,
} from './transform-reduce-internal'

export type WindowAnchor = 'start' | 'middle' | 'end'

interface WindowOptionsCommon<
  TDatum,
  TBy extends TransformValue<TDatum, TransformKey> | undefined,
> {
  by?: TBy
  size: number
  anchor?: WindowAnchor
  partial?: boolean
}

type DefaultWindowOptions<
  TDatum,
  TValue extends TransformValue<TDatum, number | null | undefined>,
  TBy extends TransformValue<TDatum, TransformKey> | undefined,
> = WindowOptionsCommon<TDatum, TBy> & {
  value: TValue
  reduce?: TransformNumericReducer | TransformReducer<TDatum>
  outputs?: never
}

export type WindowOptions<TDatum> =
  | DefaultWindowOptions<
      TDatum,
      TransformValue<TDatum, number | null | undefined>,
      TransformValue<TDatum, TransformKey> | undefined
    >
  | (WindowOptionsCommon<
      TDatum,
      TransformValue<TDatum, TransformKey> | undefined
    > & {
      outputs: TransformOutputs<TDatum>
    })

type InferredWindowOptions<
  TDatum,
  TBy extends TransformValue<TDatum, TransformKey> | undefined,
  TOutputs extends TransformOutputs<TDatum>,
> = WindowOptionsCommon<TDatum, TBy> & {
  outputs: ContextualTransformOutputs<TDatum, TOutputs>
}

export type WindowKey<TDatum, TBy> =
  TBy extends TransformValue<TDatum, TransformKey>
    ? Extract<TransformValueOutput<TDatum, TBy>, TransformKey>
    : null

export type WindowDatum<
  TDatum,
  TKey extends TransformKey,
  TOutputs,
> = TransformLineage<TDatum> &
  TransformOutputRow<TOutputs> & {
    readonly datum: TDatum
    readonly index: number
    readonly key: TKey
  }

type DefaultWindowOutput = { readonly value: number }

export function window<
  TDatum,
  const TValue extends TransformValue<TDatum, number | null | undefined>,
  const TBy extends TransformValue<TDatum, TransformKey> | undefined =
    undefined,
>(
  source: Iterable<TDatum>,
  options: DefaultWindowOptions<TDatum, TValue, TBy>,
): WindowDatum<TDatum, WindowKey<TDatum, TBy>, DefaultWindowOutput>[]
export function window<
  TDatum,
  const TBy extends TransformValue<TDatum, TransformKey> | undefined,
  const TOutputs extends TransformOutputs<TDatum>,
>(
  source: Iterable<TDatum>,
  options: InferredWindowOptions<TDatum, TBy, TOutputs>,
): WindowDatum<TDatum, WindowKey<TDatum, TBy>, TOutputs>[]
export function window<TDatum>(source: Iterable<TDatum>, options: any): any[] {
  const data = toArray(source)
  const size = normalizeWindowSize(options.size)
  const keys =
    options.by !== undefined
      ? transformValues(data, options.by)
      : data.map(() => null)
  const outputs =
    options.outputs ??
    ({
      value: {
        value: options.value,
        reduce: options.reduce ?? 'mean',
      },
    } as TransformOutputs<TDatum>)
  assertTransformOutputNames(
    outputs,
    ['datum', 'index', 'key', 'source', 'sourceIndexes'],
    'window',
  )
  const preparedOutputs = prepareOutputs(data, outputs)
  const output = groupedIndexes(keys as TransformKey[]).flatMap(
    ({ key, indexes }) =>
      indexes.flatMap((index, position) => {
        const windowIndexes = selectedWindow(
          indexes,
          position,
          size,
          options.anchor ?? 'end',
        )
        if (options.partial === false && windowIndexes.length < size) return []
        return [
          {
            datum: data[index] as TDatum,
            index,
            key,
            source: windowIndexes.map(
              (sourceIndex) => data[sourceIndex] as TDatum,
            ),
            sourceIndexes: windowIndexes,
            ...reducePreparedOutputs(data, windowIndexes, key, preparedOutputs),
          },
        ]
      }),
  )
  return output.sort((left, right) => left.index - right.index)
}

function normalizeWindowSize(value: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    throw new TypeError('window: size must be a positive finite number')
  }
  return Math.floor(value)
}

function selectedWindow(
  indexes: readonly number[],
  position: number,
  size: number,
  anchor: WindowAnchor,
): number[] {
  const start =
    anchor === 'start'
      ? position
      : anchor === 'middle'
        ? position - Math.floor((size - 1) / 2)
        : position - size + 1
  const end = anchor === 'end' ? position + 1 : start + size
  return indexes.slice(Math.max(0, start), Math.min(indexes.length, end))
}
