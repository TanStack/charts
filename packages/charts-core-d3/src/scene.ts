import { createColorScale, createScale, valueKey } from './scales'
import { nearestPoint } from './nearest'
import type {
  ResponsiveChartConfig,
  ResponsiveChartDefinition,
  InitializedMark,
  ChartAxisOptions,
  ChartBounds,
  ChartBuildContext,
  ChartMargin,
  ChartMark,
  ChartMarkDatum,
  ChartPoint,
  ChartScene,
  ChartSize,
  ChartSpec,
  StaticChartDefinition,
  ChartTheme,
  SceneGroup,
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

export function defineChart<const TMarks extends readonly ChartMark<unknown>[]>(
  spec: ChartSpec<TMarks>,
): StaticChartDefinition<ChartMarkDatum<TMarks[number]>>
export function defineChart<TInput>(): {
  <
    TPrepared,
    const TMarks extends readonly ChartMark<unknown>[] =
      readonly ChartMark<unknown>[],
  >(
    config: ResponsiveChartConfig<TInput, TPrepared, TMarks>,
  ): ResponsiveChartDefinition<
    TInput,
    TPrepared,
    ChartMarkDatum<TMarks[number]>
  >
  <
    const TMarks extends readonly ChartMark<unknown>[] =
      readonly ChartMark<unknown>[],
  >(
    chart: (context: ChartBuildContext<TInput, TInput>) => ChartSpec<TMarks>,
  ): ResponsiveChartDefinition<TInput, TInput, ChartMarkDatum<TMarks[number]>>
}
export function defineChart<
  TInput,
  TPrepared = TInput,
  const TMarks extends readonly ChartMark<unknown>[] =
    readonly ChartMark<unknown>[],
>(
  config: ResponsiveChartConfig<TInput, TPrepared, TMarks>,
): ResponsiveChartDefinition<TInput, TPrepared, ChartMarkDatum<TMarks[number]>>
export function defineChart<
  TInput,
  const TMarks extends readonly ChartMark<unknown>[] =
    readonly ChartMark<unknown>[],
>(
  chart: (context: ChartBuildContext<TInput, TInput>) => ChartSpec<TMarks>,
): ResponsiveChartDefinition<TInput, TInput, ChartMarkDatum<TMarks[number]>>
export function defineChart(definition?: any): any {
  if (definition === undefined) {
    return (dynamicDefinition: any) =>
      (typeof dynamicDefinition === 'function'
        ? { chart: dynamicDefinition }
        : dynamicDefinition) as ResponsiveChartDefinition
  }
  return (
    typeof definition === 'function' ? { chart: definition } : definition
  ) as StaticChartDefinition | ResponsiveChartDefinition
}

export function createChartScene<TDatum>(
  definition: StaticChartDefinition<TDatum>,
  size: ChartSize,
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
  const legendHeight = legend?.height(colors.domain.length, width) ?? 0
  const margin = resolveMargin(
    definition.margin,
    width,
    definition,
    legendHeight,
  )
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
  const xChannels = collectScaleChannels(initialized, 'x')
  const yChannels = collectScaleChannels(initialized, 'y')
  const scales = {
    x: createScale(
      'x',
      xChannels.values,
      [chart.x, chart.x + chart.width],
      withAutomaticZero(definition.x, xChannels.includeZero),
      xTickCount,
    ),
    y: createScale(
      'y',
      yChannels.values,
      [chart.y + chart.height, chart.y],
      withAutomaticZero(definition.y, yChannels.includeZero),
      yTickCount,
    ),
  }
  const markNodes: SceneNode[] = []
  const points: ChartPoint<TDatum>[] = []

  initialized.forEach((mark, markIndex) => {
    const rendered = mark.render({
      markIndex,
      chart,
      scales,
      theme,
      color: colors.map,
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
      ...(definition.guides === false
        ? []
        : [createAxes(chart, scales, definition, theme, width)]),
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
): { values: unknown[]; includeZero: boolean } {
  const values: unknown[] = []
  let includeZero = false
  for (const mark of marks) {
    for (const channel of Object.values(mark.channels)) {
      if (channel.scale !== scaleId) continue
      values.push(...channel.values)
      includeZero ||= channel.includeZero ?? false
    }
  }
  return { values, includeZero }
}

function withAutomaticZero(
  options: ChartAxisOptions | undefined,
  includeZero: boolean,
): ChartAxisOptions | undefined {
  if (!includeZero || options?.zero !== undefined) return options
  return { ...options, zero: true }
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
): SceneGroup {
  const children: SceneNode[] = [
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

  for (const tick of scales.x.ticks) {
    const key = valueKey(tick.value)
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
      {
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
      },
    )
  }

  for (const tick of scales.y.ticks) {
    const key = valueKey(tick.value)
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
      {
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
      },
    )
  }

  if (definition.x?.label) {
    children.push({
      kind: 'label',
      key: 'x-label',
      x: chart.x + chart.width / 2,
      y: chart.y + chart.height + Math.max(20, definition.x.labelOffset ?? 34),
      text: definition.x.label,
      anchor: 'middle',
      fontSize: 11,
      fontWeight: 600,
      style: { fill: theme.foreground, fillOpacity: 0.76 },
    })
  }

  if (definition.y?.label) {
    children.push({
      kind: 'label',
      key: 'y-label',
      x: Math.max(8, chart.x - Math.max(20, definition.y.labelOffset ?? 48)),
      y: chart.y + chart.height / 2,
      text: definition.y.label,
      anchor: 'middle',
      baseline: 'middle',
      rotate: -90,
      fontSize: 11,
      fontWeight: 600,
      style: { fill: theme.foreground, fillOpacity: 0.76 },
    })
  }

  return {
    kind: 'group',
    key: 'axes',
    className: 'ts-chart__axes',
    ariaHidden: true,
    children,
  }
}

function resolveMargin(
  margin: StaticChartDefinition['margin'],
  width: number,
  definition: StaticChartDefinition,
  legendHeight: number,
): ChartMargin {
  const compact = width < 360
  if (definition.guides === false && !margin) {
    return { top: legendHeight, right: 0, bottom: 0, left: 0 }
  }
  const defaults: ChartMargin = {
    top: legendHeight || 16,
    right: compact ? 8 : 16,
    bottom: definition.x?.label ? 48 : 36,
    left: definition.y?.label ? (compact ? 52 : 64) : compact ? 42 : 52,
  }
  if (typeof margin === 'number') {
    return { top: margin, right: margin, bottom: margin, left: margin }
  }
  return { ...defaults, ...margin }
}

function finiteSize(value: number): number {
  return Number.isFinite(value) ? Math.max(1, value) : 1
}
