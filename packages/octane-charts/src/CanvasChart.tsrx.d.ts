import type { ChartValue } from '@tanstack/charts'
import type { CanvasChartProps } from './canvas-types'

export declare function CanvasChart<
  TDatum,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
>(props: CanvasChartProps<TDatum, TXValue, TYValue>): unknown
