import type { ChartValue, DomChartDefinition } from '@tanstack/charts'
import type { RendererChartCommonProps } from './renderer-types'

export type CanvasChartCommonProps<
  TDatum = unknown,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> = Omit<RendererChartCommonProps<TDatum, TXValue, TYValue>, 'renderer'>

export type CanvasChartProps<
  TDatum = unknown,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> = CanvasChartCommonProps<TDatum, TXValue, TYValue> & {
  definition: DomChartDefinition<TDatum, TXValue, TYValue>
}
