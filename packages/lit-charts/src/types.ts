import type { TemplateResult } from 'lit'
import type {
  ChartHostCommonOptions,
  ChartHostOptions,
  ChartTooltipBodyContext,
  ChartValue,
} from '@tanstack/charts'

export interface ChartTooltipBodyRenderContext<
  TDatum = unknown,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> extends ChartTooltipBodyContext<TDatum, TXValue, TYValue> {
  defaultBody: TemplateResult
}

export interface ChartPresentationProps<
  TDatum = unknown,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> {
  class?: string
  style?: string
  renderTooltipBody?: (
    context: ChartTooltipBodyRenderContext<TDatum, TXValue, TYValue>,
  ) => unknown
}

export type ChartCommonProps<
  TDatum = unknown,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> = ChartHostCommonOptions<TDatum, TXValue, TYValue> &
  ChartPresentationProps<TDatum, TXValue, TYValue>

export type ChartProps<
  TDatum = unknown,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> = ChartHostOptions<TDatum, TXValue, TYValue> &
  ChartPresentationProps<TDatum, TXValue, TYValue>
