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
  invert?: (position: number) => TValue
  range: (values: Iterable<number>) => ConfiguredScaleLike<TValue>
  ticks?: (count: number) => readonly TValue[]
  tickFormat?: (count: number) => (value: TValue) => string
}

export interface InferableScaleLike<
  TValue extends ChartValue,
> extends ConfiguredScaleLike<TValue> {
  domain: {
    (): readonly TValue[]
    (values: Iterable<TValue>): InferableScaleLike<TValue>
  }
}

export type ChartScaleFactory<TValue extends ChartValue> = Function & {
  readonly copy?: never
  readonly __chartValue?: TValue
}

export type ChartScaleInput<TValue extends ChartValue> =
  TValue extends ChartValue
    ? ConfiguredScaleLike<TValue> | ChartScaleFactory<TValue>
    : never

export interface ChartNumericScaleOptions {
  scale: ChartScaleInput<number>
  nice?: boolean | number
}

export type ChartNumericScale =
  ((value: number) => number) | ChartNumericScaleOptions

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

export type ChannelOutput<TDatum, TChannel, TFallback extends ChartValue> =
  TChannel extends ChannelAccessor<TDatum, infer TValue>
    ? WidenChartValue<NonNullable<TValue>>
    : TChannel extends keyof TDatum
      ? WidenChartValue<NonNullable<TDatum[TChannel]>>
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

export interface ChartMarkStateContext<
  TDatum = unknown,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> {
  datum: TDatum
  index: number
  data: readonly TDatum[]
  point: ChartPoint<TDatum, TXValue, TYValue>
  focus: ChartFocusState<TDatum, TXValue, TYValue>
  pointer: ChartTooltipPosition | null
  matches: (match: ChartFocusMatch) => boolean
}

export type ChartMarkStateValue<TDatum, TValue> =
  TValue | ((context: ChartMarkStateContext<TDatum>) => TValue)

export interface ChartMarkStateStyle<TDatum = unknown> {
  fill?: ChartMarkStateValue<TDatum, string>
  fillOpacity?: ChartMarkStateValue<TDatum, number>
  stroke?: ChartMarkStateValue<TDatum, string>
  strokeOpacity?: ChartMarkStateValue<TDatum, number>
  strokeWidth?: ChartMarkStateValue<TDatum, number>
  opacity?: ChartMarkStateValue<TDatum, number>
  strokeDasharray?: ChartMarkStateValue<TDatum, string>
  r?: ChartMarkStateValue<TDatum, number>
  radius?: ChartMarkStateValue<TDatum, number>
  inset?: ChartMarkStateValue<TDatum, number>
  fontSize?: ChartMarkStateValue<TDatum, number>
  fontWeight?: ChartMarkStateValue<TDatum, number>
  dx?: ChartMarkStateValue<TDatum, number>
  dy?: ChartMarkStateValue<TDatum, number>
  rotate?: ChartMarkStateValue<TDatum, number>
}

export type ChartDotStateStyle<TDatum = unknown> = Pick<
  ChartMarkStateStyle<TDatum>,
  | 'fill'
  | 'fillOpacity'
  | 'stroke'
  | 'strokeOpacity'
  | 'strokeWidth'
  | 'opacity'
  | 'r'
>

export type ChartBarStateStyle<TDatum = unknown> = Pick<
  ChartMarkStateStyle<TDatum>,
  | 'fill'
  | 'fillOpacity'
  | 'stroke'
  | 'strokeWidth'
  | 'opacity'
  | 'radius'
  | 'inset'
>

export type ChartRectStateStyle<TDatum = unknown> = ChartBarStateStyle<TDatum>

export type ChartLineStateStyle<TDatum = unknown> = Pick<
  ChartMarkStateStyle<TDatum>,
  'stroke' | 'strokeOpacity' | 'strokeWidth' | 'strokeDasharray' | 'opacity'
>

export type ChartAreaStateStyle<TDatum = unknown> = Pick<
  ChartMarkStateStyle<TDatum>,
  | 'fill'
  | 'fillOpacity'
  | 'stroke'
  | 'strokeOpacity'
  | 'strokeWidth'
  | 'opacity'
>

export type ChartTextStateStyle<TDatum = unknown> = Pick<
  ChartMarkStateStyle<TDatum>,
  | 'fill'
  | 'fillOpacity'
  | 'stroke'
  | 'strokeWidth'
  | 'opacity'
  | 'fontSize'
  | 'fontWeight'
  | 'dx'
  | 'dy'
  | 'rotate'
>

export interface ChartMarkStateSelector {
  focus: ChartFocusMatch | 'unmatched'
  source?: ChartFocusSource | readonly ChartFocusSource[]
  pinned?: boolean
}

export interface ChartMarkState<
  TDatum = unknown,
  TStyle extends ChartMarkStateStyle<TDatum> = ChartMarkStateStyle<TDatum>,
> {
  when:
    | ChartMarkStateSelector
    | ((context: ChartMarkStateContext<TDatum>) => boolean)
  style: TStyle
  transition?: ChartMarkStateTransition
}

export type ChartMarkStateTransition = ChartMotionTransition & {
  respectReducedMotion?: boolean
}

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

export interface ChartAxisTickOptions<TValue extends ChartValue = any> {
  /** Preferred semantic candidate count. The scale may choose a nearby count. */
  count?: number
  /** Preferred pixels between semantic candidates. */
  spacing?: number
  /** Exact semantic candidates. */
  values?: readonly TValue[]
  /** Length of the visible tick stub in pixels. */
  size?: number
  /** Gap between the tick stub and label in pixels. */
  padding?: number
  format?: (value: TValue) => string
  motion?: ChartMotionDefinition
}

export interface ChartAxisTickLabelThinOptions<
  TValue extends ChartValue = any,
> {
  minGap?: number
  priority?: 'ends'
  /** Values whose labels must remain visible even when they collide. */
  keep?: readonly TValue[]
}

export interface ChartAxisTickLabelContext<
  TValue extends ChartValue = ChartValue,
> {
  /** Semantic tick value. */
  value: TValue
  /** Candidate index before collision-aware thinning. */
  index: number
  /** Resolved scale position at the center of the tick. */
  position: number
  /** Resolved band width, or zero for a continuous scale. */
  bandwidth: number
}

export type ChartAxisTickLabelValue<TValue extends ChartValue, TOutput> =
  | TOutput
  | ((context: ChartAxisTickLabelContext<TValue>) => TOutput | undefined)

export interface ChartAxisTickLabelOptions<TValue extends ChartValue = any> {
  rotate?: number
  thin?: boolean | ChartAxisTickLabelThinOptions<TValue>
  fontSize?: ChartAxisTickLabelValue<TValue, number>
  fontWeight?: ChartAxisTickLabelValue<TValue, number>
  opacity?: ChartAxisTickLabelValue<TValue, number>
  anchor?: ChartAxisTickLabelValue<TValue, 'start' | 'middle' | 'end'>
  dx?: ChartAxisTickLabelValue<TValue, number>
  dy?: ChartAxisTickLabelValue<TValue, number>
  motion?: ChartMotionDefinition
}

export interface ChartAxisLabelOptions {
  text: string
  offset?: number | 'auto'
  motion?: ChartMotionDefinition
}

export interface ChartAxisPresentationOptions<TValue extends ChartValue = any> {
  line?: boolean
  ticks?: false | ChartAxisTickOptions<TValue>
  tickLabels?: false | ChartAxisTickLabelOptions<TValue>
  label?: string | ChartAxisLabelOptions
  motion?: ChartMotionDefinition
}

export interface ChartAxisOptions<TValue extends ChartValue = any> {
  /**
   * A D3 scale factory infers its domain from materialized mark channels.
   * A scale instance retains its configured domain.
   */
  scale: ChartScale | ChartScaleInput<TValue>
  /** Applies D3 nicening after an inferred or configured domain is resolved. */
  nice?: boolean | number
  reverse?: boolean
  /** Grid lines use semantic tick candidates before label thinning. */
  grid?: boolean
  /** Axis presentation. False keeps the scale but omits the visible axis. */
  axis?: false | ChartAxisPresentationOptions<TValue>
}

export interface ChartColorOptions {
  /**
   * A D3 color-scale factory infers its domain from color channels.
   * A scale instance retains its configured domain.
   */
  scale?: ConfiguredColorScaleLike<any, any> | ChartColorScaleFactory<any, any>
  type?: ChartColorScale
  domain?: readonly ChartKey[]
  range?: readonly string[]
  nice?: boolean | number
  legend?: ChartColorLegend
}

export type ResolvedColorScaleKind =
  'categorical' | 'continuous' | 'quantile' | 'quantize' | 'threshold'

export interface ConfiguredColorScaleLike<TValue extends ChartKey, TOutput> {
  (value: TValue): TOutput
  copy: () => ConfiguredColorScaleLike<TValue, TOutput>
  domain?: () => readonly TValue[]
  range?: () => readonly TOutput[]
}

export interface InferableColorScaleLike<
  TValue extends ChartKey,
  TOutput,
> extends ConfiguredColorScaleLike<TValue, TOutput> {
  domain: {
    (): readonly TValue[]
    (values: Iterable<TValue>): InferableColorScaleLike<TValue, TOutput>
  }
  range: {
    (): readonly TOutput[]
    (values: Iterable<TOutput>): InferableColorScaleLike<TValue, TOutput>
  }
  ticks?: (count: number) => readonly TValue[]
  nice?: (count?: number) => InferableColorScaleLike<TValue, TOutput>
  thresholds?: () => readonly number[]
  quantiles?: (count?: number) => readonly number[]
  invertExtent?: (
    value: TOutput,
  ) => readonly [TValue | undefined, TValue | undefined]
}

export type ChartColorScaleFactory<
  TValue extends ChartKey,
  TOutput,
> = Function & {
  readonly copy?: never
  readonly __chartValue?: TValue
  readonly __chartOutput?: TOutput
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
  bounds: ChartBounds
  theme: ChartTheme
  width: number
  height: number
}

export type ChartLegendPlacement = 'top' | 'bottom'

export interface ChartHostControlExtensionToken {
  readonly id: string
  readonly create: Function
  readonly __chartExtensionType?: 'host-control'
}

export interface ChartHostControl {
  readonly key: string
  readonly extension: ChartHostControlExtensionToken
  readonly fallbackNodeKey?: string
}

export interface ChartBehaviorContext {
  chart: ChartBounds
  scales: Readonly<Record<string, ResolvedScale>>
  colors: ResolvedColorScale
  theme: ChartTheme
  width: number
  height: number
}

export interface ChartBehaviorScene {
  nodes?: readonly SceneNode[]
  controls?: readonly ChartHostControl[]
}

/** Resolves renderer-neutral interaction output after scales and bounds exist. */
export interface ChartBehavior<
  TXValue extends ChartValue = any,
  TYValue extends ChartValue = any,
> {
  readonly id: string
  resolve: (context: ChartBehaviorContext) => ChartBehaviorScene
  readonly __xValue?: TXValue
  readonly __yValue?: TYValue
}

export interface ChartColorLegend {
  placement?: ChartLegendPlacement
  height: (
    itemCount: number,
    width: number,
    colors?: ResolvedColorScale,
  ) => number
  render: (context: ChartColorLegendContext) => SceneNode
  /** Keeps hidden series in scale inference while removing their scene output. */
  seriesVisible?: (value: ChartKey) => boolean
  filterMark?: (
    scene: MarkScene,
    context: { seriesFromColor?: boolean },
  ) => MarkScene
  control?: (context: ChartColorLegendContext) => ChartHostControl
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

interface ChartSpecBase {
  /** Omit all Cartesian axes and grids. */
  guides?: boolean
  color?: ChartColorOptions
  gradients?: readonly ChartLinearGradient[]
  clip?: boolean
  margin?: number | Partial<ChartMargin>
  theme?: Partial<ChartTheme>
}

export type ChartMotionPhase = 'enter' | 'update' | 'exit'

export type ChartMotionRole =
  | 'area'
  | 'arc'
  | 'arrow'
  | 'axis'
  | 'axis-label'
  | 'band'
  | 'bar'
  | 'dot'
  | 'facet'
  | 'frame'
  | 'geo'
  | 'grid'
  | 'hexagon'
  | 'line'
  | 'link'
  | 'mark'
  | 'rect'
  | 'rule'
  | 'text'
  | 'tick'
  | 'tick-label'
  | 'vector'

export interface ChartMotionContext<TDatum = unknown> {
  phase: ChartMotionPhase
  role: ChartMotionRole
  key: string
  markId?: string
  seriesKey: string
  seriesIndex: number
  datumIndex: number
  datumCount: number
  datum: TDatum | undefined
  point: ChartPoint<TDatum> | undefined
  axis?: 'x' | 'y'
}

export interface ChartMotionTweenTransition {
  type: 'tween'
  duration?: number
  easing?: ChartAnimationOptions['easing']
}

export interface ChartMotionSpringTransition {
  type: 'spring'
  stiffness?: number
  damping?: number
  mass?: number
  restSpeed?: number
  restDelta?: number
}

export type ChartMotionTransition =
  ChartMotionTweenTransition | ChartMotionSpringTransition

export interface ChartMotionTiming {
  delay?: number
  transition?: ChartMotionTransition
}

export type ChartMotionDefinition<TDatum = unknown> =
  | ChartMotionTiming
  | ((context: ChartMotionContext<TDatum>) => ChartMotionTiming | undefined)

export interface ChartMarkMotionOptions<TDatum = unknown> {
  motion?: ChartMotionDefinition<TDatum>
}

interface StoredChartSpec extends ChartSpecBase {
  marks: readonly ChartMark<unknown, any, any>[]
  x?: ChartAxisOptions<any> | null
  y?: ChartAxisOptions<any> | null
}

type ChartXSpec<TMarks extends AnyChartMarks> =
  IsAny<ChartMarkScaleX<TMarks[number]>> extends true
    ? { x: ChartXOptionsForMarks<TMarks> | null }
    : [ChartMarkScaleX<TMarks[number]>] extends [never]
      ? { x?: null }
      : { x: ChartXOptionsForMarks<TMarks> }

type ChartYSpec<TMarks extends AnyChartMarks> =
  IsAny<ChartMarkScaleY<TMarks[number]>> extends true
    ? { y: ChartYOptionsForMarks<TMarks> | null }
    : [ChartMarkScaleY<TMarks[number]>] extends [never]
      ? { y?: null }
      : { y: ChartYOptionsForMarks<TMarks> }

type ChartSpecForMarks<TMarks extends AnyChartMarks> = {
  marks: TMarks
} & ChartSpecBase &
  ChartXSpec<TMarks> &
  ChartYSpec<TMarks>

export type ChartSpec<TMarks extends AnyChartMarks | undefined = undefined> = [
  TMarks,
] extends [AnyChartMarks]
  ? ChartSpecForMarks<Extract<TMarks, AnyChartMarks>>
  : StoredChartSpec

export type ChartSelectionSource = 'pointer' | 'keyboard'

export interface ChartSelectionController<
  TDatum = unknown,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> {
  readonly type: 'keyed'
  change: (
    point: ChartPoint<TDatum, TXValue, TYValue> | null,
    source: ChartSelectionSource,
  ) => void
}

export interface ChartDefinitionOptions<
  TDatum = unknown,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> {
  maxFocusDistance?: number
  focus?: ChartFocusMode<NoInfer<TDatum>, NoInfer<TXValue>, NoInfer<TYValue>>
  /** Shows the built-in primary-point focus ring. Defaults to true. */
  focusRing?: boolean
  spatialIndex?: ChartSpatialIndexFactory<TDatum, TXValue, TYValue>
  animate?: boolean | ChartAnimationOptions
  /** Renderer-neutral motion defaults. An optional motion implementation consumes them. */
  motion?: ChartMotionDefinition<NoInfer<TDatum>>
  keyboard?: boolean
  selection?: ChartSelectionController<
    NoInfer<TDatum>,
    NoInfer<TXValue>,
    NoInfer<TYValue>
  >
  behaviors?: readonly ChartBehavior<NoInfer<TXValue>, NoInfer<TYValue>>[]
  tooltip?:
    | false
    | ChartTooltipInput<NoInfer<TDatum>, NoInfer<TXValue>, NoInfer<TYValue>>
}

interface StoredChartDefinitionOptions {
  maxFocusDistance?: number
  focus?: ChartFocusMode<any, any, any>
  focusRing?: boolean
  spatialIndex?: ChartSpatialIndexFactory<any, any, any>
  animate?: boolean | ChartAnimationOptions
  motion?: ChartMotionDefinition<any>
  keyboard?: boolean
  selection?: ChartSelectionController<any, any, any>
  behaviors?: readonly ChartBehavior<any, any>[]
  tooltip?: false | ChartTooltipInput<any, any, any>
}

export interface StaticChartDefinition<
  TDatum = unknown,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
>
  extends StoredChartSpec, StoredChartDefinitionOptions {
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

export type CheckedChartSpec<TSpec extends StoredChartSpec> = TSpec &
  ChartSpec<TSpec['marks']>

export interface DynamicChartConfig<
  TSpec extends StoredChartSpec = StoredChartSpec,
> extends ChartDefinitionOptions<
  ChartSpecDatum<TSpec>,
  ChartSpecXValue<TSpec>,
  ChartSpecYValue<TSpec>
> {
  chart: (context: ChartBuildContext) => CheckedChartSpec<TSpec>
}

export interface DynamicChartDefinition<
  TDatum = unknown,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> extends StoredChartDefinitionOptions {
  chart: (context: ChartBuildContext) => StoredChartSpec
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

export type ChartSpecDatum<TSpec extends StoredChartSpec> =
  '__datum' extends keyof TSpec
    ? TSpec extends { readonly __datum?: infer TDatum }
      ? TDatum
      : never
    : ChartMarkDatum<TSpec['marks'][number]>

export type ChartSpecXValue<TSpec extends StoredChartSpec> =
  '__xValue' extends keyof TSpec
    ? TSpec extends {
        readonly __xValue?: infer TXValue extends ChartValue
      }
      ? TXValue
      : never
    : ChartMarkPointX<TSpec['marks'][number]>

export type ChartSpecYValue<TSpec extends StoredChartSpec> =
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
  invert?: (position: number) => ChartValue
  ticks: readonly ChartTick[]
  bandwidth: number
}

export interface ResolvedColorScale {
  type: string
  kind?: ResolvedColorScaleKind
  domain: readonly ChartKey[]
  range: readonly string[]
  /** Exact interior legend boundaries for a custom stepped scale. */
  thresholds?: readonly number[]
  map: (value: ChartKey | null | undefined) => string
}

export interface MarkRenderContext {
  markIndex: number
  chart: ChartBounds
  scales: Readonly<Record<string, ResolvedScale>>
  theme: ChartTheme
  color: (value: ChartKey | null | undefined) => string
  colors: ResolvedColorScale
  layout: ChartLayoutOptions
}

/**
 * Final positional scale and plot geometry available to a mark-local layout.
 *
 * A layout may run more than once while automatic margins converge. It must be
 * synchronous, pure, and deterministic. Positional scale domains come only
 * from the channels returned by `initialize`; layout-resolved channels may
 * contribute to non-positional scales such as color.
 */
export interface MarkResolvedLayoutContext {
  markIndex: number
  chart: ChartBounds
  scales: Readonly<Record<string, ResolvedScale>>
  theme: ChartTheme
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
  motion?: ChartMotionDefinition<any>
  readonly __xValue?: TXPointValue
  readonly __yValue?: TYPointValue
  readonly __xScaleValue?: TXScaleValue
  readonly __yScaleValue?: TYScaleValue
}

interface InitializedMarkBase<
  TDatum = unknown,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> {
  id: string
  channels: Readonly<Record<string, MaterializedChannel>>
  /** Scene-local motion policy resolved while this mark is initialized. */
  motion?: ChartMotionDefinition<any>
  /** The mark uses a discrete color channel as inferred series identity. */
  seriesFromColor?: boolean
  focus?: ChartFocusFilter
  states?: {
    data: readonly unknown[]
    definitions: readonly ChartMarkState<any>[]
  }
  /** Optional final mark-scene pass after chart-level domain-dependent filters. */
  postDomain?: (scene: MarkScene<any, any, any>) => MarkScene<any, any, any>
  layoutLabels?: (context: MarkRenderContext) => readonly SceneLabel[]
}

export interface ResolvedMarkLayout<
  TDatum = unknown,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> {
  /**
   * Final channels used by non-positional scale inference. When omitted, the
   * initialized channels are retained. These channels never re-domain x or y.
   */
  channels?: Readonly<Record<string, MaterializedChannel>>
  states?: {
    data: readonly unknown[]
    definitions: readonly ChartMarkState<any>[]
  }
  postDomain?: (scene: MarkScene<any, any, any>) => MarkScene<any, any, any>
  layoutLabels?: (context: MarkRenderContext) => readonly SceneLabel[]
  render: (context: MarkRenderContext) => MarkScene<TDatum, TXValue, TYValue>
}

export interface InitializedMark<
  TDatum = unknown,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> extends InitializedMarkBase<TDatum, TXValue, TYValue> {
  render: (context: MarkRenderContext) => MarkScene<TDatum, TXValue, TYValue>
  resolveLayout?: (
    context: MarkResolvedLayoutContext,
  ) => ResolvedMarkLayout<TDatum, TXValue, TYValue>
}

export interface ResolvedLayoutMarkInitialization<
  TDatum = unknown,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> extends InitializedMarkBase<TDatum, TXValue, TYValue> {
  render?: never
  resolveLayout: (
    context: MarkResolvedLayoutContext,
  ) => ResolvedMarkLayout<TDatum, TXValue, TYValue>
}

export type MarkInitialization<
  TDatum = unknown,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> =
  | InitializedMark<TDatum, TXValue, TYValue>
  | ResolvedLayoutMarkInitialization<TDatum, TXValue, TYValue>

export interface MarkScene<
  TDatum = unknown,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> {
  nodes: readonly SceneNode[]
  points?: readonly ChartPoint<TDatum, TXValue, TYValue>[]
}

export type ChartFocusAffinity = 'x' | 'y' | 'xy' | 'geometry'

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
  x1Value?: ChartValue
  x2Value?: ChartValue
  y1Value?: ChartValue
  y2Value?: ChartValue
  xInterval?: 'range' | 'difference'
  yInterval?: 'range' | 'difference'
  x: number
  y: number
  color: string
}

/** Semantic focus data attached to the scene primitive that paints it. */
export type SceneInteraction =
  | {
      point: ChartPoint
      points?: never
      /** Natural pointer fallback after exact geometry containment. */
      affinity?: ChartFocusAffinity
    }
  | {
      point?: never
      points: readonly ChartPoint[]
      /** Natural pointer fallback after exact geometry containment. */
      affinity?: ChartFocusAffinity
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
  /** Point ownership for decorative geometry; does not make the node interactive. */
  pointOwner?: ChartPoint
}

interface InteractiveSceneNodeBase extends SceneNodeBase {
  /** Interaction semantics for this primitive's rendered geometry. */
  interaction?: SceneInteraction
}

export interface SceneGroup extends SceneNodeBase {
  kind: 'group'
  children: readonly SceneNode[]
  translateX?: number
  translateY?: number
  clip?: ChartBounds
  /** Point slot owned by this subtree inside an enclosing focus candidate tree. */
  focusCandidateIndex?: number
  focus?: {
    match: ChartFocusMatch
    points: readonly ChartPoint[]
    placement: 'under' | 'over'
    /** Keeps candidate geometry out of paint until focus resolves it. */
    retarget?: boolean
    /** Renderer-neutral source geometry for a retargeting focus layer. */
    candidates?: readonly SceneNode[]
    /** Focus points represented by the currently selected children. */
    activePoints?: readonly ChartPoint[]
  }
  states?: {
    data: readonly unknown[]
    definitions: readonly ChartMarkState<any>[]
    points: readonly ChartPoint[]
  }
}

export interface SceneRule extends InteractiveSceneNodeBase {
  kind: 'rule'
  x1: number
  y1: number
  x2: number
  y2: number
}

export interface ScenePolyline extends InteractiveSceneNodeBase {
  kind: 'polyline'
  points: readonly (readonly [number, number])[]
  path?: string
}

/** One closed area boundary. The first ring in a polygon is its exterior. */
export type ScenePolygonRing = readonly (readonly [number, number])[]

/** One polygon expressed as an exterior ring followed by zero or more holes. */
export type ScenePolygon = readonly ScenePolygonRing[]

export interface SceneArea extends InteractiveSceneNodeBase {
  kind: 'area'
  points: readonly (readonly [number, number])[]
  /** Structured disconnected polygons. When present, this is the rendered geometry. */
  polygons?: readonly ScenePolygon[]
  path?: string
}

export interface SceneDot extends InteractiveSceneNodeBase {
  kind: 'dot'
  x: number
  y: number
  radius: number
}

export interface SceneRect extends InteractiveSceneNodeBase {
  kind: 'rect'
  x: number
  y: number
  width: number
  height: number
  radius?: number
  /** Applied inset retained for absolute inline-state overrides. */
  inset?: number
  /** Axes affected by `inset`; bars use only their categorical axis. */
  insetAxis?: 'x' | 'y' | 'xy'
  /** Categorical size ceiling retained while resolving inline-state insets. */
  maxThickness?: number
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
  controls?: readonly ChartHostControl[]
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
  resize?: boolean
}

export interface ChartTooltipOptions<
  TDatum = unknown,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> {
  className?: string
  portal?: ChartTooltipPortalInput
  items?: readonly ChartTooltipItem<TDatum, TXValue, TYValue>[]
  sort?: ChartTooltipSort<TDatum, TXValue, TYValue>
  anchor?: ChartTooltipAnchor<TDatum, TXValue, TYValue>
  placement?: 'auto' | ChartTooltipPlacement | readonly ChartTooltipPlacement[]
  offset?: number
  content?: (
    points: readonly ChartPoint<TDatum, TXValue, TYValue>[],
    context: ChartTooltipContentContext,
  ) => ChartTooltipContent
  format?: (point: ChartPoint<TDatum, TXValue, TYValue>) => string
  formatGroup?: (
    points: readonly ChartPoint<TDatum, TXValue, TYValue>[],
  ) => string
  sticky?: boolean
  visibility?: 'focus' | 'pinned'
}

export type ChartExtensionInput<TExtension, TOptions> =
  TExtension | ({ use: TExtension } & TOptions)

export interface ChartTooltipExtensionToken {
  readonly id: string
  readonly create: Function
  readonly __chartExtensionType?: 'tooltip'
}

export type ChartTooltipInput<
  TDatum = unknown,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> = ChartExtensionInput<
  ChartTooltipExtensionToken,
  ChartTooltipOptions<TDatum, TXValue, TYValue>
>

export type ChartTooltipPortalOptions = Record<never, never>

export interface ChartTooltipPortalExtensionToken {
  readonly id: string
  readonly create: Function
  readonly __chartExtensionType?: 'tooltip-portal'
}

export type ChartTooltipPortalInput = ChartExtensionInput<
  ChartTooltipPortalExtensionToken,
  ChartTooltipPortalOptions
>

export type ChartTooltipPlacement =
  | 'top'
  | 'top-right'
  | 'right'
  | 'bottom-right'
  | 'bottom'
  | 'bottom-left'
  | 'left'
  | 'top-left'

export interface ChartTooltipPosition {
  x: number
  y: number
}

export type ChartFocusSource =
  'pointer' | 'keyboard' | 'programmatic' | 'restored'

export interface ChartFocusState<
  TDatum = unknown,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> {
  primary: ChartPoint<TDatum, TXValue, TYValue>
  group: readonly ChartPoint<TDatum, TXValue, TYValue>[]
  source: ChartFocusSource
  pinned: boolean
}

export type ChartFocusMatch = 'primary' | 'group' | 'key' | 'x' | 'y' | 'series'

export interface ChartFocusFilter {
  match?: ChartFocusMatch
  /**
   * Keeps only the current focus selection in the rendered scene and gives it
   * stable structural keys so ordinary renderer motion can retarget it.
   */
  retarget?: boolean
}

export type ChartTooltipXAnchor =
  | 'point'
  | 'pointer'
  | 'value'
  | 'group-center'
  | 'plot-left'
  | 'plot-center'
  | 'plot-right'

export type ChartTooltipYAnchor =
  | 'point'
  | 'pointer'
  | 'value'
  | 'group-center'
  | 'plot-top'
  | 'plot-center'
  | 'plot-bottom'

export interface ChartTooltipAxisAnchor {
  x: ChartTooltipXAnchor
  y: ChartTooltipYAnchor
}

export interface ChartTooltipAnchorContext<
  TDatum = unknown,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> {
  focus: ChartFocusState<TDatum, TXValue, TYValue>
  pointer: ChartTooltipPosition | null
  plot: ChartBounds
  surface: ChartSize
  scales: Readonly<Record<string, ResolvedScale>>
}

export type ChartTooltipAnchor<
  TDatum = unknown,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> =
  | 'point'
  | 'pointer'
  | 'group-center'
  | ChartTooltipAxisAnchor
  | ((
      points: readonly ChartPoint<TDatum, TXValue, TYValue>[],
      context: ChartTooltipAnchorContext<TDatum, TXValue, TYValue>,
    ) => ChartTooltipPosition | null | undefined)

export type ChartTooltipSort<
  TDatum = unknown,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> =
  | 'visual'
  | 'color-domain'
  | 'focus'
  | ((
      left: ChartPoint<TDatum, TXValue, TYValue>,
      right: ChartPoint<TDatum, TXValue, TYValue>,
    ) => number)

export type ChartTooltipItem<
  TDatum = unknown,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> =
  | 'x'
  | 'y'
  | 'group'
  | ChartTooltipChannelItem<TDatum, TXValue, TYValue>
  | ChartTooltipDatumItem<TDatum, TXValue, TYValue>
  | ChartTooltipDerivedItem<TDatum, TXValue, TYValue>

export interface ChartTooltipItemBase<
  TDatum = unknown,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> {
  label?: string
  text?: (
    point: ChartPoint<TDatum, TXValue, TYValue>,
    context: ChartTooltipContentContext,
  ) => string | null | undefined
}

type ChartTooltipScalarDatumKey<TDatum> = {
  [TKey in keyof TDatum]-?: NonNullable<TDatum[TKey]> extends ChartValue
    ? TKey
    : never
}[keyof TDatum] &
  string

export interface ChartTooltipChannelItem<
  TDatum = unknown,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> extends ChartTooltipItemBase<TDatum, TXValue, TYValue> {
  channel: 'x' | 'y' | 'group'
}

export interface ChartTooltipDatumItem<
  TDatum = unknown,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> extends ChartTooltipItemBase<TDatum, TXValue, TYValue> {
  field: ChartTooltipScalarDatumKey<TDatum>
}

export interface ChartTooltipDerivedItem<
  TDatum = unknown,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> extends ChartTooltipItemBase<TDatum, TXValue, TYValue> {
  id: string
  text: (
    point: ChartPoint<TDatum, TXValue, TYValue>,
    context: ChartTooltipContentContext,
  ) => string | null | undefined
}

export interface ChartTooltipContent {
  title?: string
  color?: string
  rows: readonly ChartTooltipRow[]
}

export interface ChartTooltipContentContext {
  xLabel: string
  yLabel: string
  formatX: (value: ChartValue) => string
  formatY: (value: ChartValue) => string
}

export interface ChartTooltipRow {
  label: string
  value: string
  color?: string
}

export interface ChartTooltipBodyContext<
  TDatum = unknown,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> {
  points: readonly ChartPoint<TDatum, TXValue, TYValue>[]
  content: ChartTooltipContent | string
  pinned: boolean
  dismiss: () => void
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

export type ChartFocusPreset =
  'nearest' | 'nearest-x' | 'nearest-y' | 'group-x' | 'group-y'

export type ChartFocusMode<
  TDatum = unknown,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> = ChartFocusPreset | ChartFocusStrategy<TDatum, TXValue, TYValue>

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
  scene: ChartScene<TDatum, TXValue, TYValue>,
) => ChartSpatialIndex<TDatum, TXValue, TYValue>

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
