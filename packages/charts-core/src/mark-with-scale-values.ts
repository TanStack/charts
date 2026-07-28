import type {
  ChartMark,
  ChartValue,
  InitializedMark,
  MarkInitializeContext,
} from './types'

export type {
  ChartMarkPointX,
  ChartMarkPointY,
  ChartMarkScaleX,
  ChartMarkScaleY,
} from './types'

/**
 * Creates a custom mark whose materialized positional scale values differ
 * from its emitted interaction-point values.
 */
export function createMarkWithScaleValues<
  TDatum,
  TXPointValue extends ChartValue,
  TYPointValue extends ChartValue,
  TXScaleValue extends ChartValue,
  TYScaleValue extends ChartValue,
>(
  initialize: (
    context: MarkInitializeContext,
  ) => InitializedMark<TDatum, TXPointValue, TYPointValue>,
): ChartMark<TDatum, TXPointValue, TYPointValue, TXScaleValue, TYScaleValue> {
  return { initialize }
}
