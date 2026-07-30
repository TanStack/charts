import type { StyleValue } from 'vue'
import type {
  ChartHostCommonOptions,
  ChartHostOptions,
  ChartValue,
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

export type ChartProps<
  TDatum = unknown,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> = ChartHostOptions<TDatum, TXValue, TYValue> & ChartPresentationProps
