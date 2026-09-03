import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
} from 'd3-force'
import { resolveNetworkGraph } from './network-graph-internal'
import { transformValues } from './transform-internal'
import type {
  TransformLineage,
  TransformValue,
  TransformValueOutput,
} from './transform'
import type { ChartKey } from './types'
import type { Force, SimulationLinkDatum, SimulationNodeDatum } from 'd3-force'

export type ForceNumericValue<TDatum> = number | TransformValue<TDatum, number>

export interface ForceLinkDescriptor<TLink> {
  readonly type: 'link'
  readonly distance?: ForceNumericValue<TLink>
  readonly strength?: ForceNumericValue<TLink>
}

export interface ForceManyBodyDescriptor<TNode> {
  readonly type: 'manyBody'
  readonly strength?: ForceNumericValue<TNode>
}

export interface ForceCenterDescriptor {
  readonly type: 'center'
  readonly x?: number
  readonly y?: number
}

export interface ForceCollideDescriptor<TNode> {
  readonly type: 'collide'
  readonly radius?: ForceNumericValue<TNode>
  readonly strength?: number
}

export interface ForceXDescriptor<TNode> {
  readonly type: 'x'
  readonly x?: ForceNumericValue<TNode>
  readonly strength?: ForceNumericValue<TNode>
}

export interface ForceYDescriptor<TNode> {
  readonly type: 'y'
  readonly y?: ForceNumericValue<TNode>
  readonly strength?: ForceNumericValue<TNode>
}

/** A private node clone initialized and mutated only by the D3 simulation. */
export type ForceLayoutWorkingNode<TNode extends object> = Omit<
  TNode,
  keyof SimulationNodeDatum
> &
  SimulationNodeDatum

/** A private link clone whose endpoints may be resolved by a D3 link force. */
export type ForceLayoutWorkingLink<
  TNode extends object,
  TLink extends object,
> = Omit<TLink, keyof SimulationLinkDatum<ForceLayoutWorkingNode<TNode>>> &
  SimulationLinkDatum<ForceLayoutWorkingNode<TNode>>

export interface ForceFactoryContext<
  TNode extends object,
  TLink extends object,
  TNodeKey extends ChartKey = ChartKey,
> {
  readonly nodes: ForceLayoutWorkingNode<TNode>[]
  readonly links: ForceLayoutWorkingLink<TNode, TLink>[]
  readonly nodeKeys: readonly TNodeKey[]
  readonly sourceKeys: readonly ChartKey[]
  readonly targetKeys: readonly ChartKey[]
  readonly nodeKey: (
    node: ForceLayoutWorkingNode<TNode>,
    index: number,
  ) => TNodeKey
}

export type ForceFactory<
  TNode extends object,
  TLink extends object,
  TNodeKey extends ChartKey = ChartKey,
> = (
  context: ForceFactoryContext<TNode, TLink, TNodeKey>,
) => Force<ForceLayoutWorkingNode<TNode>, ForceLayoutWorkingLink<TNode, TLink>>

export interface ForceFactoryDescriptor<
  TNode extends object,
  TLink extends object,
  TNodeKey extends ChartKey = ChartKey,
> {
  readonly type: 'custom'
  readonly name: string
  readonly create: ForceFactory<TNode, TLink, TNodeKey>
}

export type ForceDescriptor<
  TNode extends object,
  TLink extends object,
  TNodeKey extends ChartKey = ChartKey,
> =
  | ForceLinkDescriptor<TLink>
  | ForceManyBodyDescriptor<TNode>
  | ForceCenterDescriptor
  | ForceCollideDescriptor<TNode>
  | ForceXDescriptor<TNode>
  | ForceYDescriptor<TNode>
  | ForceFactoryDescriptor<TNode, TLink, TNodeKey>

export interface ForceLayoutOptions<
  TNode extends object,
  TLink extends object,
  TNodeKey extends TransformValue<TNode, ChartKey> = TransformValue<
    TNode,
    ChartKey
  >,
  TSource extends TransformValue<TLink, ChartKey> = TransformValue<
    TLink,
    ChartKey
  >,
  TTarget extends TransformValue<TLink, ChartKey> = TransformValue<
    TLink,
    ChartKey
  >,
> {
  readonly nodeKey: TNodeKey
  readonly source: TSource
  readonly target: TTarget
  /** Number of synchronous simulation ticks. Defaults to D3's natural 300. */
  readonly iterations?: number
  /** Fraction of each positional span added to both domain ends. Defaults to 0.2. */
  readonly domainPadding?: number
  /** Forces are initialized and applied in authored order. */
  readonly forces: readonly ForceDescriptor<
    TNode,
    TLink,
    Extract<TransformValueOutput<TNode, TNodeKey>, ChartKey>
  >[]
}

export type ForceLayoutNode<TNode> = Omit<
  TNode,
  keyof TransformLineage<TNode> | 'x' | 'y' | 'vx' | 'vy'
> &
  TransformLineage<TNode> & {
    readonly x: number
    readonly y: number
    readonly vx: number
    readonly vy: number
  }

/**
 * Link lineage uses `sourceRows` because `source` remains the raw graph endpoint.
 * This is the deliberate exception to the ordinary `TransformLineage` field name.
 */
export interface ForceLinkLineage<TLink> {
  readonly sourceRows: readonly TLink[]
  readonly sourceIndexes: readonly number[]
}

type ForceLinkDerivedFields =
  | keyof ForceLinkLineage<unknown>
  | 'source'
  | 'target'
  | 'sourceNode'
  | 'targetNode'
  | 'sourceIndex'
  | 'targetIndex'
  | 'sourceKey'
  | 'targetKey'
  | 'x1'
  | 'y1'
  | 'x2'
  | 'y2'

export type ForceLayoutLink<
  TNode,
  TLink,
  TSourceKey extends ChartKey = ChartKey,
  TTargetKey extends ChartKey = ChartKey,
> = Omit<TLink, ForceLinkDerivedFields> &
  ForceLinkLineage<TLink> & {
    /** Raw source identifier, preserved after D3 resolves its private clone. */
    readonly source: TSourceKey
    /** Raw target identifier, preserved after D3 resolves its private clone. */
    readonly target: TTargetKey
    readonly sourceKey: TSourceKey
    readonly targetKey: TTargetKey
    readonly sourceIndex: number
    readonly targetIndex: number
    readonly sourceNode: ForceLayoutNode<TNode>
    readonly targetNode: ForceLayoutNode<TNode>
    readonly x1: number
    readonly y1: number
    readonly x2: number
    readonly y2: number
  }

export interface ForceLayoutResult<
  TNode,
  TLink,
  TSourceKey extends ChartKey = ChartKey,
  TTargetKey extends ChartKey = ChartKey,
> {
  readonly nodes: readonly ForceLayoutNode<TNode>[]
  readonly links: readonly ForceLayoutLink<
    TNode,
    TLink,
    TSourceKey,
    TTargetKey
  >[]
  readonly xDomain: readonly [number, number]
  readonly yDomain: readonly [number, number]
}

type EndpointKey<TDatum, TValue> = Extract<
  TransformValueOutput<TDatum, TValue>,
  ChartKey
>

type WorkingNode<TNode extends object> = ForceLayoutWorkingNode<TNode>
type WorkingLink<
  TNode extends object,
  TLink extends object,
> = ForceLayoutWorkingLink<TNode, TLink>

/** Settles a deterministic, synchronous D3 force simulation over private clones. */
export function forceLayout<
  TNode extends object,
  TLink extends object,
  const TNodeKey extends TransformValue<TNode, ChartKey>,
  const TSource extends TransformValue<TLink, ChartKey>,
  const TTarget extends TransformValue<TLink, ChartKey>,
>(
  nodes: Iterable<TNode>,
  links: Iterable<TLink>,
  options: ForceLayoutOptions<
    NoInfer<TNode>,
    NoInfer<TLink>,
    TNodeKey,
    TSource,
    TTarget
  >,
): ForceLayoutResult<
  TNode,
  TLink,
  EndpointKey<TLink, TSource>,
  EndpointKey<TLink, TTarget>
> {
  const graph = resolveNetworkGraph(
    nodes,
    links,
    {
      nodeKey: options.nodeKey,
      source: options.source,
      target: options.target,
    },
    'forceLayout',
  )
  const nodeData = graph.nodes
  const linkData = graph.links
  const iterations = options.iterations ?? 300
  const domainPadding = options.domainPadding ?? 0.2
  assertNonnegativeInteger(iterations, 'iterations')
  assertNonnegativeFinite(domainPadding, 'domainPadding')
  assertUniqueForces(options.forces)

  const { nodeKeys, sourceKeys, targetKeys, nodeIndexes } = graph

  const workingNodes = nodeData.map(createWorkingNode)
  const workingLinks = linkData.map((link, index) =>
    createWorkingLink<TNode, TLink>(
      link,
      sourceKeys[index] as ChartKey,
      targetKeys[index] as ChartKey,
    ),
  )
  const originalWorkingNodes = [...workingNodes]
  const originalWorkingLinks = [...workingLinks]
  const factoryContext = createForceFactoryContext(
    workingNodes,
    workingLinks,
    nodeKeys as readonly EndpointKey<TNode, TNodeKey>[],
    sourceKeys as readonly ChartKey[],
    targetKeys as readonly ChartKey[],
  )
  const preparedForces = options.forces.map((descriptor, index) => ({
    descriptor,
    force: createForce(
      descriptor,
      index,
      nodeData,
      linkData,
      nodeKeys as readonly ChartKey[],
      workingLinks,
      factoryContext,
    ),
  }))
  assertWorkingCollection(workingNodes, originalWorkingNodes, 'node')
  assertWorkingCollection(workingLinks, originalWorkingLinks, 'link')
  const simulation = forceSimulation<
    WorkingNode<TNode>,
    WorkingLink<TNode, TLink>
  >(workingNodes).stop()

  preparedForces.forEach(({ descriptor, force }, index) => {
    simulation.force(`${index}:${forceName(descriptor)}`, force)
  })
  simulation.tick(iterations)
  assertWorkingCollection(workingNodes, originalWorkingNodes, 'node')
  assertWorkingCollection(workingLinks, originalWorkingLinks, 'link')

  const outputNodes = workingNodes.map((node, index) => {
    const datum = nodeData[index] as TNode
    return {
      ...datum,
      x: coordinate(node.x, index, 'x'),
      y: coordinate(node.y, index, 'y'),
      vx: coordinate(node.vx, index, 'vx'),
      vy: coordinate(node.vy, index, 'vy'),
      source: [datum],
      sourceIndexes: [index],
    } as ForceLayoutNode<TNode>
  })
  const outputLinks = linkData.map((link, index) => {
    const source = sourceKeys[index] as EndpointKey<TLink, TSource>
    const target = targetKeys[index] as EndpointKey<TLink, TTarget>
    const sourceIndex = nodeIndexes.get(source) as number
    const targetIndex = nodeIndexes.get(target) as number
    const sourceNode = outputNodes[sourceIndex] as ForceLayoutNode<TNode>
    const targetNode = outputNodes[targetIndex] as ForceLayoutNode<TNode>
    return {
      ...link,
      source,
      target,
      sourceKey: source,
      targetKey: target,
      sourceIndex,
      targetIndex,
      sourceNode,
      targetNode,
      x1: sourceNode.x,
      y1: sourceNode.y,
      x2: targetNode.x,
      y2: targetNode.y,
      sourceRows: [link],
      sourceIndexes: [index],
    } as ForceLayoutLink<
      TNode,
      TLink,
      EndpointKey<TLink, TSource>,
      EndpointKey<TLink, TTarget>
    >
  })

  return {
    nodes: outputNodes,
    links: outputLinks,
    xDomain: paddedDomain(
      outputNodes.map((node) => node.x),
      domainPadding,
    ),
    yDomain: paddedDomain(
      outputNodes.map((node) => node.y),
      domainPadding,
    ),
  }
}

const simulationNodeFields = ['x', 'y', 'vx', 'vy', 'fx', 'fy'] as const

function createWorkingNode<TNode extends object>(
  node: TNode,
): WorkingNode<TNode> {
  const working = { ...node } as Record<string, unknown>
  delete working.index
  for (const field of simulationNodeFields) {
    const value = working[field]
    const validFixedValue = (field === 'fx' || field === 'fy') && value === null
    if (
      value !== undefined &&
      !validFixedValue &&
      (typeof value !== 'number' || !Number.isFinite(value))
    ) {
      delete working[field]
    }
  }
  return working as WorkingNode<TNode>
}

function createWorkingLink<TNode extends object, TLink extends object>(
  link: TLink,
  source: ChartKey,
  target: ChartKey,
): WorkingLink<TNode, TLink> {
  const working = {
    ...link,
    source,
    target,
  } as Record<string, unknown>
  delete working.index
  return working as WorkingLink<TNode, TLink>
}

function createForce<
  TNode extends object,
  TLink extends object,
  TNodeKey extends ChartKey,
>(
  descriptor: ForceDescriptor<TNode, TLink, TNodeKey>,
  descriptorIndex: number,
  nodes: readonly TNode[],
  links: readonly TLink[],
  nodeKeys: readonly ChartKey[],
  workingLinks: WorkingLink<TNode, TLink>[],
  factoryContext: ForceFactoryContext<TNode, TLink, TNodeKey>,
): Force<WorkingNode<TNode>, WorkingLink<TNode, TLink>> {
  const name = `forces[${descriptorIndex}] (${forceName(descriptor)})`
  switch (descriptor.type) {
    case 'link': {
      const force = forceLink<WorkingNode<TNode>, WorkingLink<TNode, TLink>>(
        workingLinks,
      ).id((_node, index) => nodeKeys[index] as ChartKey)
      const distance = forceValue(
        links,
        descriptor.distance,
        `${name}.distance`,
        assertNonnegativeFinite,
      )
      const strength = forceValue(
        links,
        descriptor.strength,
        `${name}.strength`,
        assertNonnegativeFinite,
      )
      if (distance !== undefined) force.distance(distance)
      if (strength !== undefined) force.strength(strength)
      return force
    }
    case 'manyBody': {
      const force = forceManyBody<WorkingNode<TNode>>()
      const strength = forceValue(
        nodes,
        descriptor.strength,
        `${name}.strength`,
      )
      if (strength !== undefined) force.strength(strength)
      return force
    }
    case 'center':
      assertOptionalFinite(descriptor.x, `${name}.x`)
      assertOptionalFinite(descriptor.y, `${name}.y`)
      return forceCenter<WorkingNode<TNode>>(descriptor.x, descriptor.y)
    case 'collide': {
      const force = forceCollide<WorkingNode<TNode>>()
      const radius = forceValue(
        nodes,
        descriptor.radius,
        `${name}.radius`,
        assertNonnegativeFinite,
      )
      if (radius !== undefined) force.radius(radius)
      if (descriptor.strength !== undefined) {
        assertRange(descriptor.strength, 0, 1, `${name}.strength`)
        force.strength(descriptor.strength)
      }
      return force
    }
    case 'x': {
      const force = forceX<WorkingNode<TNode>>()
      const x = forceValue(nodes, descriptor.x, `${name}.x`)
      const strength = forceValue(
        nodes,
        descriptor.strength,
        `${name}.strength`,
        assertUnitInterval,
      )
      if (x !== undefined) force.x(x)
      if (strength !== undefined) force.strength(strength)
      return force
    }
    case 'y': {
      const force = forceY<WorkingNode<TNode>>()
      const y = forceValue(nodes, descriptor.y, `${name}.y`)
      const strength = forceValue(
        nodes,
        descriptor.strength,
        `${name}.strength`,
        assertUnitInterval,
      )
      if (y !== undefined) force.y(y)
      if (strength !== undefined) force.strength(strength)
      return force
    }
    case 'custom': {
      const force = descriptor.create(factoryContext)
      if (typeof force !== 'function') {
        throw new TypeError(
          `forceLayout: ${name}.create must return a D3-compatible force`,
        )
      }
      return force
    }
  }
}

function forceValue<TDatum, TWorkingDatum>(
  data: readonly TDatum[],
  value: ForceNumericValue<TDatum> | undefined,
  name: string,
  validate: (value: number, name: string) => void = assertFinite,
): number | ((datum: TWorkingDatum, index: number) => number) | undefined {
  if (value === undefined) return undefined
  if (typeof value === 'number') {
    validate(value, name)
    return value
  }
  const values = transformValues(data, value)
  values.forEach((resolved, index) => {
    assertFinite(resolved, `${name} at index ${index}`)
    validate(resolved, `${name} at index ${index}`)
  })
  return (_datum, index) => values[index] as number
}

function assertUniqueForces<
  TNode extends object,
  TLink extends object,
  TNodeKey extends ChartKey,
>(descriptors: readonly ForceDescriptor<TNode, TLink, TNodeKey>[]) {
  const types = new Set<string>()
  const names = new Set<string>()
  descriptors.forEach((descriptor, index) => {
    const type = (descriptor as { readonly type?: unknown }).type
    if (type === 'custom') {
      const custom = descriptor as ForceFactoryDescriptor<
        TNode,
        TLink,
        TNodeKey
      >
      if (typeof custom.name !== 'string' || !custom.name.trim()) {
        throw new TypeError(
          `forceLayout: forces[${index}].name must be a nonempty string`,
        )
      }
      if (typeof custom.create !== 'function') {
        throw new TypeError(
          `forceLayout: forces[${index}] (${custom.name}).create must be a function`,
        )
      }
      if (names.has(custom.name)) {
        throw new TypeError(
          `forceLayout: duplicate force name "${custom.name}"`,
        )
      }
      names.add(custom.name)
      return
    }
    if (
      type !== 'link' &&
      type !== 'manyBody' &&
      type !== 'center' &&
      type !== 'collide' &&
      type !== 'x' &&
      type !== 'y'
    ) {
      throw new TypeError(`forceLayout: forces[${index}] has an unknown type`)
    }
    if (types.has(type)) {
      throw new TypeError(`forceLayout: duplicate force type "${type}"`)
    }
    if (names.has(type)) {
      throw new TypeError(`forceLayout: duplicate force name "${type}"`)
    }
    types.add(type)
    names.add(type)
  })
}

function forceName<
  TNode extends object,
  TLink extends object,
  TNodeKey extends ChartKey,
>(descriptor: ForceDescriptor<TNode, TLink, TNodeKey>): string {
  return descriptor.type === 'custom' ? descriptor.name : descriptor.type
}

function createForceFactoryContext<
  TNode extends object,
  TLink extends object,
  TNodeKey extends ChartKey,
>(
  nodes: WorkingNode<TNode>[],
  links: WorkingLink<TNode, TLink>[],
  nodeKeys: readonly TNodeKey[],
  sourceKeys: readonly ChartKey[],
  targetKeys: readonly ChartKey[],
): ForceFactoryContext<TNode, TLink, TNodeKey> {
  const keyByNode = new Map(
    nodes.map((node, index) => [node, nodeKeys[index] as TNodeKey] as const),
  )
  return Object.freeze({
    nodes,
    links,
    nodeKeys: Object.freeze([...nodeKeys]),
    sourceKeys: Object.freeze([...sourceKeys]),
    targetKeys: Object.freeze([...targetKeys]),
    nodeKey: (node: WorkingNode<TNode>) => {
      const key = keyByNode.get(node)
      if (key === undefined) {
        throw new TypeError(
          'forceLayout: custom force requested the key of a foreign node',
        )
      }
      return key
    },
  })
}

function assertWorkingCollection<TValue>(
  values: readonly TValue[],
  expected: readonly TValue[],
  name: 'node' | 'link',
): void {
  if (
    values.length !== expected.length ||
    values.some((value, index) => value !== expected[index])
  ) {
    throw new TypeError(
      `forceLayout: custom force changed the private ${name} collection`,
    )
  }
}

function assertNonnegativeInteger(value: number, name: string) {
  if (!Number.isInteger(value) || value < 0) {
    throw new TypeError(`forceLayout: ${name} must be a nonnegative integer`)
  }
}

function assertNonnegativeFinite(value: number, name: string) {
  if (!Number.isFinite(value) || value < 0) {
    throw new TypeError(
      `forceLayout: ${name} must be a nonnegative finite number`,
    )
  }
}

function assertUnitInterval(value: number, name: string) {
  assertRange(value, 0, 1, name)
}

function assertOptionalFinite(value: number | undefined, name: string) {
  if (value !== undefined) assertFinite(value, name)
}

function assertRange(
  value: number,
  minimum: number,
  maximum: number,
  name: string,
) {
  if (!Number.isFinite(value) || value < minimum || value > maximum) {
    throw new TypeError(
      `forceLayout: ${name} must be between ${minimum} and ${maximum}`,
    )
  }
}

function assertFinite(value: unknown, name: string): asserts value is number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new TypeError(`forceLayout: ${name} must be a finite number`)
  }
}

function coordinate(
  value: number | undefined,
  index: number,
  coordinateName: 'x' | 'y' | 'vx' | 'vy',
): number {
  if (value === undefined || !Number.isFinite(value)) {
    throw new TypeError(
      `forceLayout: simulation produced a non-finite ${coordinateName} for node index ${index}`,
    )
  }
  return value
}

function paddedDomain(
  values: readonly number[],
  padding: number,
): readonly [number, number] {
  if (values.length === 0) return [-1, 1]
  let minimum = values[0] as number
  let maximum = minimum
  for (const value of values.slice(1)) {
    if (value < minimum) minimum = value
    if (value > maximum) maximum = value
  }
  const amount = Math.max(1, maximum - minimum) * padding
  return [minimum - amount, maximum + amount]
}
