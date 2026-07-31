import { createElement } from 'react'
import { Sankey } from 'recharts'
import { basicSankeyData } from './model'
import { rechartsMount } from '../../shared/recharts-mount'
import type { ConformanceInput } from '../../types'
import type { LinkProps, NodeProps } from 'recharts/types/chart/Sankey'

function chart(input: ConformanceInput) {
  const { nodes, links } = basicSankeyData(input.revision)
  const layout = responsiveLayout(input.width, input.height)
  const nodeIndexes = new Map(nodes.map((node, index) => [node.id, index]))
  const renderLink = ({
    sourceX,
    sourceY,
    sourceControlX,
    targetX,
    targetY,
    targetControlX,
    linkWidth,
  }: LinkProps) =>
    createElement('path', {
      className: 'recharts-sankey-link',
      d: [
        `M${sourceX},${sourceY}`,
        `C${sourceControlX},${sourceY}`,
        `${targetControlX},${targetY}`,
        `${targetX},${targetY}`,
      ].join(' '),
      fill: 'none',
      stroke: 'currentColor',
      strokeOpacity: 0.35,
      strokeWidth: Math.max(1, linkWidth),
      strokeLinecap: 'butt',
    })
  const renderNode = ({ x, y, width, height, index }: NodeProps) => {
    const node = nodes[index]
    if (!node) return createElement('g')
    const labelOnRight = index !== 0

    return createElement(
      'g',
      null,
      createElement('rect', {
        className: 'recharts-rectangle',
        x,
        y,
        width,
        height: Math.max(1, height),
        fill: 'currentColor',
        fillOpacity: 0.72,
      }),
      createElement(
        'text',
        {
          className: 'recharts-text',
          x: labelOnRight
            ? x + width + layout.labelOffset
            : x - layout.labelOffset,
          y: y + height / 2,
          fill: 'currentColor',
          fontSize: layout.labelFontSize,
          fontWeight: 650,
          textAnchor: labelOnRight ? 'start' : 'end',
          dominantBaseline: 'middle',
        },
        node.label,
      ),
    )
  }

  return createElement(Sankey, {
    width: input.width,
    height: input.height,
    data: {
      nodes: nodes.map((node) => ({ ...node })),
      links: links.map((link) => ({
        source: requiredNodeIndex(nodeIndexes, link.source),
        target: requiredNodeIndex(nodeIndexes, link.target),
        value: link.value,
      })),
    },
    node: renderNode,
    link: renderLink,
    nodeWidth: layout.nodeWidth,
    nodePadding: layout.nodePadding,
    iterations: 16,
    sort: false,
    align: 'left',
    verticalAlign: 'justify',
    margin: {
      top: layout.verticalMargin,
      right: layout.sideMargin,
      bottom: layout.verticalMargin,
      left: layout.sideMargin,
    },
    accessibilityLayer: true,
  })
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

function requiredNodeIndex(indexes: ReadonlyMap<string, number>, id: string) {
  const index = indexes.get(id)
  if (index === undefined) {
    throw new TypeError(`Unknown Sankey node "${id}"`)
  }
  return index
}

export const mount = rechartsMount(chart, 'Basic Sankey')
