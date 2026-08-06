import { createDecorativeMark } from './mark-decorative-internal'
import { stripMarkSceneInteraction } from './mark-scene-filter-internal'
import type { ChartMark, ChartValue } from './types'

/** Keeps one mark's scale and painted geometry while removing interaction ownership. */
export function decorative<
  TDatum,
  TXPointValue extends ChartValue,
  TYPointValue extends ChartValue,
  TXScaleValue extends ChartValue,
  TYScaleValue extends ChartValue,
>(
  mark: ChartMark<
    TDatum,
    TXPointValue,
    TYPointValue,
    TXScaleValue,
    TYScaleValue
  >,
): ChartMark<TDatum, never, never, TXScaleValue, TYScaleValue> {
  return createDecorativeMark(
    mark,
    (scene) =>
      stripMarkSceneInteraction(scene, {
        conditional: 'reject',
      }),
    {
      conditional: 'reject',
      layoutLabels: 'preserve',
    },
  )
}
