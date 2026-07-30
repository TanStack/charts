import { defineChart } from '@tanstack/charts'
import { polar, radialArc } from '@tanstack/charts/polar'
import { flare } from '@charts-poc/demo-data/flare'
import { partition } from 'd3-hierarchy'
import { arc } from 'd3-shape'
import { selectSunburstData } from './selection'
import { flareHierarchy } from './transform'
import { tanstackMount } from '../../shared/mount'
import type { FlareRow } from '@charts-poc/demo-data/flare'
import type { ConformanceInput } from '../../types'
import type { HierarchyRectangularNode } from 'd3-hierarchy'

interface SunburstArcDatum {
  name: string
  value: number
  depth: number
  startAngle: number
  endAngle: number
  category: string
}

function topLevelCategory(node: HierarchyRectangularNode<FlareRow>): string {
  return (
    node.ancestors().find((ancestor) => ancestor.depth === 1)?.data.name ??
    'Other'
  )
}

const definition = (input: ConformanceInput) => {
  const root = flareHierarchy(selectSunburstData(flare, input.revision)).sum(
    (node) => node.size ?? 0,
  )
  const layout = partition<FlareRow>().size([Math.PI * 2, root.height + 1])(
    root,
  )
  const data: SunburstArcDatum[] = layout
    .descendants()
    .filter((node) => node.depth > 0)
    .map((node) => ({
      name: node.data.name,
      value: node.value ?? 0,
      depth: node.depth,
      startAngle: Math.PI / 2 - node.x0,
      endAngle: Math.PI / 2 - node.x1,
      category: topLevelCategory(node),
    }))

  return defineChart({
    marks: [
      polar({
        radiusRatio: 0.88,
        marks: [
          radialArc(data, {
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
            color: 'category',
            stroke: '#ffffff',
            strokeWidth: 2,
          }),
        ],
      }),
    ],
    color: {
      range: ['#7c3aed', '#0ea5e9', '#14b8a6'],
    },
    margin: 0,
  })
}

export const mount = tanstackMount(definition, 'Flare analytics sunburst', {
  format: ({ datum }) =>
    `${datum.name.replaceAll('.', ' › ')} · ${datum.value.toLocaleString('en-US')}`,
})
