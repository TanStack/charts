import type {
  ChartAnimationOptions,
  ChartDefinition,
  ChartFocusState,
  ChartHostControl,
  ChartHostControlExtensionToken,
  ChartPoint,
  ChartScene,
  ChartSvgRenderer,
  ChartTextMeasurer,
  ChartTooltipBodyContext,
  ChartTooltipExtensionToken,
  ChartTooltipOptions,
  ChartTooltipPlacement,
  ChartTooltipPortalExtensionToken,
  ChartTooltipPortalOptions,
  ChartTooltipPosition,
  ChartValue,
  RenderChartOptions,
  RenderChartSvgOptions,
} from './types'

export interface ChartHostControlExtension extends ChartHostControlExtensionToken {
  create: (
    context: ChartHostControlExtensionContext,
  ) => ChartHostControlInstance
}

export interface ChartHostControlExtensionContext {
  container: HTMLElement
  surface: ChartSurface<any, any, any>
}

export interface ChartHostControlInstance {
  update: (control: ChartHostControl, scene: ChartScene) => void
  contains?: (target: EventTarget | null) => boolean
  destroy: () => void
}

export interface ChartSurfaceRenderOptions extends RenderChartOptions {
  animation?: ChartAnimationOptions
}

export interface ChartSurface<
  TDatum = unknown,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> {
  readonly renderer: ChartRenderer<TDatum, TXValue, TYValue>
  readonly element: Element
  render: (
    scene: ChartScene<TDatum, TXValue, TYValue>,
    options: ChartSurfaceRenderOptions,
  ) => void
  clientToScene: (
    scene: ChartScene<TDatum, TXValue, TYValue>,
    clientX: number,
    clientY: number,
  ) => { x: number; y: number } | null
  /** Renderer-owned point geometry while a scene transition is active. */
  getPresentationPoints?: () => readonly ChartPoint<any, any, any>[] | undefined
  /**
   * Paints focus and may return a destination scene for interaction during a
   * transition. A returned scene preserves the rendered scene's layout.
   */
  paintFocus: (
    focus: ChartFocusState<TDatum, TXValue, TYValue> | null,
    pointer?: ChartTooltipPosition | null,
  ) => ChartScene<TDatum, TXValue, TYValue> | void
  destroy: () => void
}

export interface ChartRenderer<
  TDatum = unknown,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> {
  readonly id: string
  prerender: (
    scene: ChartScene<TDatum, TXValue, TYValue>,
    options: RenderChartOptions,
  ) => string
  mount: (
    container: HTMLElement,
    requestRender: (force?: boolean) => void,
  ) => ChartSurface<TDatum, TXValue, TYValue>
}

export interface ChartRendererRenderContext<
  TDatum = unknown,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> {
  container: HTMLElement
  scene: ChartScene<TDatum, TXValue, TYValue>
  surface: ChartSurface<TDatum, TXValue, TYValue>
}

export interface ChartTooltipBodyTarget<
  TDatum = unknown,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> extends ChartTooltipBodyContext<TDatum, TXValue, TYValue> {
  element: HTMLElement
}

export interface ChartTooltipExtension extends ChartTooltipExtensionToken {
  create: <TDatum, TXValue extends ChartValue, TYValue extends ChartValue>(
    context: ChartTooltipExtensionContext<TDatum, TXValue, TYValue>,
  ) => ChartTooltipExtensionInstance<TDatum, TXValue, TYValue>
}

export interface ChartTooltipExtensionContext<
  TDatum = unknown,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> {
  container: HTMLElement
  dismiss: () => void
  bodyChange: () =>
    | ((
        target: ChartTooltipBodyTarget<TDatum, TXValue, TYValue> | null,
      ) => void)
    | undefined
}

export interface ChartTooltipPaintContext<
  TDatum = unknown,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> {
  point: ChartPoint<TDatum, TXValue, TYValue>
  points: readonly ChartPoint<TDatum, TXValue, TYValue>[]
  scene: ChartScene<TDatum, TXValue, TYValue>
  surface: ChartSurface<TDatum, TXValue, TYValue>
  pointer: ChartTooltipPosition | null
  focus: ChartFocusState<TDatum, TXValue, TYValue>
  pinned: boolean
}

export interface ChartTooltipExtensionInstance<
  TDatum = unknown,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> {
  update: (options: ChartTooltipOptions<TDatum, TXValue, TYValue>) => void
  paint: (context: ChartTooltipPaintContext<TDatum, TXValue, TYValue>) => void
  hide: () => void
  contains: (target: EventTarget | null) => boolean
  destroy: () => void
}

export interface ChartTooltipPortalExtension extends ChartTooltipPortalExtensionToken {
  create: (
    context: ChartTooltipPortalExtensionContext,
    options: ChartTooltipPortalOptions,
  ) => ChartTooltipPortalExtensionInstance
}

export interface ChartTooltipPortalExtensionContext {
  container: HTMLElement
  element: HTMLElement
  schedulePosition: () => void
}

export interface ChartTooltipPortalPositionContext {
  scene: ChartScene<any, any, any>
  surface: ChartSurface<any, any, any>
  anchor: ChartTooltipPosition
  placement?: 'auto' | ChartTooltipPlacement | readonly ChartTooltipPlacement[]
  offset?: number
}

export interface ChartTooltipPortalExtensionInstance {
  update: (options: ChartTooltipPortalOptions) => void
  position: (context: ChartTooltipPortalPositionContext) => boolean
  hide: () => void
  destroy: () => void
}

export interface ChartRenderContext<
  TDatum = unknown,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> {
  container: HTMLElement
  svg: SVGSVGElement
  scene: ChartScene<TDatum, TXValue, TYValue>
}

export interface ChartHostCommonOptions<
  TDatum = unknown,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> extends RenderChartSvgOptions {
  height?: number
  aspectRatio?: number
  width?: number
  initialWidth?: number
  onFocusChange?: (point: ChartPoint<TDatum, TXValue, TYValue> | null) => void
  onFocusGroupChange?: (
    points: readonly ChartPoint<TDatum, TXValue, TYValue>[],
  ) => void
  onSelect?: (point: ChartPoint<TDatum, TXValue, TYValue> | null) => void
  onRender?: (context: ChartRenderContext<TDatum, TXValue, TYValue>) => void
  renderSvg?: ChartSvgRenderer<
    NoInfer<TDatum>,
    NoInfer<TXValue>,
    NoInfer<TYValue>
  >
  measureText?: ChartTextMeasurer
}

export interface ChartRendererHostCommonOptions<
  TDatum = unknown,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> extends RenderChartOptions {
  renderer: ChartRenderer<NoInfer<TDatum>, NoInfer<TXValue>, NoInfer<TYValue>>
  height?: number
  aspectRatio?: number
  width?: number
  initialWidth?: number
  onFocusChange?: (point: ChartPoint<TDatum, TXValue, TYValue> | null) => void
  onFocusGroupChange?: (
    points: readonly ChartPoint<TDatum, TXValue, TYValue>[],
  ) => void
  onSelect?: (point: ChartPoint<TDatum, TXValue, TYValue> | null) => void
  onRender?: (
    context: ChartRendererRenderContext<TDatum, TXValue, TYValue>,
  ) => void
  onTooltipBodyChange?: (
    target: ChartTooltipBodyTarget<
      NoInfer<TDatum>,
      NoInfer<TXValue>,
      NoInfer<TYValue>
    > | null,
  ) => void
  measureText?: ChartTextMeasurer
}

export type ChartRendererHostOptions<
  TDatum = unknown,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> = ChartRendererHostCommonOptions<TDatum, TXValue, TYValue> & {
  definition: ChartDefinition<TDatum, TXValue, TYValue>
}

export type ChartHostOptions<
  TDatum = unknown,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> = ChartHostCommonOptions<TDatum, TXValue, TYValue> & {
  definition: ChartDefinition<TDatum, TXValue, TYValue>
}

export interface ChartHost<
  TDatum = unknown,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> {
  update: (options: ChartHostOptions<TDatum, TXValue, TYValue>) => void
  getScene: () => ChartScene<TDatum, TXValue, TYValue>
  destroy: () => void
}

export interface ChartRendererHost<
  TDatum = unknown,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> {
  update: (options: ChartRendererHostOptions<TDatum, TXValue, TYValue>) => void
  getScene: () => ChartScene<TDatum, TXValue, TYValue>
  destroy: () => void
}
