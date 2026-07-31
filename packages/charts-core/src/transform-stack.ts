import { stackValues } from './stack-internal'
import type { StackOptions } from './stack'
import {
  type TransformLineage,
  type TransformValue,
  type TransformValueOutput,
} from './transform'
import { toArray, transformValues } from './transform-internal'
import type { ChartKey, ChartValue } from './types'

export interface StackRowsYOptions<
  TDatum,
  TX extends TransformValue<TDatum, ChartValue> = TransformValue<
    TDatum,
    ChartValue
  >,
  TY extends TransformValue<TDatum, number | null | undefined> = TransformValue<
    TDatum,
    number | null | undefined
  >,
  TZ extends TransformValue<TDatum, ChartKey> | undefined =
    TransformValue<TDatum, ChartKey> | undefined,
> extends StackOptions {
  x: TX
  y: TY
  z?: TZ
}

export interface StackRowsXOptions<
  TDatum,
  TX extends TransformValue<TDatum, number | null | undefined> = TransformValue<
    TDatum,
    number | null | undefined
  >,
  TY extends TransformValue<TDatum, ChartValue> = TransformValue<
    TDatum,
    ChartValue
  >,
  TZ extends TransformValue<TDatum, ChartKey> | undefined =
    TransformValue<TDatum, ChartKey> | undefined,
> extends StackOptions {
  x: TX
  y: TY
  z?: TZ
}

export interface StackRowsYDatum<
  TDatum,
  TXValue extends ChartValue,
  TZValue extends ChartKey,
> extends TransformLineage<TDatum> {
  readonly datum: TDatum
  readonly index: number
  readonly x: TXValue
  readonly y: number
  readonly y1: number
  readonly y2: number
  readonly z: TZValue
}

export interface StackRowsXDatum<
  TDatum,
  TYValue extends ChartValue,
  TZValue extends ChartKey,
> extends TransformLineage<TDatum> {
  readonly datum: TDatum
  readonly index: number
  readonly x: number
  readonly x1: number
  readonly x2: number
  readonly y: TYValue
  readonly z: TZValue
}

type StackSeries<TDatum, TZ> =
  TZ extends TransformValue<TDatum, ChartKey>
    ? TransformValueOutput<TDatum, TZ>
    : 'value'

export function stackRowsY<
  TDatum,
  const TX extends TransformValue<TDatum, ChartValue>,
  const TY extends TransformValue<TDatum, number | null | undefined>,
  const TZ extends TransformValue<TDatum, ChartKey> | undefined = undefined,
>(
  source: Iterable<TDatum>,
  options: StackRowsYOptions<TDatum, TX, TY, TZ>,
): StackRowsYDatum<
  TDatum,
  Extract<TransformValueOutput<TDatum, TX>, ChartValue>,
  Extract<StackSeries<TDatum, TZ>, ChartKey>
>[] {
  const data = toArray(source)
  const positions = transformValues(data, options.x)
  const values = transformValues(data, options.y)
  const series =
    options.z !== undefined
      ? transformValues(data, options.z)
      : data.map(() => 'value' as const)
  const stackableValues = values.map((value, index) =>
    isChartValue(positions[index]) && isChartKey(series[index])
      ? value
      : undefined,
  )
  const { starts, ends } = stackValues(
    positions,
    stackableValues,
    series,
    options,
    'value',
  )
  return data.flatMap((datum, index) => {
    const value = values[index]
    const position = positions[index]
    const seriesValue = series[index]
    const start = starts[index]
    const end = ends[index]
    if (
      !isFiniteNumber(value) ||
      !isChartValue(position) ||
      !isChartKey(seriesValue) ||
      start === undefined ||
      end === undefined
    ) {
      return []
    }
    return [
      {
        datum,
        index,
        x: position as Extract<TransformValueOutput<TDatum, TX>, ChartValue>,
        y: value,
        y1: start,
        y2: end,
        z: seriesValue as Extract<StackSeries<TDatum, TZ>, ChartKey>,
        source: [datum],
        sourceIndexes: [index],
      },
    ]
  })
}

export function stackRowsX<
  TDatum,
  const TX extends TransformValue<TDatum, number | null | undefined>,
  const TY extends TransformValue<TDatum, ChartValue>,
  const TZ extends TransformValue<TDatum, ChartKey> | undefined = undefined,
>(
  source: Iterable<TDatum>,
  options: StackRowsXOptions<TDatum, TX, TY, TZ>,
): StackRowsXDatum<
  TDatum,
  Extract<TransformValueOutput<TDatum, TY>, ChartValue>,
  Extract<StackSeries<TDatum, TZ>, ChartKey>
>[] {
  const data = toArray(source)
  const values = transformValues(data, options.x)
  const positions = transformValues(data, options.y)
  const series =
    options.z !== undefined
      ? transformValues(data, options.z)
      : data.map(() => 'value' as const)
  const stackableValues = values.map((value, index) =>
    isChartValue(positions[index]) && isChartKey(series[index])
      ? value
      : undefined,
  )
  const { starts, ends } = stackValues(
    positions,
    stackableValues,
    series,
    options,
    'value',
  )
  return data.flatMap((datum, index) => {
    const value = values[index]
    const position = positions[index]
    const seriesValue = series[index]
    const start = starts[index]
    const end = ends[index]
    if (
      !isFiniteNumber(value) ||
      !isChartValue(position) ||
      !isChartKey(seriesValue) ||
      start === undefined ||
      end === undefined
    ) {
      return []
    }
    return [
      {
        datum,
        index,
        x: value,
        x1: start,
        x2: end,
        y: position as Extract<TransformValueOutput<TDatum, TY>, ChartValue>,
        z: seriesValue as Extract<StackSeries<TDatum, TZ>, ChartKey>,
        source: [datum],
        sourceIndexes: [index],
      },
    ]
  })
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isChartValue(value: unknown): value is ChartValue {
  return (
    typeof value === 'string' ||
    (typeof value === 'number' && Number.isFinite(value)) ||
    (value instanceof Date && Number.isFinite(value.getTime()))
  )
}

function isChartKey(value: unknown): value is ChartKey {
  return typeof value === 'string' || typeof value === 'number'
}
