import type {
  ChartHostCommonOptions,
  ChartHostOptions,
  ChartValue,
  DynamicChartHostOptions,
  StaticChartHostOptions,
} from '@tanstack/charts'

export interface ChartPresentationOptions {
  class?: string
  style?: string
}

export type ChartCommonOptions<
  TDatum = unknown,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> = ChartHostCommonOptions<TDatum, TXValue, TYValue> & ChartPresentationOptions

export type StaticChartOptions<
  TDatum = unknown,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> = StaticChartHostOptions<TDatum, TXValue, TYValue> & ChartPresentationOptions

export type DynamicChartOptions<
  TDatum = unknown,
  TInput = unknown,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> = DynamicChartHostOptions<TDatum, TInput, TXValue, TYValue> &
  ChartPresentationOptions

export type ChartOptions<
  TDatum = unknown,
  TInput = undefined,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> = ChartHostOptions<TDatum, TInput, TXValue, TYValue> &
  ChartPresentationOptions
