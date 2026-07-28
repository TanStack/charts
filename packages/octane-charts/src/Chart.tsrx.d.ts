import type { ChartValue } from '@tanstack/charts'
import type { DynamicChartProps, StaticChartProps } from './types'

export declare function Chart<
  TDatum,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
>(props: StaticChartProps<TDatum, TXValue, TYValue>): unknown
export declare function Chart<
  TDatum,
  TInput,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
>(props: DynamicChartProps<TDatum, TInput, TXValue, TYValue>): unknown
