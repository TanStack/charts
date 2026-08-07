import {
  treemap as createTreemapLayout,
  treemapBinary,
  treemapDice,
  treemapSlice,
  treemapSliceDice,
  treemapSquarify,
} from 'd3-hierarchy'
import { measureSceneLabelBounds } from './guide-layout'
import {
  aggregateFlatHierarchyValues,
  buildFlatHierarchy,
  flatHierarchyAncestorIds,
  flatHierarchyNodeContext,
  flatHierarchyNodeValue,
} from './hierarchy-flat-internal'
import { channelValues, isChartKey, markStates, visualValue } from './mark'
import { createMarkWithScaleValues } from './mark-with-scale-values'
import { valueKey } from './scales'
import type {
  FlatHierarchyDatum,
  FlatHierarchyNode,
  FlatHierarchyOptions,
} from './hierarchy-flat-internal'
import type { TransformValue } from './transform'
import type {
  Channel,
  ChartKey,
  ChartMark,
  ChartMarkMotionOptions,
  ChartMarkState,
  ChartPoint,
  ChartRectStateStyle,
  SceneLabel,
  SceneNode,
  VisualChannel,
} from './types'
import type { HierarchyRectangularNode, TreemapLayout } from 'd3-hierarchy'

export type TreemapMethod =
  'squarify' | 'binary' | 'dice' | 'slice' | 'slice-dice'

export interface TreemapTileDatum<TDatum> {
  readonly id: string
  readonly parentId: string | null
  readonly name: string
  readonly datum: TDatum | null
  readonly sourceIndex: number | null
}

/** A native D3-compatible tiler over the mark's private hierarchy copy. */
export type TreemapTile<TDatum = unknown> = (
  node: HierarchyRectangularNode<TreemapTileDatum<TDatum>>,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
) => void

export interface TreemapNode<TDatum> {
  readonly id: string
  readonly parentId: string | null
  readonly ancestorIds: readonly string[]
  readonly name: string
  readonly data: TDatum | null
  readonly depth: number
  readonly height: number
  readonly internal: boolean
  readonly external: boolean
  readonly value: number
  readonly source: readonly TDatum[]
  readonly sourceIndexes: readonly number[]
}

export type TreemapNodeComparator<TDatum> = (
  left: TreemapNode<TDatum>,
  right: TreemapNode<TDatum>,
) => number

interface TreemapSharedOptions<TDatum> extends ChartMarkMotionOptions<
  TreemapNode<TDatum>
> {
  /** Mark identity. Explicit hierarchy identity uses `nodeId`. */
  readonly id?: string
  readonly value: TransformValue<TDatum, number | null | undefined>
  /** Built-in shorthand or a D3-compatible tiler. Defaults to `squarify`. */
  readonly method?: TreemapMethod | TreemapTile<TDatum>
  /** Target squarify aspect ratio. Defaults to the golden ratio. */
  readonly ratio?: number
  readonly round?: boolean
  /** Pixel gap between adjacent children. Defaults to zero. */
  readonly paddingInner?: number
  /** Pixel gap between parent edges and children. Defaults to zero. */
  readonly paddingOuter?: number
  readonly sort?: TreemapNodeComparator<TDatum>
  readonly color?: Channel<TreemapNode<TDatum>, ChartKey | null | undefined>
  readonly fill?: VisualChannel<TreemapNode<TDatum>, string>
  readonly fillOpacity?: number
  readonly stroke?: VisualChannel<TreemapNode<TDatum>, string>
  readonly strokeOpacity?: number
  readonly strokeWidth?: number
  readonly inset?: number
  readonly radius?: number
  readonly states?: readonly ChartMarkState<
    TreemapNode<TDatum>,
    ChartRectStateStyle<TreemapNode<TDatum>>
  >[]
  readonly label?: Channel<
    TreemapNode<TDatum>,
    string | number | null | undefined
  >
  readonly labelFill?: VisualChannel<TreemapNode<TDatum>, string>
  readonly labelFontSize?: number
  readonly labelFontWeight?: number
  /** Minimum painted pixels around an in-cell label. Defaults to 4. */
  readonly labelPadding?: number
}

export type TreemapPathOptions<TDatum> = TreemapSharedOptions<TDatum> & {
  readonly path: TransformValue<TDatum, string>
  readonly delimiter?: string
  readonly nodeId?: never
  readonly parentId?: never
}

export type TreemapParentOptions<TDatum> = TreemapSharedOptions<TDatum> & {
  readonly nodeId: TransformValue<TDatum, string>
  readonly parentId: TransformValue<TDatum, string | null | undefined>
  readonly path?: never
  readonly delimiter?: never
}

export type TreemapOptions<TDatum> =
  TreemapPathOptions<TDatum> | TreemapParentOptions<TDatum>

/** Lays out and renders hierarchy leaves in final plot-space pixels. */
export function treemap<
  TDatum,
  const TPath extends TransformValue<TDatum, string>,
>(
  source: Iterable<TDatum>,
  options: TreemapSharedOptions<TDatum> & {
    readonly path: TPath
    readonly delimiter?: string
    readonly nodeId?: never
    readonly parentId?: never
  },
): ChartMark<TreemapNode<TDatum>, string, number, never, never>
export function treemap<
  TDatum,
  const TNodeId extends TransformValue<TDatum, string>,
  const TParentId extends TransformValue<TDatum, string | null | undefined>,
>(
  source: Iterable<TDatum>,
  options: TreemapSharedOptions<TDatum> & {
    readonly nodeId: TNodeId
    readonly parentId: TParentId
    readonly path?: never
    readonly delimiter?: never
  },
): ChartMark<TreemapNode<TDatum>, string, number, never, never>
export function treemap<TDatum>(
  source: Iterable<TDatum>,
  options: TreemapOptions<TDatum>,
): ChartMark<TreemapNode<TDatum>, string, number, never, never> {
  const hierarchyOptions: FlatHierarchyOptions<TDatum> =
    options.path !== undefined
      ? { path: options.path, delimiter: options.delimiter }
      : {
          id: (options as TreemapParentOptions<TDatum>).nodeId,
          parentId: (options as TreemapParentOptions<TDatum>).parentId,
        }
  const hierarchy = buildFlatHierarchy(source, hierarchyOptions, 'treemap')
  aggregateFlatHierarchyValues(hierarchy, options.value, 'treemap')

  const contexts = new WeakMap<FlatHierarchyNode<TDatum>, TreemapNode<TDatum>>()
  const context = (node: FlatHierarchyNode<TDatum>) => {
    const existing = contexts.get(node)
    if (existing) return existing
    const created = Object.freeze(treemapNodeContext(node))
    contexts.set(node, created)
    return created
  }
  if (options.sort) {
    hierarchy.root.sort((left, right) => {
      const compared = options.sort!(
        context(left as FlatHierarchyNode<TDatum>),
        context(right as FlatHierarchyNode<TDatum>),
      )
      if (!Number.isFinite(compared)) {
        throw new TypeError('treemap: sort result must be finite')
      }
      return compared
    })
  }

  const method = options.method ?? 'squarify'
  const ratio = options.ratio ?? (1 + Math.sqrt(5)) / 2
  assertMethod(method)
  if (options.ratio !== undefined && method !== 'squarify') {
    throw new TypeError('treemap: ratio is only valid with method "squarify"')
  }
  if (!Number.isFinite(ratio) || ratio < 1) {
    throw new TypeError('treemap: ratio must be finite and at least 1')
  }
  const paddingInner = options.paddingInner ?? 0
  const paddingOuter = options.paddingOuter ?? 0
  assertNonnegativeFinite(paddingInner, 'paddingInner')
  assertNonnegativeFinite(paddingOuter, 'paddingOuter')
  const inset = options.inset ?? 0.75
  const labelPadding = options.labelPadding ?? 4
  assertNonnegativeFinite(inset, 'inset')
  assertNonnegativeFinite(labelPadding, 'labelPadding')

  return createMarkWithScaleValues<
    TreemapNode<TDatum>,
    string,
    number,
    never,
    never
  >(({ markIndex }) => {
    const id = options.id ?? `treemap-${markIndex}`
    return {
      id,
      channels: {},
      seriesFromColor: options.color !== undefined,
      resolveLayout: ({ chart, layout }) => {
        const root = hierarchy.root.copy()
        const laidOut = configureLayout(
          createTreemapLayout<FlatHierarchyDatum<TDatum>>(),
          chart.width,
          chart.height,
          method,
          ratio,
          options.round ?? false,
          paddingInner,
          paddingOuter,
        )(root)
        const leaves = laidOut.leaves()
        assertLayoutCoordinates(leaves, chart.width, chart.height)
        const cells = leaves
          .map((node) => materializeCell(node, chart.x, chart.y))
          .filter((cell) => cell.x1 > cell.x0 && cell.y1 > cell.y0)
        const nodes = cells.map((cell) => cell.node)
        const colorValues = channelValues(nodes, options.color, () => null)
        const labels = materializeLabels(
          cells,
          options.label,
          options.labelFontSize ?? 11,
          options.labelFontWeight,
          inset,
          labelPadding,
          layout.measureText,
          id,
        )

        return {
          channels: {
            color: {
              scale: 'color',
              values: colorValues.filter(isChartKey),
            },
          },
          states: markStates(nodes, options.states),
          render: ({ color: resolveColor, theme }) => {
            const points: ChartPoint<TreemapNode<TDatum>, string, number>[] = []
            const children: SceneNode[] = []
            cells.forEach((cell, nodeIndex) => {
              const node = cell.node
              const colorValue = colorValues[nodeIndex]
              const fallback = resolveColor(
                isChartKey(colorValue) ? colorValue : null,
              )
              const fill = visualValue(
                options.fill,
                node,
                nodeIndex,
                nodes,
                fallback,
              )
              const key = `${id}:node:${valueKey(node.id)}`
              const group = isChartKey(colorValue) ? colorValue : null
              const point: ChartPoint<TreemapNode<TDatum>, string, number> = {
                key,
                markId: id,
                group,
                groupLabel: group === null ? id : String(group),
                datum: node,
                datumIndex: nodeIndex,
                xValue: node.id,
                yValue: node.value,
                x: cell.x,
                y: cell.y,
                color: fill,
              }
              points.push(point)
              children.push({
                kind: 'rect',
                key,
                x: cell.x0 + inset,
                y: cell.y0 + inset,
                width: Math.max(0, cell.x1 - cell.x0 - inset * 2),
                height: Math.max(0, cell.y1 - cell.y0 - inset * 2),
                radius: options.radius,
                inset,
                insetAxis: 'xy',
                interaction: { point },
                style: {
                  fill,
                  fillOpacity: options.fillOpacity,
                  stroke:
                    options.stroke === undefined
                      ? undefined
                      : visualValue(
                          options.stroke,
                          node,
                          nodeIndex,
                          nodes,
                          fallback,
                        ),
                  strokeOpacity: options.strokeOpacity,
                  strokeWidth: options.strokeWidth,
                },
              })
              const label = labels.get(node.id)
              if (label) {
                children.push({
                  ...label,
                  key: `${key}:label`,
                  pointOwner: point,
                  style: {
                    fill: visualValue(
                      options.labelFill,
                      node,
                      nodeIndex,
                      nodes,
                      theme.foreground,
                    ),
                  },
                })
              }
            })
            return {
              nodes: [
                {
                  kind: 'group',
                  key: id,
                  className: 'ts-chart__treemap ts-chart__rect ts-chart__text',
                  ariaHidden: true,
                  children,
                },
              ],
              points,
            }
          },
        }
      },
    }
  }, options.motion)
}

function configureLayout<TDatum>(
  layout: TreemapLayout<FlatHierarchyDatum<TDatum>>,
  width: number,
  height: number,
  method: TreemapMethod | TreemapTile<TDatum>,
  ratio: number,
  round: boolean,
  paddingInner: number,
  paddingOuter: number,
): TreemapLayout<FlatHierarchyDatum<TDatum>> {
  const tile =
    typeof method === 'function'
      ? method
      : method === 'squarify'
        ? treemapSquarify.ratio(ratio)
        : method === 'binary'
          ? treemapBinary
          : method === 'dice'
            ? treemapDice
            : method === 'slice'
              ? treemapSlice
              : treemapSliceDice
  return layout
    .size([width, height])
    .tile(tile)
    .round(round)
    .paddingInner(paddingInner)
    .paddingOuter(paddingOuter)
}

function treemapNodeContext<TDatum>(
  node: FlatHierarchyNode<TDatum>,
): TreemapNode<TDatum> {
  return {
    ...flatHierarchyNodeContext(node),
    ancestorIds: flatHierarchyAncestorIds(node),
    value: flatHierarchyNodeValue(node),
  }
}

interface TreemapLayoutCell<TDatum> {
  readonly node: TreemapNode<TDatum>
  readonly x0: number
  readonly y0: number
  readonly x1: number
  readonly y1: number
  readonly x: number
  readonly y: number
}

function materializeCell<TDatum>(
  node: HierarchyRectangularNode<FlatHierarchyDatum<TDatum>>,
  offsetX: number,
  offsetY: number,
): TreemapLayoutCell<TDatum> {
  const x0 = offsetX + node.x0
  const y0 = offsetY + node.y0
  const x1 = offsetX + node.x1
  const y1 = offsetY + node.y1
  return {
    node: treemapNodeContext(node as FlatHierarchyNode<TDatum>),
    x0,
    y0,
    x1,
    y1,
    x: (x0 + x1) / 2,
    y: (y0 + y1) / 2,
  }
}

function assertLayoutCoordinates<TDatum>(
  nodes: readonly HierarchyRectangularNode<FlatHierarchyDatum<TDatum>>[],
  width: number,
  height: number,
): void {
  nodes.forEach((node) => {
    const coordinates = [node.x0, node.y0, node.x1, node.y1]
    if (!coordinates.every(Number.isFinite)) {
      throw new TypeError(
        `treemap: layout produced non-finite coordinates for node "${node.data.id}"`,
      )
    }
    if (node.x1 < node.x0 || node.y1 < node.y0) {
      throw new TypeError(
        `treemap: layout produced reversed coordinates for node "${node.data.id}"`,
      )
    }
    if (node.x0 < 0 || node.y0 < 0 || node.x1 > width || node.y1 > height) {
      throw new TypeError(
        `treemap: layout produced out-of-bounds coordinates for node "${node.data.id}"`,
      )
    }
  })
}

function materializeLabels<TDatum>(
  cells: readonly TreemapLayoutCell<TDatum>[],
  channel:
    | Channel<TreemapNode<TDatum>, string | number | null | undefined>
    | undefined,
  fontSize: number,
  fontWeight: number | undefined,
  inset: number,
  padding: number,
  measureText: Parameters<typeof measureSceneLabelBounds>[1],
  id: string,
): ReadonlyMap<string, SceneLabel> {
  if (channel === undefined) return new Map()
  const nodes = cells.map((cell) => cell.node)
  const values = channelValues(nodes, channel, () => null)
  const labels = new Map<string, SceneLabel>()
  cells.forEach((cell, index) => {
    const node = cell.node
    const value = values[index]
    if (value == null || String(value).length === 0) return
    const label: SceneLabel = {
      kind: 'label',
      key: `${id}:label:${valueKey(node.id)}`,
      x: cell.x,
      y: cell.y,
      text: String(value),
      anchor: 'middle',
      baseline: 'middle',
      fontSize,
      fontWeight,
    }
    const bounds = measureSceneLabelBounds(label, measureText)
    const left = cell.x0 + inset + padding
    const right = cell.x1 - inset - padding
    const top = cell.y0 + inset + padding
    const bottom = cell.y1 - inset - padding
    if (
      bounds.x >= left &&
      bounds.x + bounds.width <= right &&
      bounds.y >= top &&
      bounds.y + bounds.height <= bottom
    ) {
      labels.set(node.id, label)
    }
  })
  return labels
}

function assertMethod(
  value: unknown,
): asserts value is TreemapMethod | TreemapTile<unknown> {
  if (typeof value === 'function') return
  if (
    value !== 'squarify' &&
    value !== 'binary' &&
    value !== 'dice' &&
    value !== 'slice' &&
    value !== 'slice-dice'
  ) {
    throw new TypeError(`treemap: invalid method "${value}"`)
  }
}

function assertNonnegativeFinite(value: unknown, description: string) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new TypeError(
      `treemap: ${description} must be nonnegative and finite`,
    )
  }
}
