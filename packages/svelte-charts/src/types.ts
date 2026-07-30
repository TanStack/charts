import type { Snippet } from 'svelte'
import type {
  ChartHostCommonOptions,
  ChartHostOptions,
  ChartTooltipBodyContext,
  ChartValue,
} from '@tanstack/charts'

export interface ChartPresentationProps {
  class?: string
  style?: string
}

export interface ChartTooltipBodySnippetContext<
  TDatum = unknown,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> extends ChartTooltipBodyContext<TDatum, TXValue, TYValue> {
  defaultBody: Snippet
}

export type ChartCommonProps<
  TDatum = unknown,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> = ChartHostCommonOptions<TDatum, TXValue, TYValue> &
  ChartPresentationProps & {
    tooltipBody?: Snippet<
      [ChartTooltipBodySnippetContext<TDatum, TXValue, TYValue>]
    >
  }

export type ChartProps<
  TDatum = unknown,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> = ChartHostOptions<TDatum, TXValue, TYValue> &
  ChartPresentationProps & {
    tooltipBody?: Snippet<
      [ChartTooltipBodySnippetContext<TDatum, TXValue, TYValue>]
    >
  }
