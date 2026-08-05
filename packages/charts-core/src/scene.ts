import { createColorScale, valueKey } from './scales'
import { resolveConfiguredScale } from './configured-scale'
import { measureSceneLabelBounds } from './guide-layout'
import { nearestScenePoint } from './nearest'
import { chartSceneSource } from './scene-source'
import type {
  DynamicChartDefinition,
  InitializedMark,
  ChartAxisOptions,
  ChartAxisPresentationOptions,
  ChartAxisTickLabelOptions,
  ChartBounds,
  ChartBuildContext,
  CheckedChartSpec,
  ChartDefinitionOptions,
  DynamicChartConfig,
  ChartColorLegend,
  ChartLayoutOptions,
  ChartMargin,
  ChartMark,
  ChartMarkDatum,
  ChartMarkPointX,
  ChartMarkPointY,
  ChartPoint,
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

export function defineChart<
  const TMarks extends readonly ChartMark<unknown, any, any>[],
  const TSpec extends ChartSpec<TMarks>,
>(
  spec: TSpec & { marks: TMarks } & ChartDefinitionOptions<
      ChartMarkDatum<TMarks[number]>,
      ChartMarkPointX<TMarks[number]>,
      ChartMarkPointY<TMarks[number]>
    >,
): StaticChartDefinition<
  ChartMarkDatum<TMarks[number]>,
  ChartMarkPointX<TMarks[number]>,
  ChartMarkPointY<TMarks[number]>
> &
  Omit<TSpec, keyof ChartDefinitionOptions>
export function defineChart<
  const TSpec extends {
    marks: readonly ChartMark<unknown, any, any>[]
    x?: ChartAxisOptions<any> | null
    y?: ChartAxisOptions<any> | null
  },
>(
  config: DynamicChartConfig<TSpec>,
): DynamicChartDefinition<
  ChartSpecDatum<TSpec>,
  ChartSpecXValue<TSpec>,
  ChartSpecYValue<TSpec>
>
export function defineChart<
  const TSpec extends {
    marks: readonly ChartMark<unknown, any, any>[]
    x?: ChartAxisOptions<any> | null
    y?: ChartAxisOptions<any> | null
  },
>(
  chart: (context: ChartBuildContext) => CheckedChartSpec<TSpec>,
): DynamicChartDefinition<
  ChartSpecDatum<TSpec>,
  ChartSpecXValue<TSpec>,
  ChartSpecYValue<TSpec>
>
export function defineChart<
  TDatum,
  TXValue extends ChartValue,
  TYValue extends ChartValue,
>(
  definition: StaticChartDefinition<TDatum, TXValue, TYValue>,
  options: ChartDefinitionOptions<TDatum, TXValue, TYValue>,
): StaticChartDefinition<TDatum, TXValue, TYValue>
export function defineChart<
  TDatum,
  TXValue extends ChartValue,
  TYValue extends ChartValue,
>(
  definition: DynamicChartDefinition<TDatum, TXValue, TYValue>,
  options: ChartDefinitionOptions<TDatum, TXValue, TYValue>,
): DynamicChartDefinition<TDatum, TXValue, TYValue>
export function defineChart(definition?: any, options?: any): any {
  if (options) return { ...definition, ...options }
  return (
    typeof definition === 'function' ? { chart: definition } : definition
  ) as StaticChartDefinition | DynamicChartDefinition
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
  return typeof scale === 'function'
    ? resolveConfiguredScale(scale, context)
    : scale.resolve(context)
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
  const theme: ChartTheme = {
    ...defaultChartTheme,
    ...definition.theme,
    palette: definition.theme?.palette ?? defaultChartTheme.palette,
  }
  const initialized = definition.marks.map((mark, markIndex) =>
    mark.initialize({ markIndex }),
  )
  const colorChannels = collectScaleChannels(initialized, 'color')
  const colors = createColorScale(colorChannels.values, definition.color, theme)
  if (
    colors.kind !== 'categorical' &&
    initialized.some((mark) => mark.seriesFromColor)
  ) {
    throw new TypeError(
      'A continuous color channel cannot infer series identity; supply z explicitly',
    )
  }
  const legend = colors.domain.length ? definition.color?.legend : undefined
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
    colors,
    legend,
    axes,
    resolveScale,
    layout,
  )
  const { margin, chart, scales, axes: axisNodes } = resolvedLayout
  const markNodes: SceneNode[] = []
  const points: ChartPoint<TDatum, TXValue, TYValue>[] = []
  const firstBaseMarkIndex = initialized.findIndex((mark) => !mark.focus)

  initialized.forEach((mark, markIndex) => {
    const rendered = mark.render({
      markIndex,
      chart,
      scales,
      theme,
      color: colors.map,
      colors,
      layout,
    })
    const renderedPoints = collectRenderedPoints(
      rendered.nodes,
      rendered.points,
    )
    if (mark.focus) {
      markNodes.push({
        kind: 'group',
        key: `focus:${mark.id}`,
        className: 'ts-chart__focus-layer',
        ariaHidden: true,
        focus: {
          match: mark.focus.match ?? 'primary',
          points: rendered.focusPoints ?? renderedPoints,
          placement:
            firstBaseMarkIndex < 0 || markIndex < firstBaseMarkIndex
              ? 'under'
              : 'over',
        },
        children: rendered.nodes,
      })
    } else {
      const markPoints = renderedPoints as readonly ChartPoint<
        TDatum,
        TXValue,
        TYValue
      >[]
      if (mark.states) {
        markNodes.push({
          kind: 'group',
          key: `states:${mark.id}`,
          children: rendered.nodes,
          states: {
            data: mark.states.data,
            definitions: mark.states.definitions,
            points: markPoints,
          },
        })
      } else {
        for (const node of rendered.nodes) markNodes.push(node)
      }
      for (const point of markPoints) points.push(point)
    }
  })
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
  if (legend) nodes.push(legend.render({ colors, chart, theme, width }))
  if (definition.focusRing !== false && points.length) {
    nodes.push({
      kind: 'group',
      key: 'default-focus',
      className: 'ts-chart__focus-layer ts-chart__focus-layer--default',
      ariaHidden: true,
      focus: {
        match: 'primary',
        points,
        placement: 'over',
      },
      children: points.map((point) => ({
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
    [chartSceneSource]: [definition, initialized],
  } as ChartScene<TDatum, TXValue, TYValue> & {
    [chartSceneSource]: readonly [
      StaticChartDefinition<TDatum, TXValue, TYValue>,
      readonly InitializedMark[],
    ]
  }
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
): ChartPoint<TDatum, TXValue, TYValue> | null {
  return nearestScenePoint(scene, x, y, maxDistance)
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
  marks: readonly InitializedMark<unknown>[],
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
  marks: readonly InitializedMark<unknown>[],
  width: number,
  height: number,
  theme: ChartTheme,
  xChannels: CollectedScaleChannels,
  yChannels: CollectedScaleChannels,
  colors: ResolvedColorScale,
  legend: ChartColorLegend | undefined,
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
    }
  }

  function measureMargin(resolved: ResolvedSceneLayout): ChartMargin {
    const automatic = resolved.guideMargin
    if (legend && locks.top === undefined) {
      automatic.top = Math.max(
        automatic.top,
        legend.height(colors.domain.length, {
          colors,
          chart: resolved.chart,
          theme,
          width,
        }),
      )
    }
    if (!definition.clip) {
      marks.forEach((mark, markIndex) => {
        const labels = mark.layoutLabels?.({
          markIndex,
          chart: resolved.chart,
          scales: resolved.scales,
          theme,
          color: colors.map,
          colors,
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
  const children: SceneNode[] =
    !showX || xAxis?.line === false
      ? []
      : [
          {
            kind: 'rule',
            key: 'x-axis',
            x1: chart.x,
            x2: chart.x + chart.width,
            y1: chart.y + chart.height,
            y2: chart.y + chart.height,
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
      x1: chart.x,
      x2: chart.x,
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
  const xTickRotate = xTickLabels === false ? undefined : xTickLabels.rotate
  let xTickBottom = chart.y + chart.height
  let yTickLeft = chart.x
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
          chart,
          xTickSize,
          xTickPadding,
          xTickRotate,
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
          chart,
          yTickSize,
          yTickPadding,
          yTickLabels.rotate,
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
        y1: chart.y + chart.height,
        y2: chart.y + chart.height + xTickSize,
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
      xTickBottom = Math.max(xTickBottom, bounds.y + bounds.height)
    }
    children.push(candidate.label)
  }

  for (const tick of showY ? yTicks : []) {
    const key = valueKey(tick.value)
    if (yTickSize > 0) {
      children.push({
        kind: 'rule',
        key: `y-tick-rule:${key}`,
        x1: chart.x - yTickSize,
        x2: chart.x,
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
      yTickLeft = Math.min(yTickLeft, bounds.x)
    }
    children.push(candidate.label)
  }

  const xAxisLabel = axisLabelText(xAxis)
  if (showX && xAxisLabel) {
    const offset = axisLabelOffset(xAxis)
    const hasOffset = offset !== 'auto'
    const label: SceneLabel = {
      kind: 'label',
      key: 'x-label',
      x: chart.x + chart.width / 2,
      y: hasOffset
        ? chart.y + chart.height + Math.max(0, finiteMargin(offset))
        : xTickBottom + 8,
      text: xAxisLabel,
      anchor: 'middle',
      baseline: hasOffset ? 'auto' : 'hanging',
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
      x: chart.x,
      y: chart.y + chart.height / 2,
      text: yAxisLabel,
      anchor: 'middle',
      baseline: 'middle',
      rotate: -90,
      fontSize: 11,
      fontWeight: 600,
      style: { fill: theme.foreground, fillOpacity: 0.76 },
    }
    const offset = axisLabelOffset(yAxis)
    if (offset !== 'auto') {
      yLabel.x = chart.x - Math.max(0, finiteMargin(offset))
    } else {
      const localBounds = measureSceneLabelBounds(
        { ...yLabel, x: 0, y: 0 },
        measureText,
      )
      yLabel.x = yTickLeft - 8 - (localBounds.x + localBounds.width)
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
  chart: ChartBounds,
  size: number,
  padding: number,
  rotate: number | undefined,
  width: number,
  theme: ChartTheme,
  measureText: ChartTextMeasurer | undefined,
): TickLabelCandidate[] {
  const fontSize = width < 360 ? 10 : 11
  return ticks.map((tick) => {
    const label: SceneLabel =
      axis === 'x'
        ? {
            kind: 'label',
            key: `x-tick-label:${valueKey(tick.value)}`,
            x: tick.position,
            y: chart.y + chart.height + size + padding + fontSize * 0.8,
            text: tick.label,
            anchor:
              (rotate ?? 0) < 0
                ? 'end'
                : (rotate ?? 0) > 0
                  ? 'start'
                  : 'middle',
            rotate,
            fontSize,
            style: {
              fill: theme.muted,
              fillOpacity: 0.68,
            },
          }
        : {
            kind: 'label',
            key: `y-tick-label:${valueKey(tick.value)}`,
            x: chart.x - size - padding,
            y: tick.position,
            text: tick.label,
            anchor: 'end',
            baseline: 'middle',
            rotate,
            fontSize,
            style: {
              fill: theme.muted,
              fillOpacity: 0.68,
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
