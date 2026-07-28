import { defineChart, dot, link, text } from '@tanstack/charts'
import { stratify, tree } from 'd3-hierarchy'
import { scaleLinear } from 'd3-scale'
import { hierarchyData } from './data'
import { tanstackMount } from '../../shared/mount'
import type { ConformanceInput } from '../../types'
import type { HierarchyRow } from './data'

interface TreeNodeRow {
  id: string
  label: string
  x: number
  y: number
  internal: boolean
}

interface TreeLinkRow {
  id: string
  x1: number
  y1: number
  x2: number
  y2: number
}

const definition = defineChart<ConformanceInput>()(({ input }) => {
  const root = stratify<HierarchyRow>().path((row) => row.path)(
    Array.from(hierarchyData(input.revision)),
  )
  const layoutRoot = tree<HierarchyRow>().nodeSize([1, 1])(root)

  const nodes: readonly TreeNodeRow[] = layoutRoot
    .descendants()
    .map((node) => ({
      id: node.data.id,
      label: node.data.label,
      x: node.y,
      y: -node.x,
      internal: node.children !== undefined,
    }))
  const links: readonly TreeLinkRow[] = layoutRoot
    .links()
    .map(({ source, target }) => ({
      id: `${source.data.id}:${target.data.id}`,
      x1: source.y,
      y1: -source.x,
      x2: target.y,
      y2: -target.x,
    }))
  return {
    marks: [
      link(links, {
        x1: 'x1',
        y1: 'y1',
        x2: 'x2',
        y2: 'y2',
        key: 'id',
        stroke: '#94a3b8',
        strokeOpacity: 0.55,
        strokeWidth: 1.5,
      }),
      dot(nodes, {
        x: 'x',
        y: 'y',
        key: 'id',
        fill: '#2563eb',
        r: 3.5,
      }),
      text(nodes, {
        x: 'x',
        y: 'y',
        text: 'label',
        key: 'id',
        fill: '#2563eb',
        anchor: (node) => (node.internal ? 'end' : 'start'),
        dx: (node) => (node.internal ? -6 : 6),
      }),
    ],
    x: { scale: scaleLinear().domain([0, 2]) },
    y: { scale: scaleLinear().domain([-3.5, 3.5]) },
    guides: false,
    margin: { top: 22, right: 76, bottom: 22, left: 76 },
  }
})

export const mount = tanstackMount(definition, 'Tidy product hierarchy')
