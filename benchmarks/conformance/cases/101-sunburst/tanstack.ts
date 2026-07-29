import { defineChart } from '@tanstack/charts'
import { polar, radialArc } from '@tanstack/charts/polar'
import { hierarchy, partition } from 'd3-hierarchy'
import { arc } from 'd3-shape'
import { sunburstData } from './data'
import { tanstackMount } from '../../shared/mount'
import type { SunburstNode } from './data'
import type { ConformanceInput } from '../../types'
import type { HierarchyRectangularNode } from 'd3-hierarchy'

interface SunburstArcDatum {
  id: string
  name: string
  value: number
  depth: number
  startAngle: number
  endAngle: number
  fill: string
}

function inheritedFill(node: HierarchyRectangularNode<SunburstNode>): string {
  let current: HierarchyRectangularNode<SunburstNode> | null = node

  while (current) {
    if (current.data.fill) return current.data.fill
    current = current.parent
  }

  return '#64748b'
}

function nodeKey(node: HierarchyRectangularNode<SunburstNode>): string {
  return node
    .ancestors()
    .reverse()
    .map(({ data }) => data.name)
    .join('/')
}

const definition = defineChart<ConformanceInput>()(({ input }) => {
  const tree = sunburstData(input.revision)
  const root = hierarchy(tree).sum((node) =>
    node.children?.length ? 0 : node.value,
  )
  const layout = partition<SunburstNode>().size([Math.PI * 2, root.height + 1])(
    root,
  )
  const data: SunburstArcDatum[] = layout
    .descendants()
    .filter((node) => node.depth > 0)
    .map((node) => ({
      id: nodeKey(node),
      name: node.data.name,
      value: node.value ?? 0,
      depth: node.depth,
      startAngle: Math.PI / 2 - node.x0,
      endAngle: Math.PI / 2 - node.x1,
      fill: inheritedFill(node),
    }))

  return {
    marks: [
      polar({
        radiusRatio: 0.88,
        marks: [
          radialArc(data, {
            key: 'id',
            className: 'ts-chart__sunburst',
            generator: ({ radius }) => {
              const innerRadius = radius * 0.14
              const treeDepth = root.height + 1
              const thickness = (radius - innerRadius) / treeDepth
              const ringPadding = 2

              return arc<unknown, SunburstArcDatum>()
                .startAngle((node) => node.startAngle)
                .endAngle((node) => node.endAngle)
                .innerRadius(
                  (node) =>
                    innerRadius + (node.depth - 1) * (thickness + ringPadding),
                )
                .outerRadius(
                  (node) =>
                    innerRadius +
                    (node.depth - 1) * (thickness + ringPadding) +
                    thickness,
                )
            },
            fill: (node: SunburstArcDatum) => node.fill,
            stroke: '#ffffff',
            strokeWidth: 2,
          }),
        ],
      }),
    ],
    x: null,
    y: null,
    guides: false,
    margin: 0,
  }
})

export const mount = tanstackMount(definition, 'Sunburst hierarchy', {
  format: ({ datum }) =>
    `${datum.id.replaceAll('/', ' › ')} · ${datum.value} errors`,
})
