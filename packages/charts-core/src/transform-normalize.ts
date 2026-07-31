import {
  type TransformKey,
  type TransformLineage,
  type TransformValue,
  type TransformValueOutput,
} from './transform'
import { groupedIndexes, toArray, transformValues } from './transform-internal'

export type NormalizeBasis = 'sum' | 'max' | 'extent' | 'first' | 'last'

export interface NormalizeContext<
  TDatum,
  TKey extends TransformKey = TransformKey,
> {
  values: readonly number[]
  data: readonly TDatum[]
  indexes: readonly number[]
  key: TKey
}

export interface NormalizeOptions<
  TDatum,
  TValue extends TransformValue<TDatum, number | null | undefined> =
    TransformValue<TDatum, number | null | undefined>,
  TBy extends TransformValue<TDatum, TransformKey> | undefined =
    TransformValue<TDatum, TransformKey> | undefined,
> {
  value: TValue
  by?: TBy
  basis?:
    | NormalizeBasis
    | ((context: NormalizeContext<TDatum, NormalizeKey<TDatum, TBy>>) => number)
}

export type NormalizeKey<TDatum, TBy> =
  TBy extends TransformValue<TDatum, TransformKey>
    ? Extract<TransformValueOutput<TDatum, TBy>, TransformKey>
    : null

export interface NormalizeDatum<
  TDatum,
  TKey extends TransformKey,
> extends TransformLineage<TDatum> {
  readonly datum: TDatum
  readonly index: number
  readonly key: TKey
  readonly value: number
}

export function normalize<
  TDatum,
  const TValue extends TransformValue<TDatum, number | null | undefined>,
  const TBy extends TransformValue<TDatum, TransformKey> | undefined =
    undefined,
>(
  source: Iterable<TDatum>,
  options: NormalizeOptions<TDatum, TValue, TBy>,
): NormalizeDatum<TDatum, NormalizeKey<TDatum, TBy>>[] {
  const data = toArray(source)
  const rawValues = transformValues(data, options.value)
  const keys =
    options.by !== undefined
      ? transformValues(data, options.by)
      : data.map(() => null)
  const output: NormalizeDatum<TDatum, NormalizeKey<TDatum, TBy>>[] = []

  for (const { key, indexes } of groupedIndexes(keys)) {
    const validIndexes = indexes.filter((index) =>
      isFiniteNumber(rawValues[index]),
    )
    const values = validIndexes.map((index) => rawValues[index] as number)
    const groupData = validIndexes.map((index) => data[index] as TDatum)
    const basis = options.basis ?? 'sum'
    const denominator =
      typeof basis === 'function'
        ? basis({
            values,
            data: groupData,
            indexes: validIndexes,
            key: key as NormalizeKey<TDatum, TBy>,
          })
        : resolveDenominator(values, basis)
    const minimum =
      basis === 'extent' && values.length ? Math.min(...values) : 0
    for (const index of validIndexes) {
      const rawValue = rawValues[index] as number
      output.push({
        datum: data[index] as TDatum,
        index,
        key: key as NormalizeKey<TDatum, TBy>,
        value:
          basis === 'extent'
            ? denominator === 0
              ? 0
              : (rawValue - minimum) / denominator
            : denominator === 0
              ? 0
              : rawValue / denominator,
        source: [data[index] as TDatum],
        sourceIndexes: [index],
      })
    }
  }
  return output.sort((left, right) => left.index - right.index)
}

function resolveDenominator(values: readonly number[], basis: NormalizeBasis) {
  if (!values.length) return 0
  if (basis === 'sum') return values.reduce((total, value) => total + value, 0)
  if (basis === 'max') return Math.max(...values.map(Math.abs))
  if (basis === 'extent') return Math.max(...values) - Math.min(...values)
  if (basis === 'first') return values[0] ?? 0
  return values.at(-1) ?? 0
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}
