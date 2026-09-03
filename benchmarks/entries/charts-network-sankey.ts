import { rect } from '@tanstack/charts/rect'
import { sankeyDiagram } from '@tanstack/charts/network/sankey'

const nodes = [
  { id: 'source', label: 'Source' },
  { id: 'middle', label: 'Middle' },
  { id: 'target', label: 'Target' },
]
const links = [
  { id: 'source-middle', source: 'source', target: 'middle', value: 6 },
  { id: 'middle-target', source: 'middle', target: 'target', value: 4 },
]

export const mark = sankeyDiagram({
  nodes,
  links,
  nodeKey: 'id',
  source: 'source',
  target: 'target',
  value: 'value',
  marks: ({ nodes: laidOutNodes }) => [
    rect(laidOutNodes, {
      x1: 'x0',
      x2: 'x1',
      y1: 'y0',
      y2: 'y1',
      key: 'key',
    }),
  ],
})
