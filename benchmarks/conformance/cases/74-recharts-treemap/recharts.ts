import { createElement } from 'react'
import { Treemap } from 'recharts'
import { bundleGroups } from './data'
import { rechartsMount } from '../../shared/recharts-mount'
import type { ConformanceInput } from '../../types'
import type { TreemapNode } from 'recharts'

function renderTreemapNode(node: TreemapNode) {
  if (node.depth !== 2) return createElement('g')

  const fill = typeof node.fill === 'string' ? node.fill : '#64748b'

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
    createElement(
      'text',
      {
        key: 'text',
        className: 'recharts-text',
        x: node.x + 5,
        y: node.y + 15,
        fill: '#ffffff',
        fontSize: 10,
        fontWeight: 600,
      },
      node.name,
    ),
  ])
}

function chart(input: ConformanceInput) {
  return createElement(Treemap, {
    width: input.width,
    height: input.height,
    data: bundleGroups(input.revision),
    dataKey: 'size',
    nameKey: 'name',
    aspectRatio: 4 / 3,
    type: 'flat',
    content: renderTreemapNode,
    isAnimationActive: false,
    isUpdateAnimationActive: false,
  })
}

export const mount = rechartsMount(chart, 'Bundle size treemap')
