import type {
  TransformAccessor,
  TransformKey,
  TransformValue,
} from './transform'

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
