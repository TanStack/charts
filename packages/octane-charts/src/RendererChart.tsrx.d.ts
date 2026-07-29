import type { ChartValue } from '@tanstack/charts'
import type {
  DynamicRendererChartProps,
  StaticRendererChartProps,
} from './renderer-types'

export declare function RendererChart<
  TDatum,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
>(props: StaticRendererChartProps<TDatum, TXValue, TYValue>): unknown
export declare function RendererChart<
  TDatum,
  TInput,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
>(props: DynamicRendererChartProps<TDatum, TInput, TXValue, TYValue>): unknown
