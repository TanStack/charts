import type { StyleValue } from 'vue'
import type {
  ChartHostCommonOptions,
  ChartHostOptions,
  ChartValue,
  DynamicChartHostOptions,
  StaticChartHostOptions,
} from '@tanstack/charts'

export interface ChartPresentationProps {
  class?: string
  style?: StyleValue
}

export type ChartCommonProps<
  TDatum = unknown,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> = ChartHostCommonOptions<TDatum, TXValue, TYValue> & ChartPresentationProps

export type StaticChartProps<
  TDatum = unknown,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> = StaticChartHostOptions<TDatum, TXValue, TYValue> & ChartPresentationProps

export type DynamicChartProps<
  TDatum = unknown,
  TInput = unknown,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> = DynamicChartHostOptions<TDatum, TInput, TXValue, TYValue> &
  ChartPresentationProps

export type ChartProps<
  TDatum = unknown,
  TInput = undefined,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> = ChartHostOptions<TDatum, TInput, TXValue, TYValue> & ChartPresentationProps
