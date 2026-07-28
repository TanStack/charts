import type {
  ChartAnimationOptions,
  ChartFocusMode,
  ChartPoint,
  ChartRenderContext,
  ChartSpatialIndexFactory,
  ChartSvgRenderer,
  ChartTextMeasurer,
  ChartTooltipOptions,
  DynamicChartDefinition,
  StaticChartDefinition,
} from '@tanstack/charts'

export interface ChartCommonProps<TDatum = unknown> {
  ariaLabel: string
  ariaDescription?: string
  height?: number
  aspectRatio?: number
  width?: number
  initialWidth?: number
  class?: string
  style?: Record<string, string | number | undefined>
  maxFocusDistance?: number
  focus?: ChartFocusMode
  spatialIndex?: ChartSpatialIndexFactory<TDatum>
  animate?: boolean | ChartAnimationOptions
  keyboard?: boolean
  idPrefix?: string
  renderSvg?: ChartSvgRenderer
  measureText?: ChartTextMeasurer
  tooltip?: boolean | ChartTooltipOptions<TDatum>
  onFocusChange?: (point: ChartPoint<TDatum> | null) => void
  onFocusGroupChange?: (points: readonly ChartPoint<TDatum>[]) => void
  onSelect?: (point: ChartPoint<TDatum> | null) => void
  onRender?: (context: ChartRenderContext<TDatum>) => void
}

export type StaticChartProps<TDatum = unknown> = ChartCommonProps<TDatum> & {
  definition: StaticChartDefinition<TDatum>
  input?: never
}

export type DynamicChartProps<
  TDatum = unknown,
  TInput = unknown,
> = ChartCommonProps<TDatum> & {
  definition: DynamicChartDefinition<TInput, any, TDatum>
  input: TInput
}

export type ChartProps<TDatum = unknown, TInput = undefined> =
  StaticChartProps<TDatum> | DynamicChartProps<TDatum, TInput>
