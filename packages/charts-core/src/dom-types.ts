import type {
  ChartAnimationOptions,
  ChartCursorPresentation,
  DomChartDefinition,
  ChartFocusState,
  ChartHostControl,
  ChartHostControlExtensionToken,
  ChartMotionTransition,
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

export interface ChartPointerResolution<
  TDatum = unknown,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> {
  /** Pointer position in the chart scene coordinate system. */
  position: ChartTooltipPosition
  /** Primary point selected by the definition's focus strategy. */
  point: ChartPoint<TDatum, TXValue, TYValue>
  /** Complete focus group, with the primary point first. */
  points: readonly ChartPoint<TDatum, TXValue, TYValue>[]
}

export interface ChartControlledFocusOptions {
  /** Semantic input source exposed to focus marks and tooltips. */
  source?: 'pointer' | 'programmatic'
  /** Makes an enabled tooltip interactive until focus is cleared. */
  pinned?: boolean
}

export interface ChartInteractionController<
  TDatum = unknown,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> {
  /** Converts browser client coordinates into the chart scene coordinate system. */
  clientToScene: (
    clientX: number,
    clientY: number,
  ) => ChartTooltipPosition | null
  /** Resolves browser client coordinates through the current presentation. */
  resolvePointer: (
    clientX: number,
    clientY: number,
  ) => ChartPointerResolution<TDatum, TXValue, TYValue> | null
  /** Paints or clears application-owned focus without selecting a point. */
  setControlledFocus: (
    target:
      | ChartPointerResolution<TDatum, TXValue, TYValue>
      | ChartPoint<TDatum, TXValue, TYValue>
      | null,
    options?: ChartControlledFocusOptions,
  ) => void
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
  /** Optional client-coordinate conversion used by controlled pointer gestures. */
  clientToScene?: (
    scene: ChartScene<TDatum, TXValue, TYValue>,
    clientX: number,
    clientY: number,
  ) => { x: number; y: number } | null
  /** Renderer-owned point geometry while a scene transition is active. */
  getPresentationPoints?: () =>
    readonly ChartPoint<TDatum, TXValue, TYValue>[] | undefined
  /** Notifies the host when renderer-owned point geometry advances. */
  subscribePresentationPoints?: (
    listener: (points: readonly ChartPoint<TDatum, TXValue, TYValue>[]) => void,
  ) => () => void
  /**
   * Paints focus and may return a destination scene for interaction during a
   * transition. A returned scene preserves the rendered scene's layout.
   */
  paintFocus: (
    focus: ChartFocusState<TDatum, TXValue, TYValue> | null,
    pointer?: ChartTooltipPosition | null,
    cursor?: ChartCursorPresentation<TXValue, TYValue> | null,
  ) => ChartScene<TDatum, TXValue, TYValue> | void
  destroy: () => void
}

export interface ChartTooltipMotionSnapshot {
  wasHidden: boolean
  showPresence: boolean
  previousLeft?: number
  previousTop?: number
  movementX: number
  movementY: number
  velocityX: number
  velocityY: number
  presence?: { opacity: number; scale: number }
}

export interface ChartTooltipMotionController {
  beforePaint: (element: HTMLElement) => ChartTooltipMotionSnapshot
  afterPaint: (
    element: HTMLElement,
    snapshot: ChartTooltipMotionSnapshot,
    transition: false | ChartMotionTransition | undefined,
  ) => void
  hide: (
    element: HTMLElement,
    transition: false | ChartMotionTransition | undefined,
    complete: () => void,
  ) => boolean
  destroy: (element: HTMLElement | undefined) => void
}

export interface ChartRendererTooltipMotionCapability {
  readonly protocol: 1
  createController: (context: {
    container: HTMLElement
    transition: () => false | ChartMotionTransition | undefined
  }) => ChartTooltipMotionController
}

export interface ChartRendererCapabilities {
  readonly tooltipMotion?: ChartRendererTooltipMotionCapability
}

export interface ChartRenderer<
  TDatum = unknown,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> {
  readonly id: string
  readonly capabilities?: ChartRendererCapabilities
  prerender: (
    scene: ChartScene<TDatum, TXValue, TYValue>,
    options: RenderChartOptions,
  ) => string
  mount: (
    container: HTMLElement,
    requestRender: (force?: boolean) => void,
  ) => ChartSurface<TDatum, TXValue, TYValue>
}

/** A definition-agnostic renderer that acquires chart types from its host. */
export interface UniversalChartRenderer {
  readonly id: string
  readonly capabilities?: ChartRendererCapabilities
  prerender: <
    TDatum,
    TXValue extends ChartValue = ChartValue,
    TYValue extends ChartValue = ChartValue,
  >(
    scene: ChartScene<TDatum, TXValue, TYValue>,
    options: RenderChartOptions,
  ) => string
  mount: <
    TDatum,
    TXValue extends ChartValue = ChartValue,
    TYValue extends ChartValue = ChartValue,
  >(
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
  interaction: ChartInteractionController<TDatum, TXValue, TYValue>
}

export interface ChartTooltipBodyTarget<
  TDatum = unknown,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> extends ChartTooltipBodyContext<TDatum, TXValue, TYValue> {
  element: HTMLElement
}

export interface ChartTooltipExtension extends ChartTooltipExtensionToken<'dom'> {
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
  motion?: ChartTooltipMotionController
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
  interaction: ChartInteractionController<TDatum, TXValue, TYValue>
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
  definition: DomChartDefinition<TDatum, TXValue, TYValue>
}

export type ChartHostOptions<
  TDatum = unknown,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> = ChartHostCommonOptions<TDatum, TXValue, TYValue> & {
  definition: DomChartDefinition<TDatum, TXValue, TYValue>
}

export interface ChartHost<
  TDatum = unknown,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> {
  readonly interaction: ChartInteractionController<TDatum, TXValue, TYValue>
  update: (options: ChartHostOptions<TDatum, TXValue, TYValue>) => void
  getScene: () => ChartScene<TDatum, TXValue, TYValue>
  destroy: () => void
}

export interface ChartRendererHost<
  TDatum = unknown,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> {
  readonly interaction: ChartInteractionController<TDatum, TXValue, TYValue>
  update: (options: ChartRendererHostOptions<TDatum, TXValue, TYValue>) => void
  getScene: () => ChartScene<TDatum, TXValue, TYValue>
  destroy: () => void
}
