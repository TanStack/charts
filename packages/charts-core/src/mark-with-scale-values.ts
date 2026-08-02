import type {
  ChartMark,
  ChartMotionDefinition,
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
  motion?: ChartMotionDefinition<TDatum>,
): ChartMark<TDatum, TXPointValue, TYPointValue, TXScaleValue, TYScaleValue> {
  return motion === undefined ? { initialize } : { initialize, motion }
}
