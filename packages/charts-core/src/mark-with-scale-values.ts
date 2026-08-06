import type {
  ChartMark,
  ChartMotionDefinition,
  ChartValue,
  MarkInitialization,
  MarkInitializeContext,
} from './types'
import { normalizeMarkInitialization } from './mark'

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
  ) => MarkInitialization<TDatum, TXPointValue, TYPointValue>,
  motion?: ChartMotionDefinition<TDatum>,
): ChartMark<TDatum, TXPointValue, TYPointValue, TXScaleValue, TYScaleValue> {
  const normalizedInitialize = (context: MarkInitializeContext) => {
    const initialized = normalizeMarkInitialization(initialize(context))
    return motion === undefined || initialized.motion !== undefined
      ? initialized
      : { ...initialized, motion }
  }
  return motion === undefined
    ? { initialize: normalizedInitialize }
    : { initialize: normalizedInitialize, motion }
}
