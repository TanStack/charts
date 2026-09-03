import { stratify } from 'd3-hierarchy'
import type { FlareRow } from '@tanstack/charts-data/flare'
import type { HierarchyNode } from 'd3-hierarchy'

export interface SunburstTreeNode {
  [key: string]: unknown
  name: string
  size: number | null
  value: number
  children?: SunburstTreeNode[]
}

export function flareHierarchy(rows: readonly FlareRow[]) {
  const rootName = rows[0]?.name
  if (rootName === undefined) {
    throw new TypeError('The Flare sunburst selection is empty')
  }

  return stratify<FlareRow>().path((row) =>
    row.name.slice(rootName.length).replaceAll('.', '/'),
  )(Array.from(rows))
}

export function sunburstTree(rows: readonly FlareRow[]): SunburstTreeNode {
  return treeNode(flareHierarchy(rows))
}

function treeNode(node: HierarchyNode<FlareRow>): SunburstTreeNode {
  const children = node.children?.map(treeNode)
  const value =
    children === undefined
      ? (node.data.size ?? 0)
      : children.reduce((total, child) => total + child.value, 0)

  return {
    name: node.data.name,
    size: node.data.size,
    value,
    ...(children === undefined ? {} : { children }),
  }
}
