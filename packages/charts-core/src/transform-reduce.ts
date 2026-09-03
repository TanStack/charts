import type { TransformValue } from './transform'
import { quantileSortedValues } from './transform-statistics-internal'

export type TransformNumericReducer = 'count' | 'sum' | 'mean' | 'min' | 'max'

export interface TransformReduceContext<TDatum> {
  values: readonly number[]
  data: readonly TDatum[]
  indexes: readonly number[]
  group: Readonly<Record<string, unknown>>
}

export type TransformReducer<TDatum, TResult = unknown> =
  | TransformNumericReducer
  | ((context: TransformReduceContext<TDatum>) => TResult)

export type TransformOutputSpec<TDatum, TResult = unknown> =
  | { reduce: 'count'; value?: never }
  | {
      value: TransformValue<TDatum, number | null | undefined>
      reduce: TransformNumericReducer
    }
  | {
      value?: TransformValue<TDatum, number | null | undefined>
      reduce: (context: TransformReduceContext<TDatum>) => TResult
    }

export type TransformOutputs<TDatum> = Record<
  string,
  TransformOutputSpec<TDatum, any>
>

export type TransformOutputValue<TSpec> = TSpec extends {
  reduce: (context: any) => infer TResult
}
  ? TResult
  : number

export type TransformOutputRow<TOutputs> = {
  readonly [TKey in keyof TOutputs]: TransformOutputValue<TOutputs[TKey]>
}

export function quantile<TDatum>(
  probability: number,
): (context: TransformReduceContext<TDatum>) => number {
  if (!Number.isFinite(probability) || probability < 0 || probability > 1) {
    throw new TypeError('quantile: probability must be between zero and one')
  }
  return ({ values }) => {
    const sorted = [...values].sort((left, right) => left - right)
    return quantileSortedValues(sorted, probability)
  }
}

export function median(context: TransformReduceContext<unknown>): number {
  return quantile(0.5)(context)
}

export function variance({ values }: TransformReduceContext<unknown>): number {
  if (values.length < 2) return Number.NaN
  const mean = values.reduce((total, value) => total + value, 0) / values.length
  return (
    values.reduce((total, value) => total + (value - mean) ** 2, 0) /
    (values.length - 1)
  )
}

export function deviation(context: TransformReduceContext<unknown>): number {
  return Math.sqrt(variance(context))
}

export function first({ values }: TransformReduceContext<unknown>): number {
  return values[0] ?? Number.NaN
}

export function last({ values }: TransformReduceContext<unknown>): number {
  return values.at(-1) ?? Number.NaN
}

export function delta({ values }: TransformReduceContext<unknown>): number {
  return (values.at(-1) ?? Number.NaN) - (values[0] ?? Number.NaN)
}

export function ratio({ values }: TransformReduceContext<unknown>): number {
  return (values.at(-1) ?? Number.NaN) / (values[0] ?? Number.NaN)
}
