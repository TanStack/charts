import { tree } from 'd3-hierarchy'
import {
  buildFlatHierarchy,
  flatHierarchyNodeContext,
} from './hierarchy-flat-internal'
import type {
  FlatHierarchyDatum,
  FlatHierarchyNode,
  FlatHierarchyOptions,
} from './hierarchy-flat-internal'
import type { TransformValue } from './transform'

export type TreeOrientation = 'left' | 'right' | 'top' | 'bottom'

export interface TreeNodeContext<TDatum> {
  readonly id: string
  readonly parentId: string | null
  readonly name: string
  readonly data: TDatum | null
  readonly depth: number
  readonly height: number
  readonly internal: boolean
  readonly external: boolean
  readonly source: readonly TDatum[]
  readonly sourceIndexes: readonly number[]
}

export type TreeNodeComparator<TDatum> = (
  left: TreeNodeContext<TDatum>,
  right: TreeNodeContext<TDatum>,
) => number

export type TreeNodeSeparation<TDatum> = (
  left: TreeNodeContext<TDatum>,
  right: TreeNodeContext<TDatum>,
) => number

interface TreeLayoutSharedOptions<TDatum> {
  /** Root anchor and growth direction. Defaults to `left`. */
  readonly orientation?: TreeOrientation
  /** D3 tidy-tree spacing as `[breadth, depth]`. Defaults to `[1, 1]`. */
  readonly nodeSize?: readonly [number, number]
  readonly sort?: TreeNodeComparator<TDatum>
  readonly separation?: TreeNodeSeparation<TDatum>
}

export type TreeLayoutPathOptions<TDatum> = TreeLayoutSharedOptions<TDatum> & {
  readonly path: TransformValue<TDatum, string>
  readonly delimiter?: string
  readonly id?: never
  readonly parentId?: never
}

export type TreeLayoutParentOptions<TDatum> =
  TreeLayoutSharedOptions<TDatum> & {
    readonly id: TransformValue<TDatum, string>
    readonly parentId: TransformValue<TDatum, string | null | undefined>
    readonly path?: never
    readonly delimiter?: never
  }

export type TreeLayoutOptions<TDatum> =
  TreeLayoutPathOptions<TDatum> | TreeLayoutParentOptions<TDatum>

export interface TreeLayoutNode<TDatum> extends TreeNodeContext<TDatum> {
  readonly x: number
  readonly y: number
}

export interface TreeLayoutLink<TDatum> {
  /** A tree node has at most one incoming link, so its target id is the link id. */
  readonly id: string
  readonly source: string
  readonly target: string
  readonly data: TDatum | null
  readonly sourceNode: TreeLayoutNode<TDatum>
  readonly targetNode: TreeLayoutNode<TDatum>
  readonly sourceIndex: number | null
  readonly targetIndex: number | null
  /** The link represents its target node and carries that node's raw-row lineage. */
  readonly sourceRows: readonly TDatum[]
  readonly sourceIndexes: readonly number[]
  readonly x1: number
  readonly y1: number
  readonly x2: number
  readonly y2: number
}

export interface TreeLayoutResult<TDatum> {
  readonly nodes: readonly TreeLayoutNode<TDatum>[]
  readonly links: readonly TreeLayoutLink<TDatum>[]
}

/** Computes a deterministic tidy-tree layout in semantic data-space units. */
export function treeLayout<
  TDatum,
  const TPath extends TransformValue<TDatum, string>,
>(
  source: Iterable<TDatum>,
  options: TreeLayoutSharedOptions<TDatum> & {
    readonly path: TPath
    readonly delimiter?: string
    readonly id?: never
    readonly parentId?: never
  },
): TreeLayoutResult<TDatum>
export function treeLayout<
  TDatum,
  const TId extends TransformValue<TDatum, string>,
  const TParentId extends TransformValue<TDatum, string | null | undefined>,
>(
  source: Iterable<TDatum>,
  options: TreeLayoutSharedOptions<TDatum> & {
    readonly id: TId
    readonly parentId: TParentId
    readonly path?: never
    readonly delimiter?: never
  },
): TreeLayoutResult<TDatum>
export function treeLayout<TDatum>(
  source: Iterable<TDatum>,
  options: TreeLayoutOptions<TDatum>,
): TreeLayoutResult<TDatum> {
  const orientation = options.orientation ?? 'left'
  assertOrientation(orientation)
  const [breadth, depth] = options.nodeSize ?? [1, 1]
  assertPositiveFinite(breadth, 'nodeSize breadth')
  assertPositiveFinite(depth, 'nodeSize depth')

  const hierarchy = buildFlatHierarchy(
    source,
    options as FlatHierarchyOptions<TDatum>,
    'treeLayout',
  )
  const contexts = new WeakMap<
    FlatHierarchyNode<TDatum>,
    TreeNodeContext<TDatum>
  >()
  const context = (node: FlatHierarchyNode<TDatum>) => {
    const existing = contexts.get(node)
    if (existing) return existing
    const created = Object.freeze(nodeContext(node))
    contexts.set(node, created)
    return created
  }

  const sort = options.sort
  if (sort) {
    hierarchy.root.sort((left, right) => {
      const compared = sort(
        context(left as FlatHierarchyNode<TDatum>),
        context(right as FlatHierarchyNode<TDatum>),
      )
      assertFinite(compared, 'sort result')
      return compared
    })
  }
  const layout = tree<FlatHierarchyDatum<TDatum>>().nodeSize([breadth, depth])
  const separation = options.separation
  if (separation) {
    layout.separation((left, right) => {
      const separated = separation(
        context(left as FlatHierarchyNode<TDatum>),
        context(right as FlatHierarchyNode<TDatum>),
      )
      assertNonnegativeFinite(separated, 'separation result')
      return separated
    })
  }
  const root = layout(hierarchy.root)
  const outputByNode = new Map<
    FlatHierarchyNode<TDatum>,
    TreeLayoutNode<TDatum>
  >()
  const nodes = root.descendants().map((node) => {
    const [x, y] = orient(node.x, node.y, orientation)
    const output = {
      ...context(node as FlatHierarchyNode<TDatum>),
      x,
      y,
    }
    outputByNode.set(node as FlatHierarchyNode<TDatum>, output)
    return output
  })
  const links = root
    .links()
    .map(({ source: sourceNode, target: targetNode }) => {
      const source = outputByNode.get(
        sourceNode as FlatHierarchyNode<TDatum>,
      ) as TreeLayoutNode<TDatum>
      const target = outputByNode.get(
        targetNode as FlatHierarchyNode<TDatum>,
      ) as TreeLayoutNode<TDatum>
      const sourceIndex = sourceNode.data.sourceIndex
      const targetIndex = targetNode.data.sourceIndex
      return {
        id: target.id,
        source: source.id,
        target: target.id,
        data: target.data,
        sourceNode: source,
        targetNode: target,
        sourceIndex,
        targetIndex,
        sourceRows: target.source,
        sourceIndexes: target.sourceIndexes,
        x1: source.x,
        y1: source.y,
        x2: target.x,
        y2: target.y,
      }
    })

  return { nodes, links }
}

function nodeContext<TDatum>(
  node: FlatHierarchyNode<TDatum>,
): TreeNodeContext<TDatum> {
  return flatHierarchyNodeContext(node)
}

function orient(
  breadth: number,
  depth: number,
  orientation: TreeOrientation,
): readonly [number, number] {
  switch (orientation) {
    case 'left':
      return [depth, -breadth]
    case 'right':
      return [-depth, -breadth]
    case 'top':
      return [breadth, -depth]
    case 'bottom':
      return [breadth, depth]
  }
}

function assertOrientation(value: string): asserts value is TreeOrientation {
  if (
    value !== 'left' &&
    value !== 'right' &&
    value !== 'top' &&
    value !== 'bottom'
  ) {
    throw new TypeError(`treeLayout: invalid orientation "${value}"`)
  }
}

function assertPositiveFinite(value: number, description: string) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new TypeError(
      `treeLayout: ${description} must be positive and finite`,
    )
  }
}

function assertNonnegativeFinite(value: unknown, description: string) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new TypeError(
      `treeLayout: ${description} must be nonnegative and finite`,
    )
  }
}

function assertFinite(value: unknown, description: string) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new TypeError(`treeLayout: ${description} must be finite`)
  }
}
