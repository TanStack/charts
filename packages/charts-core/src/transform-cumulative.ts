import type {
  TransformGroupSpec,
  TransformLineage,
  TransformOrderOptions,
} from './transform'
import type { TransformOutputRow, TransformOutputs } from './transform-reduce'
import {
  materializeGroups,
  orderedIndexes,
  toArray,
} from './transform-internal'
import {
  assertTransformOutputNames,
  prepareOutputs,
  reducePreparedOutputs,
} from './transform-reduce-internal'

export interface CumulativeOptions<
  TDatum,
> extends TransformOrderOptions<TDatum> {
  by?: TransformGroupSpec<TDatum>
  outputs: TransformOutputs<TDatum>
}

export type CumulativeDatum<TDatum, TOutputs> = Omit<
  TDatum,
  keyof TOutputs | keyof TransformLineage<TDatum>
> &
  TransformLineage<TDatum> &
  TransformOutputRow<TOutputs>

export function cumulative<
  TDatum extends object,
  const TBy extends TransformGroupSpec<TDatum> | undefined = undefined,
  const TOutputs extends TransformOutputs<TDatum> = TransformOutputs<TDatum>,
>(
  source: Iterable<TDatum>,
  options: CumulativeOptions<TDatum> & {
    by?: TBy
    outputs: TOutputs
  },
): CumulativeDatum<TDatum, TOutputs>[] {
  const data = toArray(source)
  assertTransformOutputNames(
    options.outputs,
    ['source', 'sourceIndexes'],
    'cumulative',
  )
  const prepared = prepareOutputs(data, options.outputs)
  return materializeGroups(data, options.by).flatMap(({ group, indexes }) => {
    const ordered = orderedIndexes(
      data,
      indexes,
      options.orderBy,
      options.order,
    )
    return ordered.map((index, position) => {
      const sourceIndexes = ordered.slice(0, position + 1)
      return {
        ...(data[index] as TDatum),
        source: sourceIndexes.map((sourceIndex) => data[sourceIndex] as TDatum),
        sourceIndexes,
        ...reducePreparedOutputs<TDatum, TOutputs>(
          data,
          sourceIndexes,
          group,
          prepared,
        ),
      } as CumulativeDatum<TDatum, TOutputs>
    })
  })
}
