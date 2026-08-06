import { toArray, transformValues } from './transform-internal'
import type { TransformValue, TransformValueOutput } from './transform'
import type { ChartKey } from './types'

type ResolvedNetworkKey<TDatum, TValue> = Extract<
  TransformValueOutput<TDatum, TValue>,
  ChartKey
>

export interface NetworkGraphResolution<
  TNode,
  TLink,
  TNodeKey extends ChartKey = ChartKey,
  TSourceKey extends ChartKey = ChartKey,
  TTargetKey extends ChartKey = ChartKey,
> {
  readonly nodes: readonly TNode[]
  readonly links: readonly TLink[]
  readonly nodeKeys: readonly TNodeKey[]
  readonly sourceKeys: readonly TSourceKey[]
  readonly targetKeys: readonly TTargetKey[]
  readonly nodeIndexes: ReadonlyMap<ChartKey, number>
}

/** Materializes and validates the shared identity boundary of a flat graph. */
export function resolveNetworkGraph<
  TNode,
  TLink,
  const TNodeKey extends TransformValue<TNode, ChartKey>,
  const TSource extends TransformValue<TLink, ChartKey>,
  const TTarget extends TransformValue<TLink, ChartKey>,
>(
  nodeSource: Iterable<TNode>,
  linkSource: Iterable<TLink>,
  options: {
    readonly nodeKey: TNodeKey
    readonly source: TSource
    readonly target: TTarget
  },
  owner: string,
): NetworkGraphResolution<
  TNode,
  TLink,
  ResolvedNetworkKey<TNode, TNodeKey>,
  ResolvedNetworkKey<TLink, TSource>,
  ResolvedNetworkKey<TLink, TTarget>
> {
  const nodes = toArray(nodeSource)
  const links = toArray(linkSource)
  const nodeKeys = transformValues(nodes, options.nodeKey)
  const sourceKeys = transformValues(links, options.source)
  const targetKeys = transformValues(links, options.target)
  const nodeIndexes = new Map<ChartKey, number>()

  nodeKeys.forEach((key, index) => {
    assertNetworkKey(key, `nodeKey at index ${index}`, owner)
    if (nodeIndexes.has(key)) {
      throw new TypeError(
        `${owner}: duplicate node key ${formatNetworkKey(key)}`,
      )
    }
    nodeIndexes.set(key, index)
  })
  sourceKeys.forEach((key, index) => {
    assertNetworkEndpoint(key, index, 'source', nodeIndexes, owner)
  })
  targetKeys.forEach((key, index) => {
    assertNetworkEndpoint(key, index, 'target', nodeIndexes, owner)
  })

  return {
    nodes,
    links,
    nodeKeys: nodeKeys as unknown as readonly ResolvedNetworkKey<
      TNode,
      TNodeKey
    >[],
    sourceKeys: sourceKeys as unknown as readonly ResolvedNetworkKey<
      TLink,
      TSource
    >[],
    targetKeys: targetKeys as unknown as readonly ResolvedNetworkKey<
      TLink,
      TTarget
    >[],
    nodeIndexes,
  }
}

function assertNetworkEndpoint(
  key: unknown,
  index: number,
  endpoint: 'source' | 'target',
  nodeIndexes: ReadonlyMap<ChartKey, number>,
  owner: string,
): asserts key is ChartKey {
  assertNetworkKey(key, `${endpoint} at link index ${index}`, owner)
  if (!nodeIndexes.has(key)) {
    throw new TypeError(
      `${owner}: ${endpoint} at link index ${index} does not match a node key: ${formatNetworkKey(key)}`,
    )
  }
}

function assertNetworkKey(
  value: unknown,
  name: string,
  owner: string,
): asserts value is ChartKey {
  if (
    typeof value !== 'string' &&
    !(typeof value === 'number' && Number.isFinite(value))
  ) {
    throw new TypeError(`${owner}: ${name} must be a string or finite number`)
  }
}

function formatNetworkKey(key: ChartKey): string {
  return `${typeof key}:${JSON.stringify(key)}`
}
