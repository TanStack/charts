import { createColorScale, valueKey } from './scales'
import { resolveConfiguredScale } from './configured-scale'
import {
  axisPlacement,
  measureSceneLabelBounds,
  withChartTextTypography,
  type AxisPlacement,
} from './guide-layout'
import { nearestScenePoint } from './nearest'
import { mapScenePointReferences } from './scene-point-map'
import { chartSceneSource } from './scene-source'
import type {
  ResponsiveChartDefinition,
  InitializedMark,
  MaterializedChannel,
  ChartAxisOptions,
  ChartAxisPresentationOptions,
  ChartAxisSide,
  ChartAxisTickLabelContext,
  ChartAxisTickLabelOptions,
  ChartAxisTickLabelValue,
  ChartBounds,
  ChartBuildContext,
  ChartHostControl,
  CheckedChartSpec,
  ChartDefinitionOptions,
  ChartDefinition,
  ResponsiveChartConfig,
  ChartColorLegend,
  ChartFocusFilter,
  ChartLayoutOptions,
  ChartMargin,
  ChartMark,
  ChartMarkDatum,
  ChartMarkPointX,
  ChartMarkPointY,
  ChartMarkState,
  ChartPoint,
  SceneFocusGuide,
  SceneFocusGuideAxis,
  ResolvedColorScale,
  ChartScene,
  ChartScaleResolver,
  ChartSize,
  ChartSpec,
  ChartSpecDatum,
  ChartSpecXValue,
  ChartSpecYValue,
  StaticChartDefinition,
  ChartTheme,
  ChartTextMeasurer,
  ChartTick,
  ChartValue,
  MarkRenderContext,
  MarkResolvedLayoutContext,
  MarkScene,
  SceneGroup,
  SceneLabel,
  SceneNode,
} from './types'

export const defaultChartTheme: ChartTheme = {
  foreground: 'currentColor',
  muted: 'currentColor',
  grid: 'currentColor',
  background: 'transparent',
  palette: [
    'var(--ts-chart-1, #2563eb)',
    'var(--ts-chart-2, #f97316)',
    'var(--ts-chart-3, #10b981)',
    'var(--ts-chart-4, #8b5cf6)',
    'var(--ts-chart-5, #ec4899)',
    'var(--ts-chart-6, #06b6d4)',
  ],
}

type DefinedStaticChart<
  TMarks extends readonly ChartMark<any, any, any>[],
  TSpec extends ChartSpec<TMarks>,
> = Omit<
  StaticChartDefinition<
    ChartMarkDatum<TMarks[number]>,
    ChartMarkPointX<TMarks[number]>,
    ChartMarkPointY<TMarks[number]>
  >,
  keyof ChartDefinitionOptions | keyof ChartSpec
> &
  Omit<TSpec, keyof ChartDefinitionOptions> &
  Pick<
    StaticChartDefinition<
      ChartMarkDatum<TMarks[number]>,
      ChartMarkPointX<TMarks[number]>,
      ChartMarkPointY<TMarks[number]>
    >,
    Exclude<Extract<keyof TSpec, keyof ChartDefinitionOptions>, 'tooltip'>
  > &
  Pick<TSpec, Extract<keyof TSpec, 'tooltip'>>

type ChartDefinitionDatum<TDefinition> =
  TDefinition extends ChartDefinition<infer TDatum, any, any> ? TDatum : never

type ChartDefinitionXValue<TDefinition> =
  TDefinition extends ChartDefinition<any, infer TXValue, any> ? TXValue : never

type ChartDefinitionYValue<TDefinition> =
  TDefinition extends ChartDefinition<any, any, infer TYValue> ? TYValue : never

type ChartDefinitionWithOptions<TDefinition, TOptions> = Omit<
  TDefinition,
  keyof TOptions
> &
  TOptions

type DefinedResponsiveChart<
  TSpec extends {
    marks: readonly ChartMark<any, any, any>[]
    x?: ChartAxisOptions<any> | null
    y?: ChartAxisOptions<any> | null
  },
> = Omit<
  ResponsiveChartDefinition<
    ChartSpecDatum<TSpec>,
    ChartSpecXValue<TSpec>,
    ChartSpecYValue<TSpec>
  >,
  keyof ChartDefinitionOptions
> & {
  chart: (context: ChartBuildContext) => CheckedChartSpec<TSpec>
}

export function defineChart<
  const TMarks extends readonly ChartMark<any, any, any>[],
  const TSpec extends ChartSpec<TMarks>,
>(
  spec: TSpec & { marks: TMarks } & ChartDefinitionOptions<
      ChartMarkDatum<TMarks[number]>,
      ChartMarkPointX<TMarks[number]>,
      ChartMarkPointY<TMarks[number]>
    >,
): DefinedStaticChart<TMarks, TSpec>
export function defineChart<
  const TSpec extends {
    marks: readonly ChartMark<any, any, any>[]
    x?: ChartAxisOptions<any> | null
    y?: ChartAxisOptions<any> | null
  },
  TTooltipHost extends string = never,
>(
  config: ResponsiveChartConfig<TSpec, TTooltipHost>,
): Omit<
  ResponsiveChartDefinition<
    ChartSpecDatum<TSpec>,
    ChartSpecXValue<TSpec>,
    ChartSpecYValue<TSpec>
  >,
  keyof ChartDefinitionOptions
> &
  ResponsiveChartConfig<TSpec, TTooltipHost>
export function defineChart<
  const TSpec extends {
    marks: readonly ChartMark<any, any, any>[]
    x?: ChartAxisOptions<any> | null
    y?: ChartAxisOptions<any> | null
  },
>(
  chart: (context: ChartBuildContext) => CheckedChartSpec<TSpec>,
): DefinedResponsiveChart<TSpec>
export function defineChart<
  const TMarks extends readonly ChartMark<any, any, any>[],
  const TSpec extends ChartSpec<TMarks>,
  const TOptions extends ChartDefinitionOptions<
    ChartMarkDatum<TMarks[number]>,
    ChartMarkPointX<TMarks[number]>,
    ChartMarkPointY<TMarks[number]>
  >,
>(
  spec: TSpec & { marks: TMarks } & ChartDefinitionOptions<
      ChartMarkDatum<TMarks[number]>,
      ChartMarkPointX<TMarks[number]>,
      ChartMarkPointY<TMarks[number]>
    >,
  options: TOptions,
): ChartDefinitionWithOptions<DefinedStaticChart<TMarks, TSpec>, TOptions>
export function defineChart<
  const TSpec extends {
    marks: readonly ChartMark<any, any, any>[]
    x?: ChartAxisOptions<any> | null
    y?: ChartAxisOptions<any> | null
  },
  const TOptions extends ChartDefinitionOptions<
    ChartSpecDatum<TSpec>,
    ChartSpecXValue<TSpec>,
    ChartSpecYValue<TSpec>
  >,
>(
  chart: (context: ChartBuildContext) => TSpec,
  options: TOptions,
): ChartDefinitionWithOptions<DefinedResponsiveChart<TSpec>, TOptions>
export function defineChart<
  const TMarks extends readonly ChartMark<any, any, any>[],
  const TSpec extends ChartSpec<TMarks>,
  const TOptions extends ChartDefinitionOptions<
    ChartMarkDatum<TMarks[number]>,
    ChartMarkPointX<TMarks[number]>,
    ChartMarkPointY<TMarks[number]>
  >,
>(
  config: {
    chart: (context: ChartBuildContext) => TSpec & { marks: TMarks }
  },
  options: TOptions,
): ChartDefinitionWithOptions<
  DefinedResponsiveChart<TSpec & { marks: TMarks }>,
  TOptions
>
export function defineChart<
  const TDefinition extends StaticChartDefinition<any, any, any>,
  const TOptions extends ChartDefinitionOptions<
    ChartDefinitionDatum<TDefinition>,
    ChartDefinitionXValue<TDefinition>,
    ChartDefinitionYValue<TDefinition>
  >,
>(
  definition: TDefinition,
  options: TOptions,
): ChartDefinitionWithOptions<NoInfer<TDefinition>, NoInfer<TOptions>>
export function defineChart<
  const TDefinition extends ResponsiveChartDefinition<any, any, any>,
  const TOptions extends ChartDefinitionOptions<
    ChartDefinitionDatum<TDefinition>,
    ChartDefinitionXValue<TDefinition>,
    ChartDefinitionYValue<TDefinition>
  >,
>(
  definition: TDefinition,
  options: TOptions,
): ChartDefinitionWithOptions<NoInfer<TDefinition>, NoInfer<TOptions>>
export function defineChart(definition?: any, options?: any): any {
  if (options) {
    return typeof definition === 'function'
      ? { chart: definition, ...options }
      : { ...definition, ...options }
  }
  return (
    typeof definition === 'function' ? { chart: definition } : definition
  ) as StaticChartDefinition | ResponsiveChartDefinition
}

export function createChartScene<
  TDatum,
  TXValue extends ChartValue,
  TYValue extends ChartValue,
>(
  definition: StaticChartDefinition<TDatum, TXValue, TYValue>,
  size: ChartSize,
  layout: ChartLayoutOptions = {},
): ChartScene<TDatum, TXValue, TYValue> {
  return createChartSceneWithScaleResolver(
    definition,
    size,
    (context) => {
      if (!context.options?.scale) {
        throw new TypeError(
          `Chart scale "${context.id}" requires a configured scale`,
        )
      }
      return resolveSuppliedScale(context.options.scale, context)
    },
    layout,
  )
}

function resolveSuppliedScale(
  scale: NonNullable<ChartAxisOptions['scale']>,
  context: Parameters<ChartScaleResolver>[0],
) {
  if (typeof scale === 'function') return resolveConfiguredScale(scale, context)
  if (context.options?.viewport) {
    throw new TypeError(
      `Chart viewport "${context.id}" requires a configured or inferable continuous scale`,
    )
  }
  return scale.resolve(context)
}

function createChartSceneWithScaleResolver<
  TDatum,
  TXValue extends ChartValue,
  TYValue extends ChartValue,
>(
  definition: StaticChartDefinition<TDatum, TXValue, TYValue>,
  size: ChartSize,
  resolveScale: ChartScaleResolver,
  layout: ChartLayoutOptions,
): ChartScene<TDatum, TXValue, TYValue> {
  const width = finiteSize(size.width)
  const height = finiteSize(size.height)
  const layoutOptions: ChartLayoutOptions = {
    ...layout,
    measureText: withChartTextTypography(layout.measureText, layout.typography),
  }
  const platformTheme: ChartTheme = {
    ...defaultChartTheme,
    ...layoutOptions.defaultTheme,
    palette: layoutOptions.defaultTheme?.palette ?? defaultChartTheme.palette,
  }
  const theme: ChartTheme = {
    ...platformTheme,
    ...definition.theme,
    palette: definition.theme?.palette ?? platformTheme.palette,
  }
  const initialized = definition.marks.map((mark, markIndex) =>
    mark.initialize({ markIndex }),
  )
  const xChannels = collectScaleChannels(initialized, 'x')
  const yChannels = collectScaleChannels(initialized, 'y')
  const axes =
    definition.guides === false
      ? 0
      : +(definition.x != null && definition.x.axis !== false) |
        (+(definition.y != null && definition.y.axis !== false) << 1)
  const resolvedLayout = resolveSceneLayout(
    definition,
    initialized,
    width,
    height,
    theme,
    xChannels,
    yChannels,
    axes,
    resolveScale,
    layoutOptions,
  )
  const {
    margin,
    chart,
    scales,
    axes: axisNodes,
    marks,
    colors,
    legend,
    legendBounds,
  } = resolvedLayout
  const markEntries: ViewportMarkEntry[] = []
  const defaultFocusEntries: DefaultFocusEntry<TDatum, TXValue, TYValue>[] = []
  const points: ChartPoint<TDatum, TXValue, TYValue>[] = []
  const translateX = scales.x.viewport?.translate ?? 0
  const translateY = scales.y.viewport?.translate ?? 0
  const focusGuides: SceneFocusGuide[] = []
  const xAxisSide = axisPresentation(definition.x)?.side
  const yAxisSide = axisPresentation(definition.y)?.side
  const firstBaseMarkIndex = marks.findIndex(
    (mark) => !mark.focus && !mark.focusGuideOnly,
  )

  marks.forEach((mark, markIndex) => {
    const viewportX = Boolean(
      scales.x.viewport && markUsesViewportAxis(mark, 'x'),
    )
    const viewportY = Boolean(
      scales.y.viewport && markUsesViewportAxis(mark, 'y'),
    )
    const pointMap = new Map<ChartPoint, ChartPoint<TDatum, TXValue, TYValue>>()
    const presentPoint = (
      point: ChartPoint,
    ): ChartPoint<TDatum, TXValue, TYValue> => {
      const existing = pointMap.get(point)
      if (existing) return existing
      const presented = (
        viewportX || viewportY
          ? {
              ...point,
              x: point.x + (viewportX ? translateX : 0),
              y: point.y + (viewportY ? translateY : 0),
            }
          : point
      ) as ChartPoint<TDatum, TXValue, TYValue>
      pointMap.set(point, presented)
      return presented
    }
    let rendered = mark.render({
      markIndex,
      surface: { x: 0, y: 0, width, height },
      chart,
      scales,
      theme,
      color: colors.map,
      colors,
      layout: layoutOptions,
    })
    if (legend?.filterMark) {
      rendered = legend.filterMark(rendered, {
        seriesFromColor: mark.seriesFromColor,
      })
    }
    if (mark.postDomain) rendered = mark.postDomain(rendered)
    const renderedPoints = collectRenderedPoints(
      rendered.nodes,
      rendered.points,
    )
    const renderedNodes =
      viewportX || viewportY
        ? mapScenePointReferences(rendered.nodes, presentPoint)
        : rendered.nodes
    const presentedPoints = renderedPoints.map(presentPoint)
    const entryNodes: SceneNode[] = []
    const placement =
      firstBaseMarkIndex < 0 || markIndex < firstBaseMarkIndex
        ? 'under'
        : 'over'
    for (const guide of rendered.focusGuides ?? []) {
      focusGuides.push({
        ...guide,
        placement: guide.placement ?? placement,
        x: withGuideAxisSide(guide.x, xAxisSide),
        y: withGuideAxisSide(guide.y, yAxisSide),
      })
    }
    if (mark.focus) {
      const retarget = mark.focus.retarget === true
      entryNodes.push({
        kind: 'group',
        key: `focus:${mark.id}`,
        className: 'ts-chart__focus-layer',
        ariaHidden: true,
        focus: {
          match: mark.focus.match ?? 'primary',
          anchors: rendered.focusAnchors ?? renderedPoints,
          points: presentedPoints,
          placement,
          ...(retarget ? { retarget: true, candidates: renderedNodes } : {}),
        },
        children: retarget ? [] : renderedNodes,
      })
    } else {
      const markPoints = presentedPoints
      if (mark.states) {
        entryNodes.push({
          kind: 'group',
          key: `states:${mark.id}`,
          children: renderedNodes,
          states: {
            data: mark.states.data,
            definitions: mark.states.definitions,
            points: markPoints,
          },
        })
      } else {
        for (const node of renderedNodes) entryNodes.push(node)
      }
      for (const point of markPoints) points.push(point)
      if (markPoints.length) {
        defaultFocusEntries.push({
          markId: mark.id,
          points: markPoints,
          clipped: viewportX || viewportY,
        })
      }
    }
    markEntries.push({ key: mark.id, nodes: entryNodes, viewportX, viewportY })
  })
  const markNodes = arrangeViewportMarkNodes(
    markEntries,
    translateX,
    translateY,
    chart,
  )
  const nodes: SceneNode[] = [
    {
      kind: 'group',
      key: 'marks',
      className: 'ts-chart__marks',
      clip: definition.clip ? chart : undefined,
      children: markNodes,
    },
  ]
  if (
    definition.guides !== false &&
    (definition.x?.grid || definition.y?.grid)
  ) {
    nodes.unshift(createGrid(chart, scales, definition, theme))
  }
  if (axes) {
    nodes.push(axisNodes)
  }
  const controls: ChartHostControl[] = []
  const controlIds = new Set<string>()
  for (const control of definition.controls ?? []) {
    if (!control.id.trim()) {
      throw new TypeError('Chart control ids must be nonempty')
    }
    if (controlIds.has(control.id)) {
      throw new TypeError(`Duplicate chart control id "${control.id}"`)
    }
    controlIds.add(control.id)
    const resolved = control.resolve({
      chart,
      scales,
      colors,
      theme,
      width,
      height,
    })
    if (resolved.nodes) nodes.push(...resolved.nodes)
    if (resolved.controls) controls.push(...resolved.controls)
  }
  if (legend && legendBounds) {
    const legendContext = {
      colors,
      chart,
      bounds: legendBounds,
      theme,
      width,
      height,
    }
    nodes.push(legend.render(legendContext))
    if (legend.control) controls.push(legend.control(legendContext))
  }
  const hostControlIds = new Set<string>()
  for (const control of controls) {
    const identity = `${control.extension.id}:${control.key}`
    if (hostControlIds.has(identity)) {
      throw new TypeError(`Duplicate chart host control "${identity}"`)
    }
    hostControlIds.add(identity)
  }
  if (
    definition.focus !== false &&
    definition.focusRing !== false &&
    points.length
  ) {
    for (const entry of defaultFocusEntries) {
      nodes.push({
        kind: 'group',
        key: `default-focus:${entry.markId}`,
        className: 'ts-chart__focus-layer ts-chart__focus-layer--default',
        ariaHidden: true,
        clip: entry.clipped ? chart : undefined,
        focus: {
          match: 'primary',
          anchors: entry.points,
          points: entry.points,
          placement: 'over',
        },
        children: entry.points.map((point) => ({
          kind: 'dot',
          key: point.key,
          x: point.x,
          y: point.y,
          radius: 5,
          style: {
            fill: 'var(--ts-chart-focus-fill, Canvas)',
            stroke: point.color,
            strokeWidth: 2.5,
          },
        })),
      })
    }
  }

  return {
    width,
    height,
    margin,
    chart,
    nodes,
    points,
    scales,
    colors,
    gradients: definition.gradients ?? [],
    theme,
    ...(controls.length ? { controls } : {}),
    ...(focusGuides.length ? { focusGuides } : {}),
    [chartSceneSource]: [definition, initialized],
  } as ChartScene<TDatum, TXValue, TYValue> & {
    [chartSceneSource]: readonly [
      StaticChartDefinition<TDatum, TXValue, TYValue>,
      readonly InitializedMark[],
    ]
  }
}

interface ViewportMarkEntry {
  key: string
  nodes: readonly SceneNode[]
  viewportX: boolean
  viewportY: boolean
}

interface DefaultFocusEntry<
  TDatum,
  TXValue extends ChartValue,
  TYValue extends ChartValue,
> {
  markId: string
  points: readonly ChartPoint<TDatum, TXValue, TYValue>[]
  clipped: boolean
}

function markUsesViewportAxis(
  mark: Pick<ResolvedSceneMark, 'channels' | 'viewport'>,
  axis: 'x' | 'y',
) {
  const ownership = mark.viewport?.[axis]
  if (ownership) return ownership === 'content'
  return Object.values(mark.channels).some((channel) => channel.scale === axis)
}

function arrangeViewportMarkNodes(
  entries: readonly ViewportMarkEntry[],
  translateX: number,
  translateY: number,
  chart: ChartBounds,
): SceneNode[] {
  return entries.flatMap((entry): SceneNode[] => {
    if (!entry.viewportX && !entry.viewportY) return [...entry.nodes]
    return [
      {
        kind: 'group',
        key: `viewport-clip:${entry.key}`,
        className: 'ts-chart__viewport-clip',
        clip: chart,
        children: [
          {
            kind: 'group',
            key: `viewport-content:${entry.key}`,
            className: 'ts-chart__viewport-content',
            ...(entry.viewportX ? { translateX } : {}),
            ...(entry.viewportY ? { translateY } : {}),
            children: entry.nodes,
          },
        ],
      },
    ]
  })
}

export function findNearestPoint<
  TDatum,
  TXValue extends ChartValue,
  TYValue extends ChartValue,
>(
  scene: ChartScene<TDatum, TXValue, TYValue>,
  x: number,
  y: number,
  maxDistance = Infinity,
  points: readonly ChartPoint<TDatum, TXValue, TYValue>[] = scene.points,
): ChartPoint<TDatum, TXValue, TYValue> | null {
  return nearestScenePoint(scene, x, y, maxDistance, points)
}

/** Points whose presented anchors are inside an active viewport clip. */
export function viewportInteractionPoints<
  TDatum,
  TXValue extends ChartValue,
  TYValue extends ChartValue,
>(
  scene: ChartScene<TDatum, TXValue, TYValue>,
  points: readonly ChartPoint<TDatum, TXValue, TYValue>[] = scene.points,
): readonly ChartPoint<TDatum, TXValue, TYValue>[] {
  if (!scene.scales.x?.viewport && !scene.scales.y?.viewport) return points
  const { x, y, width, height } = scene.chart
  const right = x + width
  const bottom = y + height
  const visible = points.filter(
    (point) =>
      !pointUsesViewportClip(scene, point) ||
      (point.x >= x && point.x <= right && point.y >= y && point.y <= bottom),
  )
  return visible.length === points.length ? points : visible
}

function pointUsesViewportClip(scene: ChartScene, point: ChartPoint) {
  const source = (
    scene as ChartScene & {
      [chartSceneSource]?: readonly [
        StaticChartDefinition,
        readonly InitializedMark[],
      ]
    }
  )[chartSceneSource]
  const mark = source?.[1].find((candidate) => candidate.id === point.markId)
  if (!mark) return true
  return Boolean(
    (scene.scales.x?.viewport && markUsesViewportAxis(mark, 'x')) ||
    (scene.scales.y?.viewport && markUsesViewportAxis(mark, 'y')),
  )
}

function collectRenderedPoints(
  nodes: readonly SceneNode[],
  emitted: readonly ChartPoint[] | undefined,
): readonly ChartPoint[] {
  const points = emitted ? [...emitted] : []
  const seen = new Set(points)
  const visit = (children: readonly SceneNode[]) => {
    for (const node of children) {
      if (node.kind === 'group') {
        if (!node.focus) visit(node.children)
        continue
      }
      if (node.kind === 'label' || !node.interaction) continue
      const interaction = node.interaction
      if (interaction.point) {
        if (!seen.has(interaction.point)) {
          seen.add(interaction.point)
          points.push(interaction.point)
        }
      } else {
        for (const point of interaction.points) {
          if (seen.has(point)) continue
          seen.add(point)
          points.push(point)
        }
      }
    }
  }
  visit(nodes)
  return points
}

function collectScaleChannels(
  marks: readonly {
    channels: Readonly<Record<string, MaterializedChannel>>
  }[],
  scaleId: string,
): CollectedScaleChannels {
  const values: unknown[] = []
  let includeZero = false
  let materialized = false
  for (const mark of marks) {
    for (const channel of Object.values(mark.channels)) {
      if (channel.scale !== scaleId) continue
      materialized = true
      for (const value of channel.values) values.push(value)
      includeZero ||= channel.includeZero ?? false
    }
  }
  return { values, includeZero, materialized }
}

interface CollectedScaleChannels {
  values: unknown[]
  includeZero: boolean
  materialized: boolean
}

interface ResolvedSceneLayout {
  margin: ChartMargin
  chart: ChartBounds
  scales: ChartScene['scales']
  axes: SceneGroup
  guideMargin: ChartMargin
  marks: readonly ResolvedSceneMark[]
  colors: ResolvedColorScale
  legend: ChartColorLegend | undefined
  legendBounds: ChartBounds | undefined
}

interface ResolvedSceneMark {
  id: string
  channels: Readonly<Record<string, MaterializedChannel>>
  viewport?: Readonly<Partial<Record<'x' | 'y', 'content' | 'fixed'>>>
  focusGuideOnly?: boolean
  seriesFromColor?: boolean
  focus?: ChartFocusFilter
  states?: {
    data: readonly unknown[]
    definitions: readonly ChartMarkState<any>[]
  }
  postDomain?: (scene: MarkScene<any, any, any>) => MarkScene<any, any, any>
  layoutLabels?: (context: MarkRenderContext) => readonly SceneLabel[]
  render: (context: MarkRenderContext) => MarkScene
}

interface ResolvedAxes {
  axes: SceneGroup
  margin: ChartMargin
}

const automaticGuideInset = 4
const layoutPassLimit = 4
const layoutTolerance = 0.25

function resolveSceneLayout(
  definition: StaticChartDefinition,
  initialized: readonly InitializedMark<unknown>[],
  width: number,
  height: number,
  theme: ChartTheme,
  xChannels: CollectedScaleChannels,
  yChannels: CollectedScaleChannels,
  axes: number,
  resolveScale: ChartScaleResolver,
  layout: ChartLayoutOptions,
): ResolvedSceneLayout {
  const locks = resolveMarginLocks(definition.margin)
  const inset = axes ? automaticGuideInset : 0
  let margin = mergeMarginLocks(uniformMargin(inset), locks)
  let safeMargin = margin

  for (let pass = 0; pass < layoutPassLimit; pass += 1) {
    const resolved = compileSceneLayout(margin)
    const next = measureMargin(resolved)
    safeMargin = mergeMarginLocks(next, locks, safeMargin)
    if (marginsEqual(margin, next)) return resolved
    margin = next
  }

  let resolved = compileSceneLayout(safeMargin)
  const finalMargin = mergeMarginLocks(
    measureMargin(resolved),
    locks,
    safeMargin,
  )
  if (!marginsEqual(safeMargin, finalMargin)) {
    resolved = compileSceneLayout(finalMargin)
  }
  return resolved

  function compileSceneLayout(margin: ChartMargin): ResolvedSceneLayout {
    const chart: ChartBounds = {
      x: margin.left,
      y: margin.top,
      width: Math.max(1, width - margin.left - margin.right),
      height: Math.max(1, height - margin.top - margin.bottom),
    }
    const xTickCount = resolveTickCount(definition.x, chart.width, 92, 8)
    const yTickCount = resolveTickCount(definition.y, chart.height, 48, 7)
    const scales = {
      x:
        definition.x == null
          ? createUnusedScale('x', xChannels.materialized, definition.x)
          : resolveScale({
              id: 'x',
              values: xChannels.values,
              range: [chart.x, chart.x + chart.width],
              options: definition.x,
              tickCount: xTickCount,
              includeZero: xChannels.includeZero,
            }),
      y:
        definition.y == null
          ? createUnusedScale('y', yChannels.materialized, definition.y)
          : resolveScale({
              id: 'y',
              values: yChannels.values,
              range: [chart.y + chart.height, chart.y],
              options: definition.y,
              tickCount: yTickCount,
              includeZero: yChannels.includeZero,
            }),
    }
    const marks = resolveMarkLayouts(initialized, {
      chart,
      scales,
      theme,
      layout,
    })
    const colorChannels = collectScaleChannels(marks, 'color')
    const colors = createColorScale(
      colorChannels.values,
      definition.color,
      theme,
    )
    if (
      colors.kind !== 'categorical' &&
      marks.some((mark) => mark.seriesFromColor)
    ) {
      throw new TypeError(
        'A continuous color channel cannot infer series identity; supply z explicitly',
      )
    }
    const legend = colors.domain.length ? definition.color?.legend : undefined
    if (legend?.seriesVisible && colors.kind !== 'categorical') {
      throw new TypeError(
        'An interactive color legend requires a categorical color scale',
      )
    }
    const legendHeight = legend?.height(colors.domain.length, {
      colors,
      chart,
      bounds: { x: chart.x, y: 0, width: chart.width, height: 0 },
      theme,
      width,
      height,
    })
    const legendBounds =
      legend && legendHeight !== undefined
        ? {
            x: chart.x,
            y: legend.placement === 'bottom' ? height - legendHeight : 0,
            width: chart.width,
            height: legendHeight,
          }
        : undefined
    const resolvedAxes = createAxes(
      chart,
      scales,
      definition,
      theme,
      width,
      axes,
      layout.measureText,
    )
    return {
      margin,
      chart,
      scales,
      axes: resolvedAxes.axes,
      guideMargin: resolvedAxes.margin,
      marks,
      colors,
      legend,
      legendBounds,
    }
  }

  function measureMargin(resolved: ResolvedSceneLayout): ChartMargin {
    const automatic = resolved.guideMargin
    if (resolved.legend) {
      const legendHeight = resolved.legend.height(
        resolved.colors.domain.length,
        {
          colors: resolved.colors,
          chart: resolved.chart,
          bounds: {
            x: resolved.chart.x,
            y: 0,
            width: resolved.chart.width,
            height: 0,
          },
          theme,
          width,
          height,
        },
      )
      if (resolved.legend.placement === 'bottom') {
        if (locks.bottom === undefined) automatic.bottom += legendHeight
      } else if (locks.top === undefined) {
        automatic.top = Math.max(automatic.top, legendHeight)
      }
    }
    if (!definition.clip) {
      resolved.marks.forEach((mark, markIndex) => {
        const autoClipped = Boolean(
          (resolved.scales.x.viewport && markUsesViewportAxis(mark, 'x')) ||
          (resolved.scales.y.viewport && markUsesViewportAxis(mark, 'y')),
        )
        if (autoClipped) return
        const labels = mark.layoutLabels?.({
          markIndex,
          surface: { x: 0, y: 0, width, height },
          chart: resolved.chart,
          scales: resolved.scales,
          theme,
          color: resolved.colors.map,
          colors: resolved.colors,
          layout,
        })
        for (const label of labels ?? []) {
          includeLabelMargin(
            automatic,
            resolved.chart,
            label,
            layout.measureText,
          )
        }
      })
    }
    return mergeMarginLocks(automatic, locks)
  }
}

function resolveMarkLayouts(
  marks: readonly InitializedMark[],
  context: Omit<MarkResolvedLayoutContext, 'markIndex'>,
): readonly ResolvedSceneMark[] {
  return marks.map((mark, markIndex) => {
    if (typeof mark.resolveLayout !== 'function') {
      return mark
    }
    const resolved = mark.resolveLayout({ ...context, markIndex })
    return {
      id: mark.id,
      channels: resolved.channels ?? mark.channels,
      viewport: mark.viewport,
      focusGuideOnly: mark.focusGuideOnly,
      seriesFromColor: mark.seriesFromColor,
      focus: mark.focus,
      states: resolved.states ?? mark.states,
      postDomain: resolved.postDomain ?? mark.postDomain,
      layoutLabels: resolved.layoutLabels ?? mark.layoutLabels,
      render: resolved.render,
    }
  })
}

function includeLabelMargin(
  margin: ChartMargin,
  chart: ChartBounds,
  label: SceneLabel,
  measureText: ChartTextMeasurer | undefined,
) {
  const bounds = measureSceneLabelBounds(label, measureText)
  if (!label.text) return bounds
  margin.top = Math.max(margin.top, chart.y - bounds.y + automaticGuideInset)
  margin.right = Math.max(
    margin.right,
    bounds.x + bounds.width - chart.x - chart.width + automaticGuideInset,
  )
  margin.bottom = Math.max(
    margin.bottom,
    bounds.y + bounds.height - chart.y - chart.height + automaticGuideInset,
  )
  margin.left = Math.max(margin.left, chart.x - bounds.x + automaticGuideInset)
  return bounds
}

function resolveMarginLocks(
  margin: StaticChartDefinition['margin'],
): Partial<ChartMargin> {
  if (typeof margin === 'number') {
    return uniformMargin(finiteMargin(margin))
  }
  if (!margin) return {}
  const locks: Partial<ChartMargin> = {}
  for (const side of marginSides) {
    if (margin[side] !== undefined) locks[side] = finiteMargin(margin[side])
  }
  return locks
}

const marginSides = ['top', 'right', 'bottom', 'left'] as const

function mergeMarginLocks(
  automatic: ChartMargin,
  locks: Partial<ChartMargin>,
  previous?: ChartMargin,
): ChartMargin {
  const margin = { ...automatic }
  for (const side of marginSides) {
    margin[side] =
      locks[side] ??
      (previous ? Math.max(previous[side], automatic[side]) : automatic[side])
  }
  return margin
}

function marginsEqual(left: ChartMargin, right: ChartMargin): boolean {
  return marginSides.every(
    (side) => Math.abs(left[side] - right[side]) <= layoutTolerance,
  )
}

function finiteMargin(value: number | undefined): number {
  return value !== undefined && Number.isFinite(value) ? Math.max(0, value) : 0
}

function uniformMargin(value: number): ChartMargin {
  return { top: value, right: value, bottom: value, left: value }
}

function createUnusedScale(
  id: string,
  materialized: boolean,
  axis: null | undefined,
): ChartScene['scales'][string] {
  if (materialized) {
    throw new TypeError(
      axis === null
        ? `Chart scale "${id}" cannot be null when a mark materializes its channel`
        : `Chart scale "${id}" requires a configured scale when a mark materializes its channel`,
    )
  }
  return {
    id,
    type: 'none',
    domain: [],
    map: () => {
      throw new TypeError(`Chart scale "${id}" is not configured`)
    },
    ticks: [],
    bandwidth: 0,
  }
}

function createGrid(
  chart: ChartBounds,
  scales: ChartScene['scales'],
  definition: StaticChartDefinition,
  theme: ChartTheme,
): SceneGroup {
  const children: SceneNode[] = []

  if (definition.y?.grid) {
    for (const tick of scales.y.ticks) {
      children.push({
        kind: 'rule',
        key: `y-grid:${valueKey(tick.value)}`,
        x1: chart.x,
        x2: chart.x + chart.width,
        y1: tick.position,
        y2: tick.position,
      })
    }
  }

  if (definition.x?.grid) {
    for (const tick of scales.x.ticks) {
      children.push({
        kind: 'rule',
        key: `x-grid:${valueKey(tick.value)}`,
        x1: tick.position,
        x2: tick.position,
        y1: chart.y,
        y2: chart.y + chart.height,
      })
    }
  }

  return {
    kind: 'group',
    key: 'grid',
    className: 'ts-chart__grid',
    ariaHidden: true,
    children,
    style: {
      stroke: theme.grid,
      strokeOpacity: 0.11,
      strokeWidth: 1,
    },
  }
}

function createAxes(
  chart: ChartBounds,
  scales: ChartScene['scales'],
  definition: StaticChartDefinition,
  theme: ChartTheme,
  width: number,
  axes: number,
  measureText?: ChartTextMeasurer,
): ResolvedAxes {
  const showX = axes & 1
  const showY = axes & 2
  const xAxis = axisPresentation(definition.x)
  const yAxis = axisPresentation(definition.y)
  const xPlacement = axisPlacement('x', chart, xAxis?.side)
  const yPlacement = axisPlacement('y', chart, yAxis?.side)
  const children: SceneNode[] =
    !showX || xAxis?.line === false
      ? []
      : [
          {
            kind: 'rule',
            key: 'x-axis',
            x1: chart.x,
            x2: chart.x + chart.width,
            y1: xPlacement.edge,
            y2: xPlacement.edge,
            style: {
              stroke: theme.foreground,
              strokeOpacity: 0.28,
            },
          },
        ]
  if (showY && yAxis?.line !== false) {
    children.push({
      kind: 'rule',
      key: 'y-axis',
      x1: yPlacement.edge,
      x2: yPlacement.edge,
      y1: chart.y,
      y2: chart.y + chart.height,
      style: {
        stroke: theme.foreground,
        strokeOpacity: 0.28,
      },
    })
  }
  const xTickLabels = tickLabelPresentation(xAxis)
  const yTickLabels = tickLabelPresentation(yAxis)
  let xTickExtent = xPlacement.edge
  let yTickExtent = yPlacement.edge
  const inset = axes ? automaticGuideInset : 0
  const margin = uniformMargin(inset)

  const addLabel = (label: SceneLabel) =>
    includeLabelMargin(margin, chart, label, measureText)

  const xTicks = xAxis?.ticks === false ? [] : scales.x.ticks
  const yTicks = yAxis?.ticks === false ? [] : scales.y.ticks
  const xTickSize = finiteMargin(
    xAxis?.ticks === false ? 0 : (xAxis?.ticks?.size ?? 4),
  )
  const yTickSize = finiteMargin(
    yAxis?.ticks === false ? 0 : (yAxis?.ticks?.size ?? 4),
  )
  const xTickPadding = finiteMargin(
    xAxis?.ticks === false ? 0 : (xAxis?.ticks?.padding ?? 4),
  )
  const yTickPadding = finiteMargin(
    yAxis?.ticks === false ? 0 : (yAxis?.ticks?.padding ?? 4),
  )
  const xLabelCandidates =
    xTickLabels === false
      ? []
      : createTickLabelCandidates(
          'x',
          withKeptTicks(scales.x, definition.x, xTickLabels),
          xPlacement,
          xTickSize,
          xTickPadding,
          xTickLabels,
          scales.x.bandwidth,
          width,
          theme,
          measureText,
        )
  const yLabelCandidates =
    yTickLabels === false
      ? []
      : createTickLabelCandidates(
          'y',
          withKeptTicks(scales.y, definition.y, yTickLabels),
          yPlacement,
          yTickSize,
          yTickPadding,
          yTickLabels,
          scales.y.bandwidth,
          width,
          theme,
          measureText,
        )
  const visibleXLabels =
    xTickLabels === false
      ? []
      : thinTickLabels(xLabelCandidates, xTickLabels, scales.x.type === 'band')
  const visibleYLabels =
    yTickLabels === false
      ? []
      : thinTickLabels(yLabelCandidates, yTickLabels, false)

  for (const tick of showX ? xTicks : []) {
    const key = valueKey(tick.value)
    if (xTickSize > 0) {
      children.push({
        kind: 'rule',
        key: `x-tick-rule:${key}`,
        x1: tick.position,
        x2: tick.position,
        y1: xPlacement.edge,
        y2: xPlacement.edge + xPlacement.sign * xTickSize,
        style: {
          stroke: theme.foreground,
          strokeOpacity: 0.28,
        },
      })
    }
  }

  for (const candidate of showX ? visibleXLabels : []) {
    const bounds = addLabel(candidate.label)
    if (axisLabelText(xAxis) && axisLabelOffset(xAxis) === 'auto') {
      xTickExtent = extendTickExtent(xTickExtent, bounds, 'x', xPlacement.sign)
    }
    children.push(candidate.label)
  }

  for (const tick of showY ? yTicks : []) {
    const key = valueKey(tick.value)
    if (yTickSize > 0) {
      children.push({
        kind: 'rule',
        key: `y-tick-rule:${key}`,
        x1: yPlacement.edge + yPlacement.sign * yTickSize,
        x2: yPlacement.edge,
        y1: tick.position,
        y2: tick.position,
        style: {
          stroke: theme.foreground,
          strokeOpacity: 0.28,
        },
      })
    }
  }

  for (const candidate of showY ? visibleYLabels : []) {
    const bounds = addLabel(candidate.label)
    if (axisLabelText(yAxis) && axisLabelOffset(yAxis) === 'auto') {
      yTickExtent = extendTickExtent(yTickExtent, bounds, 'y', yPlacement.sign)
    }
    children.push(candidate.label)
  }

  const xAxisLabel = axisLabelText(xAxis)
  if (showX && xAxisLabel) {
    const offset = axisLabelOffset(xAxis)
    const hasOffset = offset !== 'auto'
    const hangingBaseline = !hasOffset && xPlacement.sign > 0
    const label: SceneLabel = {
      kind: 'label',
      key: 'x-label',
      x: chart.x + chart.width / 2,
      y: hasOffset
        ? xPlacement.edge + xPlacement.sign * Math.max(0, finiteMargin(offset))
        : xTickExtent + xPlacement.sign * 8,
      text: xAxisLabel,
      anchor: 'middle',
      baseline: hangingBaseline ? 'hanging' : 'auto',
      fontSize: width < 360 ? 10 : 11,
      fontWeight: 600,
      style: { fill: theme.foreground, fillOpacity: 0.76 },
    }
    addLabel(label)
    children.push(label)
  }

  const yAxisLabel = axisLabelText(yAxis)
  if (showY && yAxisLabel) {
    const yLabel: SceneLabel = {
      kind: 'label',
      key: 'y-label',
      x: yPlacement.edge,
      y: chart.y + chart.height / 2,
      text: yAxisLabel,
      anchor: 'middle',
      baseline: 'middle',
      rotate: yPlacement.sign > 0 ? 90 : -90,
      fontSize: 11,
      fontWeight: 600,
      style: { fill: theme.foreground, fillOpacity: 0.76 },
    }
    const offset = axisLabelOffset(yAxis)
    if (offset !== 'auto') {
      yLabel.x =
        yPlacement.edge + yPlacement.sign * Math.max(0, finiteMargin(offset))
    } else {
      const localBounds = measureSceneLabelBounds(
        { ...yLabel, x: 0, y: 0 },
        measureText,
      )
      const localEdge =
        yPlacement.sign > 0 ? localBounds.x : localBounds.x + localBounds.width
      yLabel.x = yTickExtent + yPlacement.sign * 8 - localEdge
    }
    addLabel(yLabel)
    children.push(yLabel)
  }

  return {
    axes: {
      kind: 'group',
      key: 'axes',
      className: 'ts-chart__axes',
      ariaHidden: true,
      children,
    },
    margin,
  }
}

function resolveTickCount(
  axis: ChartAxisOptions | null | undefined,
  length: number,
  defaultSpacing: number,
  maximum: number,
): number {
  const ticks = axis?.axis === false ? undefined : axis?.axis?.ticks
  if (ticks === false) {
    return Math.max(2, Math.min(maximum, Math.floor(length / defaultSpacing)))
  }
  const configured = ticks ?? {}
  const policies = [
    configured.count !== undefined,
    configured.spacing !== undefined,
    configured.values !== undefined,
  ].filter(Boolean).length
  if (policies > 1) {
    throw new TypeError(
      'Axis ticks accept only one candidate policy: count, spacing, or values',
    )
  }
  if (configured.values) return Math.max(1, configured.values.length)
  if (configured.count !== undefined) {
    return Math.max(1, Math.floor(finiteMargin(configured.count)))
  }
  if (configured.spacing !== undefined) {
    const spacing = Math.max(1, finiteMargin(configured.spacing))
    return Math.max(1, Math.floor(length / spacing))
  }
  return Math.max(2, Math.min(maximum, Math.floor(length / defaultSpacing)))
}

function axisPresentation(
  axis: ChartAxisOptions | null | undefined,
): ChartAxisPresentationOptions | undefined {
  if (!axis || axis.axis === false) return undefined
  return axis.axis ?? {}
}

function tickLabelPresentation(
  axis: ChartAxisPresentationOptions | undefined,
): false | ChartAxisTickLabelOptions {
  if (axis?.ticks === false || axis?.tickLabels === false) return false
  return axis?.tickLabels ?? {}
}

function axisLabelText(
  axis: ChartAxisPresentationOptions | undefined,
): string | undefined {
  return typeof axis?.label === 'string' ? axis.label : axis?.label?.text
}

function axisLabelOffset(
  axis: ChartAxisPresentationOptions | undefined,
): number | 'auto' {
  return typeof axis?.label === 'object'
    ? (axis.label.offset ?? 'auto')
    : 'auto'
}

function withGuideAxisSide(
  axis: SceneFocusGuideAxis | undefined,
  side: ChartAxisSide | undefined,
): SceneFocusGuideAxis | undefined {
  if (!axis || side === undefined) return axis
  return { ...axis, side }
}

function extendTickExtent(
  extent: number,
  bounds: ChartBounds,
  axis: 'x' | 'y',
  sign: 1 | -1,
): number {
  const near = axis === 'x' ? bounds.y : bounds.x
  const far = near + (axis === 'x' ? bounds.height : bounds.width)
  if (sign > 0) return Math.max(extent, far)
  return Math.min(extent, near)
}

interface TickLabelCandidate {
  value: ChartValue
  label: SceneLabel
  bounds: ChartBounds
  hard: boolean
}

function withKeptTicks(
  scale: ChartScene['scales'][string],
  axis: ChartAxisOptions | null | undefined,
  labels: ChartAxisTickLabelOptions,
): readonly (ChartTick & { hard?: boolean })[] {
  const thin = typeof labels.thin === 'object' ? labels.thin : undefined
  const keep = thin?.keep ?? []
  if (!keep.length) return scale.ticks
  const formatter =
    axis?.axis === false || axis?.axis?.ticks === false
      ? undefined
      : axis?.axis?.ticks?.format
  const ticks: (ChartTick & { hard?: boolean })[] = scale.ticks.map((tick) => ({
    ...tick,
    hard: keep.some((value) => valueKey(value) === valueKey(tick.value)),
  }))
  const seen = new Set(ticks.map((tick) => valueKey(tick.value)))
  for (const value of keep) {
    const position = scale.map(value)
    if (seen.has(valueKey(value)) || !Number.isFinite(position)) continue
    ticks.push({
      value,
      position,
      label: formatter?.(value) ?? formatAxisValue(value),
      hard: true,
    })
  }
  return ticks
}

function createTickLabelCandidates(
  axis: 'x' | 'y',
  ticks: readonly (ChartTick & { hard?: boolean })[],
  placement: AxisPlacement,
  size: number,
  padding: number,
  options: ChartAxisTickLabelOptions,
  bandwidth: number,
  width: number,
  theme: ChartTheme,
  measureText: ChartTextMeasurer | undefined,
): TickLabelCandidate[] {
  const defaultFontSize = width < 360 ? 10 : 11
  return ticks.map((tick, index) => {
    const context: ChartAxisTickLabelContext = {
      value: tick.value,
      index,
      position: tick.position,
      bandwidth,
    }
    const rotate = options.rotate
    const fontSize =
      resolveTickLabelValue(options.fontSize, context) ?? defaultFontSize
    const fontWeight = resolveTickLabelValue(options.fontWeight, context)
    const opacity = resolveTickLabelValue(options.opacity, context)
    const dx = resolveTickLabelValue(options.dx, context) ?? 0
    const dy = resolveTickLabelValue(options.dy, context) ?? 0
    const crossAnchor = placement.sign > 0 ? 'start' : 'end'
    const baselineDrop = placement.sign > 0 ? fontSize * 0.8 : 0
    const defaultAnchor =
      axis === 'y'
        ? crossAnchor
        : (rotate ?? 0) < 0
          ? 'end'
          : (rotate ?? 0) > 0
            ? 'start'
            : 'middle'
    const anchor =
      resolveTickLabelValue(options.anchor, context) ?? defaultAnchor
    const label: SceneLabel =
      axis === 'x'
        ? {
            kind: 'label',
            key: `x-tick-label:${valueKey(tick.value)}`,
            x: tick.position + dx,
            y:
              placement.edge +
              placement.sign * (size + padding) +
              baselineDrop +
              dy,
            text: tick.label,
            anchor,
            rotate,
            fontSize,
            fontWeight,
            style: {
              fill: theme.muted,
              ...(opacity === undefined ? { fillOpacity: 0.68 } : { opacity }),
            },
          }
        : {
            kind: 'label',
            key: `y-tick-label:${valueKey(tick.value)}`,
            x: placement.edge + placement.sign * (size + padding) + dx,
            y: tick.position + dy,
            text: tick.label,
            anchor,
            baseline: 'middle',
            rotate,
            fontSize,
            fontWeight,
            style: {
              fill: theme.muted,
              ...(opacity === undefined ? { fillOpacity: 0.68 } : { opacity }),
            },
          }
    return {
      value: tick.value,
      label,
      bounds: measureSceneLabelBounds(label, measureText),
      hard: tick.hard ?? false,
    }
  })
}

function resolveTickLabelValue<TValue extends ChartValue, TOutput>(
  value: ChartAxisTickLabelValue<TValue, TOutput> | undefined,
  context: ChartAxisTickLabelContext<TValue>,
): TOutput | undefined {
  return typeof value === 'function'
    ? (
        value as (
          context: ChartAxisTickLabelContext<TValue>,
        ) => TOutput | undefined
      )(context)
    : value
}

function thinTickLabels(
  candidates: readonly TickLabelCandidate[],
  options: ChartAxisTickLabelOptions,
  categoricalX: boolean,
): TickLabelCandidate[] {
  if (options.thin === false || candidates.length < 2) return [...candidates]
  const thin = typeof options.thin === 'object' ? options.thin : {}
  const minGap = Math.max(0, finiteMargin(thin.minGap ?? 4))
  const selected: TickLabelCandidate[] = candidates.filter(
    (candidate) => candidate.hard,
  )
  const soft = candidates.filter((candidate) => !candidate.hard)
  const prioritizeEnds = thin.priority === 'ends' || categoricalX

  if (prioritizeEnds && soft.length) {
    const first = soft[0]!
    const last = soft.at(-1)!
    if (!collidesWithAny(first, selected, minGap)) selected.push(first)
    if (last !== first && !collidesWithAny(last, selected, minGap)) {
      selected.push(last)
    }
  }

  const ordered = distributedCandidates(
    soft.filter((candidate) => !selected.includes(candidate)),
  )
  for (const candidate of ordered) {
    if (!collidesWithAny(candidate, selected, minGap)) selected.push(candidate)
  }

  const selectedSet = new Set(selected)
  return candidates.filter((candidate) => selectedSet.has(candidate))
}

function distributedCandidates(
  candidates: readonly TickLabelCandidate[],
): TickLabelCandidate[] {
  if (candidates.length < 3) return [...candidates]
  const result: TickLabelCandidate[] = []
  const queue: (readonly TickLabelCandidate[])[] = [candidates]
  while (queue.length) {
    const range = queue.shift()!
    if (!range.length) continue
    const middle = Math.floor(range.length / 2)
    result.push(range[middle]!)
    queue.push(range.slice(0, middle), range.slice(middle + 1))
  }
  return result
}

function collidesWithAny(
  candidate: TickLabelCandidate,
  selected: readonly TickLabelCandidate[],
  gap: number,
): boolean {
  return selected.some((other) =>
    boundsCollide(candidate.bounds, other.bounds, gap),
  )
}

function boundsCollide(left: ChartBounds, right: ChartBounds, gap: number) {
  return !(
    left.x + left.width + gap <= right.x ||
    right.x + right.width + gap <= left.x ||
    left.y + left.height + gap <= right.y ||
    right.y + right.height + gap <= left.y
  )
}

function formatAxisValue(value: ChartValue): string {
  return value instanceof Date ? value.toLocaleDateString() : String(value)
}

function finiteSize(value: number): number {
  return Number.isFinite(value) ? Math.max(1, value) : 1
}
