import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createChartRuntime } from '@tanstack/charts'
import { flare } from '@charts-poc/demo-data/flare'
import { describe, expect, it } from 'vitest'
import { selectHierarchyData } from './selection'
import { treeDefinition } from './tanstack'
import type {
  TreeLayoutLink,
  TreeLayoutNode,
} from '@tanstack/charts/hierarchy/tree'
import type { FlareRow } from '@charts-poc/demo-data/flare'
import type { ConformanceInput } from '../../types'
import type { ChartPoint, ChartScene, SceneNode } from '@tanstack/charts'

type TreeNodeDatum = TreeLayoutNode<FlareRow>
type TreeLinkDatum = TreeLayoutLink<FlareRow>

const size = { width: 640, height: 400 }

describe('native hierarchy tree', () => {
  it('renders ten nodes, nine links, and ten labels through native marks', () => {
    const scene = render(0)
    const nodes = pointData<TreeNodeDatum>(scene, 'hierarchy-nodes')
    const links = pointData<TreeLinkDatum>(scene, 'hierarchy-links')
    const labels = pointData<TreeNodeDatum>(scene, 'hierarchy-labels')

    expect(nodes).toHaveLength(10)
    expect(links).toHaveLength(9)
    expect(labels).toHaveLength(10)
    expect(markChildren(scene.nodes, 'hierarchy-links', 'rule')).toHaveLength(9)
    expect(markChildren(scene.nodes, 'hierarchy-nodes', 'dot')).toHaveLength(10)
    expect(markChildren(scene.nodes, 'hierarchy-labels', 'label')).toHaveLength(
      10,
    )
    expect(
      [...nodes, ...links].every((datum) =>
        'x' in datum
          ? Number.isFinite(datum.x) && Number.isFinite(datum.y)
          : [datum.x1, datum.y1, datum.x2, datum.y2].every(Number.isFinite),
      ),
    ).toBe(true)
  })

  it.each([0, 1])(
    'matches the existing D3 and Plot tree layout for revision %s',
    (revision) => {
      const scene = render(revision)
      const rows = selectHierarchyData(flare, revision)
      const nodes = pointData<TreeNodeDatum>(scene, 'hierarchy-nodes')
      const links = pointData<TreeLinkDatum>(scene, 'hierarchy-links')
      const expectedNodes = referenceNodes(rows)
      const expectedByName = new Map(
        expectedNodes.map(({ name, x, y }) => [name, { x, y }]),
      )

      expect(
        nodes.map(({ data, x, y }) => ({ name: data?.name, x, y })),
      ).toEqual(expectedNodes)
      expect(
        links.map(({ sourceNode, targetNode, x1, y1, x2, y2 }) => ({
          source: sourceNode.data?.name,
          target: targetNode.data?.name,
          x1,
          y1,
          x2,
          y2,
        })),
      ).toEqual(
        referenceLinks(rows).map(({ source, target }) => ({
          source,
          target,
          x1: expectedByName.get(source)?.x,
          y1: expectedByName.get(source)?.y,
          x2: expectedByName.get(target)?.x,
          y2: expectedByName.get(target)?.y,
        })),
      )
    },
  )

  it('retains raw rows, exact lineage, and resolved endpoints', () => {
    const rows = selectHierarchyData(flare, 0)
    const scene = render(0)
    const nodes = pointData<TreeNodeDatum>(scene, 'hierarchy-nodes')
    const links = pointData<TreeLinkDatum>(scene, 'hierarchy-links')

    for (const node of nodes) {
      expect(node.data).not.toBeNull()
      const sourceIndex = rows.indexOf(node.data!)
      expect(sourceIndex).toBeGreaterThanOrEqual(0)
      expect(node.source).toEqual([node.data])
      expect(node.source[0]).toBe(node.data)
      expect(node.sourceIndexes).toEqual([sourceIndex])
      expect(node.external).toBe(!node.internal)
    }

    for (const link of links) {
      expect(link.sourceNode).toBe(
        nodes.find((node) => node.id === link.source),
      )
      expect(link.targetNode).toBe(
        nodes.find((node) => node.id === link.target),
      )
      expect(link.sourceIndex).toBe(link.sourceNode.sourceIndexes[0])
      expect(link.targetIndex).toBe(link.targetNode.sourceIndexes[0])
      expect(link.source).toBe(link.sourceNode.id)
      expect(link.target).toBe(link.targetNode.id)
      expect(link.sourceRows).toEqual(link.targetNode.source)
      expect(link.sourceRows[0]).toBe(link.targetNode.data)
      expect(link.sourceIndexes).toEqual(link.targetNode.sourceIndexes)
      expect([link.x1, link.y1]).toEqual([link.sourceNode.x, link.sourceNode.y])
      expect([link.x2, link.y2]).toEqual([link.targetNode.x, link.targetNode.y])
    }
  })

  it('is deterministic while preserving identities across revisions', () => {
    const first = render(0)
    const repeated = render(0)
    const revised = render(1)

    expect(topologySignature(repeated)).toEqual(topologySignature(first))
    expect(sceneKeys(repeated)).toEqual(sceneKeys(first))
    expect(
      commonIds(pointData<TreeNodeDatum>(first, 'hierarchy-nodes')),
    ).toEqual(commonIds(pointData<TreeNodeDatum>(revised, 'hierarchy-nodes')))
    expect(
      commonIds(pointData<TreeLinkDatum>(first, 'hierarchy-links')),
    ).toEqual(commonIds(pointData<TreeLinkDatum>(revised, 'hierarchy-links')))
  })

  it('does not mutate the selected input rows', () => {
    const rows = selectHierarchyData(flare, 1)
    const before = JSON.stringify(rows)
    render(1)

    expect(JSON.stringify(rows)).toBe(before)
    expect(rows.every((row) => flare.includes(row))).toBe(true)
  })

  it('does not depend on d3-hierarchy or a case-owned layout utility', () => {
    const source = readFileSync(
      resolve(
        process.cwd(),
        'benchmarks/conformance/cases/36-hierarchy-tree/tanstack.ts',
      ),
      'utf8',
    )

    expect(source).toContain("from '@tanstack/charts/hierarchy/tree'")
    expect(source).not.toContain("from 'd3-hierarchy'")
    expect(source).not.toMatch(/from ['"]\.\/layout['"]/)
    expect(source).not.toContain('stratify(')
  })
})

function render(revision: number) {
  return createChartRuntime().render(
    treeDefinition({
      ...size,
      revision,
      interactive: true,
    } satisfies ConformanceInput),
    size,
  )
}

function referenceNodes(rows: readonly FlareRow[]) {
  const order = [0, 1, 6, 2, 3, 4, 5, 7, 8, 9]
  const coordinates = [
    [0, -0],
    [1, 2.25],
    [1, -2.25],
    [2, 3.75],
    [2, 2.75],
    [2, 1.75],
    [2, 0.75],
    [2, -1.25],
    [2, -2.25],
    [2, -3.25],
  ] as const

  return order.map((sourceIndex, index) => ({
    name: rows[sourceIndex]?.name,
    x: coordinates[index]?.[0],
    y: coordinates[index]?.[1],
  }))
}

function referenceLinks(rows: readonly FlareRow[]) {
  return [
    [0, 1],
    [0, 6],
    [1, 2],
    [1, 3],
    [1, 4],
    [1, 5],
    [6, 7],
    [6, 8],
    [6, 9],
  ].map(([sourceIndex, targetIndex]) => ({
    source: rows[sourceIndex]?.name,
    target: rows[targetIndex]?.name,
  }))
}

function pointData<TDatum>(scene: ChartScene, markId: string): TDatum[] {
  return scene.points
    .filter((point) => point.markId === markId)
    .map((point) => point.datum as TDatum)
}

function markChildren(
  nodes: readonly SceneNode[],
  key: string,
  kind: SceneNode['kind'],
): SceneNode[] {
  const group = flatten(nodes).find(
    (node) => node.kind === 'group' && node.key === key,
  )
  return group?.kind === 'group'
    ? group.children.filter((node) => node.kind === kind)
    : []
}

function topologySignature(scene: ChartScene) {
  return scene.points.map((point: ChartPoint) => ({
    key: point.key,
    datum: point.datum,
  }))
}

function sceneKeys(scene: ChartScene): string[] {
  return scene.points.map((point) => point.key)
}

function commonIds<TDatum extends { readonly id: string }>(
  rows: readonly TDatum[],
): string[] {
  return rows
    .map(({ id }) => id)
    .filter((id) => id.includes('cluster') || id.endsWith('analytics'))
}

function flatten(nodes: readonly SceneNode[]): SceneNode[] {
  return nodes.flatMap((node) =>
    node.kind === 'group' ? [node, ...flatten(node.children)] : [node],
  )
}
