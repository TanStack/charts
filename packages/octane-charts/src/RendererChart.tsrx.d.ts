import type { ChartValue } from '@tanstack/charts'
import type { RendererChartProps } from './renderer-types'

export declare function RendererChart<
  TDatum,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
>(props: RendererChartProps<TDatum, TXValue, TYValue>): unknown
