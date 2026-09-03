export type ChartValue = number | string | Date
export type ChartKey = string | number

export interface ChartCurve {
  id: string
  path: (points: readonly (readonly [number, number])[]) => string
}

export interface ChartScaleTransform {
  id: string
  defaultDomain?: readonly [number, number]
  filter?: (value: number) => boolean
  validate?: (domain: readonly [number, number]) => void
  forward: (value: number) => number
  inverse: (value: number) => number
  ticks?: (
    domain: readonly [number, number],
    transformedDomain: readonly [number, number],
    count: number,
  ) => readonly number[]
  resolve?: (context: {
    domain: readonly [number, number]
    range: readonly [number, number]
    clamp: boolean
    tickCount: number
  }) => {
    map: (value: number) => number
    ticks: readonly number[]
  }
}

export type ChannelAccessor<TDatum, TValue> = (
  datum: TDatum,
  index: number,
  data: readonly TDatum[],
) => TValue

export type Channel<TDatum, TValue> =
  Extract<keyof TDatum, string> | ChannelAccessor<TDatum, TValue>

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

export interface ChartAxisOptions {
  type?: 'linear' | 'band' | 'point' | ChartScaleTransform
  domain?: readonly ChartValue[]
  ticks?: number
  format?: (value: ChartValue) => string
  grid?: boolean
  label?: string
  nice?: boolean
  zero?: boolean
  padding?: number
  reverse?: boolean
  clamp?: boolean
  locale?: string | readonly string[]
  timeZone?: string
  tickRotate?: number
  labelOffset?: number
}

export interface ChartColorOptions {
  type?: ChartColorScale
  domain?: readonly ChartKey[]
  range?: readonly string[]
  legend?: ChartColorLegend
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

export interface ChartSpec<
  TMarks extends readonly ChartMark<unknown>[] = readonly ChartMark<unknown>[],
> {
  marks: TMarks
  guides?: boolean
  x?: ChartAxisOptions
  y?: ChartAxisOptions
  color?: ChartColorOptions
  gradients?: readonly ChartLinearGradient[]
  clip?: boolean
  margin?: number | Partial<ChartMargin>
  theme?: Partial<ChartTheme>
}

export interface StaticChartDefinition<TDatum = unknown> extends Omit<
  ChartSpec,
  'marks'
> {
  marks: readonly ChartMark<unknown>[]
  readonly __datum?: TDatum
}

export interface ChartBuildContext<TInput, TPrepared = TInput> {
  input: TInput
  prepared: TPrepared
  width: number
  height: number
  theme: ChartTheme
}

export interface ChartPrepareContext {
  signal: AbortSignal
}

export interface ResponsiveChartConfig<
  TInput,
  TPrepared,
  TMarks extends readonly ChartMark<unknown>[] = readonly ChartMark<unknown>[],
> {
  chart: (context: ChartBuildContext<TInput, TPrepared>) => ChartSpec<TMarks>
  prepare?: (input: TInput, context: ChartPrepareContext) => TPrepared
  inputEqual?: (previous: TInput, next: TInput) => boolean
  prepareEqual?: (previous: TInput, next: TInput) => boolean
}

export interface ResponsiveChartDefinition<
  TInput = unknown,
  TPrepared = TInput,
  TDatum = unknown,
> {
  chart: (context: ChartBuildContext<TInput, TPrepared>) => ChartSpec
  prepare?: (input: TInput, context: ChartPrepareContext) => TPrepared
  inputEqual?: (previous: TInput, next: TInput) => boolean
  prepareEqual?: (previous: TInput, next: TInput) => boolean
  readonly __datum?: TDatum
}

export type ChartDefinition<
  TDatum = unknown,
  TInput = undefined,
  TPrepared = TInput,
> =
  | StaticChartDefinition<TDatum>
  | ResponsiveChartDefinition<TInput, TPrepared, TDatum>

export type ChartMarkDatum<TMark> =
  TMark extends ChartMark<infer TDatum> ? TDatum : never

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
}

export interface ChartMark<TDatum = unknown> {
  initialize: (context: MarkInitializeContext) => InitializedMark<TDatum>
}

export interface InitializedMark<TDatum = unknown> {
  id: string
  channels: Readonly<Record<string, MaterializedChannel>>
  render: (context: MarkRenderContext) => MarkScene<TDatum>
}

export interface MarkScene<TDatum = unknown> {
  nodes: readonly SceneNode[]
  points?: readonly ChartPoint<TDatum>[]
}

export interface ChartPoint<TDatum = unknown> {
  key: string
  markId: string
  group: ChartKey | null
  groupLabel: string
  datum: TDatum
  datumIndex: number
  xValue: ChartValue
  yValue: ChartValue
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

export interface ChartScene<TDatum = unknown> extends ChartSize {
  margin: ChartMargin
  chart: ChartBounds
  nodes: readonly SceneNode[]
  points: readonly ChartPoint<TDatum>[]
  scales: Readonly<Record<string, ResolvedScale>>
  colors: ResolvedColorScale
  gradients: readonly ChartLinearGradient[]
  theme: ChartTheme
}

export interface RenderChartSvgOptions {
  ariaLabel: string
  ariaDescription?: string
  className?: string
  tabIndex?: number
  idPrefix?: string
}

export type ChartSvgRenderer = (
  scene: ChartScene,
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

export interface ChartTooltipOptions<TDatum = unknown> {
  className?: string
  format?: (point: ChartPoint<TDatum>) => string
  formatGroup?: (points: readonly ChartPoint<TDatum>[]) => string
}

export interface ChartFocusStrategy {
  resolve: <TDatum>(
    points: readonly ChartPoint<TDatum>[],
    x: number,
    y: number,
    maxDistance: number,
  ) => readonly ChartPoint<TDatum>[]
  group: <TDatum>(
    points: readonly ChartPoint<TDatum>[],
    point: ChartPoint<TDatum>,
  ) => readonly ChartPoint<TDatum>[]
  navigation: <TDatum>(
    points: readonly ChartPoint<TDatum>[],
  ) => readonly ChartPoint<TDatum>[]
}

export type ChartFocusMode = ChartFocusStrategy

export interface ChartRenderContext<TDatum = unknown> {
  container: HTMLElement
  svg: SVGSVGElement
  scene: ChartScene<TDatum>
}

export interface ChartSpatialIndex<TDatum = unknown> {
  findNearest: (
    x: number,
    y: number,
    maxDistance?: number,
  ) => ChartPoint<TDatum> | null
}

export type ChartSpatialIndexFactory<TDatum = unknown> = (
  points: readonly ChartPoint<TDatum>[],
) => ChartSpatialIndex<TDatum>

export interface ChartHostOptions<
  TDatum = unknown,
  TInput = undefined,
> extends RenderChartSvgOptions {
  definition: ChartDefinition<TDatum, TInput, any>
  input?: TInput
  height?: number
  aspectRatio?: number
  width?: number
  initialWidth?: number
  maxFocusDistance?: number
  focus?: ChartFocusStrategy
  spatialIndex?: ChartSpatialIndexFactory<TDatum>
  svgAnimation?: boolean | ChartAnimationOptions
  keyboard?: boolean
  tooltip?: boolean | ChartTooltipOptions<TDatum>
  onFocusChange?: (point: ChartPoint<TDatum> | null) => void
  onFocusGroupChange?: (points: readonly ChartPoint<TDatum>[]) => void
  onSelect?: (point: ChartPoint<TDatum> | null) => void
  onRender?: (context: ChartRenderContext<TDatum>) => void
  renderSvg?: ChartSvgRenderer
}

export interface ChartHost<TDatum = unknown, TInput = undefined> {
  update: (options: ChartHostOptions<TDatum, TInput>) => void
  getScene: () => ChartScene<TDatum>
  destroy: () => void
}

export interface ChartRuntime<TDatum = unknown, TInput = undefined> {
  render: (
    definition: ChartDefinition<TDatum, TInput, any>,
    input: TInput,
    size: ChartSize,
  ) => ChartScene<TDatum>
  destroy: () => void
}
