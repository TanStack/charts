import type {
  TransformGroupSpec,
  TransformLineage,
  TransformValue,
} from './transform'
import {
  materializeGroups,
  toArray,
  transformValues,
} from './transform-internal'

export type NormalizeBasis = 'sum' | 'max' | 'extent' | 'first' | 'last'

export interface NormalizeContext<TDatum> {
  values: readonly number[]
  data: readonly TDatum[]
  indexes: readonly number[]
  group: Readonly<Record<string, unknown>>
}

export interface NormalizeOptions<
  TDatum,
  TValue extends TransformValue<TDatum, number | null | undefined> =
    TransformValue<TDatum, number | null | undefined>,
  TBy extends TransformGroupSpec<TDatum> | undefined =
    TransformGroupSpec<TDatum> | undefined,
  TAs extends string = string,
> {
  value: TValue
  by?: TBy
  as?: TAs
  basis?: NormalizeBasis | ((context: NormalizeContext<TDatum>) => number)
}

export type NormalizeDatum<TDatum, TAs extends string> = Omit<
  TDatum,
  TAs | keyof TransformLineage<TDatum>
> &
  TransformLineage<TDatum> & { readonly [TKey in TAs]: number }

export function normalize<
  TDatum extends object,
  const TValue extends TransformValue<TDatum, number | null | undefined>,
  const TBy extends TransformGroupSpec<TDatum> | undefined = undefined,
  const TAs extends string = 'normalized',
>(
  source: Iterable<TDatum>,
  options: NormalizeOptions<TDatum, TValue, TBy, TAs>,
): NormalizeDatum<TDatum, TAs>[] {
  const data = toArray(source)
  const rawValues = transformValues(data, options.value)
  const outputName = options.as ?? 'normalized'
  if (outputName === 'source' || outputName === 'sourceIndexes') {
    throw new TypeError(`normalize: output name "${outputName}" is reserved`)
  }
  const output: NormalizeDatum<TDatum, TAs>[] = []
  for (const { group, indexes } of materializeGroups(data, options.by)) {
    const validIndexes = indexes.filter((index) =>
      isFiniteNumber(rawValues[index]),
    )
    const values = validIndexes.map((index) => rawValues[index] as number)
    const groupData = validIndexes.map((index) => data[index] as TDatum)
    const basis = options.basis ?? 'sum'
    const denominator =
      typeof basis === 'function'
        ? basis({ values, data: groupData, indexes: validIndexes, group })
        : resolveDenominator(values, basis)
    const minimum =
      basis === 'extent' && values.length ? Math.min(...values) : 0
    for (const index of validIndexes) {
      const rawValue = rawValues[index] as number
      const normalized =
        basis === 'extent'
          ? denominator === 0
            ? 0
            : (rawValue - minimum) / denominator
          : denominator === 0
            ? 0
            : rawValue / denominator
      output.push({
        ...(data[index] as TDatum),
        [outputName]: normalized,
        source: [data[index] as TDatum],
        sourceIndexes: [index],
      } as NormalizeDatum<TDatum, TAs>)
    }
  }
  return output
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
