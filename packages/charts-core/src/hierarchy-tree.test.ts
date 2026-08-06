import { describe, expect, expectTypeOf, it } from 'vitest'
import { treeLayout } from './hierarchy-tree'
import type { TreeLayoutNode } from './hierarchy-tree'

interface PathRow {
  name: string
  value: number | null
}

const rows = [
  { name: 'flare.analytics', value: null },
  { name: 'flare.analytics.cluster', value: null },
  { name: 'flare.analytics.cluster.A', value: 1 },
  { name: 'flare.analytics.cluster.B', value: 2 },
  { name: 'flare.analytics.graph', value: null },
  { name: 'flare.analytics.graph.C', value: 3 },
] satisfies PathRow[]

describe('treeLayout', () => {
  it('lays out full semantic paths with native-mark rows and exact lineage', () => {
    const frozen = Object.freeze(rows.map((row) => Object.freeze({ ...row })))
    const before = JSON.stringify(frozen)
    const layout = treeLayout(frozen, {
      path: 'name',
      delimiter: '.',
    })

    expect(layout.nodes).toHaveLength(frozen.length)
    expect(layout.links).toHaveLength(frozen.length - 1)
    expect(layout.nodes.map((node) => node.id)).toEqual([
      '/flare/analytics',
      '/flare/analytics/cluster',
      '/flare/analytics/graph',
      '/flare/analytics/cluster/A',
      '/flare/analytics/cluster/B',
      '/flare/analytics/graph/C',
    ])

    const root = layout.nodes[0]!
    expect(root).toMatchObject({
      id: '/flare/analytics',
      parentId: null,
      name: 'analytics',
      data: frozen[0],
      depth: 0,
      height: 2,
      internal: true,
      external: false,
      x: 0,
    })
    expect(root.source).toEqual([frozen[0]])
    expect(root.source[0]).toBe(frozen[0])
    expect(root.sourceIndexes).toEqual([0])

    const leaf = layout.nodes.find((node) => node.name === 'B')!
    expect(leaf).toMatchObject({
      parentId: '/flare/analytics/cluster',
      data: frozen[3],
      depth: 2,
      height: 0,
      internal: false,
      external: true,
      x: 2,
    })
    expect(leaf.source).toEqual([frozen[3]])
    expect(leaf.sourceIndexes).toEqual([3])

    const leafLink = layout.links.find((link) => link.target === leaf.id)!
    expect(leafLink.id).toBe(leaf.id)
    expect(leafLink.source).toBe('/flare/analytics/cluster')
    expect(leafLink.target).toBe(leaf.id)
    expect(leafLink.data).toBe(frozen[3])
    expect(leafLink.sourceNode).toBe(
      layout.nodes.find((node) => node.id === leafLink.source),
    )
    expect(leafLink.targetNode).toBe(leaf)
    expect(leafLink.sourceIndex).toBe(1)
    expect(leafLink.targetIndex).toBe(3)
    expect(leafLink.sourceRows).toEqual([frozen[3]])
    expect(leafLink.sourceRows[0]).toBe(frozen[3])
    expect(leafLink.sourceIndexes).toEqual([3])
    expect([leafLink.x1, leafLink.y1]).toEqual([
      leafLink.sourceNode.x,
      leafLink.sourceNode.y,
    ])
    expect([leafLink.x2, leafLink.y2]).toEqual([leaf.x, leaf.y])
    expect(JSON.stringify(frozen)).toBe(before)

    expectTypeOf(root.data).toMatchTypeOf<PathRow | null>()
    expectTypeOf(root.source).toMatchTypeOf<readonly PathRow[]>()
    expectTypeOf(leafLink.targetIndex).toEqualTypeOf<number | null>()
  })

  it('retains imputed branching ancestors with null data and empty lineage', () => {
    const source = [
      { path: 'root.alpha.one', value: 1 },
      { path: 'root.beta.two', value: 2 },
    ]
    const layout = treeLayout(source, { path: 'path', delimiter: '.' })

    expect(layout.nodes.map((node) => node.id)).toEqual([
      '/root',
      '/root/alpha',
      '/root/beta',
      '/root/alpha/one',
      '/root/beta/two',
    ])
    for (const id of ['/root', '/root/alpha', '/root/beta']) {
      const node = layout.nodes.find((candidate) => candidate.id === id)!
      expect(node.data).toBeNull()
      expect(node.source).toEqual([])
      expect(node.sourceIndexes).toEqual([])
    }
    const imputedLink = layout.links.find(
      (link) => link.target === '/root/alpha',
    )!
    expect(imputedLink.sourceIndex).toBeNull()
    expect(imputedLink.targetIndex).toBeNull()
    expect(imputedLink.data).toBeNull()
    expect(imputedLink.sourceRows).toEqual([])
    expect(imputedLink.sourceIndexes).toEqual([])
    const observedLink = layout.links.find(
      (link) => link.target === '/root/alpha/one',
    )!
    expect(observedLink.sourceIndex).toBeNull()
    expect(observedLink.targetIndex).toBe(0)
    expect(observedLink.sourceRows).toEqual([source[0]])
    expect(observedLink.sourceIndexes).toEqual([0])
  })

  it('supports explicit id and parent identity with raw accessor context', () => {
    const source = [
      { key: 'root', parent: null as string | null, order: 0 },
      { key: 'left/team', parent: 'root', order: 1 },
      { key: 'right', parent: 'root', order: 2 },
    ]
    const observedData: (readonly (typeof source)[number][])[] = []
    const layout = treeLayout(source, {
      id: ({ datum, index, data }) => {
        expect(datum).toBe(source[index])
        observedData.push(data)
        return datum.key
      },
      parentId: ({ datum, index, data }) => {
        expect(datum).toBe(source[index])
        observedData.push(data)
        return datum.parent
      },
    })

    expect(observedData).toHaveLength(source.length * 2)
    expect(observedData.every((data) => data === source)).toBe(true)
    expect(layout.nodes.map((node) => node.id)).toEqual([
      'root',
      'left/team',
      'right',
    ])
    expect(layout.nodes[1]?.name).toBe('left/team')
    expect(layout.links.map((link) => [link.source, link.target])).toEqual([
      ['root', 'left/team'],
      ['root', 'right'],
    ])
  })

  it('supports primitive path rows with exact indexes', () => {
    const source = ['gods', 'gods.chaos', 'gods.chaos.night']
    const layout = treeLayout(source, {
      path: ({ datum }) => datum,
      delimiter: '.',
    })

    expect(layout.nodes.map((node) => node.data)).toEqual(source)
    expect(layout.nodes.map((node) => node.sourceIndexes)).toEqual([
      [0],
      [1],
      [2],
    ])
    expect(layout.links[1]!.sourceRows).toEqual([source[2]])
  })

  it('distinguishes a raw null datum from an imputed node through lineage', () => {
    const layout = treeLayout([null], { path: () => 'root' })
    expect(layout.nodes[0]!.data).toBeNull()
    expect(layout.nodes[0]!.source).toEqual([null])
    expect(layout.nodes[0]!.sourceIndexes).toEqual([0])
  })

  it('maps all four root anchors from one stable tidy layout', () => {
    const left = treeLayout(rows, {
      path: 'name',
      delimiter: '.',
      orientation: 'left',
      nodeSize: [3, 2],
    })
    const right = treeLayout(rows, {
      path: 'name',
      delimiter: '.',
      orientation: 'right',
      nodeSize: [3, 2],
    })
    const top = treeLayout(rows, {
      path: 'name',
      delimiter: '.',
      orientation: 'top',
      nodeSize: [3, 2],
    })
    const bottom = treeLayout(rows, {
      path: 'name',
      delimiter: '.',
      orientation: 'bottom',
      nodeSize: [3, 2],
    })

    for (let index = 0; index < left.nodes.length; index += 1) {
      const a = left.nodes[index]!
      const b = right.nodes[index]!
      const c = top.nodes[index]!
      const d = bottom.nodes[index]!
      expect(b.id).toBe(a.id)
      expect([b.x, b.y]).toEqual([-a.x, a.y])
      expect([c.x, c.y]).toEqual([-a.y, -a.x])
      expect([d.x, d.y]).toEqual([-a.y, a.x])
      expect(a.x % 2).toBe(0)
    }
  })

  it('sorts and separates through immutable Charts-owned node contexts', () => {
    const source = [
      { id: 'root', parent: null as string | null, order: 0 },
      { id: 'a', parent: 'root', order: 1 },
      { id: 'b', parent: 'root', order: 2 },
    ]
    const contexts: TreeLayoutNode<(typeof source)[number]>[] = []
    const baseline = treeLayout(source, { id: 'id', parentId: 'parent' })
    const custom = treeLayout(source, {
      id: 'id',
      parentId: 'parent',
      sort: (left, right) => {
        expect(Object.isFrozen(left)).toBe(true)
        contexts.push(left as TreeLayoutNode<(typeof source)[number]>)
        return (right.data?.order ?? 0) - (left.data?.order ?? 0)
      },
      separation: (left, right) => {
        expect(Object.isFrozen(left)).toBe(true)
        expect(Object.isFrozen(right)).toBe(true)
        return 3
      },
    })

    expect(contexts.length).toBeGreaterThan(0)
    const baselineA = baseline.nodes.find((node) => node.id === 'a')!
    const baselineB = baseline.nodes.find((node) => node.id === 'b')!
    const customA = custom.nodes.find((node) => node.id === 'a')!
    const customB = custom.nodes.find((node) => node.id === 'b')!
    expect(Math.sign(customA.y - customB.y)).toBe(
      -Math.sign(baselineA.y - baselineB.y),
    )
    expect(Math.abs(customA.y - customB.y)).toBe(3)
  })

  it('preserves escaped delimiters and literal slashes without path aliases', () => {
    const source = [
      { path: 'root' },
      { path: 'root.a\\.b' },
      { path: 'root.a/b' },
    ]
    const layout = treeLayout(source, { path: 'path', delimiter: '.' })

    expect(layout.nodes.map((node) => node.name)).toEqual([
      'root',
      'a.b',
      'a/b',
    ])
    expect(new Set(layout.nodes.map((node) => node.id)).size).toBe(3)
  })

  it('rejects invalid hierarchy input and layout options', () => {
    expect(() =>
      treeLayout([{ path: 'root' }], { path: 'path', delimiter: '--' }),
    ).toThrow('delimiter must be exactly one character')
    expect(() =>
      treeLayout([{ path: 'root' }], { path: 'path', delimiter: '\\' }),
    ).toThrow('delimiter cannot be backslash')
    expect(() => treeLayout([{ path: '' }], { path: 'path' })).toThrow(
      'path at index 0 must be a nonempty string',
    )
    expect(() =>
      treeLayout(
        [
          { id: 'root', parent: null },
          { id: 'root', parent: null },
        ],
        { id: 'id', parentId: 'parent' },
      ),
    ).toThrow('duplicate id "root" at indexes 0 and 1')
    expect(() =>
      treeLayout([{ id: 'child', parent: 'missing' }], {
        id: 'id',
        parentId: 'parent',
      }),
    ).toThrow('missing: missing')
    expect(() =>
      treeLayout([{ path: 'root' }], {
        path: 'path',
        nodeSize: [0, 1],
      }),
    ).toThrow('nodeSize breadth must be positive and finite')
    expect(() =>
      treeLayout([{ path: 'root' }], {
        path: 'path',
        orientation: 'diagonal' as 'left',
      }),
    ).toThrow('invalid orientation "diagonal"')
    expect(() =>
      treeLayout(
        [
          { id: 'root', parent: null },
          { id: 'a', parent: 'root' },
          { id: 'b', parent: 'root' },
        ],
        { id: 'id', parentId: 'parent', separation: () => -1 },
      ),
    ).toThrow('separation result must be nonnegative and finite')
    expect(() =>
      treeLayout(
        [
          { id: 'root', parent: null },
          { id: 'a', parent: 'root' },
          { id: 'b', parent: 'root' },
        ],
        { id: 'id', parentId: 'parent', sort: () => Number.NaN },
      ),
    ).toThrow('sort result must be finite')
  })

  it('is deterministic across repeated calls', () => {
    const first = treeLayout(rows, { path: 'name', delimiter: '.' })
    const second = treeLayout(rows, { path: 'name', delimiter: '.' })
    expect(second).toEqual(first)
  })
})
