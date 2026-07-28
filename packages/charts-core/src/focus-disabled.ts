import type { ChartPoint, ChartValue } from './types'

export const focusDisabled: UniversalChartFocusStrategy = {
  resolve: () => [],
  group: () => [],
  navigation: () => [],
}

interface UniversalChartFocusStrategy {
  resolve: <TDatum, TXValue extends ChartValue, TYValue extends ChartValue>(
    points: readonly ChartPoint<TDatum, TXValue, TYValue>[],
    x: number,
    y: number,
    maxDistance: number,
  ) => readonly ChartPoint<TDatum, TXValue, TYValue>[]
  group: <TDatum, TXValue extends ChartValue, TYValue extends ChartValue>(
    points: readonly ChartPoint<TDatum, TXValue, TYValue>[],
    point: ChartPoint<TDatum, TXValue, TYValue>,
  ) => readonly ChartPoint<TDatum, TXValue, TYValue>[]
  navigation: <TDatum, TXValue extends ChartValue, TYValue extends ChartValue>(
    points: readonly ChartPoint<TDatum, TXValue, TYValue>[],
  ) => readonly ChartPoint<TDatum, TXValue, TYValue>[]
}
