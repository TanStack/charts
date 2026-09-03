import {
  sankey as createSankey,
  sankeyCenter,
  sankeyJustify,
  sankeyLeft,
  sankeyRight,
} from 'd3-sankey'
import { resolveCompositeChildMotion } from './composite-motion-internal'
import { createMarkWithScaleValues } from './mark-with-scale-values'
import { resolveNetworkGraph } from './network-graph-internal'
import {
  composeResolvedChildMarks,
  resolvedChildMarkId,
} from './resolved-layout-child'
import { valueKey } from './scales'
import { transformValues } from './transform-internal'
import type {
  SankeyLink as D3SankeyLink,
  SankeyNode as D3SankeyNode,
} from 'd3-sankey'
import type { TransformValue, TransformValueOutput } from './transform'
import type {
  ChartBounds,
  ChartKey,
  ChartMark,
  ChartMarkDatum,
  ChartMarkPointX,
  ChartMarkPointY,
  ChartMotionContext,
  ChartMotionDefinition,
  ChartMarkMotionOptions,
} from './types'

type AnyChartMark = ChartMark<any, any, any, any, any>
type SankeyMarks = readonly [AnyChartMark, ...AnyChartMark[]]
type ResolvedKey<TDatum, TValue> = Extract<
  TransformValueOutput<TDatum, TValue>,
  ChartKey
>

export type SankeyAlignment = 'left' | 'right' | 'center' | 'justify'

type SankeyAlignmentNodeDatum<
  TNode extends object,
  TNodeKey extends ChartKey,
> = {
  readonly data: TNode
  readonly key: TNodeKey
  readonly sourceIndex: number
}

type SankeyAlignmentLinkDatum<TLink extends object> = {
  readonly data: TLink
  readonly key: ChartKey
  readonly sourceIndex: number
}

/** The private D3 node supplied to a custom alignment callable. */
export type SankeyAlignmentNode<
  TNode extends object,
  TLink extends object,
  TNodeKey extends ChartKey = ChartKey,
> = D3SankeyNode<
  SankeyAlignmentNodeDatum<TNode, TNodeKey>,
  SankeyAlignmentLinkDatum<TLink>
>

/** A native D3-compatible horizontal node-layer aligner. */
export type SankeyNodeAligner<
  TNode extends object,
  TLink extends object,
  TNodeKey extends ChartKey = ChartKey,
> = (
  node: SankeyAlignmentNode<TNode, TLink, TNodeKey>,
  columnCount: number,
) => number

export interface SankeyInset {
  readonly top?: number
  readonly right?: number
  readonly bottom?: number
  readonly left?: number
}

export type SankeyLayoutValue<TValue> =
  TValue | ((chart: ChartBounds) => TValue)

export interface SankeyEndpointContext<
  TNode,
  TNodeKey extends ChartKey = ChartKey,
> {
  readonly kind: 'node'
  readonly key: TNodeKey
  readonly data: TNode
  readonly source: readonly TNode[]
  readonly sourceIndexes: readonly number[]
  readonly index: number
}

export interface SankeyNodeContext<
  TNode,
  TNodeKey extends ChartKey = ChartKey,
> extends SankeyEndpointContext<TNode, TNodeKey> {
  readonly depth: number
  readonly height: number
  readonly value: number
}

export interface SankeyLinkContext<
  TNode,
  TLink,
  TNodeKey extends ChartKey = ChartKey,
> {
  readonly kind: 'link'
  readonly key: ChartKey
  readonly data: TLink
  readonly sourceRows: readonly TLink[]
  readonly sourceIndexes: readonly number[]
  readonly source: TNodeKey
  readonly target: TNodeKey
  readonly sourceKey: TNodeKey
  readonly targetKey: TNodeKey
  readonly sourceIndex: number
  readonly targetIndex: number
  readonly sourceNode: SankeyEndpointContext<TNode, TNodeKey>
  readonly targetNode: SankeyEndpointContext<TNode, TNodeKey>
  readonly value: number
}

export interface SankeyNode<
  TNode,
  TLink,
  TNodeKey extends ChartKey = ChartKey,
> extends SankeyNodeContext<TNode, TNodeKey> {
  readonly layer: number
  readonly x0: number
  readonly x1: number
  readonly y0: number
  readonly y1: number
  readonly x: number
  readonly y: number
  readonly incomingLinks: readonly SankeyLink<TNode, TLink, TNodeKey>[]
  readonly outgoingLinks: readonly SankeyLink<TNode, TLink, TNodeKey>[]
}

export interface SankeyLink<
  TNode,
  TLink,
  TNodeKey extends ChartKey = ChartKey,
> extends Omit<
  SankeyLinkContext<TNode, TLink, TNodeKey>,
  'sourceNode' | 'targetNode'
> {
  readonly sourceNode: SankeyNode<TNode, TLink, TNodeKey>
  readonly targetNode: SankeyNode<TNode, TLink, TNodeKey>
  readonly width: number
  readonly x1: number
  readonly y1: number
  readonly x2: number
  readonly y2: number
}

export interface SankeyDiagramContext<
  TNode,
  TLink,
  TNodeKey extends ChartKey = ChartKey,
> {
  readonly id: string
  readonly chart: ChartBounds
  readonly nodes: readonly SankeyNode<TNode, TLink, TNodeKey>[]
  readonly links: readonly SankeyLink<TNode, TLink, TNodeKey>[]
}

export type SankeyNodeComparator<
  TNode,
  TNodeKey extends ChartKey = ChartKey,
> = (
  left: SankeyNodeContext<TNode, TNodeKey>,
  right: SankeyNodeContext<TNode, TNodeKey>,
) => number

export type SankeyLinkComparator<
  TNode,
  TLink,
  TNodeKey extends ChartKey = ChartKey,
> = (
  left: SankeyLinkContext<TNode, TLink, TNodeKey>,
  right: SankeyLinkContext<TNode, TLink, TNodeKey>,
) => number

export interface SankeyDiagramOptions<
  TNode extends object,
  TLink extends object,
  TNodeKey extends TransformValue<TNode, ChartKey>,
  TSource extends TransformValue<TLink, ChartKey>,
  TTarget extends TransformValue<TLink, ChartKey>,
  TValue extends TransformValue<TLink, number>,
  TMarks extends SankeyMarks,
> extends ChartMarkMotionOptions<ChartMarkDatum<TMarks[number]>> {
  readonly id?: string
  readonly nodes: Iterable<TNode>
  readonly links: Iterable<TLink>
  readonly nodeKey: TNodeKey
  readonly source: TSource
  readonly target: TTarget
  readonly value: TValue
  readonly linkKey?: TransformValue<TLink, ChartKey>
  /** Built-in shorthand or D3-compatible node aligner. Defaults to `justify`. */
  readonly align?:
    | SankeyAlignment
    | SankeyNodeAligner<TNode, TLink, ResolvedKey<TNode, TNodeKey>>
  /** `undefined` lets the layout order nodes; `null` preserves input order. */
  readonly nodeSort?: SankeyNodeComparator<
    TNode,
    ResolvedKey<TNode, TNodeKey>
  > | null
  /** `undefined` lets the layout order links; `null` preserves input order. */
  readonly linkSort?: SankeyLinkComparator<
    TNode,
    TLink,
    ResolvedKey<TNode, TNodeKey>
  > | null
  /** Node width in final pixels. Defaults to 24. */
  readonly nodeWidth?: SankeyLayoutValue<number>
  /** Same-column node separation in final pixels. Defaults to 8. */
  readonly nodePadding?: SankeyLayoutValue<number>
  /** Final-pixel inset from the resolved plot bounds. Defaults to zero. */
  readonly inset?: SankeyLayoutValue<number | SankeyInset>
  /** Number of relaxation passes. Defaults to D3 Sankey's 6. */
  readonly iterations?: number
  /** Ordinary marks over immutable final-pixel node and link rows. */
  readonly marks: (
    context: SankeyDiagramContext<TNode, TLink, ResolvedKey<TNode, TNodeKey>>,
  ) => TMarks
}

/** Resolves a proportional flow layout, then composes ordinary pixel marks. */
export function sankeyDiagram<
  TNode extends object,
  TLink extends object,
  const TNodeKey extends TransformValue<TNode, ChartKey>,
  const TSource extends TransformValue<TLink, ChartKey>,
  const TTarget extends TransformValue<TLink, ChartKey>,
  const TValue extends TransformValue<TLink, number>,
  const TMarks extends SankeyMarks,
>(
  options: SankeyDiagramOptions<
    TNode,
    TLink,
    TNodeKey,
    TSource,
    TTarget,
    TValue,
    TMarks
  >,
): ChartMark<
  ChartMarkDatum<TMarks[number]>,
  ChartMarkPointX<TMarks[number]>,
  ChartMarkPointY<TMarks[number]>,
  never,
  never
> {
  type TResolvedNodeKey = ResolvedKey<TNode, TNodeKey>
  const graph = resolveNetworkGraph(
    options.nodes,
    options.links,
    {
      nodeKey: options.nodeKey,
      source: options.source,
      target: options.target,
    },
    'sankeyDiagram',
  )
  const values = transformValues(graph.links, options.value)
  values.forEach((value, index) =>
    assertNonnegativeFinite(value, `value at link index ${index}`),
  )
  if (graph.nodes.length > 0 && !values.some((value) => value > 0)) {
    throw new TypeError(
      'sankeyDiagram: a nonempty graph requires at least one positive link value',
    )
  }
  const linkKeys = resolveLinkKeys(
    graph.links,
    graph.sourceKeys,
    graph.targetKeys,
    options.linkKey,
  )
  const iterations = options.iterations ?? 6
  assertNonnegativeInteger(iterations, 'iterations')
  const align = options.align ?? 'justify'
  const aligner = sankeyAligner<TNode, TLink, TResolvedNodeKey>(align)

  return createMarkWithScaleValues<
    ChartMarkDatum<TMarks[number]>,
    ChartMarkPointX<TMarks[number]>,
    ChartMarkPointY<TMarks[number]>,
    never,
    never
  >(
    ({ markIndex }) => {
      const id = options.id ?? `sankey-${markIndex}`
      let childMotions = new Map<string, ChartMotionDefinition<any>>()
      const motion = (
        context: ChartMotionContext<ChartMarkDatum<TMarks[number]>>,
      ) => resolveCompositeChildMotion(options.motion, childMotions, context)
      return {
        id,
        channels: {},
        motion,
        resolveLayout: ({ chart }) => {
          const nodeWidth = resolveLayoutNumber(
            options.nodeWidth,
            chart,
            24,
            'nodeWidth',
            true,
          )
          const nodePadding = resolveLayoutNumber(
            options.nodePadding,
            chart,
            8,
            'nodePadding',
            false,
          )
          const inset = resolveInset(options.inset, chart)
          const extent = {
            x0: chart.x + inset.left,
            y0: chart.y + inset.top,
            x1: chart.x + chart.width - inset.right,
            y1: chart.y + chart.height - inset.bottom,
          }
          if (extent.x1 - extent.x0 < nodeWidth) {
            throw new TypeError(
              'sankeyDiagram: inset leaves less horizontal space than nodeWidth',
            )
          }
          if (extent.y1 <= extent.y0) {
            throw new TypeError(
              'sankeyDiagram: inset leaves no vertical layout space',
            )
          }

          const laidOut =
            graph.nodes.length === 0
              ? { nodes: [], links: [] }
              : createSankey<WorkingNode<TNode>, WorkingLink<TLink>>()
                  .nodeId((node) => node.key)
                  .nodeAlign((node, columnCount) =>
                    aligner(
                      node as unknown as SankeyAlignmentNode<
                        TNode,
                        TLink,
                        TResolvedNodeKey
                      >,
                      columnCount,
                    ),
                  )
                  .nodeWidth(nodeWidth)
                  .nodePadding(nodePadding)
                  .extent([
                    [extent.x0, extent.y0],
                    [extent.x1, extent.y1],
                  ])
                  .iterations(iterations)
                  .nodeSort(resolveNodeSort(options.nodeSort))
                  .linkSort(resolveLinkSort(options.linkSort))({
                  nodes: graph.nodes.map((data, index) => ({
                    data,
                    key: graph.nodeKeys[index] as TResolvedNodeKey,
                    sourceIndex: index,
                  })),
                  links: graph.links.map((data, index) => ({
                    data,
                    key: linkKeys[index] as ChartKey,
                    source: graph.sourceKeys[index] as TResolvedNodeKey,
                    target: graph.targetKeys[index] as TResolvedNodeKey,
                    value: values[index] as number,
                    sourceIndex: index,
                  })),
                })
          const output = materializeSankey<TNode, TLink, TResolvedNodeKey>(
            laidOut.nodes,
            laidOut.links,
            graph.nodeIndexes,
          )
          const marks = options.marks({ id, chart, ...output })
          if (!Array.isArray(marks) || marks.length === 0) {
            throw new TypeError(
              'sankeyDiagram: marks must return at least one chart mark',
            )
          }
          const children = marks.map((mark, childIndex) =>
            mark.initialize({ markIndex: childIndex }),
          )
          const composition = composeResolvedChildMarks(id, children)
          childMotions = new Map(
            children.flatMap((child, childIndex) => {
              const childMotion = child.motion ?? marks[childIndex]?.motion
              if (childMotion === undefined) return []
              return [[resolvedChildMarkId(id, child.id), childMotion] as const]
            }),
          )
          return composition
        },
      }
    },
    options.motion,
    options.renderer,
  )
}

interface WorkingNode<TNode> {
  readonly data: TNode
  readonly key: ChartKey
  readonly sourceIndex: number
  index?: number
  depth?: number
  height?: number
  layer?: number
  value?: number
  x0?: number
  x1?: number
  y0?: number
  y1?: number
  sourceLinks?: D3SankeyLink<WorkingNode<TNode>, WorkingLink<unknown>>[]
  targetLinks?: D3SankeyLink<WorkingNode<TNode>, WorkingLink<unknown>>[]
}

interface WorkingLink<TLink> {
  readonly data: TLink
  readonly key: ChartKey
  source: ChartKey | WorkingNode<unknown>
  target: ChartKey | WorkingNode<unknown>
  readonly value: number
  readonly sourceIndex: number
  index?: number
  y0?: number
  y1?: number
  width?: number
}

function materializeSankey<TNode, TLink, TNodeKey extends ChartKey>(
  workingNodes: readonly WorkingNode<TNode>[],
  workingLinks: readonly WorkingLink<TLink>[],
  nodeIndexes: ReadonlyMap<ChartKey, number>,
): {
  nodes: readonly SankeyNode<TNode, TLink, TNodeKey>[]
  links: readonly SankeyLink<TNode, TLink, TNodeKey>[]
} {
  const incoming = workingNodes.map(
    () => [] as SankeyLink<TNode, TLink, TNodeKey>[],
  )
  const outgoing = workingNodes.map(
    () => [] as SankeyLink<TNode, TLink, TNodeKey>[],
  )
  const nodes = workingNodes.map((node, index) => {
    const bounds = resolvedNodeBounds(node, index)
    const key = node.key as TNodeKey
    return {
      kind: 'node' as const,
      key,
      data: node.data,
      source: Object.freeze([node.data]),
      sourceIndexes: Object.freeze([node.sourceIndex]),
      index: resolvedInteger(node.index, `node index ${index}`),
      depth: resolvedInteger(node.depth, `node depth ${index}`),
      height: resolvedInteger(node.height, `node height ${index}`),
      layer: resolvedInteger(node.layer, `node layer ${index}`),
      value: resolvedFinite(node.value, `node value ${index}`),
      ...bounds,
      x: (bounds.x0 + bounds.x1) / 2,
      y: (bounds.y0 + bounds.y1) / 2,
      incomingLinks: incoming[index]!,
      outgoingLinks: outgoing[index]!,
    }
  }) as SankeyNode<TNode, TLink, TNodeKey>[]
  const links = workingLinks.map((link, index) => {
    const sourceKey = resolvedWorkingNode(link.source, index, 'source')
      .key as TNodeKey
    const targetKey = resolvedWorkingNode(link.target, index, 'target')
      .key as TNodeKey
    const sourceIndex = nodeIndexes.get(sourceKey) as number
    const targetIndex = nodeIndexes.get(targetKey) as number
    const sourceNode = nodes[sourceIndex]!
    const targetNode = nodes[targetIndex]!
    return Object.freeze({
      kind: 'link' as const,
      key: link.key,
      data: link.data,
      sourceRows: Object.freeze([link.data]),
      sourceIndexes: Object.freeze([link.sourceIndex]),
      source: sourceKey,
      target: targetKey,
      sourceKey,
      targetKey,
      sourceIndex,
      targetIndex,
      sourceNode,
      targetNode,
      value: resolvedFinite(link.value, `link value ${index}`),
      width: resolvedFinite(link.width, `link width ${index}`),
      x1: sourceNode.x1,
      y1: resolvedFinite(link.y0, `link source y ${index}`),
      x2: targetNode.x0,
      y2: resolvedFinite(link.y1, `link target y ${index}`),
    })
  })

  workingNodes.forEach((node, index) => {
    for (const link of node.targetLinks ?? []) {
      incoming[index]!.push(links[link.sourceIndex]!)
    }
    for (const link of node.sourceLinks ?? []) {
      outgoing[index]!.push(links[link.sourceIndex]!)
    }
    Object.freeze(incoming[index])
    Object.freeze(outgoing[index])
    Object.freeze(nodes[index])
  })

  return { nodes: Object.freeze(nodes), links: Object.freeze(links) }
}

function resolveLinkKeys<TLink>(
  links: readonly TLink[],
  sourceKeys: readonly ChartKey[],
  targetKeys: readonly ChartKey[],
  linkKey: TransformValue<TLink, ChartKey> | undefined,
): readonly ChartKey[] {
  if (linkKey !== undefined) {
    const keys = transformValues(links, linkKey)
    assertUniqueLinkKeys(keys)
    return keys
  }
  const inferred = links.map((link) =>
    link != null && typeof link === 'object'
      ? (link as Record<string, unknown>).id
      : undefined,
  )
  if (
    inferred.every(isChartKey) &&
    new Set(inferred).size === inferred.length
  ) {
    return inferred
  }
  const occurrences = new Map<string, number>()
  return links.map((_link, index) => {
    const pair = JSON.stringify([
      valueKey(sourceKeys[index]),
      valueKey(targetKeys[index]),
    ])
    const occurrence = occurrences.get(pair) ?? 0
    occurrences.set(pair, occurrence + 1)
    return `link:${pair}:${occurrence}`
  })
}

function assertUniqueLinkKeys(
  keys: readonly unknown[],
): asserts keys is ChartKey[] {
  const seen = new Set<ChartKey>()
  keys.forEach((key, index) => {
    if (!isChartKey(key)) {
      throw new TypeError(
        `sankeyDiagram: linkKey at index ${index} must be a string or finite number`,
      )
    }
    if (seen.has(key)) {
      throw new TypeError(
        `sankeyDiagram: duplicate link key ${typeof key}:${JSON.stringify(key)}`,
      )
    }
    seen.add(key)
  })
}

function resolveNodeSort<TNode, TNodeKey extends ChartKey>(
  sort: SankeyNodeComparator<TNode, TNodeKey> | null | undefined,
) {
  if (sort === undefined || sort === null) return sort
  return (left: WorkingNode<TNode>, right: WorkingNode<TNode>) => {
    const compared = sort(
      nodeContext<TNode, TNodeKey>(left),
      nodeContext<TNode, TNodeKey>(right),
    )
    assertFinite(compared, 'nodeSort result')
    return compared
  }
}

function resolveLinkSort<TNode, TLink, TNodeKey extends ChartKey>(
  sort: SankeyLinkComparator<TNode, TLink, TNodeKey> | null | undefined,
) {
  if (sort === undefined || sort === null) return sort
  return (left: WorkingLink<TLink>, right: WorkingLink<TLink>) => {
    const compared = sort(
      linkContext<TNode, TLink, TNodeKey>(left),
      linkContext<TNode, TLink, TNodeKey>(right),
    )
    assertFinite(compared, 'linkSort result')
    return compared
  }
}

function nodeContext<TNode, TNodeKey extends ChartKey = ChartKey>(
  node: WorkingNode<TNode>,
): SankeyNodeContext<TNode, TNodeKey> {
  return {
    ...endpointContext<TNode, TNodeKey>(node),
    depth: resolvedInteger(node.depth, 'nodeSort node depth'),
    height: resolvedInteger(node.height, 'nodeSort node height'),
    value: resolvedFinite(node.value, 'nodeSort node value'),
  }
}

function endpointContext<TNode, TNodeKey extends ChartKey = ChartKey>(
  node: WorkingNode<TNode>,
): SankeyEndpointContext<TNode, TNodeKey> {
  return {
    kind: 'node',
    key: node.key as TNodeKey,
    data: node.data,
    source: [node.data],
    sourceIndexes: [node.sourceIndex],
    index: resolvedInteger(node.index, 'node index'),
  }
}

function linkContext<TNode, TLink, TNodeKey extends ChartKey>(
  link: WorkingLink<TLink>,
): SankeyLinkContext<TNode, TLink, TNodeKey> {
  const source = resolvedWorkingNode(link.source, link.sourceIndex, 'source')
  const target = resolvedWorkingNode(link.target, link.sourceIndex, 'target')
  return {
    kind: 'link',
    key: link.key,
    data: link.data,
    sourceRows: [link.data],
    sourceIndexes: [link.sourceIndex],
    source: source.key as TNodeKey,
    target: target.key as TNodeKey,
    sourceKey: source.key as TNodeKey,
    targetKey: target.key as TNodeKey,
    sourceIndex: source.sourceIndex,
    targetIndex: target.sourceIndex,
    sourceNode: endpointContext<TNode, TNodeKey>(source as WorkingNode<TNode>),
    targetNode: endpointContext<TNode, TNodeKey>(target as WorkingNode<TNode>),
    value: link.value,
  }
}

function resolvedWorkingNode<TNode>(
  endpoint: ChartKey | WorkingNode<TNode>,
  index: number,
  name: 'source' | 'target',
): WorkingNode<TNode> {
  if (typeof endpoint === 'object') return endpoint
  throw new TypeError(
    `sankeyDiagram: unresolved ${name} at link index ${index}`,
  )
}

function resolvedNodeBounds<TNode>(node: WorkingNode<TNode>, index: number) {
  return {
    x0: resolvedFinite(node.x0, `node x0 ${index}`),
    x1: resolvedFinite(node.x1, `node x1 ${index}`),
    y0: resolvedFinite(node.y0, `node y0 ${index}`),
    y1: resolvedFinite(node.y1, `node y1 ${index}`),
  }
}

function sankeyAligner<
  TNode extends object,
  TLink extends object,
  TNodeKey extends ChartKey,
>(
  align: SankeyAlignment | SankeyNodeAligner<TNode, TLink, TNodeKey>,
): SankeyNodeAligner<TNode, TLink, TNodeKey> {
  const selected =
    typeof align === 'function'
      ? align
      : align === 'left'
        ? sankeyLeft
        : align === 'right'
          ? sankeyRight
          : align === 'center'
            ? sankeyCenter
            : align === 'justify'
              ? sankeyJustify
              : undefined
  if (!selected) {
    throw new TypeError(`sankeyDiagram: invalid alignment "${String(align)}"`)
  }
  return (node, columnCount) => {
    const layer = selected(node, columnCount)
    if (!Number.isInteger(layer) || layer < 0 || layer >= columnCount) {
      throw new TypeError(
        `sankeyDiagram: align result must be an integer between 0 and ${columnCount - 1}`,
      )
    }
    return layer
  }
}

function resolveLayoutNumber(
  value: SankeyLayoutValue<number> | undefined,
  chart: ChartBounds,
  fallback: number,
  name: string,
  positive: boolean,
): number {
  const resolved = typeof value === 'function' ? value(chart) : value
  const number = resolved ?? fallback
  if (!Number.isFinite(number) || (positive ? number <= 0 : number < 0)) {
    throw new TypeError(
      `sankeyDiagram: ${name} must be a ${positive ? 'positive' : 'nonnegative'} finite number`,
    )
  }
  return number
}

function resolveInset(
  value: SankeyLayoutValue<number | SankeyInset> | undefined,
  chart: ChartBounds,
): Required<SankeyInset> {
  const resolved = typeof value === 'function' ? value(chart) : value
  const inset =
    typeof resolved === 'number'
      ? { top: resolved, right: resolved, bottom: resolved, left: resolved }
      : {
          top: resolved?.top ?? 0,
          right: resolved?.right ?? 0,
          bottom: resolved?.bottom ?? 0,
          left: resolved?.left ?? 0,
        }
  for (const [name, amount] of Object.entries(inset)) {
    assertNonnegativeFinite(amount, `inset.${name}`)
  }
  return inset
}

function resolvedFinite(value: number | undefined, name: string): number {
  assertFinite(value, name)
  return value
}

function resolvedInteger(value: number | undefined, name: string): number {
  if (!Number.isInteger(value) || (value as number) < 0) {
    throw new TypeError(`sankeyDiagram: layout produced an invalid ${name}`)
  }
  return value as number
}

function assertFinite(value: unknown, name: string): asserts value is number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new TypeError(`sankeyDiagram: layout produced a non-finite ${name}`)
  }
}

function assertNonnegativeFinite(value: unknown, name: string) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new TypeError(
      `sankeyDiagram: ${name} must be a nonnegative finite number`,
    )
  }
}

function assertNonnegativeInteger(value: number, name: string) {
  if (!Number.isInteger(value) || value < 0) {
    throw new TypeError(`sankeyDiagram: ${name} must be a nonnegative integer`)
  }
}

function isChartKey(value: unknown): value is ChartKey {
  return (
    typeof value === 'string' ||
    (typeof value === 'number' && Number.isFinite(value))
  )
}
