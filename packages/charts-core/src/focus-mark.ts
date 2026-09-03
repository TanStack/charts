import type { ChartFocusFilter, ChartMark, ChartValue } from './types'

export function whenFocused<
  TDatum,
  TXPointValue extends ChartValue,
  TYPointValue extends ChartValue,
  TXScaleValue extends ChartValue,
  TYScaleValue extends ChartValue,
  TXScaleId extends string,
  TYScaleId extends string,
>(
  mark: ChartMark<
    TDatum,
    TXPointValue,
    TYPointValue,
    TXScaleValue,
    TYScaleValue,
    TXScaleId,
    TYScaleId
  >,
  options: ChartFocusFilter = {},
): ChartMark<
  TDatum,
  TXPointValue,
  TYPointValue,
  TXScaleValue,
  TYScaleValue,
  TXScaleId,
  TYScaleId
> {
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
