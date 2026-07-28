import type { DynamicChartProps, StaticChartProps } from './types'

export declare function Chart<TDatum>(props: StaticChartProps<TDatum>): unknown
export declare function Chart<TDatum, TInput>(
  props: DynamicChartProps<TDatum, TInput>,
): unknown
