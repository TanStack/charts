import { forceLayout } from '@tanstack/charts/network/force'

const nodes = [
  { id: 'a', group: 'one' },
  { id: 'b', group: 'one' },
  { id: 'c', group: 'two' },
  { id: 'd', group: 'two' },
]
const links = [
  { source: 'a', target: 'b', value: 2 },
  { source: 'b', target: 'c', value: 1 },
  { source: 'c', target: 'd', value: 3 },
]

export const layout = forceLayout(nodes, links, {
  nodeKey: 'id',
  source: 'source',
  target: 'target',
  iterations: 100,
  forces: [
    { type: 'link', distance: 24 },
    { type: 'manyBody', strength: -30 },
    { type: 'center' },
    { type: 'collide', radius: 5 },
  ],
})
