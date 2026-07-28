import { defineChart, rect, text } from '@tanstack/charts'
import { hierarchy, treemap } from 'd3-hierarchy'
import { scaleLinear, scaleOrdinal } from 'd3-scale'
import { bundleColors, bundleFamilies, bundleTree } from './data'
import { tanstackMount } from '../../shared/mount'
import type { BundleFamily, BundleNode } from './data'
import type { ConformanceInput } from '../../types'

interface BundleCell {
  id: string
  name: string
  family: BundleFamily
  x1: number
  x2: number
  y1: number
  y2: number
  labelX: number
  labelY: number
}

function isBundleFamily(value: string): value is BundleFamily {
  return (
    value === 'Recharts' ||
    value === 'React' ||
    value === 'D3' ||
    value === 'Utilities'
  )
}

function layoutCells(revision: number): readonly BundleCell[] {
  const root = hierarchy(bundleTree(revision))
    .sum((node) => node.size ?? 0)
    .sort((left, right) => (right.value ?? 0) - (left.value ?? 0))

  const layoutRoot = treemap<BundleNode>()
    .size([100, 100])
    .paddingInner(0.5)
    .round(false)(root)

  return layoutRoot.leaves().map((leaf) => {
    const familyName =
      leaf.ancestors().find((ancestor) => ancestor.depth === 1)?.data.name ??
      'Utilities'
    const family: BundleFamily = isBundleFamily(familyName)
      ? familyName
      : 'Utilities'

    return {
      id: `${family}:${leaf.data.name}`,
      name: leaf.data.name,
      family,
      x1: leaf.x0,
      x2: leaf.x1,
      y1: leaf.y0,
      y2: leaf.y1,
      labelX: (leaf.x0 + leaf.x1) / 2,
      labelY: (leaf.y0 + leaf.y1) / 2,
    }
  })
}

const definition = defineChart<ConformanceInput>()(({ input }) => {
  const cells = layoutCells(input.revision)

  return {
    marks: [
      rect(cells, {
        x1: 'x1',
        x2: 'x2',
        y1: 'y1',
        y2: 'y2',
        z: 'family',
        key: 'id',
        inset: 1,
        stroke: '#ffffff',
        strokeWidth: 1,
      }),
      text(cells, {
        x: 'labelX',
        y: 'labelY',
        text: 'name',
        key: 'id',
        fill: '#ffffff',
        fontSize: 8,
        fontWeight: 600,
        anchor: 'middle',
      }),
    ],
    x: { scale: scaleLinear().domain([0, 100]) },
    y: { scale: scaleLinear().domain([100, 0]) },
    color: {
      scale: scaleOrdinal<BundleFamily, string>()
        .domain(bundleFamilies)
        .range(bundleFamilies.map((family) => bundleColors[family])),
    },
    guides: false,
    margin: 0,
  }
})

export const mount = tanstackMount(definition, 'Bundle size treemap')
