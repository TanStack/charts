import { defineChart } from '@tanstack/charts'
import { createMarkWithScaleValues } from '@tanstack/charts/mark/scale-values'
import { sankey, sankeyLeft, sankeyLinkHorizontal } from 'd3-sankey'
import {
  flowLinks,
  flowNodes,
  incomeStatementTitle,
  linkColors,
  toneColors,
} from './data'
import { tanstackMount } from '../../shared/mount'
import type { ChartPoint, SceneNode } from '@tanstack/charts'
import type { SankeyGraph, SankeyLink, SankeyNode } from 'd3-sankey'
import type { FlowLink, FlowNode, FlowTone } from './data'

const toneDomain = [
  'Neutral',
  'Profit',
  'Cost',
] as const satisfies readonly FlowTone[]

export const sankeyDefinition = () =>
  defineChart({
    marks: [sankeyFlow(flowNodes, flowLinks)],
    color: {
      domain: toneDomain,
      range: toneDomain.map((tone) => toneColors[tone]),
    },
    margin: 0,
  })

function sankeyFlow(nodes: readonly FlowNode[], links: readonly FlowLink[]) {
  return createMarkWithScaleValues<FlowNode, string, number, never, never>(
    ({ markIndex }) => {
      const id = `sankey-${markIndex}`
      const sourceNodes = new Map(nodes.map((node) => [node.id, node]))

      return {
        id,
        channels: {
          color: {
            scale: 'color',
            values: nodes.map((node) => node.tone),
          },
        },
        render: ({ chart, color, theme }) => {
          const layout = responsiveLayout(chart.width, chart.height)
          const graph = sankey<FlowNode, FlowLink>()
            .nodeId((node) => node.id)
            .nodeAlign(sankeyLeft)
            .nodeSort((left, right) => left.order - right.order)
            .nodeWidth(layout.nodeWidth)
            .nodePadding(layout.nodePadding)
            .extent([
              [chart.x + layout.leftMargin, chart.y + layout.topMargin],
              [
                chart.x + chart.width - layout.rightMargin,
                chart.y + chart.height - layout.bottomMargin,
              ],
            ])
            .iterations(32)(cloneGraph(nodes, links))
          const linkPath = sankeyLinkHorizontal<FlowNode, FlowLink>()
          const linkNodes: SceneNode[] = []
          const rectNodes: SceneNode[] = []
          const labelNodes: SceneNode[] = [
            {
              kind: 'label',
              key: `${id}:title`,
              x: chart.x + chart.width / 2,
              y: chart.y + layout.titleY,
              text: incomeStatementTitle,
              anchor: 'middle',
              baseline: 'middle',
              fontSize: layout.titleFontSize,
              fontWeight: 750,
              style: { fill: '#155477' },
            },
          ]
          const points: ChartPoint<FlowNode, string, number>[] = []

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
                stroke: linkColors[link.tone],
                strokeOpacity: link.tone === 'Neutral' ? 0.58 : 0.64,
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
            const fill = color(node.tone)
            const key = `${id}:node:${node.id}`
            const centerX = (bounds.x0 + bounds.x1) / 2
            const centerY = (bounds.y0 + bounds.y1) / 2
            const labelOnRight = node.labelSide === 'right'
            const labelX = labelOnRight
              ? bounds.x1 + layout.labelOffset
              : bounds.x0 - layout.labelOffset
            const labelAnchor = labelOnRight ? 'start' : 'end'
            const label =
              chart.width < 720 && node.compactLabel
                ? node.compactLabel
                : node.label

            rectNodes.push({
              kind: 'rect',
              key,
              x: bounds.x0,
              y: bounds.y0,
              width: bounds.x1 - bounds.x0,
              height: Math.max(1, bounds.y1 - bounds.y0),
              style: { fill },
            })
            if (node.labelBackdrop) {
              const backdrop = labelBackdropBounds({
                anchor: labelAnchor,
                centerY,
                fontSize: layout.labelFontSize,
                label,
                labelX,
                value: node.displayValue,
              })
              rectNodes.push({
                kind: 'rect',
                key: `${key}:label-backdrop`,
                ...backdrop,
                radius: 1,
                style: {
                  fill: 'var(--panel, #ffffff)',
                  fillOpacity: 0.82,
                },
              })
            }
            labelNodes.push(
              {
                kind: 'label',
                key: `${key}:name`,
                x: labelX,
                y: centerY - layout.labelFontSize * 0.5,
                text: label,
                anchor: labelAnchor,
                baseline: 'middle',
                fontSize: layout.labelFontSize,
                fontWeight: 700,
                style: { fill: theme.foreground },
              },
              {
                kind: 'label',
                key: `${key}:value`,
                x: labelX,
                y: centerY + layout.labelFontSize * 0.58,
                text: node.displayValue,
                anchor: labelAnchor,
                baseline: 'middle',
                fontSize: layout.labelFontSize,
                fontWeight: 500,
                style: { fill: theme.foreground },
              },
            )
            points.push({
              key,
              markId: id,
              group: node.tone,
              groupLabel: node.tone,
              datum,
              datumIndex: points.length,
              xValue: node.id,
              yValue: node.value ?? 0,
              x: centerX,
              y: centerY,
              color: fill,
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
    leftMargin: clamp(width * 0.15, 56, 122),
    rightMargin: clamp(width * 0.13, 48, 105),
    topMargin: clamp(height * 0.14, 38, 70),
    bottomMargin: clamp(height * 0.025, 8, 14),
    nodeWidth: clamp(width * 0.032, 10, 24),
    nodePadding: clamp(height * 0.11, 12, 40),
    labelFontSize: clamp(width * 0.013, 6.5, 10.5),
    labelOffset: clamp(width * 0.008, 3, 6),
    titleFontSize: clamp(width * 0.034, 14, 26),
    titleY: clamp(height * 0.065, 17, 32),
  }
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value))
}

function labelBackdropBounds(options: {
  anchor: 'start' | 'end'
  centerY: number
  fontSize: number
  label: string
  labelX: number
  value: string
}) {
  const width =
    Math.max(options.label.length, options.value.length) *
      options.fontSize *
      0.58 +
    5
  const height = options.fontSize * 2.25
  return {
    x:
      options.anchor === 'start'
        ? options.labelX - 2
        : options.labelX - width + 2,
    y: options.centerY - height / 2,
    width,
    height,
  }
}

function cloneGraph(
  nodes: readonly FlowNode[],
  links: readonly FlowLink[],
): SankeyGraph<FlowNode, FlowLink> {
  return {
    nodes: nodes.map((node) => ({ ...node })),
    links: links.map((link) => ({ ...link })),
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

export const mount = tanstackMount(sankeyDefinition, incomeStatementTitle, {
  format: ({ datum }) => `${datum.label} · ${datum.displayValue}`,
})
