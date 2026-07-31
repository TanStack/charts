import type {
  TransformAccessor,
  TransformGroupRow,
  TransformGroupSpec,
  TransformKey,
  TransformOrder,
  TransformValue,
} from './transform'
import type { ChartValue } from './types'

export function toArray<TDatum>(source: Iterable<TDatum>): readonly TDatum[] {
  return Array.isArray(source) ? source : Array.from(source)
}

export function transformValues<TDatum, TValue>(
  data: readonly TDatum[],
  value: TransformValue<TDatum, TValue>,
): TValue[] {
  if (typeof value === 'function') {
    const accessor = value as TransformAccessor<TDatum, TValue>
    return data.map((datum, index) => accessor({ datum, index, data }))
  }
  return data.map((datum) =>
    datum != null && typeof datum === 'object'
      ? (datum as Record<string, TValue>)[value]
      : undefined,
  ) as TValue[]
}

export function transformKey(value: TransformKey | undefined): string {
  if (Array.isArray(value)) {
    return `tuple:${JSON.stringify(value.map((entry) => transformKey(entry)))}`
  }
  if (value instanceof Date) return `date:${value.getTime()}`
  return `${typeof value}:${String(value)}`
}

export function groupedIndexes<TKey extends TransformKey>(
  keys: readonly TKey[],
): { key: TKey; indexes: number[] }[] {
  const groups = new Map<string, { key: TKey; indexes: number[] }>()
  keys.forEach((key, index) => {
    const identity = transformKey(key)
    const group = groups.get(identity)
    if (group) group.indexes.push(index)
    else groups.set(identity, { key, indexes: [index] })
  })
  return [...groups.values()]
}

export function materializeGroups<
  TDatum,
  const TBy extends TransformGroupSpec<TDatum> | undefined,
>(
  data: readonly TDatum[],
  by: TBy,
): {
  group: TransformGroupRow<TDatum, TBy>
  indexes: number[]
}[] {
  if (by === undefined) {
    return [
      {
        group: {} as TransformGroupRow<TDatum, TBy>,
        indexes: data.map((_, index) => index),
      },
    ]
  }
  const entries =
    typeof by === 'string'
      ? [[by, by as TransformValue<TDatum, TransformKey>] as const]
      : (Object.entries(by) as [string, TransformValue<TDatum, TransformKey>][])
  const values = entries.map(([name, value]) => ({
    name,
    values: transformValues(data, value),
  }))
  const groups = new Map<
    string,
    { group: Record<string, TransformKey>; indexes: number[] }
  >()
  data.forEach((_, index) => {
    const group = Object.fromEntries(
      values.map(({ name, values: fieldValues }) => [name, fieldValues[index]]),
    ) as Record<string, TransformKey>
    const identity = transformKey(Object.values(group))
    const existing = groups.get(identity)
    if (existing) existing.indexes.push(index)
    else groups.set(identity, { group, indexes: [index] })
  })
  return [...groups.values()] as {
    group: TransformGroupRow<TDatum, TBy>
    indexes: number[]
  }[]
}

export function orderedIndexes<TDatum>(
  data: readonly TDatum[],
  indexes: readonly number[],
  orderBy: TransformValue<TDatum, ChartValue> | undefined,
  order: TransformOrder = 'ascending',
): number[] {
  if (orderBy === undefined) return [...indexes]
  const values = transformValues(data, orderBy)
  const direction = order === 'descending' ? -1 : 1
  return [...indexes].sort((left, right) => {
    const a = values[left]
    const b = values[right]
    const compared = compareChartValues(a, b)
    return compared === 0 ? left - right : compared * direction
  })
}

function compareChartValues(left: ChartValue, right: ChartValue): number {
  const a = left instanceof Date ? left.getTime() : left
  const b = right instanceof Date ? right.getTime() : right
  return a < b ? -1 : a > b ? 1 : 0
}
