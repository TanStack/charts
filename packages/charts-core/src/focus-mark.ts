import type { ChartFocusFilter, ChartMark, ChartValue } from './types'

export function whenFocused<
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
  options: ChartFocusFilter = {},
): ChartMark<TDatum, TXPointValue, TYPointValue, TXScaleValue, TYScaleValue> {
  return {
    ...mark,
    initialize(context) {
      return {
        ...mark.initialize(context),
        focus: options,
      }
    },
  }
}
