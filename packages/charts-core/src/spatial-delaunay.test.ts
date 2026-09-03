import { scaleBand, scaleLinear, scaleTime } from 'd3-scale'
import { describe, expect, expectTypeOf, it, vi } from 'vitest'
import { facet } from './facet'
import { createChartScene, defineChart } from './scene'
import { delaunayLink } from './spatial-delaunay'
import {
  canonicalDelaunayPoints,
  createDelaunay,
  delaunayNeighborIndexes,
  delaunayNeighborPairs,
} from './spatial-delaunay-internal'
import type { SceneNode } from './types'

describe('spatial Delaunay link', () => {
  it('derives unique links from complete rows with endpoint lineage', () => {
    const rows = [
      { id: 'a', x: 0, y: 0 },
      { id: 'b', x: 10, y: 0 },
      { id: 'c', x: 0, y: 10 },
      { id: 'invalid-y', x: 999, y: null },
      { id: 'invalid-x', x: Number.NaN, y: 5 },
    ]
    const before = rows.map((row) => ({ ...row }))
    const motion = vi.fn(() => ({ delay: 10 }))
    const mark = delaunayLink(rows, {
      x: 'x',
      y: 'y',
      key: 'id',
      motion,
      stroke: ({ source, target }) =>
        source.id === 'a' || target.id === 'a' ? '#2563eb' : '#94a3b8',
    })
    const definition = defineChart({
      marks: [mark],
      guides: false,
      focusRing: false,
      margin: 0,
      scales: {
        x: { scale: scaleLinear },
        y: { scale: scaleLinear },
      },
    })
    const scene = createChartScene(definition, { width: 240, height: 180 })
    const repeated = createChartScene(definition, {
      width: 240,
      height: 180,
    })
    const reorderedRows = rows.slice(0, 3).reverse()
    const reordered = createChartScene(
      defineChart({
        marks: [
          delaunayLink(reorderedRows, {
            x: 'x',
            y: 'y',
            key: 'id',
          }),
        ],
        guides: false,
        focusRing: false,
        margin: 0,
        scales: {
          x: { scale: scaleLinear },
          y: { scale: scaleLinear },
        },
      }),
      { width: 240, height: 180 },
    )

    expect(mark.motion).toBe(motion)
    expect(scene.scales.x.domain).toEqual([0, 10])
    expect(scene.scales.y.domain).toEqual([0, 10])
    expect(scene.points).toHaveLength(3)
    expectTypeOf(scene.points[0]!.datum.x1).toEqualTypeOf<number>()
    expectTypeOf(scene.points[0]!.datum.source).toEqualTypeOf<
      (typeof rows)[number]
    >()
    expect(edgePairs(scene.points.map((point) => point.datum))).toEqual([
      '0:1',
      '0:2',
      '1:2',
    ])
    for (const point of scene.points) {
      const edge = point.datum
      expect(edge.source).toBe(rows[edge.sourceIndex])
      expect(edge.target).toBe(rows[edge.targetIndex])
      expect(point.x1Value).toBe(edge.x1)
      expect(point.y1Value).toBe(edge.y1)
      expect(point.x2Value).toBe(edge.x2)
      expect(point.y2Value).toBe(edge.y2)
      expect(point.x).toBeCloseTo(
        (scene.scales.x.map(edge.x1) + scene.scales.x.map(edge.x2)) / 2,
      )
      expect(point.y).toBeCloseTo(
        (scene.scales.y.map(edge.y1) + scene.scales.y.map(edge.y2)) / 2,
      )
    }
    expect(repeated.points.map((point) => point.key)).toEqual(
      scene.points.map((point) => point.key),
    )
    expect(reordered.points.map((point) => point.key).sort()).toEqual(
      scene.points.map((point) => point.key).sort(),
    )
    expect(rows).toEqual(before)
    expect(sceneRules(scene.nodes).map((node) => node.style?.stroke)).toContain(
      '#2563eb',
    )
  })

  it('recomputes topology from the final responsive aspect ratio', () => {
    const rows = [
      { id: 'a', x: 0, y: 0 },
      { id: 'b', x: 2, y: 0 },
      { id: 'c', x: 0, y: 3 },
      { id: 'd', x: 3, y: 2 },
    ]
    const definition = defineChart({
      marks: [delaunayLink(rows, { x: 'x', y: 'y', key: 'id' })],
      guides: false,
      focusRing: false,
      margin: 0,
      scales: {
        x: { scale: scaleLinear().domain([0, 3]) },
        y: { scale: scaleLinear().domain([0, 3]) },
      },
    })
    const narrow = createChartScene(definition, { width: 100, height: 200 })
    const wide = createChartScene(definition, { width: 400, height: 200 })
    const narrowPairs = edgePairs(narrow.points.map((point) => point.datum))
    const widePairs = edgePairs(wide.points.map((point) => point.datum))

    expect(narrowPairs).toContain('0:3')
    expect(narrowPairs).not.toContain('1:2')
    expect(widePairs).toContain('1:2')
    expect(widePairs).not.toContain('0:3')
  })

  it('uses stable point keys to resolve cocircular and coincident ties', () => {
    const rows = [
      { id: 'd', x: 1, y: 1 },
      { id: 'b', x: 1, y: 0 },
      { id: 'duplicate-a', x: 0, y: 0 },
      { id: 'c', x: 0, y: 1 },
      { id: 'a', x: 0, y: 0 },
    ]
    const render = (source: typeof rows) =>
      createChartScene(
        defineChart({
          marks: [delaunayLink(source, { x: 'x', y: 'y', key: 'id' })],
          guides: false,
          focusRing: false,
          margin: 0,
          scales: {
            x: { scale: scaleLinear },
            y: { scale: scaleLinear },
          },
        }),
        { width: 200, height: 200 },
      )

    const original = render(rows)
    const reordered = render([rows[4]!, rows[3]!, rows[2]!, rows[1]!, rows[0]!])

    expect(edgeKeyPairs(original.points.map((point) => point.datum))).toEqual(
      edgeKeyPairs(reordered.points.map((point) => point.datum)),
    )
    expect(
      original.points.some(
        ({ datum }) =>
          datum.sourceKey === 'duplicate-a' ||
          datum.targetKey === 'duplicate-a',
      ),
    ).toBe(false)
  })

  it('triangulates source z groups independently', () => {
    const rows = [
      { id: 'a', group: 'A', x: 0, y: 0 },
      { id: 'b', group: 'A', x: 1, y: 1 },
      { id: 'c', group: 'B', x: 0, y: 0 },
      { id: 'd', group: 'B', x: 1, y: 1 },
    ]
    const scene = createChartScene(
      defineChart({
        marks: [
          delaunayLink(rows, {
            x: 'x',
            y: 'y',
            z: 'group',
            key: 'id',
          }),
        ],
        guides: false,
        focusRing: false,
        scales: {
          x: { scale: scaleLinear },
          y: { scale: scaleLinear },
        },
      }),
      { width: 240, height: 180 },
    )

    expect(edgePairs(scene.points.map((point) => point.datum))).toEqual([
      '0:1',
      '2:3',
    ])
    expect(scene.points.map((point) => point.group)).toEqual(['A', 'B'])
    expect(scene.colors.domain).toEqual(['A', 'B'])
  })

  it('supports categorical and temporal coordinates without inversion', () => {
    const rows = [
      { id: 'a', category: 'A', date: new Date('2024-01-01T00:00:00Z') },
      { id: 'b', category: 'B', date: new Date('2024-01-02T00:00:00Z') },
      { id: 'c', category: 'A', date: new Date('2024-01-03T00:00:00Z') },
    ]
    const scene = createChartScene(
      defineChart({
        marks: [
          delaunayLink(rows, {
            x: 'category',
            y: 'date',
            key: 'id',
          }),
        ],
        guides: false,
        focusRing: false,
        scales: {
          x: { scale: scaleBand<string> },
          y: { scale: scaleTime() },
        },
      }),
      { width: 240, height: 180 },
    )

    expectTypeOf(scene.points[0]!.xValue).toEqualTypeOf<string>()
    expectTypeOf(scene.points[0]!.yValue).toEqualTypeOf<Date>()
    expectTypeOf(scene.points[0]!.datum.x1).toEqualTypeOf<string>()
    expectTypeOf(scene.points[0]!.datum.y1).toEqualTypeOf<Date>()
    expect(scene.points).toHaveLength(3)
  })

  it('resolves independently inside facet cells', () => {
    const rows = [
      { id: 'a', panel: 'A', x: 0, y: 0 },
      { id: 'b', panel: 'A', x: 1, y: 0 },
      { id: 'c', panel: 'A', x: 0, y: 1 },
      { id: 'd', panel: 'B', x: 0, y: 0 },
      { id: 'e', panel: 'B', x: 1, y: 0 },
      { id: 'f', panel: 'B', x: 0, y: 1 },
    ]
    const scene = createChartScene(
      defineChart({
        marks: [
          facet(rows, {
            by: 'panel',
            columns: 2,
            gap: 0,
            label: false,
            axes: 'cell',
            chart: (cellRows) => ({
              marks: [delaunayLink(cellRows, { x: 'x', y: 'y', key: 'id' })],
              guides: false,
              scales: {
                x: { scale: scaleLinear },
                y: { scale: scaleLinear },
              },
            }),
          }),
        ],
        guides: false,
        scales: {
          x: null,
          y: null,
        },
      }),
      { width: 320, height: 180 },
    )

    expect(scene.points).toHaveLength(6)
    expect(new Set(scene.points.map((point) => point.key)).size).toBe(6)
  })
})

describe('Delaunay neighbor kernel', () => {
  it('canonicalizes exact positions by stable key', () => {
    const rows = [
      { key: 'duplicate', sourceIndex: 0, x: -0, y: 1 },
      { key: 'b', sourceIndex: 1, x: 2, y: 3 },
      { key: 'a', sourceIndex: 2, x: 0, y: 1 },
      { key: 'c', sourceIndex: 3, x: 4, y: 5 },
    ]

    expect(canonicalDelaunayPoints(rows)).toEqual([rows[2], rows[1], rows[3]])
    expect(canonicalDelaunayPoints([...rows].reverse())).toEqual([
      rows[2],
      rows[1],
      rows[3],
    ])
  })

  it('handles empty, duplicate, two-point, and collinear inputs', () => {
    expect(delaunayNeighborPairs([])).toEqual([])
    expect(delaunayNeighborPairs([{ x: 0, y: 0 }])).toEqual([])
    expect(
      delaunayNeighborPairs([
        { x: 0, y: 0 },
        { x: 1, y: 0 },
      ]),
    ).toEqual([[0, 1]])
    expect(
      delaunayNeighborPairs([
        { x: 0, y: 0 },
        { x: 0, y: 0 },
      ]),
    ).toEqual([])
    expect(
      delaunayNeighborPairs([
        { x: 0, y: 0 },
        { x: 0, y: 0 },
        { x: 0, y: 0 },
      ]),
    ).toEqual([])
    expect(
      delaunayNeighborPairs([
        { x: 0, y: 0 },
        { x: 0, y: 0 },
        { x: 1, y: 0 },
      ]),
    ).toEqual([[0, 2]])
    expect(
      delaunayNeighborPairs([
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 2, y: 0 },
      ]),
    ).toEqual([
      [0, 1],
      [1, 2],
    ])
  })

  it('retains triangle edges when the neighbor iterator stops early', () => {
    const points = [
      { x: -1_000_000_000_578.3121, y: -999_999_999_345.0317 },
      { x: -1_000_000_000_169.9282, y: 1_000_000_000_661.7872 },
      { x: -1_000_000_000_133.2104, y: 1_000_000_000_669.596 },
    ]
    const neighbors = delaunayNeighborIndexes(
      createDelaunay(points),
      points.length,
      true,
    )

    expect(neighbors[0]).toContain(2)
  })
})

function edgePairs(
  edges: readonly { sourceIndex: number; targetIndex: number }[],
): string[] {
  return edges
    .map((edge) =>
      [edge.sourceIndex, edge.targetIndex].sort((left, right) => left - right),
    )
    .map(([source, target]) => `${source}:${target}`)
    .sort()
}

function edgeKeyPairs(
  edges: readonly { sourceKey: string | number; targetKey: string | number }[],
): string[] {
  return edges
    .map((edge) => [String(edge.sourceKey), String(edge.targetKey)].sort())
    .map(([source, target]) => `${source}:${target}`)
    .sort()
}

function sceneRules(
  nodes: readonly SceneNode[],
): Extract<SceneNode, { kind: 'rule' }>[] {
  return nodes.flatMap((node) =>
    node.kind === 'group'
      ? sceneRules(node.children)
      : node.kind === 'rule'
        ? [node]
        : [],
  )
}
