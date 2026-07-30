import type { JSX } from 'solid-js'
import type {
  ChartHostCommonOptions,
  ChartHostOptions,
  ChartTooltipBodyContext,
  ChartValue,
} from '@tanstack/charts'

export interface ChartPresentationProps {
  class?: string
  style?: JSX.CSSProperties
}

export interface ChartTooltipBodyRenderContext<
  TDatum = unknown,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> extends ChartTooltipBodyContext<TDatum, TXValue, TYValue> {
  defaultBody: JSX.Element
}

export interface ChartTooltipBodyRenderProps<
  TDatum = unknown,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> {
  renderTooltipBody?: (
    context: ChartTooltipBodyRenderContext<TDatum, TXValue, TYValue>,
  ) => JSX.Element
}

export type ChartCommonProps<
  TDatum = unknown,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> = ChartHostCommonOptions<TDatum, TXValue, TYValue> &
  ChartPresentationProps &
  ChartTooltipBodyRenderProps<TDatum, TXValue, TYValue>

export type ChartProps<
  TDatum = unknown,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> = ChartHostOptions<TDatum, TXValue, TYValue> &
  ChartPresentationProps &
  ChartTooltipBodyRenderProps<TDatum, TXValue, TYValue>
