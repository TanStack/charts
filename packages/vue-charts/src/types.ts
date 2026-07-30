import type { StyleValue, VNodeChild } from 'vue'
import type {
  ChartHostCommonOptions,
  ChartHostOptions,
  ChartTooltipBodyContext,
  ChartValue,
} from '@tanstack/charts'

export interface ChartPresentationProps {
  class?: string
  style?: StyleValue
}

export interface ChartTooltipBodySlotContext<
  TDatum = unknown,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> extends ChartTooltipBodyContext<TDatum, TXValue, TYValue> {
  defaultBody: () => VNodeChild
}

export type ChartCommonProps<
  TDatum = unknown,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> = ChartHostCommonOptions<TDatum, TXValue, TYValue> & ChartPresentationProps

export type ChartProps<
  TDatum = unknown,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> = ChartHostOptions<TDatum, TXValue, TYValue> & ChartPresentationProps
