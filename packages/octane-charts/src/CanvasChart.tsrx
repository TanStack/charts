import { canvasChartRenderer } from '@tanstack/charts/canvas'
import type { ChartValue } from '@tanstack/charts'
import { RendererChart } from './RendererChart.tsrx'
import type {
  CanvasChartProps,
  DynamicCanvasChartProps,
  StaticCanvasChartProps,
} from './canvas-types'

export function CanvasChart<
  TDatum,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
>(props: StaticCanvasChartProps<TDatum, TXValue, TYValue>): unknown
export function CanvasChart<
  TDatum,
  TInput,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
>(props: DynamicCanvasChartProps<TDatum, TInput, TXValue, TYValue>): unknown
export function CanvasChart<
  TDatum,
  TInput = undefined,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
>(props: CanvasChartProps<TDatum, TInput, TXValue, TYValue>) {
  return <RendererChart {...props} renderer={canvasChartRenderer} />
}
