import type { JSX } from 'solid-js'
import type {
  ChartHostCommonOptions,
  ChartHostOptions,
  ChartValue,
} from '@tanstack/charts'

export interface ChartPresentationProps {
  class?: string
  style?: JSX.CSSProperties
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
