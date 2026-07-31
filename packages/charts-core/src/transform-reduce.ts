import type { TransformKey, TransformValue } from './transform'

export type TransformNumericReducer = 'count' | 'sum' | 'mean' | 'min' | 'max'

export interface TransformReduceContext<TDatum> {
  values: readonly number[]
  data: readonly TDatum[]
  indexes: readonly number[]
  key: TransformKey
}

export type TransformReducer<TDatum, TResult = unknown> =
  | TransformNumericReducer
  | ((context: TransformReduceContext<TDatum>) => TResult)

export interface TransformOutputSpec<TDatum, TResult = unknown> {
  value?: TransformValue<TDatum, number | null | undefined>
  reduce?: TransformReducer<TDatum, TResult>
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
