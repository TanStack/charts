import { isChartValue } from './mark'
import type { ChartValue, ResolvedScale } from './types'

export interface LayoutSourceRow<TDatum> {
  readonly datum: TDatum
  readonly sourceIndex: number
}

export interface LayoutXYSourceRow<
  TDatum,
  TXValue extends ChartValue,
  TYValue extends ChartValue,
> extends LayoutSourceRow<TDatum> {
  readonly xValue: TXValue
  readonly yValue: TYValue
}

export interface ResolvedLayoutX<TValue extends ChartValue> {
  readonly xValue: TValue
  readonly x: number
}

export interface ResolvedLayoutY<TValue extends ChartValue> {
  readonly yValue: TValue
  readonly y: number
}

/** Materializes only complete positional pairs so one invalid axis cannot domain the other. */
export function materializeLayoutXYRows<
  TDatum,
  TXValue extends ChartValue,
  TYValue extends ChartValue,
>(
  data: readonly TDatum[],
  xValues: readonly (TXValue | null | undefined)[],
  yValues: readonly (TYValue | null | undefined)[],
): readonly LayoutXYSourceRow<TDatum, TXValue, TYValue>[] {
  return data.flatMap((datum, sourceIndex) => {
    const xValue = xValues[sourceIndex]
    const yValue = yValues[sourceIndex]
    return isChartValue(xValue) && isChartValue(yValue)
      ? [{ datum, sourceIndex, xValue, yValue }]
      : []
  })
}

export function projectLayoutX<
  TRow extends LayoutSourceRow<unknown>,
  TValue extends ChartValue,
>(
  rows: readonly TRow[],
  values: readonly (TValue | null | undefined)[],
  scale: ResolvedScale,
): readonly (TRow & ResolvedLayoutX<TValue>)[] {
  return projectLayoutAxis(rows, values, scale, 'xValue', 'x')
}

export function projectLayoutY<
  TRow extends LayoutSourceRow<unknown>,
  TValue extends ChartValue,
>(
  rows: readonly TRow[],
  values: readonly (TValue | null | undefined)[],
  scale: ResolvedScale,
): readonly (TRow & ResolvedLayoutY<TValue>)[] {
  return projectLayoutAxis(rows, values, scale, 'yValue', 'y')
}

function projectLayoutAxis<
  TRow extends LayoutSourceRow<unknown>,
  TValue extends ChartValue,
  TValueKey extends 'xValue' | 'yValue',
  TPositionKey extends 'x' | 'y',
>(
  rows: readonly TRow[],
  values: readonly (TValue | null | undefined)[],
  scale: ResolvedScale,
  valueKey: TValueKey,
  positionKey: TPositionKey,
): readonly (TRow &
  Record<TValueKey, TValue> &
  Record<TPositionKey, number>)[] {
  return rows.flatMap((row) => {
    const value = values[row.sourceIndex]
    if (!isChartValue(value)) return []
    const position = scale.map(value)
    return Number.isFinite(position)
      ? [
          {
            ...row,
            [valueKey]: value,
            [positionKey]: position,
          } as TRow & Record<TValueKey, TValue> & Record<TPositionKey, number>,
        ]
      : []
  })
}
