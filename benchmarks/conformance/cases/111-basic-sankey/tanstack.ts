import { d3Curve, defineChart, link, rect, text } from '@tanstack/charts'
import { sankey, sankeyLeft } from 'd3-sankey'
import { scaleLinear } from 'd3-scale'
import { curveBumpX } from 'd3-shape'
import { responsiveLayout } from './layout'
import { basicSankeyData } from './model'
import { tanstackMount } from '../../shared/mount'
import type { SankeyGraph, SankeyLink, SankeyNode } from 'd3-sankey'
import type { ConformanceInput } from '../../types'
import type { BasicFlowLink, BasicFlowNode } from './model'

export interface BasicSankeyNodeRow extends BasicFlowNode {
  readonly kind: 'node'
  readonly value: number
  readonly x0: number
  readonly x1: number
  readonly y0: number
  readonly y1: number
  readonly labelX: number
  readonly labelY: number
  readonly labelAnchor: 'start' | 'end'
}

export interface BasicSankeyLinkRow extends BasicFlowLink {
  readonly kind: 'link'
  readonly id: string
  readonly sourceLabel: string
  readonly targetLabel: string
  readonly x1: number
  readonly y1: number
  readonly x2: number
  readonly y2: number
  readonly width: number
}

export type BasicSankeyDatum = BasicSankeyNodeRow | BasicSankeyLinkRow

export const basicSankeyDefinition = (input: ConformanceInput) => {
  const { nodes, links } = basicSankeyData(input.revision)

  return defineChart(({ width, height }) => {
    const layout = responsiveLayout(width, height)
    const graph = sankey<BasicFlowNode, BasicFlowLink>()
      .nodeId((node) => node.id)
      .nodeAlign(sankeyLeft)
      .nodeWidth(layout.nodeWidth)
      .nodePadding(layout.nodePadding)
      .extent([
        [layout.sideMargin, layout.verticalMargin],
        [width - layout.sideMargin, height - layout.verticalMargin],
      ])
      .iterations(16)(cloneGraph(nodes, links))
    const nodeRows = graph.nodes.map((node) =>
      nodeRow(node, layout.labelOffset),
    )
    const linkRows = graph.links.map(linkRow)

    return {
      marks: [
        link(linkRows, {
          x1: 'x1',
          y1: 'y1',
          x2: 'x2',
          y2: 'y2',
          stroke: 'currentColor',
          strokeOpacity: 0.35,
          strokeWidth: (flow) => flow.width,
          lineCap: 'butt',
          curve: d3Curve(curveBumpX),
        }),
        rect(nodeRows, {
          x1: 'x0',
          x2: 'x1',
          y1: 'y0',
          y2: 'y1',
          fill: 'currentColor',
          fillOpacity: 0.72,
          inset: 0,
        }),
        text(nodeRows, {
          x: 'labelX',
          y: 'labelY',
          text: 'label',
          anchor: (node) => node.labelAnchor,
          fill: 'currentColor',
          fontSize: layout.labelFontSize,
          fontWeight: 650,
        }),
      ],
      x: { scale: scaleLinear().domain([0, width]) },
      y: { scale: scaleLinear().domain([height, 0]) },
      guides: false,
      margin: 0,
    }
  })
}

function nodeRow(
  node: SankeyNode<BasicFlowNode, BasicFlowLink>,
  labelOffset: number,
): BasicSankeyNodeRow {
  const { x0, x1, y0, y1 } = resolvedNodeBounds(node)
  const labelOnRight = node.depth !== 0

  return {
    kind: 'node',
    id: node.id,
    label: node.label,
    value: node.value ?? 0,
    x0,
    x1,
    y0,
    y1,
    labelX: labelOnRight ? x1 + labelOffset : x0 - labelOffset,
    labelY: (y0 + y1) / 2,
    labelAnchor: labelOnRight ? 'start' : 'end',
  }
}

function linkRow(
  flow: SankeyLink<BasicFlowNode, BasicFlowLink>,
): BasicSankeyLinkRow {
  const source = resolvedLinkNode(flow.source, 'source')
  const target = resolvedLinkNode(flow.target, 'target')
  const y1 = flow.y0
  const y2 = flow.y1
  if (y1 === undefined || y2 === undefined) {
    throw new TypeError(
      `Sankey link "${source.id} → ${target.id}" has no layout`,
    )
  }

  return {
    kind: 'link',
    id: `${source.id}:${target.id}`,
    source: source.id,
    target: target.id,
    sourceLabel: source.label,
    targetLabel: target.label,
    value: flow.value,
    x1: resolvedNodeBounds(source).x1,
    y1,
    x2: resolvedNodeBounds(target).x0,
    y2,
    width: Math.max(1, flow.width ?? 1),
  }
}

function cloneGraph(
  nodes: readonly BasicFlowNode[],
  links: readonly BasicFlowLink[],
): SankeyGraph<BasicFlowNode, BasicFlowLink> {
  return {
    nodes: nodes.map((node) => ({ ...node })),
    links: links.map((flow) => ({ ...flow })),
  }
}

function resolvedLinkNode(
  node: SankeyLink<BasicFlowNode, BasicFlowLink>['source'],
  endpoint: 'source' | 'target',
): SankeyNode<BasicFlowNode, BasicFlowLink> {
  if (typeof node === 'object') return node
  throw new TypeError(`Unresolved Sankey link ${endpoint}`)
}

function resolvedNodeBounds(node: SankeyNode<BasicFlowNode, BasicFlowLink>) {
  const { x0, x1, y0, y1 } = node
  if (
    x0 === undefined ||
    x1 === undefined ||
    y0 === undefined ||
    y1 === undefined
  ) {
    throw new TypeError(`Sankey node "${node.id}" has no layout bounds`)
  }
  return { x0, x1, y0, y1 }
}

export const mount = tanstackMount(basicSankeyDefinition, 'Basic Sankey', {
  format: ({ datum }) =>
    datum.kind === 'node'
      ? `${datum.label} · ${datum.value}`
      : `${datum.sourceLabel} → ${datum.targetLabel} · ${datum.value}`,
})
