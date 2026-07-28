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
import type { SimulationLinkDatum, SimulationNodeDatum } from 'd3-force'

export type NetworkGroup = 'Client' | 'Service' | 'Data'

export interface NetworkNode {
  id: string
  label: string
  group: NetworkGroup
}

export interface NetworkEdge {
  id: string
  source: string
  target: string
  weight: number
}

export interface PositionedNetworkNode extends NetworkNode {
  x: number
  y: number
}

export interface PositionedNetworkLink {
  id: string
  source: string
  target: string
  weight: number
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

interface LayoutNode extends NetworkNode, SimulationNodeDatum {}

interface LayoutLink extends SimulationLinkDatum<LayoutNode> {
  id: string
  source: string | LayoutNode
  target: string | LayoutNode
  weight: number
}

export const networkGroups: readonly NetworkGroup[] = [
  'Client',
  'Service',
  'Data',
]

export const networkColors = ['#2563eb', '#f97316', '#10b981']

const nodes: readonly NetworkNode[] = [
  { id: 'web', label: 'Web', group: 'Client' },
  { id: 'mobile', label: 'Mobile', group: 'Client' },
  { id: 'gateway', label: 'Gateway', group: 'Service' },
  { id: 'auth', label: 'Auth', group: 'Service' },
  { id: 'catalog', label: 'Catalog', group: 'Service' },
  { id: 'search', label: 'Search', group: 'Service' },
  { id: 'orders', label: 'Orders', group: 'Service' },
  { id: 'payments', label: 'Payments', group: 'Service' },
  { id: 'inventory', label: 'Inventory', group: 'Data' },
  { id: 'events', label: 'Events', group: 'Data' },
  { id: 'analytics', label: 'Analytics', group: 'Data' },
]

const edges: readonly NetworkEdge[] = [
  { id: 'web-gateway', source: 'web', target: 'gateway', weight: 3 },
  { id: 'mobile-gateway', source: 'mobile', target: 'gateway', weight: 3 },
  { id: 'gateway-auth', source: 'gateway', target: 'auth', weight: 3 },
  { id: 'gateway-catalog', source: 'gateway', target: 'catalog', weight: 2 },
  { id: 'gateway-search', source: 'gateway', target: 'search', weight: 2 },
  { id: 'gateway-orders', source: 'gateway', target: 'orders', weight: 3 },
  {
    id: 'catalog-inventory',
    source: 'catalog',
    target: 'inventory',
    weight: 2,
  },
  { id: 'search-catalog', source: 'search', target: 'catalog', weight: 2 },
  { id: 'search-analytics', source: 'search', target: 'analytics', weight: 1 },
  { id: 'orders-auth', source: 'orders', target: 'auth', weight: 2 },
  { id: 'orders-payments', source: 'orders', target: 'payments', weight: 3 },
  { id: 'orders-inventory', source: 'orders', target: 'inventory', weight: 2 },
  { id: 'orders-events', source: 'orders', target: 'events', weight: 2 },
  { id: 'payments-events', source: 'payments', target: 'events', weight: 1 },
  { id: 'events-analytics', source: 'events', target: 'analytics', weight: 3 },
]

export function networkLayout(revision = 0): PositionedNetwork {
  const layoutNodes: LayoutNode[] = nodes.map((node) => ({ ...node }))
  const layoutLinks: LayoutLink[] = edges.map((edge) => ({ ...edge }))
  const distanceDelta = Math.abs(revision % 2) * 3

  const simulation = forceSimulation(layoutNodes)
    .force(
      'link',
      forceLink<LayoutNode, LayoutLink>(layoutLinks)
        .id((node) => node.id)
        .distance((edge) => 38 + (3 - edge.weight) * 8 + distanceDelta)
        .strength((edge) => 0.24 + edge.weight * 0.08),
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
    label: node.label,
    group: node.group,
    x: coordinate(node.x, node.id, 'x'),
    y: coordinate(node.y, node.id, 'y'),
  }))
  const positionedLinks = layoutLinks.map((edge) => {
    const source = resolvedNode(edge.source, edge.id, 'source')
    const target = resolvedNode(edge.target, edge.id, 'target')
    return {
      id: edge.id,
      source: source.id,
      target: target.id,
      weight: edge.weight,
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
  edgeId: string,
  endpoint: 'source' | 'target',
): LayoutNode {
  if (typeof value !== 'string') return value
  throw new TypeError(`Force layout did not resolve ${endpoint} for ${edgeId}`)
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
