export interface ChartSize {
  width: number
  height: number
}

export interface ChartThemeTokens {
  background: string
  foreground: string
  muted: string
  grid: string
  axis: string
  tooltipBackground: string
  tooltipForeground: string
  focus: string
  selection: string
  positive: string
  negative: string
  warning: string
  neutral: string
  categorical: readonly string[]
}

export interface ResolvedChartTheme extends ChartThemeTokens {
  mode: 'light' | 'dark'
}

export type ChartThemeInput =
  | 'auto'
  | 'light'
  | 'dark'
  | {
      mode?: 'auto' | 'light' | 'dark'
      tokens?: Partial<ChartThemeTokens>
    }

export interface ChartRenderContext<TData> extends ChartSize {
  container: HTMLElement
  data: TData
  document: Document
  reducedMotion: boolean
  signal: AbortSignal
  theme: ResolvedChartTheme
}

export type ChartRenderReason =
  'initial' | 'resize' | 'theme' | 'preference' | 'update' | 'manual'

export interface ChartRenderUpdate {
  reason: ChartRenderReason
}

export interface ChartRenderResult<TValue = unknown, TData = unknown> {
  element: Element
  destroy?: () => void
  getValue?: () => TValue | undefined
  subscribeValue?: (listener: (value: TValue | undefined) => void) => () => void
  update?: (
    context: ChartRenderContext<TData>,
    update: ChartRenderUpdate,
  ) => void
}

export interface ChartRenderer<TData, TValue = unknown> {
  (context: ChartRenderContext<TData>): ChartRenderResult<TValue, TData>
  readonly inputEqual?: (previous: TData, next: TData) => boolean
}

export interface ChartRenderMetrics extends ChartSize {
  duration: number
  reason: ChartRenderReason
  renderCount: number
}

export interface ChartEnvironment {
  document?: Document
  ResizeObserver?: typeof ResizeObserver
  MutationObserver?: typeof MutationObserver
  measure?: (container: HTMLElement) => ChartSize
  requestAnimationFrame?: (callback: FrameRequestCallback) => number
  cancelAnimationFrame?: (handle: number) => void
  getComputedStyle?: (element: Element) => CSSStyleDeclaration
  matchMedia?: (query: string) => MediaQueryList
  now?: () => number
}

export interface ChartControllerOptions<TData, TValue = unknown> {
  data: TData
  renderer: ChartRenderer<TData, TValue>
  sizing?: ChartSizing
  theme?: ChartThemeInput
  initialSize?: Partial<ChartSize>
  environment?: ChartEnvironment
  onError?: (error: unknown) => void
  onRender?: (metrics: ChartRenderMetrics) => void
  onValueChange?: (value: TValue | undefined) => void
}

export interface ChartControllerUpdate<TData, TValue = unknown> {
  data?: TData
  renderer?: ChartRenderer<TData, TValue>
  sizing?: ChartSizing
  theme?: ChartThemeInput
  initialSize?: Partial<ChartSize>
  onError?: (error: unknown) => void
  onRender?: (metrics: ChartRenderMetrics) => void
  onValueChange?: (value: TValue | undefined) => void
}

export interface ChartController<TData = unknown, TValue = unknown> {
  readonly renderCount: number
  readonly size: ChartSize | null
  renderNow: () => void
  update: (options: ChartControllerUpdate<TData, TValue>) => void
  destroy: () => void
}

export type ChartSizing =
  | {
      height: number
      aspectRatio?: never
      fill?: never
    }
  | {
      aspectRatio: number
      minHeight?: number
      maxHeight?: number
      height?: never
      fill?: never
    }
  | {
      fill: true
      height?: never
      aspectRatio?: never
    }
