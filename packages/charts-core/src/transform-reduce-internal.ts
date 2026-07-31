import { transformValues } from './transform-internal'
import type {
  TransformOutputRow,
  TransformOutputSpec,
  TransformOutputValue,
  TransformOutputs,
} from './transform-reduce'

export type ContextualTransformOutputs<TDatum, TOutputs> = {
  [TKey in keyof TOutputs]: TransformOutputSpec<
    TDatum,
    TransformOutputValue<TOutputs[TKey]>
  >
}

interface PreparedTransformOutput<TDatum> {
  spec: TransformOutputSpec<TDatum>
  values: readonly (number | null | undefined)[]
}

type PreparedTransformOutputs<TDatum> = Readonly<
  Record<string, PreparedTransformOutput<TDatum>>
>

export function prepareOutputs<
  TDatum,
  TOutputs extends TransformOutputs<TDatum>,
>(
  data: readonly TDatum[],
  outputs: TOutputs,
): PreparedTransformOutputs<TDatum> {
  return Object.fromEntries(
    Object.entries(outputs).map(([name, spec]) => [
      name,
      {
        spec,
        values:
          spec.value !== undefined ? transformValues(data, spec.value) : [],
      },
    ]),
  )
}

export function assertTransformOutputNames(
  outputs: Readonly<Record<string, unknown>>,
  reserved: readonly string[],
  transform: string,
): void {
  const collision = Object.keys(outputs).find((name) => reserved.includes(name))
  if (collision) {
    throw new TypeError(
      `${transform}: output name "${collision}" is reserved by the transform`,
    )
  }
}

export function reducePreparedOutputs<TDatum, TOutputs>(
  data: readonly TDatum[],
  indexes: readonly number[],
  group: Readonly<Record<string, unknown>>,
  outputs: PreparedTransformOutputs<TDatum>,
): TransformOutputRow<TOutputs> {
  const entries = Object.entries(outputs).map(([name, output]) => [
    name,
    reducePreparedOutput(data, indexes, group, output),
  ])
  return Object.fromEntries(entries) as TransformOutputRow<TOutputs>
}

function reducePreparedOutput<TDatum, TResult>(
  data: readonly TDatum[],
  indexes: readonly number[],
  group: Readonly<Record<string, unknown>>,
  output: PreparedTransformOutput<TDatum>,
): TResult | number {
  const values = indexes.flatMap((index) => {
    const value = output.values[index]
    return isFiniteNumber(value) ? [value] : []
  })
  const selectedData = indexes.flatMap((index) =>
    index in data ? [data[index] as TDatum] : [],
  )
  const reducer = output.spec.reduce
  if (typeof reducer === 'function') {
    return reducer({ values, data: selectedData, indexes, group }) as TResult
  }
  if (reducer === 'count') return selectedData.length
  if (!values.length) return reducer === 'sum' ? 0 : Number.NaN
  if (reducer === 'sum') {
    return values.reduce((total, value) => total + value, 0)
  }
  if (reducer === 'mean') {
    return values.reduce((total, value) => total + value, 0) / values.length
  }
  if (reducer === 'min') return Math.min(...values)
  return Math.max(...values)
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}
