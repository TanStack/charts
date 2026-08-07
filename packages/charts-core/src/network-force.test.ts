import { describe, expect, expectTypeOf, it } from 'vitest'
import { forceRadial } from 'd3-force'
import { forceLayout } from './network-force'
import type {
  ForceDescriptor,
  ForceFactory,
  ForceFactoryDescriptor,
  ForceLayoutWorkingLink,
  ForceLayoutWorkingNode,
} from './network-force'

interface NodeRow {
  id: string
  group: number
  x?: number
  y?: number
  vx?: number
  vy?: number
}

interface LinkRow {
  source: string
  target: string
  value: number
}

const forces = [
  {
    type: 'link',
    distance: ({ datum }: { datum: LinkRow }) => 40 - datum.value,
    strength: ({ datum }: { datum: LinkRow }) => 0.2 + datum.value * 0.05,
  },
  { type: 'manyBody', strength: -80 },
  { type: 'center', x: 0, y: 0 },
  { type: 'collide', radius: 8, strength: 0.9 },
  { type: 'x', x: 0, strength: 0.03 },
  { type: 'y', y: 0, strength: 0.03 },
] satisfies readonly ForceDescriptor<NodeRow, LinkRow>[]

describe('forceLayout', () => {
  it('settles private clones and returns native-mark rows with exact lineage', () => {
    const nodes = Object.freeze([
      Object.freeze({ id: 'a', group: 1 }),
      Object.freeze({ id: 'b', group: 2 }),
      Object.freeze({ id: 'c', group: 1 }),
    ])
    const links = Object.freeze([
      Object.freeze({ source: 'a', target: 'b', value: 3 }),
      Object.freeze({ source: 'b', target: 'c', value: 5 }),
    ])
    const beforeNodes = JSON.stringify(nodes)
    const beforeLinks = JSON.stringify(links)

    const layout = forceLayout(nodes, links, {
      nodeKey: 'id',
      source: 'source',
      target: 'target',
      iterations: 300,
      domainPadding: 0.2,
      forces,
    })

    expect(layout.nodes.map((node) => node.id)).toEqual(['a', 'b', 'c'])
    expect(layout.links.map((link) => link.value)).toEqual([3, 5])
    for (const node of layout.nodes) {
      expect([node.x, node.y, node.vx, node.vy].every(Number.isFinite)).toBe(
        true,
      )
    }
    expect(layout.nodes[0]!.source).toEqual([nodes[0]])
    expect(layout.nodes[0]!.source[0]).toBe(nodes[0])
    expect(layout.nodes[0]!.sourceIndexes).toEqual([0])

    const firstLink = layout.links[0]!
    expect(firstLink.source).toBe('a')
    expect(firstLink.target).toBe('b')
    expect(firstLink.sourceKey).toBe('a')
    expect(firstLink.targetKey).toBe('b')
    expect(firstLink.sourceIndex).toBe(0)
    expect(firstLink.targetIndex).toBe(1)
    expect(firstLink.sourceNode).toBe(layout.nodes[0])
    expect(firstLink.targetNode).toBe(layout.nodes[1])
    expect(firstLink.sourceRows).toEqual([links[0]])
    expect(firstLink.sourceRows[0]).toBe(links[0])
    expect(firstLink.sourceIndexes).toEqual([0])
    expect([firstLink.x1, firstLink.y1]).toEqual([
      firstLink.sourceNode.x,
      firstLink.sourceNode.y,
    ])
    expect([firstLink.x2, firstLink.y2]).toEqual([
      firstLink.targetNode.x,
      firstLink.targetNode.y,
    ])

    const xs = layout.nodes.map((node) => node.x)
    const ys = layout.nodes.map((node) => node.y)
    const xSpan = Math.max(1, Math.max(...xs) - Math.min(...xs))
    const ySpan = Math.max(1, Math.max(...ys) - Math.min(...ys))
    expect(layout.xDomain[0]).toBeCloseTo(Math.min(...xs) - xSpan * 0.2)
    expect(layout.xDomain[1]).toBeCloseTo(Math.max(...xs) + xSpan * 0.2)
    expect(layout.yDomain[0]).toBeCloseTo(Math.min(...ys) - ySpan * 0.2)
    expect(layout.yDomain[1]).toBeCloseTo(Math.max(...ys) + ySpan * 0.2)

    const repeated = forceLayout(nodes, links, {
      nodeKey: 'id',
      source: 'source',
      target: 'target',
      iterations: 300,
      domainPadding: 0.2,
      forces,
    })
    expect(
      repeated.nodes.map(({ x, y, vx, vy }) => ({ x, y, vx, vy })),
    ).toEqual(layout.nodes.map(({ x, y, vx, vy }) => ({ x, y, vx, vy })))

    expect(JSON.stringify(nodes)).toBe(beforeNodes)
    expect(JSON.stringify(links)).toBe(beforeLinks)
    expectTypeOf(layout.nodes[0]!.id).toMatchTypeOf<string>()
    expectTypeOf(layout.links[0]!.source).toMatchTypeOf<string>()
    expectTypeOf(layout.links[0]!.sourceRows).toMatchTypeOf<
      readonly LinkRow[]
    >()
    expectTypeOf(layout.nodes[0]!.x).toEqualTypeOf<number>()
  })

  it('evaluates transform accessors against the raw rows and their source arrays', () => {
    const nodes = [
      { id: 'a', group: 1, targetX: -10, radius: 3 },
      { id: 'b', group: 2, targetX: 10, radius: 4 },
    ]
    const links = [{ from: 'a', to: 'b', distance: 24, weight: 0.6 }]
    const observedNodeData: (readonly (typeof nodes)[number][])[] = []
    const observedLinkData: (readonly (typeof links)[number][])[] = []

    const layout = forceLayout(nodes, links, {
      nodeKey: ({ datum, index, data }) => {
        expect(datum).toBe(nodes[index])
        observedNodeData.push(data)
        return datum.id
      },
      source: ({ datum, index, data }) => {
        expect(datum).toBe(links[index])
        observedLinkData.push(data)
        return datum.from
      },
      target: ({ datum }) => datum.to,
      iterations: 2,
      forces: [
        {
          type: 'link',
          distance: ({ datum, index, data }) => {
            expect(datum).toBe(links[index])
            observedLinkData.push(data)
            return datum.distance
          },
          strength: 'weight',
        },
        {
          type: 'manyBody',
          strength: ({ datum, index, data }) => {
            expect(datum).toBe(nodes[index])
            observedNodeData.push(data)
            return -datum.group * 10
          },
        },
        { type: 'collide', radius: 'radius' },
        { type: 'x', x: 'targetX', strength: 0.1 },
      ],
    })

    expect(observedNodeData.length).toBeGreaterThan(0)
    expect(observedNodeData.every((data) => data === nodes)).toBe(true)
    expect(observedLinkData.length).toBeGreaterThan(0)
    expect(observedLinkData.every((data) => data === links)).toBe(true)
    expect(layout.links[0]!.source).toBe('a')
    expect(layout.links[0]!.target).toBe('b')
  })

  it('applies unique force descriptors in authored order', () => {
    const nodes: NodeRow[] = [
      { id: 'a', group: 1, x: 100, y: 0, vx: 0, vy: 0 },
      { id: 'b', group: 1, x: 200, y: 0, vx: 0, vy: 0 },
    ]
    const links: LinkRow[] = []
    const centerThenX = forceLayout(nodes, links, {
      nodeKey: 'id',
      source: 'source',
      target: 'target',
      iterations: 1,
      forces: [
        { type: 'center', x: 0, y: 0 },
        { type: 'x', x: 0, strength: 1 },
      ],
    })
    const xThenCenter = forceLayout(nodes, links, {
      nodeKey: 'id',
      source: 'source',
      target: 'target',
      iterations: 1,
      forces: [
        { type: 'x', x: 0, strength: 1 },
        { type: 'center', x: 0, y: 0 },
      ],
    })

    expect(centerThenX.nodes.map((node) => node.x)).not.toEqual(
      xThenCenter.nodes.map((node) => node.x),
    )
  })

  it('runs named native D3 forces over fresh private working clones', () => {
    const nodes: readonly Readonly<NodeRow>[] = Object.freeze([
      Object.freeze({ id: 'a', group: 1 } as NodeRow),
      Object.freeze({ id: 'b', group: 2 } as NodeRow),
    ])
    const links: readonly Readonly<LinkRow>[] = Object.freeze([
      Object.freeze({ source: 'a', target: 'b', value: 1 } as LinkRow),
    ])
    const contexts: unknown[] = []
    const radial: ForceFactoryDescriptor<NodeRow, LinkRow, string> = {
      type: 'custom',
      name: 'radial',
      create: (context) => {
        contexts.push(context)
        expect(Object.isFrozen(context)).toBe(true)
        expect(Object.isFrozen(context.nodeKeys)).toBe(true)
        expect(context.nodes[0]).not.toBe(nodes[0])
        expect(context.links[0]).not.toBe(links[0])
        expect(context.nodes.map((node) => node.id)).toEqual(['a', 'b'])
        expect(context.nodeKeys).toEqual(['a', 'b'])
        expect(context.sourceKeys).toEqual(['a'])
        expect(context.targetKeys).toEqual(['b'])
        expect(context.nodeKey(context.nodes[0]!, 0)).toBe('a')
        expectTypeOf(context.nodes[0]!.group).toEqualTypeOf<number>()
        return forceRadial<ForceLayoutWorkingNode<NodeRow>>(25, 0, 0).strength(
          0.4,
        )
      },
    }
    const settle = () =>
      forceLayout(nodes, links, {
        nodeKey: 'id',
        source: 'source',
        target: 'target',
        iterations: 40,
        forces: [{ type: 'center', x: 0, y: 0 }, radial],
      })

    const first = settle()
    const repeated = settle()

    expect(contexts).toHaveLength(2)
    expect(
      repeated.nodes.map(({ x, y, vx, vy }) => ({ x, y, vx, vy })),
    ).toEqual(first.nodes.map(({ x, y, vx, vy }) => ({ x, y, vx, vy })))
    expect(JSON.stringify(nodes)).toBe(
      JSON.stringify([
        { id: 'a', group: 1 },
        { id: 'b', group: 2 },
      ]),
    )
    expect(JSON.stringify(links)).toBe(
      JSON.stringify([{ source: 'a', target: 'b', value: 1 }]),
    )
  })

  it('keeps conflicting source fields out of D3-owned working state', () => {
    interface ReservedNodeRow {
      id: string
      label: string
      index: string
      x: string
      fx: string
    }
    interface ReservedLinkRow {
      source: string
      target: string
      index: string
    }

    const nodes: ReservedNodeRow[] = [
      {
        id: 'a',
        label: 'Alpha',
        index: 'source-node-index',
        x: 'source-x',
        fx: 'source-fx',
      },
    ]
    const links: ReservedLinkRow[] = [
      { source: 'a', target: 'a', index: 'source-link-index' },
    ]
    const inspect: ForceFactoryDescriptor<
      ReservedNodeRow,
      ReservedLinkRow,
      string
    > = {
      type: 'custom',
      name: 'inspect',
      create: (context) => {
        expect(context.nodes[0]).toMatchObject({ id: 'a', label: 'Alpha' })
        expect(context.nodes[0]!.index).toBeUndefined()
        expect(context.nodes[0]!.x).toBeUndefined()
        expect(context.nodes[0]!.fx).toBeUndefined()
        expectTypeOf(context.nodes[0]!.index).toEqualTypeOf<
          number | undefined
        >()
        expectTypeOf(context.nodes[0]!.x).toEqualTypeOf<number | undefined>()
        expectTypeOf(context.nodes[0]!.fx).toEqualTypeOf<
          number | null | undefined
        >()
        expect(context.links[0]).toMatchObject({ source: 'a', target: 'a' })
        expect(context.links[0]!.index).toBeUndefined()
        expectTypeOf(context.links[0]!.index).toEqualTypeOf<
          number | undefined
        >()
        expectTypeOf(context.links).toEqualTypeOf<
          ForceLayoutWorkingLink<ReservedNodeRow, ReservedLinkRow>[]
        >()
        return () => {}
      },
    }

    const layout = forceLayout(nodes, links, {
      nodeKey: 'id',
      source: 'source',
      target: 'target',
      iterations: 1,
      forces: [inspect],
    })

    expect(layout.nodes[0]).toMatchObject({
      id: 'a',
      label: 'Alpha',
      index: 'source-node-index',
      fx: 'source-fx',
    })
    expect(layout.nodes[0]!.x).toEqual(expect.any(Number))
    expect(layout.links[0]!.index).toBe('source-link-index')
  })

  it('keeps numeric and string keys distinct', () => {
    const nodes = [{ id: 1 }, { id: '1' }]
    const links = [{ source: 1, target: '1' }]
    const layout = forceLayout(nodes, links, {
      nodeKey: 'id',
      source: 'source',
      target: 'target',
      iterations: 1,
      forces: [{ type: 'link' }],
    })

    expect(layout.links[0]!.sourceIndex).toBe(0)
    expect(layout.links[0]!.targetIndex).toBe(1)
  })

  it('rejects duplicate keys, missing endpoints, and invalid options before simulation', () => {
    const noForce: ForceFactory<NodeRow, LinkRow, string> = () => (_alpha) =>
      undefined
    expect(() =>
      forceLayout([{ id: 'a' }, { id: 'a' }], [] as LinkRow[], {
        nodeKey: 'id',
        source: 'source',
        target: 'target',
        forces: [],
      }),
    ).toThrow('duplicate node key string:"a"')

    expect(() =>
      forceLayout([{ id: 'a' }], [{ source: 'a', target: 'b', value: 1 }], {
        nodeKey: 'id',
        source: 'source',
        target: 'target',
        forces: [],
      }),
    ).toThrow('target at link index 0 does not match a node key')

    expect(() =>
      forceLayout([{ id: Number.NaN }], [] as LinkRow[], {
        nodeKey: 'id',
        source: 'source',
        target: 'target',
        forces: [],
      }),
    ).toThrow('nodeKey at index 0 must be a string or finite number')

    expect(() =>
      forceLayout([{ id: 'a' }], [] as LinkRow[], {
        nodeKey: 'id',
        source: 'source',
        target: 'target',
        iterations: 1.5,
        forces: [],
      }),
    ).toThrow('iterations must be a nonnegative integer')

    expect(() =>
      forceLayout([{ id: 'a' }], [] as LinkRow[], {
        nodeKey: 'id',
        source: 'source',
        target: 'target',
        domainPadding: -1,
        forces: [],
      }),
    ).toThrow('domainPadding must be a nonnegative finite number')

    expect(() =>
      forceLayout([{ id: 'a' }], [] as LinkRow[], {
        nodeKey: 'id',
        source: 'source',
        target: 'target',
        forces: [{ type: 'x' }, { type: 'x' }],
      }),
    ).toThrow('duplicate force type "x"')

    expect(() =>
      forceLayout([{ id: 'a' }], [] as LinkRow[], {
        nodeKey: 'id',
        source: 'source',
        target: 'target',
        forces: [{ type: 'collide', radius: -1 }],
      }),
    ).toThrow('radius must be a nonnegative finite number')

    expect(() =>
      forceLayout([{ id: 'a' }], [] as LinkRow[], {
        nodeKey: 'id',
        source: 'source',
        target: 'target',
        forces: [{ type: 'x', strength: Number.POSITIVE_INFINITY }],
      }),
    ).toThrow('strength must be between 0 and 1')

    expect(() =>
      forceLayout([{ id: 'a', group: 1 }], [] as LinkRow[], {
        nodeKey: 'id',
        source: 'source',
        target: 'target',
        forces: [
          { type: 'custom', name: 'radial', create: noForce },
          { type: 'custom', name: 'radial', create: noForce },
        ],
      }),
    ).toThrow('duplicate force name "radial"')

    expect(() =>
      forceLayout([{ id: 'a', group: 1 }], [] as LinkRow[], {
        nodeKey: 'id',
        source: 'source',
        target: 'target',
        forces: [{ type: 'custom', name: ' ', create: noForce }],
      }),
    ).toThrow('name must be a nonempty string')

    const invalidFactory = (() => null) as unknown as ForceFactory<
      NodeRow,
      LinkRow,
      string
    >
    expect(() =>
      forceLayout([{ id: 'a', group: 1 }], [] as LinkRow[], {
        nodeKey: 'id',
        source: 'source',
        target: 'target',
        forces: [
          {
            type: 'custom',
            name: 'invalid',
            create: invalidFactory,
          },
        ],
      }),
    ).toThrow('create must return a D3-compatible force')

    expect(() =>
      forceLayout(
        [
          { id: 'a', group: 1 },
          { id: 'b', group: 2 },
        ],
        [] as LinkRow[],
        {
          nodeKey: 'id',
          source: 'source',
          target: 'target',
          forces: [
            {
              type: 'custom',
              name: 'reorder',
              create: (context) => {
                context.nodes.reverse()
                return (_alpha) => undefined
              },
            },
          ],
        },
      ),
    ).toThrow('custom force changed the private node collection')
  })

  it('returns stable empty domains without inventing rows', () => {
    const layout = forceLayout([] as NodeRow[], [] as LinkRow[], {
      nodeKey: 'id',
      source: 'source',
      target: 'target',
      forces: [],
    })

    expect(layout).toEqual({
      nodes: [],
      links: [],
      xDomain: [-1, 1],
      yDomain: [-1, 1],
    })
  })
})
