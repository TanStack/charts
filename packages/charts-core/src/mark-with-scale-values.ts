import type {
  ChartMark,
  ChartMarkRenderer,
  ChartMotionDefinition,
  ChartValue,
  MarkInitialization,
  MarkInitializeContext,
} from './types'
import { createMarkDefinition } from './mark'

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
  TXScaleId extends string = 'x',
  TYScaleId extends string = 'y',
>(
  initialize: (
    context: MarkInitializeContext,
  ) => MarkInitialization<TDatum, TXPointValue, TYPointValue>,
  motion?: ChartMotionDefinition<TDatum>,
  renderer?: ChartMarkRenderer,
): ChartMark<
  TDatum,
  TXPointValue,
  TYPointValue,
  TXScaleValue,
  TYScaleValue,
  TXScaleId,
  TYScaleId
> {
  return createMarkDefinition(initialize, motion, renderer)
}
