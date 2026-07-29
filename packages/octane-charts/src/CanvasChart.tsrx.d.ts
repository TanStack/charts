import type { ChartValue } from '@tanstack/charts'
import type {
  DynamicCanvasChartProps,
  StaticCanvasChartProps,
} from './canvas-types'

export declare function CanvasChart<
  TDatum,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
>(props: StaticCanvasChartProps<TDatum, TXValue, TYValue>): unknown
export declare function CanvasChart<
  TDatum,
  TInput,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
>(props: DynamicCanvasChartProps<TDatum, TInput, TXValue, TYValue>): unknown
