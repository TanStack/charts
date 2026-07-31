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

export type WindowAnchor = 'start' | 'middle' | 'end'

export interface WindowOptions<TDatum> extends TransformOrderOptions<TDatum> {
  by?: TransformGroupSpec<TDatum>
  size: number
  anchor?: WindowAnchor
  partial?: boolean
  outputs: TransformOutputs<TDatum>
}

interface InferredWindowOptions<
  TDatum,
  TBy extends TransformGroupSpec<TDatum> | undefined,
  TOutputs extends TransformOutputs<TDatum>,
> extends TransformOrderOptions<TDatum> {
  by?: TBy
  size: number
  anchor?: WindowAnchor
  partial?: boolean
  outputs: TOutputs
}

export type WindowDatum<TDatum, TOutputs> = Omit<
  TDatum,
  keyof TOutputs | keyof TransformLineage<TDatum>
> &
  TransformLineage<TDatum> &
  TransformOutputRow<TOutputs>

export function window<
  TDatum extends object,
  const TBy extends TransformGroupSpec<TDatum> | undefined = undefined,
  const TOutputs extends TransformOutputs<TDatum> = TransformOutputs<TDatum>,
>(
  source: Iterable<TDatum>,
  options: InferredWindowOptions<TDatum, TBy, TOutputs>,
): WindowDatum<TDatum, TOutputs>[] {
  const data = toArray(source)
  const size = normalizeWindowSize(options.size)
  assertTransformOutputNames(
    options.outputs,
    ['source', 'sourceIndexes'],
    'window',
  )
  const preparedOutputs = prepareOutputs(data, options.outputs)
  return materializeGroups(data, options.by).flatMap(({ group, indexes }) => {
    const ordered = orderedIndexes(
      data,
      indexes,
      options.orderBy,
      options.order,
    )
    return ordered.flatMap((index, position) => {
      const windowIndexes = selectedWindow(
        ordered,
        position,
        size,
        options.anchor ?? 'end',
      )
      if (options.partial === false && windowIndexes.length < size) return []
      return [
        {
          ...(data[index] as TDatum),
          source: windowIndexes.map(
            (sourceIndex) => data[sourceIndex] as TDatum,
          ),
          sourceIndexes: windowIndexes,
          ...reducePreparedOutputs<TDatum, TOutputs>(
            data,
            windowIndexes,
            group,
            preparedOutputs,
          ),
        } as WindowDatum<TDatum, TOutputs>,
      ]
    })
  })
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
