import { stratify } from 'd3-hierarchy'
import type { FlareRow } from '@tanstack/charts-data/flare'
import type { HierarchyNode } from 'd3-hierarchy'

export interface FlareTreeNode {
  [key: string]: unknown
  name: string
  size: number | null
  family: string
  children?: readonly FlareTreeNode[]
}

export function flareTree(rows: readonly FlareRow[]): FlareTreeNode {
  const rootName = rows[0]?.name
  if (rootName === undefined) {
    throw new TypeError('The Flare treemap selection is empty')
  }

  const root = stratify<FlareRow>().path((row) =>
    row.name.slice(rootName.length).replaceAll('.', '/'),
  )(Array.from(rows))

  return treeNode(root, rootName)
}

export function flareLabel(name: string): string {
  return name.slice(name.lastIndexOf('.') + 1)
}

function treeNode(
  node: HierarchyNode<FlareRow>,
  inheritedFamily: string,
): FlareTreeNode {
  const family = node.depth === 1 ? node.data.name : inheritedFamily
  const children = node.children?.map((child) => treeNode(child, family))

  return {
    name: node.data.name,
    size: node.data.size,
    family,
    ...(children === undefined ? {} : { children }),
  }
}
