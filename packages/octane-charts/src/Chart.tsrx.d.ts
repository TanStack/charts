import type { ChartValue } from '@tanstack/charts'
import type { ChartProps } from './types'

export declare function Chart<
  TDatum,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
>(props: ChartProps<TDatum, TXValue, TYValue>): unknown
