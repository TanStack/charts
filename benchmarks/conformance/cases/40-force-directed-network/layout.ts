import { extent } from 'd3-array'
import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
} from 'd3-force'
import type {
  MiserablesGraph,
  MiserablesLink,
  MiserablesNode,
} from '@tanstack/charts-data/miserables'
import type { SimulationLinkDatum, SimulationNodeDatum } from 'd3-force'

export interface PositionedNetworkNode extends MiserablesNode {
  x: number
  y: number
}

export interface PositionedNetworkLink {
  source: string
  target: string
  value: number
  x1: number
  y1: number
  x2: number
  y2: number
}

export interface PositionedNetwork {
  nodes: readonly PositionedNetworkNode[]
  links: readonly PositionedNetworkLink[]
  xDomain: readonly [number, number]
  yDomain: readonly [number, number]
}

interface LayoutNode extends MiserablesNode, SimulationNodeDatum {}

type LayoutLink = Omit<MiserablesLink, 'source' | 'target'> &
  SimulationLinkDatum<LayoutNode> & {
    source: string | LayoutNode
    target: string | LayoutNode
  }

export function networkLayout(
  source: MiserablesGraph,
  revision = 0,
): PositionedNetwork {
  const layoutNodes: LayoutNode[] = source.nodes.map((node) => ({ ...node }))
  const layoutLinks: LayoutLink[] = source.links.map((edge) => ({ ...edge }))
  const distanceDelta = Math.abs(revision % 2) * 3

  const simulation = forceSimulation(layoutNodes)
    .force(
      'link',
      forceLink<LayoutNode, LayoutLink>(layoutLinks)
        .id((node) => node.id)
        .distance((edge) => 54 - Math.min(edge.value, 10) * 1.8 + distanceDelta)
        .strength((edge) => 0.2 + Math.min(edge.value, 10) * 0.045),
    )
    .force('charge', forceManyBody<LayoutNode>().strength(-165))
    .force('center', forceCenter(0, 0))
    .force('collision', forceCollide<LayoutNode>(15).strength(0.9))
    .force('x', forceX<LayoutNode>(0).strength(0.035))
    .force('y', forceY<LayoutNode>(0).strength(0.035))
    .stop()

  simulation.tick(300)

  const positionedNodes = layoutNodes.map((node) => ({
    id: node.id,
    group: node.group,
    x: coordinate(node.x, node.id, 'x'),
    y: coordinate(node.y, node.id, 'y'),
  }))
  const positionedLinks = layoutLinks.map((edge) => {
    const source = resolvedNode(edge.source, 'source')
    const target = resolvedNode(edge.target, 'target')
    return {
      source: source.id,
      target: target.id,
      value: edge.value,
      x1: coordinate(source.x, source.id, 'x'),
      y1: coordinate(source.y, source.id, 'y'),
      x2: coordinate(target.x, target.id, 'x'),
      y2: coordinate(target.y, target.id, 'y'),
    }
  })

  return {
    nodes: positionedNodes,
    links: positionedLinks,
    xDomain: paddedDomain(positionedNodes.map((node) => node.x)),
    yDomain: paddedDomain(positionedNodes.map((node) => node.y)),
  }
}

function resolvedNode(
  value: string | LayoutNode,
  endpoint: 'source' | 'target',
): LayoutNode {
  if (typeof value !== 'string') return value
  throw new TypeError(`Force layout did not resolve ${endpoint} ${value}`)
}

function coordinate(
  value: number | undefined,
  nodeId: string,
  axis: 'x' | 'y',
): number {
  if (value === undefined || !Number.isFinite(value)) {
    throw new TypeError(
      `Force layout produced no ${axis} coordinate for ${nodeId}`,
    )
  }
  return value
}

function paddedDomain(values: readonly number[]): [number, number] {
  const [minimum, maximum] = extent(values)
  if (minimum === undefined || maximum === undefined) return [-1, 1]
  const span = Math.max(1, maximum - minimum)
  const padding = span * 0.2
  return [minimum - padding, maximum + padding]
}
