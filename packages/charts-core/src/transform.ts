import type { ChannelAccessorContext, ChartValue } from './types'

export { quantile } from './transform-reduce'

export type TransformAccessorContext<TDatum> = ChannelAccessorContext<TDatum>

export type TransformField<TDatum, TValue> = {
  [TKey in Extract<keyof TDatum, string>]-?: NonNullable<
    TDatum[TKey]
  > extends TValue
    ? TKey
    : never
}[Extract<keyof TDatum, string>]

export type TransformAccessor<TDatum, TValue> = (
  datum: TDatum,
  context: TransformAccessorContext<TDatum>,
) => TValue

export type TransformValue<TDatum, TValue> =
  TransformField<TDatum, TValue> | TransformAccessor<TDatum, TValue>

export type TransformValueOutput<TDatum, TValue> = TValue extends keyof TDatum
  ? TDatum[TValue]
  : TValue extends TransformAccessor<TDatum, infer TOutput>
    ? TOutput
    : never

export type TransformKey =
  ChartValue | boolean | null | undefined | readonly TransformKey[]

export interface TransformLineage<TDatum> {
  readonly source: readonly TDatum[]
  readonly sourceIndexes: readonly number[]
}

export type TransformGroupSpec<TDatum> =
  | TransformField<TDatum, TransformKey>
  | Readonly<Record<string, TransformValue<TDatum, TransformKey>>>

export type TransformGroupRow<TDatum, TBy> =
  TBy extends Extract<keyof TDatum, string>
    ? Pick<TDatum, TBy>
    : TBy extends Readonly<Record<string, unknown>>
      ? {
          readonly [TKey in keyof TBy]: Extract<
            TransformValueOutput<TDatum, TBy[TKey]>,
            TransformKey
          >
        }
      : Record<never, never>

export type TransformOrder = 'ascending' | 'descending'

export interface TransformOrderOptions<TDatum> {
  orderBy?: TransformValue<TDatum, ChartValue>
  order?: TransformOrder
}
