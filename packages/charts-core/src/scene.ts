import { createColorScale, valueKey } from './scales'
import { resolveConfiguredScale } from './configured-scale'
import { measureSceneLabelBounds } from './guide-layout'
import { nearestPoint } from './nearest'
import type {
  DynamicChartConfig,
  DynamicChartDefinition,
  InitializedMark,
  ChartAxisOptions,
  ChartBounds,
  ChartBuildContext,
  CheckedChartSpec,
  ChartColorLegend,
  ChartLayoutOptions,
  ChartMargin,
  ChartMark,
  ChartMarkDatum,
  ChartPoint,
  ChartScene,
  ChartScaleResolver,
  ChartSize,
  ChartSpec,
  ChartSpecDatum,
  StaticChartDefinition,
  ChartTheme,
  ChartTextMeasurer,
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
  spec: TSpec & { marks: TMarks },
): StaticChartDefinition<ChartMarkDatum<TMarks[number]>> & TSpec
export function defineChart<TInput>(): {
  <const TSpec extends ChartSpec, TPrepared = TInput>(
    config: DynamicChartConfig<TInput, TPrepared, TSpec>,
  ): DynamicChartDefinition<TInput, TPrepared, ChartSpecDatum<TSpec>>
  <const TSpec extends ChartSpec>(
    chart: (
      context: ChartBuildContext<TInput, TInput>,
    ) => CheckedChartSpec<TSpec>,
  ): DynamicChartDefinition<TInput, TInput, ChartSpecDatum<TSpec>>
}
export function defineChart<
  TInput,
  const TSpec extends ChartSpec,
  TPrepared = TInput,
>(
  config: DynamicChartConfig<TInput, TPrepared, TSpec>,
): DynamicChartDefinition<TInput, TPrepared, ChartSpecDatum<TSpec>>
export function defineChart<TInput, const TSpec extends ChartSpec>(
  chart: (
    context: ChartBuildContext<TInput, TInput>,
  ) => CheckedChartSpec<TSpec>,
): DynamicChartDefinition<TInput, TInput, ChartSpecDatum<TSpec>>
export function defineChart(definition?: any): any {
  if (definition === undefined) {
    return (dynamicDefinition: any) =>
      (typeof dynamicDefinition === 'function'
        ? { chart: dynamicDefinition }
        : dynamicDefinition) as DynamicChartDefinition
  }
  return (
    typeof definition === 'function' ? { chart: definition } : definition
  ) as StaticChartDefinition | DynamicChartDefinition
}

export function createChartScene<TDatum>(
  definition: StaticChartDefinition<TDatum>,
  size: ChartSize,
  layout: ChartLayoutOptions = {},
): ChartScene<TDatum> {
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

function createChartSceneWithScaleResolver<TDatum>(
  definition: StaticChartDefinition<TDatum>,
  size: ChartSize,
  resolveScale: ChartScaleResolver,
  layout: ChartLayoutOptions,
): ChartScene<TDatum> {
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
  const legend = colors.domain.length ? definition.color?.legend : undefined
  const xChannels = collectScaleChannels(initialized, 'x')
  const yChannels = collectScaleChannels(initialized, 'y')
  const resolvedLayout = resolveSceneLayout(
    definition,
    width,
    height,
    theme,
    xChannels,
    yChannels,
    colors.domain.length,
    legend,
    resolveScale,
    layout.measureText,
  )
  const { margin, chart, scales, axes } = resolvedLayout
  const markNodes: SceneNode[] = []
  const points: ChartPoint<TDatum>[] = []

  initialized.forEach((mark, markIndex) => {
    const rendered = mark.render({
      markIndex,
      chart,
      scales,
      theme,
      color: colors.map,
      layout,
    })
    markNodes.push(...rendered.nodes)
    points.push(...((rendered.points ?? []) as readonly ChartPoint<TDatum>[]))
  })

  return {
    width,
    height,
    margin,
    chart,
    nodes: [
      ...(definition.guides === false
        ? []
        : [createGrid(chart, scales, definition, theme)]),
      {
        kind: 'group',
        key: 'marks',
        className: 'ts-chart__marks',
        clip: definition.clip ? chart : undefined,
        children: markNodes,
      },
      ...(definition.guides === false ? [] : [axes]),
      ...(legend ? [legend.render({ colors, chart, theme, width })] : []),
    ],
    points,
    scales,
    colors,
    gradients: definition.gradients ?? [],
    theme,
  }
}

export function findNearestPoint<TDatum>(
  scene: ChartScene<TDatum>,
  x: number,
  y: number,
  maxDistance = Infinity,
): ChartPoint<TDatum> | null {
  return nearestPoint(scene.points, x, y, maxDistance)
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
      values.push(...channel.values)
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
  width: number,
  height: number,
  theme: ChartTheme,
  xChannels: CollectedScaleChannels,
  yChannels: CollectedScaleChannels,
  colorCount: number,
  legend: ChartColorLegend | undefined,
  resolveScale: ChartScaleResolver,
  measureText: ChartTextMeasurer | undefined,
): ResolvedSceneLayout {
  const locks = resolveMarginLocks(definition.margin)
  const inset = definition.guides === false ? 0 : automaticGuideInset
  let margin = mergeMarginLocks(
    { top: inset, right: inset, bottom: inset, left: inset },
    locks,
  )
  let safeMargin = margin

  for (let pass = 0; pass < layoutPassLimit; pass += 1) {
    const resolved = compileSceneLayout(margin)
    const next = measureMargin(resolved)
    safeMargin = maxMargins(safeMargin, next, locks)
    if (marginsEqual(margin, next)) return resolved
    margin = next
  }

  let resolved = compileSceneLayout(safeMargin)
  const finalMargin = maxMargins(safeMargin, measureMargin(resolved), locks)
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
    const xTickCount =
      definition.x?.ticks ??
      Math.max(2, Math.min(8, Math.floor(chart.width / 92)))
    const yTickCount =
      definition.y?.ticks ??
      Math.max(2, Math.min(7, Math.floor(chart.height / 48)))
    const scales = {
      x:
        definition.x === null
          ? createUnusedScale('x', xChannels.materialized)
          : resolveScale({
              id: 'x',
              values: xChannels.values,
              range: [chart.x, chart.x + chart.width],
              options: definition.x,
              tickCount: xTickCount,
              includeZero: xChannels.includeZero,
            }),
      y:
        definition.y === null
          ? createUnusedScale('y', yChannels.materialized)
          : resolveScale({
              id: 'y',
              values: yChannels.values,
              range: [chart.y + chart.height, chart.y],
              options: definition.y,
              tickCount: yTickCount,
              includeZero: yChannels.includeZero,
            }),
    }
    const resolvedAxes =
      definition.guides === false
        ? {
            axes: {
              kind: 'group' as const,
              key: 'axes',
              className: 'ts-chart__axes',
              ariaHidden: true,
              children: [],
            },
            margin: { top: 0, right: 0, bottom: 0, left: 0 },
          }
        : createAxes(chart, scales, definition, theme, width, measureText)
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
        legend.height(colorCount, resolved.chart.width),
      )
    }
    return mergeMarginLocks(automatic, locks)
  }
}

function resolveMarginLocks(
  margin: StaticChartDefinition['margin'],
): Partial<ChartMargin> {
  if (typeof margin === 'number') {
    const value = finiteMargin(margin)
    return { top: value, right: value, bottom: value, left: value }
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
): ChartMargin {
  return {
    top: locks.top ?? automatic.top,
    right: locks.right ?? automatic.right,
    bottom: locks.bottom ?? automatic.bottom,
    left: locks.left ?? automatic.left,
  }
}

function maxMargins(
  previous: ChartMargin,
  next: ChartMargin,
  locks: Partial<ChartMargin>,
): ChartMargin {
  return mergeMarginLocks(
    {
      top: Math.max(previous.top, next.top),
      right: Math.max(previous.right, next.right),
      bottom: Math.max(previous.bottom, next.bottom),
      left: Math.max(previous.left, next.left),
    },
    locks,
  )
}

function marginsEqual(left: ChartMargin, right: ChartMargin): boolean {
  return marginSides.every(
    (side) => Math.abs(left[side] - right[side]) <= layoutTolerance,
  )
}

function finiteMargin(value: number | undefined): number {
  return value !== undefined && Number.isFinite(value) ? Math.max(0, value) : 0
}

function createUnusedScale(
  id: string,
  materialized: boolean,
): ChartScene['scales'][string] {
  if (materialized) {
    throw new TypeError(
      `Chart scale "${id}" cannot be null when a mark materializes its channel`,
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

  if (definition.y?.grid ?? true) {
    for (const tick of scales.y.ticks) {
      children.push({
        kind: 'rule',
        key: `y-grid:${valueKey(tick.value)}`,
        x1: chart.x,
        x2: chart.x + chart.width,
        y1: tick.position,
        y2: tick.position,
        style: {
          stroke: theme.grid,
          strokeOpacity: 0.11,
          strokeWidth: 1,
        },
      })
    }
  }

  if (definition.x?.grid ?? false) {
    for (const tick of scales.x.ticks) {
      children.push({
        kind: 'rule',
        key: `x-grid:${valueKey(tick.value)}`,
        x1: tick.position,
        x2: tick.position,
        y1: chart.y,
        y2: chart.y + chart.height,
        style: {
          stroke: theme.grid,
          strokeOpacity: 0.11,
          strokeWidth: 1,
        },
      })
    }
  }

  return {
    kind: 'group',
    key: 'grid',
    className: 'ts-chart__grid',
    ariaHidden: true,
    children,
  }
}

function createAxes(
  chart: ChartBounds,
  scales: ChartScene['scales'],
  definition: StaticChartDefinition,
  theme: ChartTheme,
  width: number,
  measureText?: ChartTextMeasurer,
): ResolvedAxes {
  const children: SceneNode[] =
    definition.x === null
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
  const xTickRotate = definition.x?.tickRotate
  const xTickAnchor =
    (xTickRotate ?? 0) < 0 ? 'end' : (xTickRotate ?? 0) > 0 ? 'start' : 'middle'
  let xTickBottom = chart.y + chart.height
  let yTickLeft = chart.x
  const margin: ChartMargin = {
    top: automaticGuideInset,
    right: automaticGuideInset,
    bottom: automaticGuideInset,
    left: automaticGuideInset,
  }

  const addLabel = (label: SceneLabel) => {
    const bounds = measureSceneLabelBounds(label, measureText)
    margin.top = Math.max(margin.top, chart.y - bounds.y + automaticGuideInset)
    margin.right = Math.max(
      margin.right,
      bounds.x + bounds.width - chart.x - chart.width + automaticGuideInset,
    )
    margin.bottom = Math.max(
      margin.bottom,
      bounds.y + bounds.height - chart.y - chart.height + automaticGuideInset,
    )
    margin.left = Math.max(
      margin.left,
      chart.x - bounds.x + automaticGuideInset,
    )
    return bounds
  }

  for (const tick of scales.x.ticks) {
    const key = valueKey(tick.value)
    const label: SceneLabel = {
      kind: 'label',
      key: `x-tick-label:${key}`,
      x: tick.position,
      y: chart.y + chart.height + 17,
      text: tick.label,
      anchor: xTickAnchor,
      rotate: xTickRotate,
      fontSize: width < 360 ? 10 : 11,
      style: {
        fill: theme.muted,
        fillOpacity: 0.68,
      },
    }
    const bounds = addLabel(label)
    if (definition.x?.label && definition.x.labelOffset === undefined) {
      xTickBottom = Math.max(xTickBottom, bounds.y + bounds.height)
    }
    children.push(
      {
        kind: 'rule',
        key: `x-tick-rule:${key}`,
        x1: tick.position,
        x2: tick.position,
        y1: chart.y + chart.height,
        y2: chart.y + chart.height + 4,
        style: {
          stroke: theme.foreground,
          strokeOpacity: 0.28,
        },
      },
      label,
    )
  }

  for (const tick of scales.y.ticks) {
    const key = valueKey(tick.value)
    const label: SceneLabel = {
      kind: 'label',
      key: `y-tick-label:${key}`,
      x: chart.x - 8,
      y: tick.position,
      text: tick.label,
      anchor: 'end',
      baseline: 'middle',
      fontSize: width < 360 ? 10 : 11,
      style: {
        fill: theme.muted,
        fillOpacity: 0.68,
      },
    }
    const bounds = addLabel(label)
    if (definition.y?.label && definition.y.labelOffset === undefined) {
      yTickLeft = Math.min(yTickLeft, bounds.x)
    }
    children.push(
      {
        kind: 'rule',
        key: `y-tick-rule:${key}`,
        x1: chart.x - 4,
        x2: chart.x,
        y1: tick.position,
        y2: tick.position,
        style: {
          stroke: theme.foreground,
          strokeOpacity: 0.28,
        },
      },
      label,
    )
  }

  if (definition.x?.label) {
    const hasOffset = definition.x.labelOffset !== undefined
    const label: SceneLabel = {
      kind: 'label',
      key: 'x-label',
      x: chart.x + chart.width / 2,
      y: hasOffset
        ? chart.y +
          chart.height +
          Math.max(0, finiteMargin(definition.x.labelOffset))
        : xTickBottom + 8,
      text: definition.x.label,
      anchor: 'middle',
      baseline: hasOffset ? 'auto' : 'hanging',
      fontSize: 11,
      fontWeight: 600,
      style: { fill: theme.foreground, fillOpacity: 0.76 },
    }
    addLabel(label)
    children.push(label)
  }

  if (definition.y?.label) {
    const yLabel: SceneLabel = {
      kind: 'label',
      key: 'y-label',
      x: chart.x,
      y: chart.y + chart.height / 2,
      text: definition.y.label,
      anchor: 'middle',
      baseline: 'middle',
      rotate: -90,
      fontSize: 11,
      fontWeight: 600,
      style: { fill: theme.foreground, fillOpacity: 0.76 },
    }
    if (definition.y.labelOffset !== undefined) {
      yLabel.x = chart.x - Math.max(0, finiteMargin(definition.y.labelOffset))
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

function finiteSize(value: number): number {
  return Number.isFinite(value) ? Math.max(1, value) : 1
}
