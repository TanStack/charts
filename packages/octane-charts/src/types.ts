import type {
  ChartAnimationOptions,
  ChartFocusMode,
  ChartPoint,
  ChartRenderContext,
  ChartSpatialIndexFactory,
  ChartSvgRenderer,
  ChartTextMeasurer,
  ChartTooltipOptions,
  ChartValue,
  DynamicChartDefinition,
  StaticChartDefinition,
} from '@tanstack/charts'

export interface ChartCommonProps<
  TDatum = unknown,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> {
  ariaLabel: string
  ariaDescription?: string
  height?: number
  aspectRatio?: number
  width?: number
  initialWidth?: number
  class?: string
  style?: Record<string, string | number | undefined>
  maxFocusDistance?: number
  focus?: ChartFocusMode<NoInfer<TDatum>, NoInfer<TXValue>, NoInfer<TYValue>>
  spatialIndex?: ChartSpatialIndexFactory<TDatum, TXValue, TYValue>
  animate?: boolean | ChartAnimationOptions
  keyboard?: boolean
  tabIndex?: number
  idPrefix?: string
  renderSvg?: ChartSvgRenderer<
    NoInfer<TDatum>,
    NoInfer<TXValue>,
    NoInfer<TYValue>
  >
  measureText?: ChartTextMeasurer
  tooltip?: boolean | ChartTooltipOptions<TDatum, TXValue, TYValue>
  onFocusChange?: (point: ChartPoint<TDatum, TXValue, TYValue> | null) => void
  onFocusGroupChange?: (
    points: readonly ChartPoint<TDatum, TXValue, TYValue>[],
  ) => void
  onSelect?: (point: ChartPoint<TDatum, TXValue, TYValue> | null) => void
  onRender?: (context: ChartRenderContext<TDatum, TXValue, TYValue>) => void
}

export type StaticChartProps<
  TDatum = unknown,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> = ChartCommonProps<TDatum, TXValue, TYValue> & {
  definition: StaticChartDefinition<TDatum, TXValue, TYValue>
  input?: never
}

export type DynamicChartProps<
  TDatum = unknown,
  TInput = unknown,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> = ChartCommonProps<TDatum, TXValue, TYValue> & {
  definition: DynamicChartDefinition<TInput, any, TDatum, TXValue, TYValue>
  input: TInput
}

export type ChartProps<
  TDatum = unknown,
  TInput = undefined,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> =
  | StaticChartProps<TDatum, TXValue, TYValue>
  | DynamicChartProps<TDatum, TInput, TXValue, TYValue>
