import type { ChartValue } from './types'
import { toArray } from './transform-internal'

export interface TransformAccessorContext<TDatum> {
  datum: TDatum
  index: number
  data: readonly TDatum[]
}

export type TransformField<TDatum, TValue> = {
  [TKey in Extract<keyof TDatum, string>]-?: NonNullable<
    TDatum[TKey]
  > extends TValue
    ? TKey
    : never
}[Extract<keyof TDatum, string>]

export type TransformAccessor<TDatum, TValue> = (
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

export interface DataTransformContext<TDatum> {
  data: readonly TDatum[]
  stage: number
}

export type DataTransform<TInput, TOutput> = (
  context: DataTransformContext<TInput>,
) => Iterable<TOutput>

export function transformData<TInput, TOutput>(
  source: Iterable<TInput>,
  transform: DataTransform<TInput, TOutput>,
): TOutput[]
export function transformData<TInput, TIntermediate, TOutput>(
  source: Iterable<TInput>,
  first: DataTransform<TInput, TIntermediate>,
  second: DataTransform<TIntermediate, TOutput>,
): TOutput[]
export function transformData<TInput, T1, T2, TOutput>(
  source: Iterable<TInput>,
  first: DataTransform<TInput, T1>,
  second: DataTransform<T1, T2>,
  third: DataTransform<T2, TOutput>,
): TOutput[]
export function transformData<TInput, T1, T2, T3, TOutput>(
  source: Iterable<TInput>,
  first: DataTransform<TInput, T1>,
  second: DataTransform<T1, T2>,
  third: DataTransform<T2, T3>,
  fourth: DataTransform<T3, TOutput>,
): TOutput[]
export function transformData(
  source: Iterable<unknown>,
  ...transforms: readonly DataTransform<any, any>[]
): unknown[] {
  let data: readonly unknown[] = toArray(source)
  transforms.forEach((transform, stage) => {
    data = toArray(transform({ data, stage }))
  })
  return [...data]
}
