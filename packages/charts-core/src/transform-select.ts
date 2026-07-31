import {
  type TransformKey,
  type TransformValue,
  type TransformValueOutput,
} from './transform'
import { groupedIndexes, toArray, transformValues } from './transform-internal'

export type SelectMethod = 'first' | 'last' | 'min' | 'max'

export interface SelectContext<
  TDatum,
  TKey extends TransformKey = TransformKey,
> {
  values: readonly (number | null | undefined)[]
  data: readonly TDatum[]
  indexes: readonly number[]
  key: TKey
}

interface SelectOptionsBase<TDatum, TBy> {
  by?: TBy
}

type SelectKey<TDatum, TBy> =
  TBy extends TransformValue<TDatum, TransformKey>
    ? Extract<TransformValueOutput<TDatum, TBy>, TransformKey>
    : null

export type SelectOptions<
  TDatum,
  TBy extends TransformValue<TDatum, TransformKey> | undefined =
    TransformValue<TDatum, TransformKey> | undefined,
> = SelectOptionsBase<TDatum, TBy> &
  (
    | {
        value?: TransformValue<TDatum, number | null | undefined>
        select: 'first' | 'last'
      }
    | {
        value: TransformValue<TDatum, number | null | undefined>
        select: 'min' | 'max'
      }
    | {
        value?: TransformValue<TDatum, number | null | undefined>
        select: (
          context: SelectContext<TDatum, SelectKey<TDatum, TBy>>,
        ) => number | readonly number[] | undefined
      }
  )

export function select<
  TDatum,
  const TBy extends TransformValue<TDatum, TransformKey> | undefined =
    undefined,
>(source: Iterable<TDatum>, options: SelectOptions<TDatum, TBy>): TDatum[] {
  const data = toArray(source)
  const keys =
    options.by !== undefined
      ? transformValues(data, options.by)
      : data.map(() => null)
  const values =
    options.value !== undefined
      ? transformValues(data, options.value)
      : data.map(() => undefined)
  const selected: number[] = []

  for (const { key, indexes } of groupedIndexes(keys)) {
    if (typeof options.select === 'function') {
      const result = options.select({
        values: indexes.map((index) => values[index]),
        data: indexes.map((index) => data[index] as TDatum),
        indexes,
        key: key as SelectKey<TDatum, TBy>,
      })
      const allowed = new Set(indexes)
      if (typeof result === 'number') {
        if (allowed.has(result)) selected.push(result)
      } else if (result) {
        selected.push(...result.filter((index) => allowed.has(index)))
      }
      continue
    }
    if (options.select === 'first') {
      if (indexes[0] !== undefined) selected.push(indexes[0])
      continue
    }
    if (options.select === 'last') {
      const index = indexes.at(-1)
      if (index !== undefined) selected.push(index)
      continue
    }
    if (!options.value) {
      throw new TypeError(`select: "${options.select}" requires a value`)
    }
    let selectedIndex: number | undefined
    let selectedValue: number | undefined
    for (const index of indexes) {
      const value = values[index]
      if (!isFiniteNumber(value)) continue
      if (
        selectedValue === undefined ||
        (options.select === 'min' && value < selectedValue) ||
        (options.select === 'max' && value > selectedValue)
      ) {
        selectedIndex = index
        selectedValue = value
      }
    }
    if (selectedIndex !== undefined) selected.push(selectedIndex)
  }

  return [...new Set(selected)]
    .sort((left, right) => left - right)
    .flatMap((index) => (index in data ? [data[index] as TDatum] : []))
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}
