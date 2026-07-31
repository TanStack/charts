import { createElement } from 'react'
import { Sankey } from 'recharts'
import { labelBackdropBounds, responsiveLayout } from './layout'
import {
  incomeStatementData,
  incomeStatementTitle,
  linkColors,
  toneColors,
} from './model'
import { rechartsMount } from '../../shared/recharts-mount'
import type { ConformanceInput } from '../../types'
import type { SankeyLinkProps, SankeyNodeProps } from 'recharts'

function chart(input: ConformanceInput) {
  const { nodes, links } = incomeStatementData(input.revision)
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
    index,
  }: SankeyLinkProps) => {
    const link = links[index]
    if (!link) return createElement('path')
    return createElement('path', {
      className: 'recharts-sankey-link',
      d: [
        `M${sourceX},${sourceY}`,
        `C${sourceControlX},${sourceY}`,
        `${targetControlX},${targetY}`,
        `${targetX},${targetY}`,
      ].join(' '),
      fill: 'none',
      stroke: linkColors[link.tone],
      strokeOpacity: link.tone === 'Neutral' ? 0.58 : 0.64,
      strokeWidth: Math.max(1, linkWidth),
      strokeLinecap: 'butt',
    })
  }
  const renderNode = ({ x, y, width, height, index }: SankeyNodeProps) => {
    const node = nodes[index]
    if (!node) return createElement('g')
    const labelOnRight = node.labelSide === 'right'
    const labelX = labelOnRight
      ? x + width + layout.labelOffset
      : x - layout.labelOffset
    const centerY = y + height / 2
    const label =
      input.width < 720 && node.compactLabel ? node.compactLabel : node.label
    const children = [
      createElement('rect', {
        key: 'rect',
        className: 'recharts-rectangle',
        x,
        y,
        width,
        height: Math.max(1, height),
        fill: toneColors[node.tone],
      }),
      ...(node.labelBackdrop
        ? [
            createElement('rect', {
              key: 'label-backdrop',
              className: 'recharts-rectangle',
              ...labelBackdropBounds({
                anchor: labelOnRight ? 'start' : 'end',
                centerY,
                fontSize: layout.labelFontSize,
                label,
                labelX,
                value: node.displayValue,
              }),
              rx: 1,
              fill: 'var(--panel, #ffffff)',
              fillOpacity: 0.82,
            }),
          ]
        : []),
      createElement(
        'text',
        {
          key: 'name',
          className: 'recharts-text',
          x: labelX,
          y: centerY - layout.labelFontSize * 0.5,
          fill: 'currentColor',
          fontSize: layout.labelFontSize,
          fontWeight: 700,
          textAnchor: labelOnRight ? 'start' : 'end',
          dominantBaseline: 'middle',
        },
        label,
      ),
      createElement(
        'text',
        {
          key: 'value',
          className: 'recharts-text',
          x: labelX,
          y: centerY + layout.labelFontSize * 0.58,
          fill: 'currentColor',
          fontSize: layout.labelFontSize,
          fontWeight: 500,
          textAnchor: labelOnRight ? 'start' : 'end',
          dominantBaseline: 'middle',
        },
        node.displayValue,
      ),
    ]

    if (index === 0) {
      children.unshift(
        createElement(
          'text',
          {
            key: 'title',
            className: 'recharts-text',
            x: input.width / 2,
            y: layout.titleY,
            fill: '#155477',
            fontSize: layout.titleFontSize,
            fontWeight: 750,
            textAnchor: 'middle',
            dominantBaseline: 'middle',
          },
          incomeStatementTitle,
        ),
      )
    }

    return createElement('g', null, children)
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
    iterations: 32,
    sort: false,
    align: 'left',
    verticalAlign: 'justify',
    margin: {
      top: layout.topMargin,
      right: layout.rightMargin,
      bottom: layout.bottomMargin,
      left: layout.leftMargin,
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

export const mount = rechartsMount(chart, incomeStatementTitle)
