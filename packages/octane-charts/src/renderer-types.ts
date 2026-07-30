import type {
  ChartPoint,
  ChartRenderer,
  ChartRendererRenderContext,
  ChartTextMeasurer,
  ChartValue,
  ChartDefinition,
} from '@tanstack/charts'

export interface RendererChartCommonProps<
  TDatum = unknown,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> {
  renderer: ChartRenderer<NoInfer<TDatum>, NoInfer<TXValue>, NoInfer<TYValue>>
  ariaLabel: string
  ariaDescription?: string
  height?: number
  aspectRatio?: number
  width?: number
  initialWidth?: number
  class?: string
  style?: Record<string, string | number | undefined>
  tabIndex?: number
  idPrefix?: string
  measureText?: ChartTextMeasurer
  onFocusChange?: (point: ChartPoint<TDatum, TXValue, TYValue> | null) => void
  onFocusGroupChange?: (
    points: readonly ChartPoint<TDatum, TXValue, TYValue>[],
  ) => void
  onSelect?: (point: ChartPoint<TDatum, TXValue, TYValue> | null) => void
  onRender?: (
    context: ChartRendererRenderContext<TDatum, TXValue, TYValue>,
  ) => void
}

export type RendererChartProps<
  TDatum = unknown,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> = RendererChartCommonProps<TDatum, TXValue, TYValue> & {
  definition: ChartDefinition<TDatum, TXValue, TYValue>
}
