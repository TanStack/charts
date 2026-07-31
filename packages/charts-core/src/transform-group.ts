import type {
  TransformGroupRow,
  TransformGroupSpec,
  TransformLineage,
} from './transform'
import type { TransformOutputRow, TransformOutputs } from './transform-reduce'
import { materializeGroups, toArray } from './transform-internal'
import {
  assertTransformOutputNames,
  prepareOutputs,
  reducePreparedOutputs,
} from './transform-reduce-internal'

export interface GroupByOptions<TDatum> {
  by: TransformGroupSpec<TDatum>
  outputs: TransformOutputs<TDatum>
}

interface InferredGroupByOptions<
  TDatum,
  TBy extends TransformGroupSpec<TDatum>,
  TOutputs extends TransformOutputs<TDatum>,
> {
  by: TBy
  outputs: TOutputs
}

export type GroupByDatum<TDatum, TBy, TOutputs> = TransformGroupRow<
  TDatum,
  TBy
> &
  TransformLineage<TDatum> &
  TransformOutputRow<TOutputs>

export function groupBy<
  TDatum,
  const TBy extends TransformGroupSpec<TDatum>,
  const TOutputs extends TransformOutputs<TDatum>,
>(
  source: Iterable<TDatum>,
  options: InferredGroupByOptions<TDatum, TBy, TOutputs>,
): GroupByDatum<TDatum, TBy, TOutputs>[] {
  const data = toArray(source)
  const groups = materializeGroups(data, options.by)
  const groupNames = groups[0] ? Object.keys(groups[0].group) : []
  assertTransformOutputNames(
    options.outputs,
    [...groupNames, 'source', 'sourceIndexes'],
    'groupBy',
  )
  const preparedOutputs = prepareOutputs(data, options.outputs)
  return groups.map(({ group, indexes }) => ({
    ...group,
    source: indexes.map((index) => data[index] as TDatum),
    sourceIndexes: indexes,
    ...reducePreparedOutputs<TDatum, TOutputs>(
      data,
      indexes,
      group,
      preparedOutputs,
    ),
  })) as GroupByDatum<TDatum, TBy, TOutputs>[]
}
