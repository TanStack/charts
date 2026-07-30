import { canvasChartRenderer } from '@tanstack/charts/canvas'
import type { ChartValue } from '@tanstack/charts'
import { RendererChart } from './RendererChart.tsrx'
import type { CanvasChartProps } from './canvas-types'

export function CanvasChart<
  TDatum,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
>(props: CanvasChartProps<TDatum, TXValue, TYValue>) {
  return <RendererChart {...props} renderer={canvasChartRenderer} />
}
