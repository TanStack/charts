import type {
  ChartPoint,
  ChartRenderContext,
  ChartSvgRenderer,
  ChartTextMeasurer,
  ChartValue,
  ChartDefinition,
} from '@tanstack/charts'
import type { OctaneNode } from 'octane'
import type { ChartTooltipBodyRenderContext } from './renderer-types'

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
  tabIndex?: number
  idPrefix?: string
  renderSvg?: ChartSvgRenderer<
    NoInfer<TDatum>,
    NoInfer<TXValue>,
    NoInfer<TYValue>
  >
  measureText?: ChartTextMeasurer
  onFocusChange?: (point: ChartPoint<TDatum, TXValue, TYValue> | null) => void
  onFocusGroupChange?: (
    points: readonly ChartPoint<TDatum, TXValue, TYValue>[],
  ) => void
  onSelect?: (point: ChartPoint<TDatum, TXValue, TYValue> | null) => void
  onRender?: (context: ChartRenderContext<TDatum, TXValue, TYValue>) => void
  renderTooltipBody?: (
    context: ChartTooltipBodyRenderContext<TDatum, TXValue, TYValue>,
  ) => OctaneNode
}

export type ChartProps<
  TDatum = unknown,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> = ChartCommonProps<TDatum, TXValue, TYValue> & {
  definition: ChartDefinition<TDatum, TXValue, TYValue>
}
