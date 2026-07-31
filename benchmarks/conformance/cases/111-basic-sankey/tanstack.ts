import { defineChart } from '@tanstack/charts'
import { createMarkWithScaleValues } from '@tanstack/charts/mark/scale-values'
import { sankey, sankeyLeft, sankeyLinkHorizontal } from 'd3-sankey'
import { basicFlowLinks, basicFlowNodes } from './data'
import { tanstackMount } from '../../shared/mount'
import type { ChartPoint, SceneNode } from '@tanstack/charts'
import type { SankeyGraph, SankeyLink, SankeyNode } from 'd3-sankey'
import type { BasicFlowLink, BasicFlowNode } from './data'

export const basicSankeyDefinition = () =>
  defineChart({
    marks: [basicSankey(basicFlowNodes, basicFlowLinks)],
    margin: 0,
  })

function basicSankey(
  nodes: readonly BasicFlowNode[],
  links: readonly BasicFlowLink[],
) {
  return createMarkWithScaleValues<BasicFlowNode, string, number, never, never>(
    ({ markIndex }) => {
      const id = `basic-sankey-${markIndex}`
      const sourceNodes = new Map(nodes.map((node) => [node.id, node]))

      return {
        id,
        channels: {},
        render: ({ chart, theme }) => {
          const layout = responsiveLayout(chart.width, chart.height)
          const graph = sankey<BasicFlowNode, BasicFlowLink>()
            .nodeId((node) => node.id)
            .nodeAlign(sankeyLeft)
            .nodeWidth(layout.nodeWidth)
            .nodePadding(layout.nodePadding)
            .extent([
              [chart.x + layout.sideMargin, chart.y + layout.verticalMargin],
              [
                chart.x + chart.width - layout.sideMargin,
                chart.y + chart.height - layout.verticalMargin,
              ],
            ])
            .iterations(16)(cloneGraph(nodes, links))
          const linkPath = sankeyLinkHorizontal<BasicFlowNode, BasicFlowLink>()
          const linkNodes: SceneNode[] = []
          const rectNodes: SceneNode[] = []
          const labelNodes: SceneNode[] = []
          const points: ChartPoint<BasicFlowNode, string, number>[] = []

          for (const link of graph.links) {
            const source = resolvedLinkNode(link.source, 'source')
            const target = resolvedLinkNode(link.target, 'target')
            const path = linkPath(link)
            if (path === null) continue
            linkNodes.push({
              kind: 'polyline',
              key: `${id}:link:${source.id}:${target.id}`,
              points: [],
              path,
              style: {
                fill: 'none',
                stroke: theme.muted,
                strokeOpacity: 0.35,
                strokeWidth: Math.max(1, link.width ?? 1),
                lineCap: 'butt',
              },
            })
          }

          for (const node of graph.nodes) {
            const bounds = resolvedNodeBounds(node)
            const datum = sourceNodes.get(node.id)
            if (!datum) {
              throw new TypeError(`Unknown Sankey node "${node.id}"`)
            }
            const key = `${id}:node:${node.id}`
            const labelOnRight = node.depth !== 0
            const centerX = (bounds.x0 + bounds.x1) / 2
            const centerY = (bounds.y0 + bounds.y1) / 2

            rectNodes.push({
              kind: 'rect',
              key,
              x: bounds.x0,
              y: bounds.y0,
              width: bounds.x1 - bounds.x0,
              height: Math.max(1, bounds.y1 - bounds.y0),
              style: { fill: theme.foreground, fillOpacity: 0.72 },
            })
            labelNodes.push({
              kind: 'label',
              key: `${key}:label`,
              x: labelOnRight
                ? bounds.x1 + layout.labelOffset
                : bounds.x0 - layout.labelOffset,
              y: centerY,
              text: node.label,
              anchor: labelOnRight ? 'start' : 'end',
              baseline: 'middle',
              fontSize: layout.labelFontSize,
              fontWeight: 650,
              style: { fill: theme.foreground },
            })
            points.push({
              key,
              markId: id,
              group: 'Flow',
              groupLabel: 'Flow',
              datum,
              datumIndex: points.length,
              xValue: node.id,
              yValue: node.value ?? 0,
              x: centerX,
              y: centerY,
              color: theme.foreground,
            })
          }

          return {
            nodes: [
              sceneGroup(`${id}:links`, 'ts-chart__link', linkNodes),
              sceneGroup(`${id}:nodes`, 'ts-chart__rect', rectNodes),
              sceneGroup(`${id}:labels`, 'ts-chart__text', labelNodes),
            ],
            points,
          }
        },
      }
    },
  )
}

function responsiveLayout(width: number, height: number) {
  return {
    sideMargin: clamp(width * 0.14, 48, 82),
    verticalMargin: clamp(height * 0.1, 18, 32),
    nodeWidth: clamp(width * 0.025, 10, 18),
    nodePadding: clamp(height * 0.12, 18, 38),
    labelFontSize: clamp(width * 0.018, 8, 12),
    labelOffset: clamp(width * 0.012, 4, 8),
  }
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value))
}

function cloneGraph(
  nodes: readonly BasicFlowNode[],
  links: readonly BasicFlowLink[],
): SankeyGraph<BasicFlowNode, BasicFlowLink> {
  return {
    nodes: nodes.map((node) => ({ ...node })),
    links: links.map((link) => ({ ...link })),
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

function sceneGroup(
  key: string,
  className: string,
  children: readonly SceneNode[],
): SceneNode {
  return {
    kind: 'group',
    key,
    className,
    ariaHidden: true,
    children,
  }
}

export const mount = tanstackMount(basicSankeyDefinition, 'Basic Sankey', {
  format: ({ datum }) => datum.label,
})
