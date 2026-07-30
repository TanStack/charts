import { defineChart, rect, text } from '@tanstack/charts'
import { flare } from '@charts-poc/demo-data/flare'
import { hierarchy, treemap } from 'd3-hierarchy'
import { scaleLinear } from 'd3-scale'
import { selectTreemapData } from './selection'
import { flareLabel, flareTree } from './transform'
import { tanstackMount } from '../../shared/mount'
import type { FlareTreeNode } from './transform'
import type { ConformanceInput } from '../../types'

const colors = ['#2563eb', '#8b5cf6', '#10b981']

interface BundleCell {
  name: string
  family: string
  x1: number
  x2: number
  y1: number
  y2: number
  labelX: number
  labelY: number
}

function layoutCells(): readonly BundleCell[] {
  const treemapData = selectTreemapData(flare)
  const root = hierarchy(flareTree(treemapData))
    .sum((node) => node.size ?? 0)
    .sort((left, right) => (right.value ?? 0) - (left.value ?? 0))

  const layoutRoot = treemap<FlareTreeNode>()
    .size([100, 100])
    .paddingInner(0.5)
    .round(false)(root)

  return layoutRoot.leaves().map((leaf) => {
    return {
      name: leaf.data.name,
      family: leaf.data.family,
      x1: leaf.x0,
      x2: leaf.x1,
      y1: leaf.y0,
      y2: leaf.y1,
      labelX: (leaf.x0 + leaf.x1) / 2,
      labelY: (leaf.y0 + leaf.y1) / 2,
    }
  })
}

const definition = (input: ConformanceInput) => {
  const cells = layoutCells()
  const labels = cells.filter((cell) => {
    const label = flareLabel(cell.name)
    const width = ((cell.x2 - cell.x1) / 100) * input.width
    const height = ((cell.y2 - cell.y1) / 100) * input.height
    return width >= label.length * 4.8 + 8 && height >= 14
  })

  return defineChart({
    marks: [
      rect(cells, {
        x1: 'x1',
        x2: 'x2',
        y1: 'y1',
        y2: 'y2',
        color: 'family',
        inset: 1,
        stroke: '#ffffff',
        strokeWidth: 1,
      }),
      text(labels, {
        x: 'labelX',
        y: 'labelY',
        text: (cell) => flareLabel(cell.name),
        fill: '#ffffff',
        fontSize: 8,
        fontWeight: 600,
        anchor: 'middle',
      }),
    ],
    x: { scale: scaleLinear().domain([0, 100]) },
    y: { scale: scaleLinear().domain([100, 0]) },
    color: {
      range: colors,
    },
    guides: false,
    margin: 0,
  })
}

export const mount = tanstackMount(definition, 'Flare analytics treemap')
