import { sankey as createD3Sankey, sankeyLeft } from 'd3-sankey'
import { describe, expect, expectTypeOf, it } from 'vitest'
import { link } from './link'
import { sankeyDiagram } from './network-sankey'
import { rect } from './rect'
import { createChartRuntime } from './runtime'
import { defaultChartTheme, defineChart } from './scene'
import type {
  SankeyDiagramContext,
  SankeyLink,
  SankeyNode,
} from './network-sankey'
import type {
  ChartMark,
  ChartMotionContext,
  ChartMotionDefinition,
  ChartMotionTiming,
  InitializedMark,
} from './types'

interface NodeRow {
  readonly id: string
  readonly order: number
  readonly tone: 'source' | 'middle' | 'target'
}

interface LinkRow {
  readonly id?: string
  readonly from: string
  readonly to: string
  readonly amount: number
  readonly tone: 'primary' | 'secondary'
}

const nodes = Object.freeze([
  Object.freeze({ id: 'input', order: 0, tone: 'source' as const }),
  Object.freeze({ id: 'a', order: 0, tone: 'middle' as const }),
  Object.freeze({ id: 'b', order: 1, tone: 'middle' as const }),
  Object.freeze({ id: 'output', order: 0, tone: 'target' as const }),
])

const links = Object.freeze([
  Object.freeze({
    id: 'input-a',
    from: 'input',
    to: 'a',
    amount: 6,
    tone: 'primary' as const,
  }),
  Object.freeze({
    id: 'input-b',
    from: 'input',
    to: 'b',
    amount: 4,
    tone: 'secondary' as const,
  }),
  Object.freeze({
    id: 'a-output',
    from: 'a',
    to: 'output',
    amount: 6,
    tone: 'primary' as const,
  }),
  Object.freeze({
    id: 'b-output',
    from: 'b',
    to: 'output',
    amount: 4,
    tone: 'secondary' as const,
  }),
])

describe('sankeyDiagram', () => {
  it.each([
    { width: 320, height: 240 },
    { width: 768, height: 500 },
  ])(
    'resolves private graph clones against final $width×$height pixels',
    (size) => {
      let resolved: SankeyDiagramContext<NodeRow, LinkRow, string> | undefined
      const beforeNodes = JSON.stringify(nodes)
      const beforeLinks = JSON.stringify(links)
      const mark = sankeyDiagram({
        id: 'flow',
        nodes,
        links,
        nodeKey: 'id',
        source: 'from',
        target: 'to',
        value: 'amount',
        align: 'left',
        nodeSort: (left, right) => left.data.order - right.data.order,
        nodeWidth: ({ width }) => width / 32,
        nodePadding: ({ height }) => height / 12,
        inset: ({ width, height }) => ({
          left: width / 10,
          right: width / 10,
          top: height / 10,
          bottom: height / 10,
        }),
        iterations: 16,
        marks: (context) => {
          resolved = context
          return [
            link(context.links, {
              id: 'flows',
              x1: 'x1',
              y1: 'y1',
              x2: 'x2',
              y2: 'y2',
              key: 'key',
              color: (flow) => flow.data.tone,
              strokeWidth: (flow) => Math.max(1, flow.width),
              lineCap: 'butt',
            }),
            rect(context.nodes, {
              id: 'nodes',
              x1: 'x0',
              x2: 'x1',
              y1: 'y0',
              y2: 'y1',
              key: 'key',
              color: (node) => node.data.tone,
              inset: 0,
            }),
          ] as const
        },
      })
      const definition = defineChart({
        marks: [mark],
        color: {
          domain: ['primary', 'secondary', 'source', 'middle', 'target'],
        },
        guides: false,
        margin: 0,
      })
      const scene = createChartRuntime().render(definition, size)

      expect(resolved).toBeDefined()
      expect(resolved!.chart).toEqual({ x: 0, y: 0, ...size })
      expect(resolved!.nodes).toHaveLength(nodes.length)
      expect(resolved!.links).toHaveLength(links.length)
      expect(JSON.stringify(nodes)).toBe(beforeNodes)
      expect(JSON.stringify(links)).toBe(beforeLinks)
      expect(resolved!.nodes.map((node) => node.data)).toEqual(nodes)
      expect(resolved!.links.map((flow) => flow.data)).toEqual(links)
      expect(resolved!.nodes[0]!.data).toBe(nodes[0])
      expect(resolved!.links[0]!.data).toBe(links[0])
      expect(resolved!.nodes[0]!.source).toEqual([nodes[0]])
      expect(resolved!.nodes[0]!.sourceIndexes).toEqual([0])
      expect(resolved!.links[0]!.sourceRows).toEqual([links[0]])
      expect(resolved!.links[0]!.sourceIndexes).toEqual([0])
      expect(resolved!.links[0]!.sourceNode).toBe(resolved!.nodes[0])
      expect(resolved!.links[0]!.targetNode).toBe(resolved!.nodes[1])
      expect(resolved!.nodes[0]!.outgoingLinks).toHaveLength(2)
      expect(resolved!.nodes[3]!.incomingLinks).toHaveLength(2)
      expect(Object.isFrozen(resolved!.nodes[0])).toBe(true)
      expect(Object.isFrozen(resolved!.links[0])).toBe(true)

      for (const node of resolved!.nodes) {
        expect(node.x0).toBeGreaterThanOrEqual(size.width / 10)
        expect(node.x1).toBeLessThanOrEqual(size.width - size.width / 10)
        expect(node.y0).toBeGreaterThanOrEqual(size.height / 10)
        expect(node.y1).toBeLessThanOrEqual(size.height - size.height / 10)
      }
      expect(resolved!.nodes.map((node) => node.key)).toEqual(
        nodes.map((node) => node.id),
      )
      expect(resolved!.links.map((flow) => flow.key)).toEqual(
        links.map((flow) => flow.id),
      )
      expect(scene.scales.x.type).toBe('none')
      expect(scene.scales.y.type).toBe('none')
      expect(scene.points).toHaveLength(nodes.length + links.length)
      expect(
        scene.points.every(
          (point) =>
            point.key.startsWith('flow:') && point.markId.startsWith('flow:'),
        ),
      ).toBe(true)
    },
  )

  it('matches the configured D3 Sankey kernel exactly', () => {
    let resolved: SankeyDiagramContext<NodeRow, LinkRow, string> | undefined
    const size = { width: 400, height: 260 }
    const definition = defineChart({
      marks: [
        sankeyDiagram({
          nodes,
          links,
          nodeKey: 'id',
          source: 'from',
          target: 'to',
          value: 'amount',
          align: 'left',
          nodeSort: (left, right) => left.data.order - right.data.order,
          nodeWidth: 14,
          nodePadding: 22,
          inset: { top: 18, right: 30, bottom: 20, left: 28 },
          iterations: 16,
          marks: (context) => {
            resolved = context
            return [
              rect(context.nodes, {
                x1: 'x0',
                x2: 'x1',
                y1: 'y0',
                y2: 'y1',
              }),
            ] as const
          },
        }),
      ],
      guides: false,
      margin: 0,
    })
    createChartRuntime().render(definition, size)

    const expected = createD3Sankey<
      NodeRow & { id: string },
      LinkRow & { source: string; target: string; value: number }
    >()
      .nodeId((node) => node.id)
      .nodeAlign(sankeyLeft)
      .nodeSort((left, right) => left.order - right.order)
      .nodeWidth(14)
      .nodePadding(22)
      .extent([
        [28, 18],
        [370, 240],
      ])
      .iterations(16)({
      nodes: nodes.map((node) => ({ ...node })),
      links: links.map((flow) => ({
        ...flow,
        source: flow.from,
        target: flow.to,
        value: flow.amount,
      })),
    })

    expect(
      resolved!.nodes.map(({ x0, x1, y0, y1 }) => ({ x0, x1, y0, y1 })),
    ).toEqual(expected.nodes.map(({ x0, x1, y0, y1 }) => ({ x0, x1, y0, y1 })))
    expect(
      resolved!.links.map(({ x1, y1, x2, y2, width }) => ({
        x1,
        y1,
        x2,
        y2,
        width,
      })),
    ).toEqual(
      expected.links.map((flow) => ({
        x1:
          typeof flow.source === 'object'
            ? (flow.source as { x1?: number }).x1
            : undefined,
        y1: flow.y0,
        x2:
          typeof flow.target === 'object'
            ? (flow.target as { x0?: number }).x0
            : undefined,
        y2: flow.y1,
        width: flow.width,
      })),
    )
  })

  it('uses occurrence-safe fallback identities for parallel links', () => {
    let resolved: SankeyDiagramContext<NodeRow, LinkRow, string> | undefined
    const parallel = [
      { from: 'input', to: 'a', amount: 2, tone: 'primary' as const },
      { from: 'input', to: 'a', amount: 3, tone: 'secondary' as const },
    ]
    const mark = sankeyDiagram({
      nodes: nodes.slice(0, 2),
      links: parallel,
      nodeKey: 'id',
      source: 'from',
      target: 'to',
      value: 'amount',
      marks: (context) => {
        resolved = context
        return [
          link(context.links, {
            x1: 'x1',
            y1: 'y1',
            x2: 'x2',
            y2: 'y2',
          }),
        ] as const
      },
    })
    createChartRuntime().render(
      defineChart({ marks: [mark], guides: false, margin: 0 }),
      { width: 300, height: 180 },
    )

    expect(new Set(resolved!.links.map((flow) => flow.key)).size).toBe(2)
    expect(resolved!.links.map((flow) => flow.key)).toEqual([
      'link:["string:5:input","string:1:a"]:0',
      'link:["string:5:input","string:1:a"]:1',
    ])
  })

  it('keeps fallback identities collision-proof for separator-bearing keys', () => {
    let resolved:
      | SankeyDiagramContext<{ id: string }, Omit<LinkRow, 'id'>, string>
      | undefined
    const keyedNodes = [
      { id: 'a:string:b' },
      { id: 'c' },
      { id: 'a' },
      { id: 'b:string:c' },
    ]
    const keyedLinks = [
      {
        from: 'a:string:b',
        to: 'c',
        amount: 1,
        tone: 'primary' as const,
      },
      {
        from: 'a',
        to: 'b:string:c',
        amount: 1,
        tone: 'secondary' as const,
      },
    ]
    const mark = sankeyDiagram({
      nodes: keyedNodes,
      links: keyedLinks,
      nodeKey: 'id',
      source: 'from',
      target: 'to',
      value: 'amount',
      marks: (context) => {
        resolved = context
        return [
          link(context.links, {
            x1: 'x1',
            y1: 'y1',
            x2: 'x2',
            y2: 'y2',
          }),
        ] as const
      },
    })

    createChartRuntime().render(
      defineChart({ marks: [mark], guides: false, margin: 0 }),
      { width: 300, height: 180 },
    )

    expect(new Set(resolved!.links.map(({ key }) => key)).size).toBe(2)
    expect(resolved!.links.map(({ key }) => key)).toEqual([
      'link:["string:10:a:string:b","string:1:c"]:0',
      'link:["string:1:a","string:10:b:string:c"]:0',
    ])
  })

  it('rejects invalid graph identity, values, options, and cycles', () => {
    const base = {
      nodes,
      links,
      nodeKey: 'id' as const,
      source: 'from' as const,
      target: 'to' as const,
      value: 'amount' as const,
      marks: ({ nodes: laidOut }: SankeyDiagramContext<NodeRow, LinkRow>) =>
        [rect(laidOut, { x1: 'x0', x2: 'x1', y1: 'y0', y2: 'y1' })] as const,
    }

    expect(() =>
      sankeyDiagram({
        ...base,
        nodes: [{ ...nodes[0] }, { ...nodes[0] }],
        links: [],
      }),
    ).toThrow('duplicate node key string:"input"')
    expect(() =>
      sankeyDiagram({
        ...base,
        links: [{ from: 'input', to: 'missing', amount: 1, tone: 'primary' }],
      }),
    ).toThrow('target at link index 0 does not match a node key')
    expect(() =>
      sankeyDiagram({
        ...base,
        links: [{ from: 'input', to: 'a', amount: -1, tone: 'primary' }],
      }),
    ).toThrow('value at link index 0 must be a nonnegative finite number')
    expect(() =>
      sankeyDiagram({
        ...base,
        nodes: nodes.slice(0, 2),
        links: [],
      }),
    ).toThrow('a nonempty graph requires at least one positive link value')
    expect(() =>
      sankeyDiagram({
        ...base,
        nodes: nodes.slice(0, 2),
        links: [{ from: 'input', to: 'a', amount: 0, tone: 'primary' }],
      }),
    ).toThrow('a nonempty graph requires at least one positive link value')
    expect(() => sankeyDiagram({ ...base, iterations: 1.5 })).toThrow(
      'iterations must be a nonnegative integer',
    )

    const invalidSize = sankeyDiagram({ ...base, nodeWidth: 500 })
    expect(() =>
      createChartRuntime().render(
        defineChart({ marks: [invalidSize], guides: false, margin: 0 }),
        { width: 320, height: 200 },
      ),
    ).toThrow('inset leaves less horizontal space than nodeWidth')

    const zeroHeight = sankeyDiagram({ ...base, inset: { top: 100 } })
    expect(() =>
      createChartRuntime().render(
        defineChart({ marks: [zeroHeight], guides: false, margin: 0 }),
        { width: 320, height: 100 },
      ),
    ).toThrow('inset leaves no vertical layout space')

    const cyclicNodes = nodes.slice(0, 2)
    const cycle = sankeyDiagram({
      ...base,
      nodes: cyclicNodes,
      links: [
        { from: 'input', to: 'a', amount: 1, tone: 'primary' },
        { from: 'a', to: 'input', amount: 1, tone: 'secondary' },
      ],
    })
    expect(() =>
      createChartRuntime().render(
        defineChart({ marks: [cycle], guides: false, margin: 0 }),
        { width: 320, height: 200 },
      ),
    ).toThrow('circular link')
  })

  it('infers exact child datum unions without requiring Cartesian scales', () => {
    const mark = sankeyDiagram({
      nodes,
      links,
      nodeKey: 'id',
      source: 'from',
      target: 'to',
      value: 'amount',
      marks: ({ nodes: laidOutNodes, links: laidOutLinks }) => [
        rect(laidOutNodes, {
          x1: 'x0',
          x2: 'x1',
          y1: 'y0',
          y2: 'y1',
        }),
        link(laidOutLinks, {
          x1: 'x1',
          y1: 'y1',
          x2: 'x2',
          y2: 'y2',
        }),
      ],
    })

    expectTypeOf(mark).toMatchTypeOf<
      ChartMark<
        | SankeyNode<NodeRow, LinkRow, string>
        | SankeyLink<NodeRow, LinkRow, string>,
        number,
        number,
        never,
        never
      >
    >()
  })

  it('snapshots child motion per mark initialization and scene layout', () => {
    const mark = sankeyDiagram({
      nodes,
      links,
      nodeKey: 'id',
      source: 'from',
      target: 'to',
      value: 'amount',
      motion: { transition: { type: 'tween', duration: 100 } },
      marks: ({ chart, nodes: laidOutNodes }) => {
        const nodesMark = rect(laidOutNodes, {
          id: 'nodes',
          x1: 'x0',
          x2: 'x1',
          y1: 'y0',
          y2: 'y1',
        })
        return [
          {
            ...nodesMark,
            // Structural custom marks may keep motion on the mark only.
            motion: {
              delay: chart.width,
              transition: { type: 'tween', easing: 'linear' },
            },
          },
        ]
      },
    })
    const first = mark.initialize({ markIndex: 0 })
    const second = mark.initialize({ markIndex: 1 })
    const sameIdNextScene = mark.initialize({ markIndex: 0 })

    resolveAt(first, 300)
    resolveAt(second, 600)
    resolveAt(sameIdNextScene, 900)

    expect(
      resolveMotion(first.motion, motionContext('sankey-0:nodes')),
    ).toEqual({
      delay: 300,
      transition: { type: 'tween', duration: 100, easing: 'linear' },
    })
    expect(
      resolveMotion(second.motion, motionContext('sankey-1:nodes')),
    ).toEqual({
      delay: 600,
      transition: { type: 'tween', duration: 100, easing: 'linear' },
    })
    expect(
      resolveMotion(sameIdNextScene.motion, motionContext('sankey-0:nodes')),
    ).toEqual({
      delay: 900,
      transition: { type: 'tween', duration: 100, easing: 'linear' },
    })
  })
})

function resolveAt(mark: InitializedMark<any, any, any>, width: number) {
  mark.resolveLayout?.({
    markIndex: 0,
    chart: { x: 0, y: 0, width, height: 240 },
    scales: {},
    theme: defaultChartTheme,
    layout: {},
  })
}

function motionContext(markId: string): ChartMotionContext {
  return {
    phase: 'enter',
    role: 'rect',
    key: `${markId}:input`,
    markId,
    seriesKey: '',
    seriesIndex: 0,
    datumIndex: 0,
    datumCount: 1,
    datum: undefined,
    point: undefined,
  }
}

function resolveMotion(
  motion: ChartMotionDefinition<any> | undefined,
  context: ChartMotionContext,
): ChartMotionTiming | undefined {
  return typeof motion === 'function' ? motion(context) : motion
}
