import type {
  ChartMark,
  ChartMarkRenderer,
  ChartMotionDefinition,
  ChartValue,
  MarkInitialization,
  MarkInitializeContext,
} from './types'
import { applyMarkRenderer, normalizeMarkInitialization } from './mark'

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
  const normalizedInitialize = (context: MarkInitializeContext) => {
    const initialized = normalizeMarkInitialization(initialize(context))
    const withMotion =
      motion === undefined || initialized.motion !== undefined
        ? initialized
        : { ...initialized, motion }
    return renderer === undefined
      ? withMotion
      : applyMarkRenderer(withMotion, renderer)
  }
  return {
    initialize: normalizedInitialize,
    ...(motion === undefined ? {} : { motion }),
    ...(renderer === undefined ? {} : { renderer }),
  }
}
