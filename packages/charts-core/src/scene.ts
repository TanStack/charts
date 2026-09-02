import { createColorScale, valueKey } from './scales'
import { resolveConfiguredScale } from './configured-scale'
import {
  measureSceneLabelBounds,
  withChartTextTypography,
} from './guide-layout'
import { nearestScenePoint } from './nearest'
import { setMappedFocusCoordinate } from './focus-coordinate-internal'
import { readMaterializedPositionChannel } from './materialized-channel-internal'
import { mapScenePointReferences } from './scene-point-map'
import { chartSceneSource } from './scene-source'
import type {
  ResponsiveChartDefinition,
  InitializedMark,
  MaterializedChannel,
  ChartAxisSide,
  ChartAxisPresentationOptions,
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
  ChartPositionChannel,
  ChartPositionScaleOptions,
  SceneFocusGuide,
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
  TMarks extends readonly ChartMark<any, any, any, any, any, any, any>[],
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

type ErasedChartMarks = readonly ChartMark<any, any, any, any, any, any, any>[]

type ErasedChartSpec = {
  marks: ErasedChartMarks
  scales: Readonly<Record<string, ChartPositionScaleOptions | null>>
}

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

type DefinedResponsiveChart<TSpec extends ErasedChartSpec> = Omit<
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
  const TMarks extends readonly ChartMark<any, any, any, any, any, any, any>[],
  const TSpec extends ChartSpec<TMarks>,
>(
  spec: TSpec & { marks: TMarks } & ChartDefinitionOptions<
      ChartMarkDatum<TMarks[number]>,
      ChartMarkPointX<TMarks[number]>,
      ChartMarkPointY<TMarks[number]>
    >,
): DefinedStaticChart<TMarks, TSpec>
export function defineChart<
  const TSpec extends ErasedChartSpec,
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
export function defineChart<const TSpec extends ErasedChartSpec>(
  chart: (context: ChartBuildContext) => CheckedChartSpec<TSpec>,
): DefinedResponsiveChart<TSpec>
export function defineChart<
  const TMarks extends readonly ChartMark<any, any, any, any, any, any, any>[],
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
  const TSpec extends ErasedChartSpec,
  const TOptions extends ChartDefinitionOptions<
    ChartSpecDatum<TSpec>,
    ChartSpecXValue<TSpec>,
    ChartSpecYValue<TSpec>
  >,
>(
  chart: (context: ChartBuildContext) => CheckedChartSpec<TSpec>,
  options: TOptions,
): ChartDefinitionWithOptions<DefinedResponsiveChart<TSpec>, TOptions>
export function defineChart<
  const TMarks extends readonly ChartMark<any, any, any, any, any, any, any>[],
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
  const TSpec extends ErasedChartSpec,
  const TOptions extends ChartDefinitionOptions<
    ChartSpecDatum<TSpec>,
    ChartSpecXValue<TSpec>,
    ChartSpecYValue<TSpec>
  >,
>(
  definition: DefinedResponsiveChart<TSpec>,
  options: TOptions,
): ChartDefinitionWithOptions<DefinedResponsiveChart<TSpec>, TOptions>
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
  definition: TDefinition &
    (ErasedChartSpec extends ReturnType<TDefinition['chart']>
      ? unknown
      : never),
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
  scale: NonNullable<ChartPositionScaleOptions['scale']>,
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
  const scaleChannels = collectPositionScaleChannels(initialized)
  const scaleDefinitions = resolveScaleDefinitions(definition, scaleChannels)
  const resolvedLayout = resolveSceneLayout(
    definition,
    initialized,
    width,
    height,
    theme,
    scaleDefinitions,
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
    positionScales,
    scaleGuides,
    gridScales,
  } = resolvedLayout
  const markEntries: ViewportMarkEntry[] = []
  const defaultFocusEntries: DefaultFocusEntry<TDatum, TXValue, TYValue>[] = []
  const points: ChartPoint<TDatum, TXValue, TYValue>[] = []
  const focusGuides: SceneFocusGuide[] = []
  const firstBaseMarkIndex = marks.findIndex(
    (mark) => !mark.focus && !mark.focusGuideOnly,
  )

  marks.forEach((mark, markIndex) => {
    const translateX = markViewportTranslation(
      mark,
      'x',
      positionScales,
      scales,
    )
    const translateY = markViewportTranslation(
      mark,
      'y',
      positionScales,
      scales,
    )
    const viewportX = translateX !== undefined
    const viewportY = translateY !== undefined
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
              x: point.x + (translateX ?? 0),
              y: point.y + (translateY ?? 0),
            }
          : point
      ) as ChartPoint<TDatum, TXValue, TYValue>
      registerMappedFocusCoordinates(
        presented,
        mark,
        scales,
        translateX,
        translateY,
      )
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
      focusGuides.push({ ...guide, placement: guide.placement ?? placement })
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
    markEntries.push({
      key: mark.id,
      nodes: entryNodes,
      translateX,
      translateY,
    })
  })
  const markNodes = arrangeViewportMarkNodes(markEntries, chart)
  const nodes: SceneNode[] = [
    {
      kind: 'group',
      key: 'marks',
      className: 'ts-chart__marks',
      clip: definition.clip ? chart : undefined,
      children: markNodes,
    },
  ]
  if (gridScales.length) {
    nodes.unshift(createGrid(chart, gridScales, theme))
  }
  if (scaleGuides.length) {
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
    const focusRing =
      typeof definition.focusRing === 'object'
        ? definition.focusRing
        : undefined
    const radius = finiteNonNegative(focusRing?.radius, 5)
    const fill = focusRing?.fill ?? 'var(--ts-chart-focus-fill, Canvas)'
    const stroke = focusRing?.stroke
    const strokeWidth = finiteNonNegative(focusRing?.strokeWidth, 2.5)
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
          radius,
          style: {
            fill,
            stroke: stroke ?? point.color,
            strokeWidth,
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

function registerMappedFocusCoordinates(
  point: ChartPoint,
  mark: Pick<ResolvedSceneMark, 'channels'>,
  scales: ChartScene['scales'],
  translateX: number | undefined,
  translateY: number | undefined,
): void {
  register('x', point.xValue, point.x, translateX)
  register('y', point.yValue, point.y, translateY)

  function register(
    axis: ChartPositionChannel,
    value: ChartValue,
    coordinate: number,
    translate: number | undefined,
  ) {
    const scaleId = mark.channels[axis]?.scale
    const scale = scaleId === undefined ? undefined : scales[scaleId]
    if (!scale || scale.type === 'none') return
    const mapped = scale.map(value) + (translate ?? 0)
    if (Number.isFinite(mapped) && mapped !== coordinate) {
      setMappedFocusCoordinate(point, axis, mapped)
    }
  }
}

interface ViewportMarkEntry {
  key: string
  nodes: readonly SceneNode[]
  translateX?: number
  translateY?: number
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

function markViewportTranslation(
  mark: Pick<ResolvedSceneMark, 'channels' | 'viewport'>,
  channel: ChartPositionChannel,
  positionScales: readonly ResolvedPositionScale[],
  scales: ChartScene['scales'],
): number | undefined {
  const ownership = mark.viewport?.[channel]
  if (ownership === 'fixed') return undefined
  for (const positionScale of positionScales) {
    if (
      positionScale.channel === channel &&
      positionScale.scale.viewport &&
      Object.values(mark.channels).some(
        (materialized) => materialized.scale === positionScale.id,
      )
    ) {
      return positionScale.scale.viewport.translate
    }
  }
  return ownership === 'content'
    ? scales[channel]?.viewport?.translate
    : undefined
}

function markUsesAnyViewport(
  mark: Pick<ResolvedSceneMark, 'channels' | 'viewport'>,
  positionScales: readonly ResolvedPositionScale[],
): boolean {
  return (['x', 'y'] as const).some((channel) =>
    positionScales.some(
      (positionScale) =>
        positionScale.channel === channel &&
        positionScale.scale.viewport &&
        mark.viewport?.[channel] !== 'fixed' &&
        (mark.viewport?.[channel] === 'content' ||
          Object.values(mark.channels).some(
            (materialized) => materialized.scale === positionScale.id,
          )),
    ),
  )
}

function arrangeViewportMarkNodes(
  entries: readonly ViewportMarkEntry[],
  chart: ChartBounds,
): SceneNode[] {
  return entries.flatMap((entry): SceneNode[] => {
    if (entry.translateX === undefined && entry.translateY === undefined) {
      return [...entry.nodes]
    }
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
            ...(entry.translateX === undefined
              ? {}
              : { translateX: entry.translateX }),
            ...(entry.translateY === undefined
              ? {}
              : { translateY: entry.translateY }),
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
  if (!Object.values(scene.scales).some((scale) => scale.viewport))
    return points
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
  return (['x', 'y'] as const).some((axis) => {
    const ownership = mark.viewport?.[axis]
    if (ownership === 'fixed') return false
    if (ownership === 'content' && scene.scales[axis]?.viewport) return true
    return Object.entries(mark.channels).some(
      ([channelName, channel]) =>
        channelName === axis &&
        channel.scale !== undefined &&
        scene.scales[channel.scale]?.viewport !== undefined,
    )
  })
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

function collectPositionScaleChannels(
  marks: readonly InitializedMark<unknown>[],
): ReadonlyMap<string, CollectedPositionScaleChannels> {
  const collected = new Map<string, CollectedPositionScaleChannels>()
  for (const mark of marks) {
    for (const [channelName, channel] of Object.entries(mark.channels)) {
      const scaleId = channel.scale
      if (scaleId === undefined) continue
      const positionChannel = readMaterializedPositionChannel(
        channelName,
        channel,
      )
      if (scaleId === 'color') {
        if (positionChannel) {
          throw new TypeError('Position scales cannot use reserved ID "color"')
        }
        continue
      }
      const current = collected.get(scaleId) ?? {
        values: [],
        includeZero: false,
        materialized: false,
      }
      if (
        positionChannel &&
        current.channel &&
        current.channel !== positionChannel
      ) {
        throw new TypeError(
          `Chart scale "${scaleId}" cannot materialize both x and y channels`,
        )
      }
      current.channel ??= positionChannel
      current.materialized ||= !mark.focusGuideOnly
      current.includeZero ||= channel.includeZero ?? false
      for (const value of channel.values) current.values.push(value)
      collected.set(scaleId, current)
    }
  }
  return collected
}

function resolveScaleDefinitions(
  definition: StaticChartDefinition,
  collected: ReadonlyMap<string, CollectedPositionScaleChannels>,
): readonly PositionScaleDefinition[] {
  const scales = definition.scales

  if (!scales || !Object.hasOwn(scales, 'x') || !Object.hasOwn(scales, 'y')) {
    throw new TypeError('Chart scales must define reserved `x` and `y` entries')
  }

  for (const scaleId of collected.keys()) {
    if (!Object.hasOwn(scales, scaleId)) {
      throw new TypeError(
        `Chart scale "${scaleId}" is used by a mark but is not configured`,
      )
    }
  }

  return Object.entries(scales).map(([id, options]) => {
    if (id === 'color') {
      throw new TypeError('Position scales cannot use reserved ID "color"')
    }
    const channels = collected.get(id) ?? {
      values: [],
      includeZero: false,
      materialized: false,
    }
    const reservedChannel = id === 'x' || id === 'y' ? id : undefined
    const configuredChannel = options?.channel
    if (!reservedChannel && options !== null && !configuredChannel) {
      throw new TypeError(
        `Named chart scale "${id}" requires channel: "x" or channel: "y"`,
      )
    }
    const channel =
      reservedChannel ?? configuredChannel ?? channels.channel ?? 'x'
    if (
      (configuredChannel && configuredChannel !== channel) ||
      (channels.channel && channels.channel !== channel)
    ) {
      throw new TypeError(
        `Chart scale "${id}" is configured for ${channel} but is used as ${channels.channel ?? configuredChannel}`,
      )
    }
    const side = options?.side ?? (channel === 'x' ? 'bottom' : 'left')
    if (
      (channel === 'x' && side !== 'top' && side !== 'bottom') ||
      (channel === 'y' && side !== 'left' && side !== 'right')
    ) {
      throw new TypeError(
        `Chart scale "${id}" uses ${channel} and cannot render an axis on the ${side} side`,
      )
    }
    return { id, channel, side, options, channels }
  })
}

interface CollectedScaleChannels {
  values: unknown[]
  includeZero: boolean
  materialized: boolean
}

interface CollectedPositionScaleChannels extends CollectedScaleChannels {
  channel?: ChartPositionChannel
}

interface PositionScaleDefinition {
  id: string
  channel: ChartPositionChannel
  side: ChartAxisSide
  options: ChartPositionScaleOptions | null | undefined
  channels: CollectedPositionScaleChannels
}

interface ResolvedPositionScale extends PositionScaleDefinition {
  scale: ChartScene['scales'][string]
}

interface ResolvedSceneLayout {
  margin: ChartMargin
  chart: ChartBounds
  scales: ChartScene['scales']
  axes: SceneGroup
  positionScales: readonly ResolvedPositionScale[]
  scaleGuides: readonly ResolvedPositionScale[]
  gridScales: readonly ResolvedPositionScale[]
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
  scaleDefinitions: readonly PositionScaleDefinition[],
  resolveScale: ChartScaleResolver,
  layout: ChartLayoutOptions,
): ResolvedSceneLayout {
  const locks = resolveMarginLocks(definition.margin)
  const hasGuides =
    definition.guides !== false && scaleDefinitions.some(hasScaleGuide)
  const inset = hasGuides ? automaticGuideInset : 0
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
    const scales: Record<string, ChartScene['scales'][string]> = {}
    const resolvedScales: ResolvedPositionScale[] = []
    for (const scaleDefinition of scaleDefinitions) {
      const { id, channel, options, channels } = scaleDefinition
      const length = channel === 'x' ? chart.width : chart.height
      const tickCount = resolveTickCount(
        options,
        length,
        channel === 'x' ? 92 : 48,
        channel === 'x' ? 8 : 7,
      )
      const range: readonly [number, number] =
        channel === 'x'
          ? [chart.x, chart.x + chart.width]
          : [chart.y + chart.height, chart.y]
      const scale =
        options == null
          ? createUnusedScale(id, channels.materialized, options)
          : resolveScale({
              id,
              channel,
              values: channels.values,
              range,
              options,
              tickCount,
              includeZero: channels.includeZero,
            })
      scales[id] = scale
      resolvedScales.push({ ...scaleDefinition, scale })
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
    const scaleGuides =
      definition.guides === false ? [] : resolvedScales.filter(hasScaleGuide)
    const gridScales =
      definition.guides === false ? [] : resolvedScales.filter(hasScaleGrid)
    const resolvedAxes = createAxes(
      chart,
      scaleGuides,
      theme,
      width,
      layout.measureText,
      layout.typography?.direction === 'rtl',
    )
    return {
      margin,
      chart,
      scales,
      axes: resolvedAxes.axes,
      positionScales: resolvedScales,
      scaleGuides,
      gridScales,
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
          markUsesAnyViewport(mark, resolved.positionScales),
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

function hasScaleGuide(
  scale: PositionScaleDefinition | ResolvedPositionScale,
): boolean {
  return scale.options != null && scale.options.axis !== false
}

function hasScaleGrid(
  scale: PositionScaleDefinition | ResolvedPositionScale,
): boolean {
  return scale.options != null && scale.options.grid === true
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
  includeBoundsMargin(margin, chart, bounds)
  return bounds
}

function includeBoundsMargin(
  margin: ChartMargin,
  chart: ChartBounds,
  bounds: ChartBounds,
) {
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

function finiteNonNegative(
  value: number | undefined,
  fallback: number,
): number {
  return value !== undefined && Number.isFinite(value) && value >= 0
    ? value
    : fallback
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
  guides: readonly ResolvedPositionScale[],
  theme: ChartTheme,
): SceneGroup {
  const children: SceneNode[] = []

  for (const guide of guides) {
    if (!guide.options?.grid) continue
    for (const tick of guide.scale.ticks) {
      const key = `${guide.id}-grid:${valueKey(tick.value)}`
      children.push(
        guide.channel === 'x'
          ? {
              kind: 'rule',
              key,
              x1: tick.position,
              x2: tick.position,
              y1: chart.y,
              y2: chart.y + chart.height,
            }
          : {
              kind: 'rule',
              key,
              x1: chart.x,
              x2: chart.x + chart.width,
              y1: tick.position,
              y2: tick.position,
            },
      )
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
  guides: readonly ResolvedPositionScale[],
  theme: ChartTheme,
  width: number,
  measureText?: ChartTextMeasurer,
  rightToLeft = false,
): ResolvedAxes {
  const children: SceneNode[] = []
  const inset = guides.length ? automaticGuideInset : 0
  const margin = uniformMargin(inset)
  const offsets: Record<ChartAxisSide, number> = {
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  }
  const chartRight = chart.x + chart.width
  const chartBottom = chart.y + chart.height

  for (const guide of guides) {
    const offset = offsets[guide.side]
    margin[guide.side] = Math.max(
      margin[guide.side],
      offset + automaticGuideInset,
    )
    const axisPosition =
      guide.side === 'top'
        ? chart.y - offset
        : guide.side === 'right'
          ? chartRight + offset
          : guide.side === 'bottom'
            ? chartBottom + offset
            : chart.x - offset
    let outward = axisPosition
    const includeOutward = (bounds: ChartBounds) => {
      includeBoundsMargin(margin, chart, bounds)
      if (guide.side === 'top') outward = Math.min(outward, bounds.y)
      else if (guide.side === 'right') {
        outward = Math.max(outward, bounds.x + bounds.width)
      } else if (guide.side === 'bottom') {
        outward = Math.max(outward, bounds.y + bounds.height)
      } else outward = Math.min(outward, bounds.x)
    }
    const includeCoordinate = (coordinate: number) => {
      if (guide.side === 'top' || guide.side === 'left') {
        outward = Math.min(outward, coordinate)
      } else {
        outward = Math.max(outward, coordinate)
      }
    }

    if (guide.channel === 'x') {
      renderXAxis(guide, axisPosition, includeOutward, includeCoordinate)
    } else {
      renderYAxis(guide, axisPosition, includeOutward, includeCoordinate)
    }

    const distance =
      guide.side === 'top'
        ? chart.y - outward
        : guide.side === 'right'
          ? outward - chartRight
          : guide.side === 'bottom'
            ? outward - chartBottom
            : chart.x - outward
    offsets[guide.side] = Math.max(offset, distance) + 8
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

  function renderXAxis(
    guide: ResolvedPositionScale,
    axisY: number,
    includeOutward: (bounds: ChartBounds) => void,
    includeCoordinate: (coordinate: number) => void,
  ) {
    const presentation = axisPresentation(guide.options)
    const bottom = guide.side === 'bottom'
    const direction = bottom ? 1 : -1
    if (presentation?.line !== false) {
      children.push({
        kind: 'rule',
        key: `${guide.id}-axis`,
        x1: chart.x,
        x2: chartRight,
        y1: axisY,
        y2: axisY,
        style: axisStyle(),
      })
    }
    const ticks = presentation?.ticks === false ? [] : guide.scale.ticks
    const tickSize = finiteMargin(
      presentation?.ticks === false ? 0 : (presentation?.ticks?.size ?? 4),
    )
    const tickPadding = finiteMargin(
      presentation?.ticks === false ? 0 : (presentation?.ticks?.padding ?? 4),
    )
    const tickLabels = tickLabelPresentation(presentation)
    const candidates =
      tickLabels === false
        ? []
        : createTickLabelCandidates(
            guide,
            withKeptTicks(guide.scale, guide.options, tickLabels),
            axisY,
            tickSize,
            tickPadding,
            tickLabels,
            width,
            theme,
            measureText,
            rightToLeft,
          )
    const visibleLabels =
      tickLabels === false
        ? []
        : thinTickLabels(candidates, tickLabels, guide.scale.type === 'band')
    let tickOuter = axisY

    for (const tick of ticks) {
      if (tickSize <= 0) continue
      const tickEnd = axisY + direction * tickSize
      includeCoordinate(tickEnd)
      tickOuter = bottom
        ? Math.max(tickOuter, tickEnd)
        : Math.min(tickOuter, tickEnd)
      children.push({
        kind: 'rule',
        key: `${guide.id}-tick-rule:${valueKey(tick.value)}`,
        x1: tick.position,
        x2: tick.position,
        y1: axisY,
        y2: tickEnd,
        style: axisStyle(),
      })
    }
    for (const candidate of visibleLabels) {
      includeOutward(candidate.bounds)
      tickOuter = bottom
        ? Math.max(tickOuter, candidate.bounds.y + candidate.bounds.height)
        : Math.min(tickOuter, candidate.bounds.y)
      children.push(candidate.label)
    }

    const axisLabel = presentation?.label
    const labelText =
      typeof axisLabel === 'string' ? axisLabel : axisLabel?.text
    if (!labelText) return
    const labelOptions = typeof axisLabel === 'object' ? axisLabel : undefined
    const labelOffset = labelOptions?.offset ?? 'auto'
    const explicitOffset = labelOffset !== 'auto'
    const label: SceneLabel = {
      kind: 'label',
      key: `${guide.id}-label`,
      x: chart.x + chart.width / 2,
      y: explicitOffset
        ? axisY + direction * Math.max(0, finiteMargin(labelOffset))
        : tickOuter + direction * 8,
      text: labelText,
      anchor: 'middle',
      baseline: bottom && !explicitOffset ? 'hanging' : 'auto',
      fontSize: labelOptions?.fontSize ?? (width < 360 ? 10 : 11),
      fontWeight: labelOptions?.fontWeight ?? 600,
      style: {
        fill: labelOptions?.fill ?? theme.foreground,
        ...(labelOptions?.opacity === undefined
          ? { fillOpacity: 0.76 }
          : { opacity: labelOptions.opacity }),
      },
    }
    includeOutward(measureSceneLabelBounds(label, measureText))
    children.push(label)
  }

  function renderYAxis(
    guide: ResolvedPositionScale,
    axisX: number,
    includeOutward: (bounds: ChartBounds) => void,
    includeCoordinate: (coordinate: number) => void,
  ) {
    const presentation = axisPresentation(guide.options)
    const right = guide.side === 'right'
    const direction = right ? 1 : -1
    if (presentation?.line !== false) {
      children.push({
        kind: 'rule',
        key: `${guide.id}-axis`,
        x1: axisX,
        x2: axisX,
        y1: chart.y,
        y2: chartBottom,
        style: axisStyle(),
      })
    }
    const ticks = presentation?.ticks === false ? [] : guide.scale.ticks
    const tickSize = finiteMargin(
      presentation?.ticks === false ? 0 : (presentation?.ticks?.size ?? 4),
    )
    const tickPadding = finiteMargin(
      presentation?.ticks === false ? 0 : (presentation?.ticks?.padding ?? 4),
    )
    const tickLabels = tickLabelPresentation(presentation)
    const candidates =
      tickLabels === false
        ? []
        : createTickLabelCandidates(
            guide,
            withKeptTicks(guide.scale, guide.options, tickLabels),
            axisX,
            tickSize,
            tickPadding,
            tickLabels,
            width,
            theme,
            measureText,
            rightToLeft,
          )
    const visibleLabels =
      tickLabels === false ? [] : thinTickLabels(candidates, tickLabels, false)
    let tickOuter = axisX

    for (const tick of ticks) {
      if (tickSize <= 0) continue
      const tickEnd = axisX + direction * tickSize
      includeCoordinate(tickEnd)
      tickOuter = right
        ? Math.max(tickOuter, tickEnd)
        : Math.min(tickOuter, tickEnd)
      children.push({
        kind: 'rule',
        key: `${guide.id}-tick-rule:${valueKey(tick.value)}`,
        x1: axisX,
        x2: tickEnd,
        y1: tick.position,
        y2: tick.position,
        style: axisStyle(),
      })
    }
    for (const candidate of visibleLabels) {
      includeOutward(candidate.bounds)
      tickOuter = right
        ? Math.max(tickOuter, candidate.bounds.x + candidate.bounds.width)
        : Math.min(tickOuter, candidate.bounds.x)
      children.push(candidate.label)
    }

    const axisLabel = presentation?.label
    const labelText =
      typeof axisLabel === 'string' ? axisLabel : axisLabel?.text
    if (!labelText) return
    const labelOptions = typeof axisLabel === 'object' ? axisLabel : undefined
    const label: SceneLabel = {
      kind: 'label',
      key: `${guide.id}-label`,
      x: axisX,
      y: chart.y + chart.height / 2,
      text: labelText,
      anchor: 'middle',
      baseline: 'middle',
      rotate: right ? 90 : -90,
      fontSize: labelOptions?.fontSize ?? 11,
      fontWeight: labelOptions?.fontWeight ?? 600,
      style: {
        fill: labelOptions?.fill ?? theme.foreground,
        ...(labelOptions?.opacity === undefined
          ? { fillOpacity: 0.76 }
          : { opacity: labelOptions.opacity }),
      },
    }
    const labelOffset = labelOptions?.offset ?? 'auto'
    if (labelOffset !== 'auto') {
      label.x = axisX + direction * Math.max(0, finiteMargin(labelOffset))
    } else {
      const localBounds = measureSceneLabelBounds(
        { ...label, x: 0, y: 0 },
        measureText,
      )
      label.x = right
        ? tickOuter + 8 - localBounds.x
        : tickOuter - 8 - (localBounds.x + localBounds.width)
    }
    includeOutward(measureSceneLabelBounds(label, measureText))
    children.push(label)
  }

  function axisStyle() {
    return { stroke: theme.foreground, strokeOpacity: 0.28 }
  }
}

function resolveTickCount(
  axis: ChartPositionScaleOptions | null | undefined,
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
  axis: ChartPositionScaleOptions | null | undefined,
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

interface TickLabelCandidate {
  value: ChartValue
  label: SceneLabel
  bounds: ChartBounds
  hard: boolean
}

function withKeptTicks(
  scale: ChartScene['scales'][string],
  axis: ChartPositionScaleOptions | null | undefined,
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
  guide: ResolvedPositionScale,
  ticks: readonly (ChartTick & { hard?: boolean })[],
  axisPosition: number,
  size: number,
  padding: number,
  options: ChartAxisTickLabelOptions,
  width: number,
  theme: ChartTheme,
  measureText: ChartTextMeasurer | undefined,
  rightToLeft = false,
): TickLabelCandidate[] {
  const defaultFontSize = width < 360 ? 10 : 11
  const positiveSide = guide.side === 'bottom' || guide.side === 'right'
  const direction = positiveSide ? 1 : -1
  return ticks.map((tick, index) => {
    const context: ChartAxisTickLabelContext = {
      value: tick.value,
      index,
      position: tick.position,
      bandwidth: guide.scale.bandwidth,
    }
    const rotate = options.rotate
    const fontSize =
      resolveTickLabelValue(options.fontSize, context) ?? defaultFontSize
    const fontWeight = resolveTickLabelValue(options.fontWeight, context)
    const opacity = resolveTickLabelValue(options.opacity, context)
    const dx = resolveTickLabelValue(options.dx, context) ?? 0
    const dy = resolveTickLabelValue(options.dy, context) ?? 0
    // Automatic anchors preserve a physical placement outside the plot.
    // Authored anchors remain logical SVG start/end values.
    const automaticAnchor: NonNullable<SceneLabel['anchor']> =
      guide.channel === 'y'
        ? positiveSide
          ? 'start'
          : 'end'
        : (rotate ?? 0) < 0
          ? 'end'
          : (rotate ?? 0) > 0
            ? 'start'
            : 'middle'
    const anchor =
      resolveTickLabelValue(options.anchor, context) ??
      mirrorAutomaticAnchor(automaticAnchor, rightToLeft)
    const label: SceneLabel =
      guide.channel === 'x'
        ? {
            kind: 'label',
            key: `${guide.id}-tick-label:${valueKey(tick.value)}`,
            x: tick.position + dx,
            y:
              axisPosition + direction * (size + padding + fontSize * 0.8) + dy,
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
            key: `${guide.id}-tick-label:${valueKey(tick.value)}`,
            x: axisPosition + direction * (size + padding) + dx,
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

function mirrorAutomaticAnchor(
  anchor: NonNullable<SceneLabel['anchor']>,
  rightToLeft: boolean,
): NonNullable<SceneLabel['anchor']> {
  if (!rightToLeft || anchor === 'middle') return anchor
  return anchor === 'start' ? 'end' : 'start'
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
