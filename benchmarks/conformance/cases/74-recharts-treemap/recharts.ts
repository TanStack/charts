import { createElement } from 'react'
import { Treemap } from 'recharts'
import { flare } from '@tanstack/charts-data/flare'
import { selectTreemapData } from './selection'
import { flareLabel, flareTree } from './transform'
import { rechartsMount } from '../../shared/recharts-mount'
import type { ConformanceInput } from '../../types'
import type { TreemapNode } from 'recharts'

const colors = ['#2563eb', '#8b5cf6', '#10b981']

function chart(input: ConformanceInput) {
  const treemapData = selectTreemapData(flare)
  const tree = flareTree(treemapData)
  const colorByFamily = new Map(
    tree.children?.map((child, index) => [
      child.name,
      colors[index % colors.length],
    ]),
  )

  function renderTreemapNode(node: TreemapNode) {
    if (node.children !== null) return createElement('g')

    const fill = colorByFamily.get(String(node.family)) ?? '#64748b'
    const label = flareLabel(node.name)
    const labelFits = node.width >= label.length * 4.8 + 8 && node.height >= 14

    return createElement('g', null, [
      createElement('rect', {
        key: 'rect',
        className: 'recharts-rectangle',
        x: node.x + 1,
        y: node.y + 1,
        width: Math.max(0, node.width - 2),
        height: Math.max(0, node.height - 2),
        fill,
        stroke: '#ffffff',
        strokeWidth: 1,
      }),
      ...(labelFits
        ? [
            createElement(
              'text',
              {
                key: 'text',
                className: 'recharts-text',
                x: node.x + node.width / 2,
                y: node.y + node.height / 2,
                fill: '#ffffff',
                fontSize: 8,
                fontWeight: 600,
                textAnchor: 'middle',
                dominantBaseline: 'middle',
              },
              label,
            ),
          ]
        : []),
    ])
  }

  return createElement(Treemap, {
    width: input.width,
    height: input.height,
    data: [tree],
    dataKey: 'size',
    nameKey: 'name',
    aspectRatio: 4 / 3,
    type: 'flat',
    content: renderTreemapNode,
    isAnimationActive: false,
    isUpdateAnimationActive: false,
  })
}

export const mount = rechartsMount(chart, 'Flare analytics treemap')
