export type ChartValue = number | string | Date
export type ChartKey = string | number

export interface ChartCurve {
  line: (points: readonly (readonly [number, number])[]) => string
  area: (
    top: readonly (readonly [number, number])[],
    bottom: readonly (readonly [number, number])[],
  ) => string
}

export interface ChartScaleResolveContext {
  id: string
  values: readonly unknown[]
  range: readonly [number, number]
  options: ChartAxisOptions<any> | undefined
  tickCount: number
  includeZero: boolean
}

export interface ChartScale {
  id: string
  resolve: (context: ChartScaleResolveContext) => ResolvedScale
}

export interface ConfiguredScaleLike<TValue extends ChartValue> {
  (value: TValue): number | undefined
  bandwidth?: () => number
  copy: () => ConfiguredScaleLike<TValue>
  domain: () => readonly TValue[]
  range: (values: Iterable<number>) => ConfiguredScaleLike<TValue>
  ticks?: (count: number) => readonly TValue[]
  tickFormat?: (count: number) => (value: TValue) => string
}

export type ChartScaleResolver = (
  context: ChartScaleResolveContext,
) => ResolvedScale

export type ChannelAccessor<TDatum, TValue> = (
  datum: TDatum,
  index: number,
  data: readonly TDatum[],
) => TValue

export type ChannelField<TDatum, TValue> = {
  [TKey in Extract<keyof TDatum, string>]-?: TDatum[TKey] extends TValue
    ? TKey
    : never
}[Extract<keyof TDatum, string>]

export type Channel<TDatum, TValue> =
  ChannelField<TDatum, TValue> | ChannelAccessor<TDatum, TValue>

export type WidenChartValue<TValue> = TValue extends string
  ? string
  : TValue extends number
    ? number
    : TValue extends Date
      ? Date
      : never

export type ChannelOutput<
  TDatum,
  TChannel,
  TFallback extends ChartValue,
> = TChannel extends keyof TDatum
  ? WidenChartValue<NonNullable<TDatum[TChannel]>>
  : TChannel extends ChannelAccessor<TDatum, infer TValue>
    ? WidenChartValue<NonNullable<TValue>>
    : WidenChartValue<TFallback>

export type OptionChannelOutput<
  TDatum,
  TOptions,
  TKey extends PropertyKey,
  TFallback extends ChartValue,
> = TOptions extends unknown
  ? TKey extends keyof TOptions
    ? ChannelOutput<TDatum, TOptions[TKey], TFallback>
    : WidenChartValue<TFallback>
  : never

export type VisualChannel<TDatum, TValue> =
  TValue | ChannelAccessor<TDatum, TValue>

export interface ChartSize {
  width: number
  height: number
}

export interface ChartBounds extends ChartSize {
  x: number
  y: number
}

export interface ChartMargin {
  top: number
  right: number
  bottom: number
  left: number
}

export interface ChartTextMeasureOptions {
  fontSize: number
  fontWeight?: number
  anchor: 'start' | 'middle' | 'end'
  baseline: 'auto' | 'middle' | 'hanging'
}

export interface ChartTextMetrics {
  /** Left edge of the painted glyph box relative to the anchored label origin. */
  x: number
  /** Top edge of the painted glyph box relative to the baseline origin. */
  y: number
  width: number
  height: number
}

export type ChartTextMeasurer = (
  text: string,
  options: ChartTextMeasureOptions,
) => ChartTextMetrics

export interface ChartLayoutOptions {
  measureText?: ChartTextMeasurer
}

export interface ChartAxisGuideOptions<TValue extends ChartValue = any> {
  /** Whether to render this axis, its ticks, title, and grid lines. */
  guide?: boolean
  ticks?: number
  format?: (value: TValue) => string
  grid?: boolean
  label?: string
  reverse?: boolean
  tickRotate?: number
  labelOffset?: number
}

export interface ChartAxisOptions<
  TValue extends ChartValue = any,
> extends ChartAxisGuideOptions<TValue> {
  scale: ChartScale | ConfiguredScaleLike<TValue>
}

export interface ChartColorOptions {
  scale?: ConfiguredColorScaleLike<any, any>
  type?: ChartColorScale
  domain?: readonly ChartKey[]
  range?: readonly string[]
  legend?: ChartColorLegend
}

export interface ConfiguredColorScaleLike<TValue extends ChartKey, TOutput> {
  (value: TValue): TOutput
  copy: () => ConfiguredColorScaleLike<TValue, TOutput>
  domain?: () => readonly TValue[]
  range?: () => readonly TOutput[]
}

export interface ChartColorScaleContext {
  values: readonly unknown[]
  domain?: readonly ChartKey[]
  range?: readonly string[]
  theme: ChartTheme
}

export interface ChartColorScale {
  id: string
  resolve: (context: ChartColorScaleContext) => ResolvedColorScale
}

export interface ChartColorLegendContext {
  colors: ResolvedColorScale
  chart: ChartBounds
  theme: ChartTheme
  width: number
}

export interface ChartColorLegend {
  height: (itemCount: number, width: number) => number
  render: (context: ChartColorLegendContext) => SceneNode
}

export interface ChartTheme {
  foreground: string
  muted: string
  grid: string
  background: string
  palette: readonly string[]
}

export interface ChartGradientStop {
  offset: number
  color: string
  opacity?: number
}

export interface ChartLinearGradient {
  id: string
  x1?: number
  y1?: number
  x2?: number
  y2?: number
  stops: readonly ChartGradientStop[]
}

export type ChartMarkScaleX<TMark> =
  TMark extends ChartMark<any, any, any, infer TValue, any> ? TValue : never

export type ChartMarkScaleY<TMark> =
  TMark extends ChartMark<any, any, any, any, infer TValue> ? TValue : never

export type ChartMarkPointX<TMark> =
  TMark extends ChartMark<infer TDatum, infer TXValue, any, any, any>
    ? [TDatum] extends [never]
      ? never
      : TXValue
    : never

export type ChartMarkPointY<TMark> =
  TMark extends ChartMark<infer TDatum, any, infer TYValue, any, any>
    ? [TDatum] extends [never]
      ? never
      : TYValue
    : never

/** @deprecated Prefer ChartMarkPointX when distinguishing point and scale values. */
export type ChartMarkX<TMark> = ChartMarkPointX<TMark>

/** @deprecated Prefer ChartMarkPointY when distinguishing point and scale values. */
export type ChartMarkY<TMark> = ChartMarkPointY<TMark>

type IsAny<TValue> = 0 extends 1 & TValue ? true : false

export type ChartAxisValue<TValue> =
  IsAny<TValue> extends true
    ? any
    : [TValue] extends [never]
      ? any
      : [ChartValue] extends [TValue]
        ? any
        : WidenChartValue<TValue>

type AnyChartMarks = readonly ChartMark<unknown, any, any>[]

type IsUnion<TValue, TWhole = TValue> = TValue extends TWhole
  ? [TWhole] extends [TValue]
    ? false
    : true
  : never

type ChartXOptionsForMarks<TMarks extends AnyChartMarks> =
  IsUnion<TMarks> extends false
    ? ChartAxisOptions<ChartAxisValue<ChartMarkScaleX<TMarks[number]>>>
    : TMarks extends AnyChartMarks
      ? ChartAxisOptions<ChartAxisValue<ChartMarkScaleX<TMarks[number]>>>
      : never

type ChartYOptionsForMarks<TMarks extends AnyChartMarks> =
  IsUnion<TMarks> extends false
    ? ChartAxisOptions<ChartAxisValue<ChartMarkScaleY<TMarks[number]>>>
    : TMarks extends AnyChartMarks
      ? ChartAxisOptions<ChartAxisValue<ChartMarkScaleY<TMarks[number]>>>
      : never

export interface ChartSpec<TMarks extends AnyChartMarks = any> {
  marks: TMarks
  guides?: boolean
  x: ChartXOptionsForMarks<TMarks> | null
  y: ChartYOptionsForMarks<TMarks> | null
  color?: ChartColorOptions
  gradients?: readonly ChartLinearGradient[]
  clip?: boolean
  margin?: number | Partial<ChartMargin>
  theme?: Partial<ChartTheme>
}

export interface StaticChartDefinition<
  TDatum = unknown,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> extends Omit<ChartSpec, 'marks'> {
  marks: readonly ChartMark<unknown, any, any>[]
  readonly __datum?: TDatum
  readonly __xValue?: TXValue
  readonly __yValue?: TYValue
}

export interface ChartBuildContext {
  width: number
  height: number
  theme: ChartTheme
}

export type CheckedChartSpec<TSpec extends ChartSpec> = TSpec extends ChartSpec
  ? TSpec & ChartSpec<TSpec['marks']>
  : never

export interface DynamicChartDefinition<
  TDatum = unknown,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> {
  chart: (context: ChartBuildContext) => ChartSpec
  readonly __datum?: TDatum
  readonly __xValue?: TXValue
  readonly __yValue?: TYValue
}

export type ChartDefinition<
  TDatum = unknown,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> =
  | StaticChartDefinition<TDatum, TXValue, TYValue>
  | DynamicChartDefinition<TDatum, TXValue, TYValue>

export type ChartMarkDatum<TMark> =
  TMark extends ChartMark<infer TDatum, any, any> ? TDatum : never

export type ChartSpecDatum<TSpec extends ChartSpec> =
  '__datum' extends keyof TSpec
    ? TSpec extends { readonly __datum?: infer TDatum }
      ? TDatum
      : never
    : ChartMarkDatum<TSpec['marks'][number]>

export type ChartSpecXValue<TSpec extends ChartSpec> =
  '__xValue' extends keyof TSpec
    ? TSpec extends {
        readonly __xValue?: infer TXValue extends ChartValue
      }
      ? TXValue
      : never
    : ChartMarkPointX<TSpec['marks'][number]>

export type ChartSpecYValue<TSpec extends ChartSpec> =
  '__yValue' extends keyof TSpec
    ? TSpec extends {
        readonly __yValue?: infer TYValue extends ChartValue
      }
      ? TYValue
      : never
    : ChartMarkPointY<TSpec['marks'][number]>

export interface MaterializedChannel {
  scale?: string
  values: readonly unknown[]
  includeZero?: boolean
}

export interface MarkInitializeContext {
  markIndex: number
}

export interface ResolvedScale {
  id: string
  type: string
  domain: readonly ChartValue[]
  map: (value: unknown) => number
  ticks: readonly ChartTick[]
  bandwidth: number
}

export interface ResolvedColorScale {
  type: string
  domain: readonly ChartKey[]
  range: readonly string[]
  map: (value: ChartKey | null | undefined) => string
}

export interface MarkRenderContext {
  markIndex: number
  chart: ChartBounds
  scales: Readonly<Record<string, ResolvedScale>>
  theme: ChartTheme
  color: (value: ChartKey | null | undefined) => string
  layout: ChartLayoutOptions
}

export interface ChartMark<
  TDatum = unknown,
  // Point values drive interaction callbacks; scale values cover every materialized channel.
  TXPointValue extends ChartValue = ChartValue,
  TYPointValue extends ChartValue = ChartValue,
  TXScaleValue extends ChartValue = TXPointValue,
  TYScaleValue extends ChartValue = TYPointValue,
> {
  initialize: (
    context: MarkInitializeContext,
  ) => InitializedMark<TDatum, TXPointValue, TYPointValue>
  readonly __xValue?: TXPointValue
  readonly __yValue?: TYPointValue
  readonly __xScaleValue?: TXScaleValue
  readonly __yScaleValue?: TYScaleValue
}

export interface InitializedMark<
  TDatum = unknown,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> {
  id: string
  channels: Readonly<Record<string, MaterializedChannel>>
  render: (context: MarkRenderContext) => MarkScene<TDatum, TXValue, TYValue>
}

export interface MarkScene<
  TDatum = unknown,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> {
  nodes: readonly SceneNode[]
  points?: readonly ChartPoint<TDatum, TXValue, TYValue>[]
}

export interface ChartPoint<
  TDatum = unknown,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> {
  key: string
  markId: string
  group: ChartKey | null
  groupLabel: string
  datum: TDatum
  datumIndex: number
  xValue: TXValue
  yValue: TYValue
  x: number
  y: number
  color: string
}

export interface ChartTick {
  value: ChartValue
  label: string
  position: number
}

export interface SceneStyle {
  fill?: string
  fillOpacity?: number
  stroke?: string
  strokeOpacity?: number
  strokeWidth?: number
  opacity?: number
  lineCap?: 'butt' | 'round' | 'square'
  lineJoin?: 'arcs' | 'bevel' | 'miter' | 'miter-clip' | 'round'
  strokeDasharray?: string
}

interface SceneNodeBase {
  key: string
  className?: string
  style?: SceneStyle
  ariaHidden?: boolean
}

export interface SceneGroup extends SceneNodeBase {
  kind: 'group'
  children: readonly SceneNode[]
  translateX?: number
  translateY?: number
  clip?: ChartBounds
}

export interface SceneRule extends SceneNodeBase {
  kind: 'rule'
  x1: number
  y1: number
  x2: number
  y2: number
}

export interface ScenePolyline extends SceneNodeBase {
  kind: 'polyline'
  points: readonly (readonly [number, number])[]
  path?: string
}

export interface SceneArea extends SceneNodeBase {
  kind: 'area'
  points: readonly (readonly [number, number])[]
  path?: string
}

export interface SceneDot extends SceneNodeBase {
  kind: 'dot'
  x: number
  y: number
  radius: number
}

export interface SceneRect extends SceneNodeBase {
  kind: 'rect'
  x: number
  y: number
  width: number
  height: number
  radius?: number
}

export interface SceneLabel extends SceneNodeBase {
  kind: 'label'
  x: number
  y: number
  text: string
  anchor?: 'start' | 'middle' | 'end'
  baseline?: 'auto' | 'middle' | 'hanging'
  rotate?: number
  fontSize?: number
  fontWeight?: number
}

export type SceneNode =
  | SceneGroup
  | SceneRule
  | ScenePolyline
  | SceneArea
  | SceneDot
  | SceneRect
  | SceneLabel

export interface ChartScene<
  TDatum = unknown,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> extends ChartSize {
  margin: ChartMargin
  chart: ChartBounds
  nodes: readonly SceneNode[]
  points: readonly ChartPoint<TDatum, TXValue, TYValue>[]
  scales: Readonly<Record<string, ResolvedScale>>
  colors: ResolvedColorScale
  gradients: readonly ChartLinearGradient[]
  theme: ChartTheme
}

export interface RenderChartOptions {
  ariaLabel: string
  ariaDescription?: string
  className?: string
  tabIndex?: number
  idPrefix?: string
}

export type RenderChartSvgOptions = RenderChartOptions

export type ChartSvgRenderer<
  TDatum = unknown,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> = (
  scene: ChartScene<TDatum, TXValue, TYValue>,
  options: RenderChartSvgOptions,
) => string

export interface ChartAnimationOptions {
  duration?: number
  easing?:
    | 'linear'
    | 'ease'
    | 'ease-in'
    | 'ease-out'
    | 'ease-in-out'
    | ((progress: number) => number)
  respectReducedMotion?: boolean
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
  paintFocus: (
    point: ChartPoint<TDatum, TXValue, TYValue> | null,
    points: readonly ChartPoint<TDatum, TXValue, TYValue>[],
  ) => void
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

export interface ChartTooltipOptions<
  TDatum = unknown,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> {
  className?: string
  format?: (point: ChartPoint<TDatum, TXValue, TYValue>) => string
  formatGroup?: (
    points: readonly ChartPoint<TDatum, TXValue, TYValue>[],
  ) => string
  sticky?: boolean
}

export interface ChartFocusStrategy<
  TDatum = unknown,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> {
  resolve: (
    points: readonly ChartPoint<TDatum, TXValue, TYValue>[],
    x: number,
    y: number,
    maxDistance: number,
  ) => readonly ChartPoint<TDatum, TXValue, TYValue>[]
  group: (
    points: readonly ChartPoint<TDatum, TXValue, TYValue>[],
    point: ChartPoint<TDatum, TXValue, TYValue>,
  ) => readonly ChartPoint<TDatum, TXValue, TYValue>[]
  navigation: (
    points: readonly ChartPoint<TDatum, TXValue, TYValue>[],
  ) => readonly ChartPoint<TDatum, TXValue, TYValue>[]
}

export type ChartFocusMode<
  TDatum = unknown,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> = ChartFocusStrategy<TDatum, TXValue, TYValue>

export interface ChartRenderContext<
  TDatum = unknown,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> {
  container: HTMLElement
  svg: SVGSVGElement
  scene: ChartScene<TDatum, TXValue, TYValue>
}

export interface ChartSpatialIndex<
  TDatum = unknown,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> {
  findNearest: (
    x: number,
    y: number,
    maxDistance?: number,
  ) => ChartPoint<TDatum, TXValue, TYValue> | null
}

export type ChartSpatialIndexFactory<
  TDatum = unknown,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> = (
  points: readonly ChartPoint<TDatum, TXValue, TYValue>[],
) => ChartSpatialIndex<TDatum, TXValue, TYValue>

export interface ChartHostCommonOptions<
  TDatum = unknown,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> extends RenderChartSvgOptions {
  height?: number
  aspectRatio?: number
  width?: number
  initialWidth?: number
  maxFocusDistance?: number
  focus?: ChartFocusStrategy<
    NoInfer<TDatum>,
    NoInfer<TXValue>,
    NoInfer<TYValue>
  >
  spatialIndex?: ChartSpatialIndexFactory<TDatum, TXValue, TYValue>
  animate?: boolean | ChartAnimationOptions
  keyboard?: boolean
  tooltip?: boolean | ChartTooltipOptions<TDatum, TXValue, TYValue>
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
  maxFocusDistance?: number
  focus?: ChartFocusStrategy<
    NoInfer<TDatum>,
    NoInfer<TXValue>,
    NoInfer<TYValue>
  >
  spatialIndex?: ChartSpatialIndexFactory<TDatum, TXValue, TYValue>
  animate?: boolean | ChartAnimationOptions
  keyboard?: boolean
  tooltip?: boolean | ChartTooltipOptions<TDatum, TXValue, TYValue>
  onFocusChange?: (point: ChartPoint<TDatum, TXValue, TYValue> | null) => void
  onFocusGroupChange?: (
    points: readonly ChartPoint<TDatum, TXValue, TYValue>[],
  ) => void
  onSelect?: (point: ChartPoint<TDatum, TXValue, TYValue> | null) => void
  onRender?: (
    context: ChartRendererRenderContext<TDatum, TXValue, TYValue>,
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

export interface ChartRuntime<
  TDatum = unknown,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> {
  render: <TRenderXValue extends TXValue, TRenderYValue extends TYValue>(
    definition: ChartDefinition<TDatum, TRenderXValue, TRenderYValue>,
    size: ChartSize,
    layout?: ChartLayoutOptions,
  ) => ChartScene<TDatum, TRenderXValue, TRenderYValue>
  destroy: () => void
}
