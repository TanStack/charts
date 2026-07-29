import { channelValues, createMark } from './mark'
import { valueKey } from './scales'
import { createChartScene } from './scene'
import type {
  Channel,
  ChartBounds,
  ChartKey,
  ChartMark,
  ChartMargin,
  ChartPoint,
  ChartScene,
  ChartSpec,
  ChartTheme,
  ResolvedScale,
  SceneGroup,
  SceneLabel,
  SceneNode,
  StaticChartDefinition,
} from './types'

export type FacetAxes = 'outer' | 'cell'

export interface FacetOptions<TDatum> {
  id?: string
  by: Channel<TDatum, ChartKey>
  chart: (data: readonly TDatum[], key: ChartKey) => ChartSpec
  columns?: number
  minWidth?: number
  gap?: number
  label?: boolean | ((key: ChartKey) => string)
  axes?: FacetAxes
}

interface FacetEntry<TDatum> {
  key: ChartKey
  data: TDatum[]
}

export function facet<TDatum>(
  source: Iterable<TDatum>,
  options: FacetOptions<NoInfer<TDatum>>,
): ChartMark<TDatum> {
  const data = Array.isArray(source) ? source : Array.from(source)

  return createMark(({ markIndex }) => {
    const id = options.id ?? `facet-${markIndex}`
    const keys = channelValues(data, options.by, () => '')
    const groups = new Map<string, FacetEntry<TDatum>>()
    data.forEach((datum, index) => {
      const key = keys[index]
      if (!isKey(key)) return
      const identity = valueKey(key)
      const group = groups.get(identity)
      if (group) group.data.push(datum)
      else groups.set(identity, { key, data: [datum] })
    })

    return {
      id,
      channels: {},
      render: ({ chart, theme, layout }) => {
        const entries = [...groups.values()]
        const gap = Math.max(0, options.gap ?? 16)
        const automaticColumns = Math.max(
          1,
          Math.floor((chart.width + gap) / ((options.minWidth ?? 220) + gap)),
        )
        const columns = Math.max(
          1,
          Math.min(
            entries.length || 1,
            Math.floor(options.columns ?? automaticColumns),
          ),
        )
        const rows = Math.max(1, Math.ceil(entries.length / columns))
        const cellWidth = cellSize(chart.width, gap, columns)
        const cellHeight = cellSize(chart.height, gap, rows)
        const showLabel = options.label !== false
        const labelHeight = showLabel ? 22 : 0
        const definitions = entries.map((entry) =>
          mergeTheme<TDatum>(options.chart(entry.data, entry.key), theme),
        )

        if (
          options.axes === 'cell' ||
          entries.length <= 1 ||
          definitions.every((definition) => definition.guides === false)
        ) {
          return renderCellAxes({
            id,
            entries,
            definitions,
            chart,
            columns,
            cellWidth,
            cellHeight,
            gap,
            labelHeight,
            showLabel,
            label: options.label,
            theme,
            layout,
          })
        }

        const guideScenes = entries.map((entry, index) =>
          createFacetScene(
            id,
            entry,
            {
              ...definitions[index]!,
              marks: definitions[index]!.marks.map(withoutMarkRendering),
            },
            {
              width: cellWidth,
              height: Math.max(1, cellHeight - labelHeight),
            },
            layout,
          ),
        )
        assertOuterAxes(id, definitions, guideScenes)

        return renderOuterAxes({
          id,
          entries,
          definitions,
          chart,
          columns,
          rows,
          gap,
          labelHeight,
          showLabel,
          label: options.label,
          theme,
          margin: maxSceneMargins(guideScenes),
          layout,
        })
      },
    }
  })
}

interface CellRenderOptions<TDatum> {
  id: string
  entries: readonly FacetEntry<TDatum>[]
  definitions: readonly StaticChartDefinition<TDatum>[]
  chart: ChartBounds
  columns: number
  cellWidth: number
  cellHeight: number
  gap: number
  labelHeight: number
  showLabel: boolean
  label: FacetOptions<TDatum>['label']
  theme: ChartTheme
  layout: Parameters<typeof createChartScene>[2]
}

function renderCellAxes<TDatum>(options: CellRenderOptions<TDatum>) {
  const {
    id,
    entries,
    definitions,
    chart,
    columns,
    cellWidth,
    cellHeight,
    gap,
    labelHeight,
    showLabel,
    label,
    theme,
    layout,
  } = options
  const points: ChartPoint<TDatum>[] = []
  const children = entries.map((entry, index) => {
    const column = index % columns
    const row = Math.floor(index / columns)
    const x = chart.x + column * (cellWidth + gap)
    const y = chart.y + row * (cellHeight + gap)
    const scene = createFacetScene(
      id,
      entry,
      definitions[index]!,
      {
        width: cellWidth,
        height: Math.max(1, cellHeight - labelHeight),
      },
      layout,
    )
    const identity = valueKey(entry.key)
    for (const point of offsetPoints(
      id,
      identity,
      scene.points,
      x,
      y + labelHeight,
    )) {
      points.push(point)
    }
    return facetCell({
      id,
      identity,
      entry,
      x,
      y,
      width: cellWidth,
      labelHeight,
      showLabel,
      label,
      theme,
      nodes: scene.nodes,
    })
  })
  return facetScene(id, children, points)
}

interface OuterRenderOptions<TDatum> extends Omit<
  CellRenderOptions<TDatum>,
  'cellWidth' | 'cellHeight'
> {
  rows: number
  margin: ChartMargin
}

function renderOuterAxes<TDatum>(options: OuterRenderOptions<TDatum>) {
  const {
    id,
    entries,
    definitions,
    chart,
    columns,
    rows,
    gap,
    labelHeight,
    showLabel,
    label,
    theme,
    margin,
    layout,
  } = options
  const plotWidth = cellSize(
    Math.max(1, chart.width - margin.left - margin.right),
    gap,
    columns,
  )
  const plotHeight = cellSize(
    Math.max(1, chart.height - margin.top - margin.bottom - labelHeight * rows),
    gap,
    rows,
  )
  const originX = chart.x + margin.left
  const originY = chart.y + margin.top
  const points: ChartPoint<TDatum>[] = []
  const axes: SceneGroup[] = []
  let xTitle: SceneLabel | undefined
  let yTitle: SceneLabel | undefined
  let deepestPlotBottom = originY

  const children = entries.map((entry, index) => {
    const column = index % columns
    const row = Math.floor(index / columns)
    const x = originX + column * (plotWidth + gap)
    const y = originY + row * (plotHeight + labelHeight + gap)
    const plotY = y + labelHeight
    const scene = createFacetScene(
      id,
      entry,
      { ...definitions[index]!, margin: 0 },
      { width: plotWidth, height: plotHeight },
      layout,
    )
    const axis = scene.nodes.find(
      (node): node is SceneGroup =>
        node.kind === 'group' && node.key === 'axes',
    )
    const identity = valueKey(entry.key)
    deepestPlotBottom = Math.max(deepestPlotBottom, plotY + plotHeight)
    for (const point of offsetPoints(id, identity, scene.points, x, plotY)) {
      points.push(point)
    }

    if (axis && column === 0) {
      const yChildren = axis.children.filter(
        (node) => node.key.startsWith('y-') && node.key !== 'y-label',
      )
      if (yChildren.length) {
        axes.push({
          kind: 'group',
          key: `${id}:outer-y:${row}`,
          className: 'ts-chart__facet-axis ts-chart__facet-axis--y',
          ariaHidden: true,
          translateX: x,
          translateY: plotY,
          children: yChildren,
        })
      }
    }

    if (axis && index + columns >= entries.length) {
      const xChildren = axis.children.filter(
        (node) => node.key.startsWith('x-') && node.key !== 'x-label',
      )
      if (xChildren.length) {
        axes.push({
          kind: 'group',
          key: `${id}:outer-x:${column}`,
          className: 'ts-chart__facet-axis ts-chart__facet-axis--x',
          ariaHidden: true,
          translateX: x,
          translateY: plotY,
          children: xChildren,
        })
      }
    }

    xTitle ??= axis?.children.find(
      (node): node is SceneLabel =>
        node.kind === 'label' && node.key === 'x-label',
    )
    yTitle ??= axis?.children.find(
      (node): node is SceneLabel =>
        node.kind === 'label' && node.key === 'y-label',
    )

    return facetCell({
      id,
      identity,
      entry,
      x,
      y,
      width: plotWidth,
      labelHeight,
      showLabel,
      label,
      theme,
      nodes: scene.nodes.filter((node) => node.key !== 'axes'),
    })
  })

  if (xTitle) {
    axes.push({
      kind: 'group',
      key: `${id}:outer-x-title`,
      className: 'ts-chart__facet-axis-title',
      ariaHidden: true,
      children: [
        {
          ...xTitle,
          key: `${id}:x-label`,
          x:
            originX +
            (columns * plotWidth + Math.max(0, columns - 1) * gap) / 2,
          y: deepestPlotBottom + xTitle.y - plotHeight,
        },
      ],
    })
  }

  if (yTitle) {
    axes.push({
      kind: 'group',
      key: `${id}:outer-y-title`,
      className: 'ts-chart__facet-axis-title',
      ariaHidden: true,
      children: [
        {
          ...yTitle,
          key: `${id}:y-label`,
          x: originX + yTitle.x,
          y: (originY + labelHeight + deepestPlotBottom) / 2,
        },
      ],
    })
  }

  return facetScene(
    id,
    [
      ...children,
      {
        kind: 'group',
        key: `${id}:outer-axes`,
        className: 'ts-chart__facet-axes',
        ariaHidden: true,
        children: axes,
      },
    ],
    points,
  )
}

function facetCell<TDatum>(options: {
  id: string
  identity: string
  entry: FacetEntry<TDatum>
  x: number
  y: number
  width: number
  labelHeight: number
  showLabel: boolean
  label: FacetOptions<TDatum>['label']
  theme: ChartTheme
  nodes: readonly SceneNode[]
}): SceneGroup {
  const {
    id,
    identity,
    entry,
    x,
    y,
    width,
    labelHeight,
    showLabel,
    label,
    theme,
    nodes,
  } = options
  return {
    kind: 'group',
    key: `${id}:${identity}`,
    className: 'ts-chart__facet-cell',
    translateX: x,
    translateY: y,
    children: [
      ...(showLabel
        ? [
            {
              kind: 'label' as const,
              key: `${id}:${identity}:label`,
              x: width / 2,
              y: 11,
              text:
                typeof label === 'function'
                  ? label(entry.key)
                  : String(entry.key),
              anchor: 'middle' as const,
              fontSize: 11,
              fontWeight: 600,
              style: {
                fill: theme.foreground,
                fillOpacity: 0.78,
              },
            },
          ]
        : []),
      {
        kind: 'group',
        key: `${id}:${identity}:chart`,
        translateY: labelHeight,
        children: nodes,
      },
    ],
  }
}

function facetScene<TDatum>(
  id: string,
  children: readonly SceneNode[],
  points: readonly ChartPoint<TDatum>[],
) {
  return {
    nodes: [
      {
        kind: 'group' as const,
        key: id,
        className: 'ts-chart__facet',
        children,
      },
    ],
    points,
  }
}

function createFacetScene<TDatum>(
  id: string,
  entry: FacetEntry<TDatum>,
  definition: StaticChartDefinition<TDatum>,
  size: { width: number; height: number },
  layout: Parameters<typeof createChartScene>[2],
): ChartScene<TDatum> {
  try {
    return createChartScene(definition, size, layout)
  } catch (error) {
    throw new TypeError(
      `Facet "${id}" cell "${String(entry.key)}" could not compile: ${
        error instanceof Error ? error.message : String(error)
      }`,
      { cause: error },
    )
  }
}

function withoutMarkRendering(mark: ChartMark<unknown>): ChartMark<unknown> {
  return {
    initialize: (context) => {
      const initialized = mark.initialize(context)
      return { ...initialized, render: () => ({ nodes: [] }) }
    },
  }
}

function assertOuterAxes(
  id: string,
  definitions: readonly StaticChartDefinition[],
  scenes: readonly ChartScene[],
): void {
  const firstDefinition = definitions[0]
  const firstScene = scenes[0]
  const incompatible =
    !firstDefinition ||
    !firstScene ||
    definitions.some(
      (definition) =>
        definition.guides === false ||
        definition.margin !== undefined ||
        definition.color?.legend !== undefined,
    ) ||
    scenes.slice(1).some((scene, index) => {
      const definition = definitions[index + 1]!
      return (
        !sameAxis(firstDefinition.x, definition.x) ||
        !sameAxis(firstDefinition.y, definition.y) ||
        !sameScale(firstScene.scales.x!, scene.scales.x!) ||
        !sameScale(firstScene.scales.y!, scene.scales.y!) ||
        firstScene.theme.foreground !== scene.theme.foreground ||
        firstScene.theme.muted !== scene.theme.muted
      )
    })

  if (incompatible) {
    throw new TypeError(
      `Facet "${id}" cannot share outer axes because its cell scales or guide options differ; use axes: "cell" for independent scales`,
    )
  }
}

function sameAxis(
  left: StaticChartDefinition['x'],
  right: StaticChartDefinition['x'],
): boolean {
  if (left === null || right === null) return left === right
  return (
    left?.label === right?.label &&
    left?.labelOffset === right?.labelOffset &&
    left?.tickRotate === right?.tickRotate
  )
}

function sameScale(left: ResolvedScale, right: ResolvedScale): boolean {
  return (
    left.type === right.type &&
    sameValues(left.domain, right.domain) &&
    left.ticks.length === right.ticks.length &&
    left.ticks.every(
      (tick, index) =>
        valueKey(tick.value) === valueKey(right.ticks[index]?.value) &&
        tick.label === right.ticks[index]?.label,
    ) &&
    scaleDirection(left) === scaleDirection(right)
  )
}

function sameValues(
  left: readonly unknown[],
  right: readonly unknown[],
): boolean {
  return (
    left.length === right.length &&
    left.every((value, index) => valueKey(value) === valueKey(right[index]))
  )
}

function scaleDirection(scale: ResolvedScale): number {
  const first = scale.domain[0]
  const last = scale.domain.at(-1)
  if (first === undefined || last === undefined) return 0
  return Math.sign(scale.map(last) - scale.map(first))
}

function mergeTheme<TDatum>(
  spec: ChartSpec,
  theme: ChartTheme,
): StaticChartDefinition<TDatum> {
  return {
    ...spec,
    theme: {
      ...theme,
      ...spec.theme,
      palette: spec.theme?.palette ?? theme.palette,
    },
  }
}

function offsetPoints<TDatum>(
  id: string,
  identity: string,
  points: readonly ChartPoint<TDatum>[],
  x: number,
  y: number,
): ChartPoint<TDatum>[] {
  return points.map((point) => ({
    ...point,
    key: `${id}:${identity}:${point.key}`,
    x: point.x + x,
    y: point.y + y,
  }))
}

function maxSceneMargins(scenes: readonly ChartScene[]): ChartMargin {
  return scenes.reduce(
    (margin, scene) => ({
      top: Math.max(margin.top, scene.margin.top),
      right: Math.max(margin.right, scene.margin.right),
      bottom: Math.max(margin.bottom, scene.margin.bottom),
      left: Math.max(margin.left, scene.margin.left),
    }),
    { top: 0, right: 0, bottom: 0, left: 0 },
  )
}

function cellSize(size: number, gap: number, count: number): number {
  return Math.max(1, (size - gap * (count - 1)) / count)
}

export function facetChart<TDatum>(
  source: Iterable<TDatum>,
  options: FacetOptions<NoInfer<TDatum>>,
): StaticChartDefinition<TDatum> {
  return {
    marks: [facet(source, options)],
    guides: false,
    margin: 0,
    x: null,
    y: null,
  }
}

function isKey(value: unknown): value is ChartKey {
  return typeof value === 'string' || typeof value === 'number'
}
