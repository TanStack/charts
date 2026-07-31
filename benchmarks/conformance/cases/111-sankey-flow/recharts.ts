import { createElement } from 'react'
import { Sankey } from 'recharts'
import {
  incomeStatementData,
  incomeStatementTitle,
  linkColors,
  toneColors,
} from './model'
import { rechartsMount } from '../../shared/recharts-mount'
import type { ConformanceInput } from '../../types'
import type { LinkProps, NodeProps } from 'recharts/types/chart/Sankey'

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
  }: LinkProps) => {
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
  const renderNode = ({ x, y, width, height, index }: NodeProps) => {
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

function requiredNodeIndex(indexes: ReadonlyMap<string, number>, id: string) {
  const index = indexes.get(id)
  if (index === undefined) {
    throw new TypeError(`Unknown Sankey node "${id}"`)
  }
  return index
}

export const mount = rechartsMount(chart, incomeStatementTitle)
