import type {
  ChartRenderMetrics,
  ChartRenderer,
  ChartSize,
  ChartSizing,
  ChartThemeInput,
} from '@plot-poc/host-core'
import type { PlotDefinition } from '@plot-poc/observable'

export interface ChartProps<TData, TValue = unknown> {
  data: TData
  renderer: ChartRenderer<TData, TValue>
  sizing: ChartSizing
  theme?: ChartThemeInput
  initialSize?: Partial<ChartSize>
  ariaLabel: string
  ariaDescription?: string
  class?: string
  style?: Record<string, string | number | undefined>
  tabIndex?: number
  onError?: (error: unknown) => void
  onRender?: (metrics: ChartRenderMetrics) => void
  onValueChange?: (value: TValue | undefined) => void
}

export interface PlotProps<
  TInput,
  TValue = unknown,
  TPrepared = TInput,
> extends Omit<ChartProps<TInput, TValue>, 'data' | 'renderer'> {
  definition: PlotDefinition<TInput, TValue, TPrepared>
  input: TInput
}
