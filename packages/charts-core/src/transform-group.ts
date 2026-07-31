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

export interface GroupByOptions<TDatum> {
  by: TransformValue<TDatum, TransformKey>
  outputs: TransformOutputs<TDatum>
}

interface InferredGroupByOptions<
  TDatum,
  TBy extends TransformValue<TDatum, TransformKey>,
  TOutputs extends TransformOutputs<TDatum>,
> {
  by: TBy
  outputs: ContextualTransformOutputs<TDatum, TOutputs>
}

export type GroupByDatum<
  TDatum,
  TKey extends TransformKey,
  TOutputs,
> = TransformLineage<TDatum> &
  TransformOutputRow<TOutputs> & {
    readonly key: TKey
  }

export function groupBy<
  TDatum,
  const TBy extends TransformValue<TDatum, TransformKey>,
  const TOutputs extends TransformOutputs<TDatum>,
>(
  source: Iterable<TDatum>,
  options: InferredGroupByOptions<TDatum, TBy, TOutputs>,
): GroupByDatum<
  TDatum,
  Extract<TransformValueOutput<TDatum, TBy>, TransformKey>,
  TOutputs
>[] {
  type TKey = Extract<TransformValueOutput<TDatum, TBy>, TransformKey>
  const data = toArray(source)
  assertTransformOutputNames(
    options.outputs,
    ['key', 'source', 'sourceIndexes'],
    'groupBy',
  )
  const keys = transformValues(data, options.by) as TKey[]
  const groups = new Map<string, { key: TKey; indexes: number[] }>()
  const preparedOutputs = prepareOutputs(data, options.outputs)

  keys.forEach((key, index) => {
    const identity = transformKey(key)
    const group = groups.get(identity)
    if (group) group.indexes.push(index)
    else groups.set(identity, { key, indexes: [index] })
  })

  return [...groups.values()].map(({ key, indexes }) => ({
    key,
    source: indexes.map((index) => data[index] as TDatum),
    sourceIndexes: indexes,
    ...reducePreparedOutputs<TDatum, TOutputs>(
      data,
      indexes,
      key,
      preparedOutputs,
    ),
  }))
}
