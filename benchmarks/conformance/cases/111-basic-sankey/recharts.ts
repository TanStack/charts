import { createElement } from 'react'
import { Sankey } from 'recharts'
import { responsiveLayout } from './layout'
import { basicSankeyData } from './model'
import { rechartsMount } from '../../shared/recharts-mount'
import type { ConformanceInput } from '../../types'
import type { SankeyLinkProps, SankeyNodeProps } from 'recharts'

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
  }: SankeyLinkProps) =>
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
  const renderNode = ({ x, y, width, height, index }: SankeyNodeProps) => {
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

function requiredNodeIndex(indexes: ReadonlyMap<string, number>, id: string) {
  const index = indexes.get(id)
  if (index === undefined) {
    throw new TypeError(`Unknown Sankey node "${id}"`)
  }
  return index
}

export const mount = rechartsMount(chart, 'Basic Sankey')
