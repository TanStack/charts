import { defineChart, dot, link, text } from '@tanstack/charts'
import { flare } from '@charts-poc/demo-data/flare'
import { stratify, tree } from 'd3-hierarchy'
import { scaleLinear } from 'd3-scale'
import { selectHierarchyData } from './selection'
import { tanstackMount } from '../../shared/mount'
import type { FlareRow } from '@charts-poc/demo-data/flare'
import type { ConformanceInput } from '../../types'

interface TreeNodeRow {
  name: string
  x: number
  y: number
  internal: boolean
}

interface TreeLinkRow {
  source: string
  target: string
  x1: number
  y1: number
  x2: number
  y2: number
}

function hierarchyPath(name: string): string {
  return name.slice('flare.'.length).replaceAll('.', '/')
}

function hierarchyLabel(name: string): string {
  return name.slice(name.lastIndexOf('.') + 1)
}

const definition = (input: ConformanceInput) => {
  const root = stratify<FlareRow>().path((row) => hierarchyPath(row.name))(
    Array.from(selectHierarchyData(flare, input.revision)),
  )
  const layoutRoot = tree<FlareRow>().nodeSize([1, 1])(root)

  const nodes: readonly TreeNodeRow[] = layoutRoot
    .descendants()
    .map((node) => ({
      name: node.data.name,
      x: node.y,
      y: -node.x,
      internal: node.children !== undefined,
    }))
  const links: readonly TreeLinkRow[] = layoutRoot
    .links()
    .map(({ source, target }) => ({
      source: source.data.name,
      target: target.data.name,
      x1: source.y,
      y1: -source.x,
      x2: target.y,
      y2: -target.x,
    }))
  return defineChart({
    marks: [
      link(links, {
        x1: 'x1',
        y1: 'y1',
        x2: 'x2',
        y2: 'y2',
        stroke: '#94a3b8',
        strokeOpacity: 0.55,
        strokeWidth: 1.5,
      }),
      dot(nodes, {
        x: 'x',
        y: 'y',
        fill: '#2563eb',
        r: 3.5,
      }),
      text(nodes, {
        x: 'x',
        y: 'y',
        text: (node) => hierarchyLabel(node.name),
        fill: '#2563eb',
        fontSize: 10,
        anchor: (node) => (node.internal ? 'end' : 'start'),
        dx: (node) => (node.internal ? -6 : 6),
      }),
    ],
    x: { scale: scaleLinear },
    y: { scale: scaleLinear },
    guides: false,
    margin: { top: 22, right: 140, bottom: 22, left: 50 },
  })
}

export const mount = tanstackMount(
  definition,
  'Tidy Flare analytics hierarchy',
  {
    format: ({ datum }) =>
      'name' in datum
        ? `${datum.name} · ${datum.internal ? 'Group' : 'Leaf'}`
        : `${datum.source} → ${datum.target}`,
  },
)
