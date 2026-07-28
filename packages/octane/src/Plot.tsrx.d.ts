import type { PlotProps } from './types'

export declare function Plot<TInput, TValue = unknown, TPrepared = TInput>(
  props: PlotProps<TInput, TValue, TPrepared>,
): unknown
