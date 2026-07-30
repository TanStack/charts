import type {
  ChartHostCommonOptions,
  ChartHostOptions,
  ChartValue,
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

export type ChartOptions<
  TDatum = unknown,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> = ChartHostOptions<TDatum, TXValue, TYValue> & ChartPresentationOptions
