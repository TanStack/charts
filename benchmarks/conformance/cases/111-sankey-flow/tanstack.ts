import { d3Curve, defineChart, link, rect, text } from '@tanstack/charts'
import { sankey, sankeyLeft } from 'd3-sankey'
import { scaleLinear } from 'd3-scale'
import { curveBumpX } from 'd3-shape'
import { labelBackdropBounds, responsiveLayout } from './layout'
import {
  incomeStatementData,
  incomeStatementTitle,
  linkColors,
  toneColors,
} from './model'
import { tanstackMount } from '../../shared/mount'
import type { SankeyGraph, SankeyLink, SankeyNode } from 'd3-sankey'
import type { FlowLink, FlowNode, FlowTone } from './model'
import type { ConformanceInput } from '../../types'

const toneDomain = [
  'Neutral',
  'Profit',
  'Cost',
] as const satisfies readonly FlowTone[]

export interface IncomeSankeyNodeRow extends FlowNode {
  readonly kind: 'node'
  readonly x0: number
  readonly x1: number
  readonly y0: number
  readonly y1: number
  readonly labelText: string
  readonly labelX: number
  readonly labelNameY: number
  readonly labelValueY: number
  readonly labelAnchor: 'start' | 'end'
  readonly backdropX0: number
  readonly backdropX1: number
  readonly backdropY0: number
  readonly backdropY1: number
}

export interface IncomeSankeyLinkRow extends FlowLink {
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

export interface IncomeSankeyTitleRow {
  readonly kind: 'title'
  readonly id: 'title'
  readonly title: string
  readonly x: number
  readonly y: number
}

export type IncomeSankeyDatum =
  IncomeSankeyNodeRow | IncomeSankeyLinkRow | IncomeSankeyTitleRow

export const sankeyDefinition = (input: ConformanceInput) => {
  const { nodes, links } = incomeStatementData(input.revision)

  return defineChart(({ width, height }) => {
    const layout = responsiveLayout(width, height)
    const graph = sankey<FlowNode, FlowLink>()
      .nodeId((node) => node.id)
      .nodeAlign(sankeyLeft)
      .nodeSort((left, right) => left.order - right.order)
      .nodeWidth(layout.nodeWidth)
      .nodePadding(layout.nodePadding)
      .extent([
        [layout.leftMargin, layout.topMargin],
        [width - layout.rightMargin, height - layout.bottomMargin],
      ])
      .iterations(32)(cloneGraph(nodes, links))
    const nodeRows = graph.nodes.map((node) =>
      nodeRow(node, width, layout.labelOffset, layout.labelFontSize),
    )
    const linkRows = graph.links.map(linkRow)
    const backdropRows = nodeRows.filter((node) => node.labelBackdrop)
    const titleRows: readonly IncomeSankeyTitleRow[] = [
      {
        kind: 'title',
        id: 'title',
        title: incomeStatementTitle,
        x: width / 2,
        y: layout.titleY,
      },
    ]

    return {
      marks: [
        link(linkRows, {
          x1: 'x1',
          y1: 'y1',
          x2: 'x2',
          y2: 'y2',
          stroke: (flow) => linkColors[flow.tone],
          strokeOpacity: (flow) => (flow.tone === 'Neutral' ? 0.58 : 0.64),
          strokeWidth: (flow) => flow.width,
          lineCap: 'butt',
          curve: d3Curve(curveBumpX),
        }),
        rect(nodeRows, {
          x1: 'x0',
          x2: 'x1',
          y1: 'y0',
          y2: 'y1',
          color: 'tone',
          inset: 0,
        }),
        rect(backdropRows, {
          x1: 'backdropX0',
          x2: 'backdropX1',
          y1: 'backdropY0',
          y2: 'backdropY1',
          fill: 'var(--panel, #ffffff)',
          fillOpacity: 0.82,
          inset: 0,
          radius: 1,
        }),
        text(nodeRows, {
          x: 'labelX',
          y: 'labelNameY',
          text: 'labelText',
          anchor: (node) => node.labelAnchor,
          fill: 'currentColor',
          fontSize: layout.labelFontSize,
          fontWeight: 700,
        }),
        text(nodeRows, {
          x: 'labelX',
          y: 'labelValueY',
          text: 'displayValue',
          anchor: (node) => node.labelAnchor,
          fill: 'currentColor',
          fontSize: layout.labelFontSize,
          fontWeight: 500,
        }),
        text(titleRows, {
          x: 'x',
          y: 'y',
          text: 'title',
          fill: '#155477',
          fontSize: layout.titleFontSize,
          fontWeight: 750,
        }),
      ],
      x: { scale: scaleLinear().domain([0, width]) },
      y: { scale: scaleLinear().domain([height, 0]) },
      color: {
        domain: toneDomain,
        range: toneDomain.map((tone) => toneColors[tone]),
      },
      guides: false,
      margin: 0,
    }
  })
}

function nodeRow(
  node: SankeyNode<FlowNode, FlowLink>,
  width: number,
  labelOffset: number,
  labelFontSize: number,
): IncomeSankeyNodeRow {
  const { x0, x1, y0, y1 } = resolvedNodeBounds(node)
  const labelOnRight = node.labelSide === 'right'
  const labelX = labelOnRight ? x1 + labelOffset : x0 - labelOffset
  const labelAnchor = labelOnRight ? 'start' : 'end'
  const centerY = (y0 + y1) / 2
  const labelText =
    width < 720 && node.compactLabel ? node.compactLabel : node.label
  const backdrop = labelBackdropBounds({
    anchor: labelAnchor,
    centerY,
    fontSize: labelFontSize,
    label: labelText,
    labelX,
    value: node.displayValue,
  })

  return {
    kind: 'node',
    id: node.id,
    label: node.label,
    compactLabel: node.compactLabel,
    value: node.value,
    displayValue: node.displayValue,
    tone: node.tone,
    order: node.order,
    labelSide: node.labelSide,
    labelBackdrop: node.labelBackdrop,
    x0,
    x1,
    y0,
    y1,
    labelText,
    labelX,
    labelNameY: centerY - labelFontSize * 0.5,
    labelValueY: centerY + labelFontSize * 0.58,
    labelAnchor,
    backdropX0: backdrop.x,
    backdropX1: backdrop.x + backdrop.width,
    backdropY0: backdrop.y,
    backdropY1: backdrop.y + backdrop.height,
  }
}

function linkRow(flow: SankeyLink<FlowNode, FlowLink>): IncomeSankeyLinkRow {
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
    tone: flow.tone,
    x1: resolvedNodeBounds(source).x1,
    y1,
    x2: resolvedNodeBounds(target).x0,
    y2,
    width: Math.max(1, flow.width ?? 1),
  }
}

function cloneGraph(
  nodes: readonly FlowNode[],
  links: readonly FlowLink[],
): SankeyGraph<FlowNode, FlowLink> {
  return {
    nodes: nodes.map((node) => ({ ...node })),
    links: links.map((flow) => ({ ...flow })),
  }
}

function resolvedLinkNode(
  node: SankeyLink<FlowNode, FlowLink>['source'],
  endpoint: 'source' | 'target',
): SankeyNode<FlowNode, FlowLink> {
  if (typeof node === 'object') return node
  throw new TypeError(`Unresolved Sankey link ${endpoint}`)
}

function resolvedNodeBounds(node: SankeyNode<FlowNode, FlowLink>) {
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

export const mount = tanstackMount(sankeyDefinition, incomeStatementTitle, {
  format: ({ datum }) => {
    if (datum.kind === 'title') return datum.title
    if (datum.kind === 'node') return `${datum.label} · ${datum.displayValue}`
    return `${datum.sourceLabel} → ${datum.targetLabel} · ${datum.value}`
  },
})
