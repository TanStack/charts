import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createChartRuntime } from '@tanstack/charts'
import { flare } from '@charts-poc/demo-data/flare'
import { describe, expect, it } from 'vitest'
import { selectTreemapData } from './selection'
import { treemapDefinition } from './tanstack'
import type { TreemapNode } from '@tanstack/charts/hierarchy/treemap'
import type { FlareRow } from '@charts-poc/demo-data/flare'
import type {
  ChartPoint,
  ChartScene,
  SceneNode,
  SceneRect,
} from '@tanstack/charts'

const expectedLeaves = [
  'AgglomerativeCluster',
  'CommunityStructure',
  'HierarchicalCluster',
  'MergeEdge',
  'BetweennessCentrality',
  'LinkDistance',
  'MaxFlowMinCut',
  'ShortestPaths',
  'SpanningTree',
  'AspectRatioBanker',
]

describe('native responsive treemap', () => {
  it('renders the ten authored leaves as native cells with honest lineage', () => {
    const scene = render(640, 400)
    const nodes = pointData(scene)

    expect(nodes.map((node) => node.name)).toEqual(expectedLeaves)
    expect(markRectangles(scene)).toHaveLength(10)
    expect(markLabels(scene)).toHaveLength(9)

    const selected = selectTreemapData(flare)
    for (const node of nodes) {
      expect(node.external).toBe(true)
      expect(node.data).not.toBeNull()
      expect(node.source).toEqual([node.data])
      expect(node.sourceIndexes).toEqual([selected.indexOf(node.data!)])
      expect(node.source[0]).toBe(node.data)
      expect(node.value).toBe(node.data?.size)
    }
    expect(new Set(markPoints(scene).map((point) => point.color))).toEqual(
      new Set(['#2563eb', '#8b5cf6', '#10b981']),
    )
  })

  it('lays out against the final plot bounds at each responsive size', () => {
    const wide = render(640, 400)
    const compact = render(320, 240)
    const wideCells = markRectangles(wide)
    const compactCells = markRectangles(compact)

    expect(extent(wideCells)).toEqual({ x0: 0, y0: 0, x1: 640, y1: 400 })
    expect(extent(compactCells)).toEqual({
      x0: 0,
      y0: 0,
      x1: 320,
      y1: 240,
    })
    expect(compactCells.map(cellLayout)).not.toEqual(wideCells.map(cellLayout))
  })

  it('is deterministic and leaves source rows unchanged', () => {
    const selected = selectTreemapData(flare)
    const before = JSON.stringify(selected)

    expect(pointData(render(640, 400))).toEqual(pointData(render(640, 400)))
    expect(JSON.stringify(selected)).toBe(before)
    expect(selected.every((row) => flare.includes(row))).toBe(true)
  })

  it('contains only selection and semantic accessors outside the mark', () => {
    const source = readFileSync(
      resolve(
        process.cwd(),
        'benchmarks/conformance/cases/74-recharts-treemap/example.tsx',
      ),
      'utf8',
    )

    expect(source).toContain("from '@tanstack/charts/hierarchy/treemap'")
    expect(source).not.toContain("from 'd3-hierarchy'")
    expect(source).not.toContain("from 'd3-scale'")
    expect(source).not.toMatch(/from ['"]\.\/transform['"]/)
    expect(source).not.toContain('layoutCells')
    expect(source).not.toContain('label.length')
    expect(source).toContain('ratio: 4 / 3')
    expect(source).toContain('round: true')
    expect(source).not.toContain('paddingInner')
    expect(source).not.toContain('paddingOuter')
  })
})

function render(width: number, height: number) {
  return createChartRuntime().render(treemapDefinition(), { width, height })
}

function pointData(scene: ChartScene): TreemapNode<FlareRow>[] {
  return markPoints(scene).map((point) => point.datum as TreemapNode<FlareRow>)
}

function markPoints(scene: ChartScene) {
  return scene.points.filter(
    (point) => point.markId === 'treemap-cells',
  ) as ChartPoint<TreemapNode<FlareRow>, string, number>[]
}

function markGroup(scene: ChartScene) {
  const group = flatten(scene.nodes).find(
    (node) => node.kind === 'group' && node.key === 'treemap-cells',
  )
  return group?.kind === 'group' ? group : undefined
}

function markRectangles(scene: ChartScene): SceneRect[] {
  return (
    markGroup(scene)?.children.filter(
      (node): node is SceneRect => node.kind === 'rect',
    ) ?? []
  )
}

function markLabels(scene: ChartScene) {
  return (
    markGroup(scene)?.children.filter((node) => node.kind === 'label') ?? []
  )
}

function extent(cells: readonly SceneRect[]) {
  return {
    x0: Math.min(...cells.map((cell) => cell.x - 1)),
    y0: Math.min(...cells.map((cell) => cell.y - 1)),
    x1: Math.max(...cells.map((cell) => cell.x + cell.width + 1)),
    y1: Math.max(...cells.map((cell) => cell.y + cell.height + 1)),
  }
}

function cellLayout(cell: SceneRect) {
  return {
    key: cell.key,
    x: cell.x,
    y: cell.y,
    width: cell.width,
    height: cell.height,
  }
}

function flatten(nodes: readonly SceneNode[]): SceneNode[] {
  return nodes.flatMap((node) =>
    node.kind === 'group' ? [node, ...flatten(node.children)] : [node],
  )
}
