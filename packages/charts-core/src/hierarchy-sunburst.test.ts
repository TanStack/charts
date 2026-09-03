import { arc, pointRadial } from 'd3-shape'
import { describe, expect, expectTypeOf, it, vi } from 'vitest'
import { sunburst } from './hierarchy-sunburst'
import { nearestScenePoint } from './nearest'
import { polar } from './polar'
import { createChartScene, defineChart } from './scene'
import type {
  SunburstNode,
  SunburstNodeComparator,
  SunburstOptions,
  SunburstParentOptions,
  SunburstPathOptions,
} from './hierarchy-sunburst'
import type { PolarMark } from './polar'
import type { ChartScene, SceneArea, SceneNode } from './types'

interface PathRow {
  path: string
  value: number | null
}

const pathRows = [
  { path: 'root', value: null },
  { path: 'root.alpha', value: null },
  { path: 'root.alpha.a', value: 4 },
  { path: 'root.beta.b', value: 6 },
] satisfies PathRow[]

function render<TDatum>(
  mark: PolarMark<SunburstNode<TDatum>, number, number, never, never>,
  options: {
    width?: number
    height?: number
    startAngle?: number
    endAngle?: number
  } = {},
) {
  return createChartScene(
    defineChart({
      marks: [
        polar({
          marks: [mark],
          scales: { angle: null, radius: null },
          startAngle: options.startAngle,
          endAngle: options.endAngle,
        }),
      ],
      scales: { x: null, y: null },
      guides: false,
      focusRing: false,
      margin: 0,
      color: { range: ['#7c3aed', '#0ea5e9'] },
    }),
    { width: options.width ?? 200, height: options.height ?? 160 },
  ) as ChartScene<SunburstNode<TDatum>, number, number>
}

describe('sunburst', () => {
  it('renders normalized path nodes, imputed ancestors, aggregation, and direct lineage', () => {
    const source: readonly PathRow[] = Object.freeze(
      pathRows.map((row) => Object.freeze({ ...row })),
    )
    const before = JSON.stringify(source)
    const mark = sunburst(source, {
      id: 'hierarchy',
      path: 'path',
      delimiter: '.',
      value: 'value',
      color: 'branchId',
    })
    const scene = render(mark)
    const byId = new Map(scene.points.map((point) => [point.datum.id, point]))

    expectTypeOf(mark).toEqualTypeOf<
      PolarMark<SunburstNode<PathRow>, number, number, never, never>
    >()
    expect(scene.points).toHaveLength(4)
    expect(byId.has('/root')).toBe(false)
    expect([...byId.keys()]).toEqual([
      '/root/alpha',
      '/root/beta',
      '/root/alpha/a',
      '/root/beta/b',
    ])
    expect(byId.get('/root/alpha')?.datum).toMatchObject({
      parentId: '/root',
      ancestorIds: ['/root'],
      branchId: '/root/alpha',
      name: 'alpha',
      data: source[1],
      depth: 1,
      height: 1,
      internal: true,
      external: false,
      value: 4,
      source: [source[1]],
      sourceIndexes: [1],
    })
    expect(byId.get('/root/beta')?.datum).toMatchObject({
      parentId: '/root',
      ancestorIds: ['/root'],
      branchId: '/root/beta',
      name: 'beta',
      data: null,
      depth: 1,
      height: 1,
      internal: true,
      external: false,
      value: 6,
      source: [],
      sourceIndexes: [],
    })
    expect(byId.get('/root/alpha/a')?.datum).toMatchObject({
      ancestorIds: ['/root', '/root/alpha'],
      branchId: '/root/alpha',
      value: 4,
      data: source[2],
      source: [source[2]],
      sourceIndexes: [2],
    })
    expect(byId.get('/root/beta/b')?.datum).toMatchObject({
      ancestorIds: ['/root', '/root/beta'],
      branchId: '/root/beta',
      value: 6,
      data: source[3],
      source: [source[3]],
      sourceIndexes: [3],
    })
    expect(byId.get('/root/alpha')?.color).toBe(
      byId.get('/root/alpha/a')?.color,
    )
    expect(byId.get('/root/beta')?.color).toBe(byId.get('/root/beta/b')?.color)
    expect(byId.get('/root/alpha')?.color).not.toBe(
      byId.get('/root/beta')?.color,
    )
    expect(scene.points.map((point) => point.key)).toEqual([
      'hierarchy:node:string:11:/root/alpha',
      'hierarchy:node:string:10:/root/beta',
      'hierarchy:node:string:13:/root/alpha/a',
      'hierarchy:node:string:12:/root/beta/b',
    ])
    expect(
      Math.max(
        ...areaNodes(scene.nodes).map((area) => radialExtent(area).maximum),
      ),
    ).toBe(80)
    expect(scene.points[0]?.datum.data?.path).toBe('root.alpha')
    expect(JSON.stringify(source)).toBe(before)
  })

  it('supports explicit parent ids, independent grouping, and immutable sort contexts', () => {
    const source = Object.freeze([
      Object.freeze({ id: 'root', parent: null as string | null, value: 0 }),
      Object.freeze({ id: 'alpha', parent: 'root', value: 2 }),
      Object.freeze({ id: 'beta', parent: 'root', value: 8 }),
      Object.freeze({ id: 'alpha-leaf', parent: 'alpha', value: 3 }),
    ])
    const before = JSON.stringify(source)
    const contexts: SunburstNode<(typeof source)[number]>[] = []
    const sort: SunburstNodeComparator<(typeof source)[number]> = (
      left,
      right,
    ) => {
      contexts.push(left, right)
      return right.value - left.value
    }
    const scene = render(
      sunburst(source, {
        id: 'explicit',
        nodeId: 'id',
        parentId: 'parent',
        value: 'value',
        sort,
        z: (node) => (node.internal ? 'internal' : 'leaf'),
        color: 'branchId',
      }),
    )

    expect(scene.points.map((point) => point.datum.id)).toEqual([
      'beta',
      'alpha',
      'alpha-leaf',
    ])
    expect(scene.points[0]?.datum.value).toBe(8)
    expect(scene.points[1]?.datum.value).toBe(5)
    expect(scene.points[0]?.group).toBe('leaf')
    expect(scene.points[1]?.group).toBe('internal')
    expect(scene.points[2]?.group).toBe('leaf')
    expect(scene.points[1]?.color).toBe(scene.points[2]?.color)
    expect(contexts.length).toBeGreaterThan(0)
    expect(
      contexts.some((context) => context.id === 'alpha' && context.value === 5),
    ).toBe(true)
    expect(
      contexts.some((context) => context.id === 'beta' && context.value === 8),
    ).toBe(true)
    for (const context of contexts) {
      expect(Object.isFrozen(context)).toBe(true)
      expect(Object.isFrozen(context.ancestorIds)).toBe(true)
      expect(Object.isFrozen(context.source)).toBe(true)
      expect(Object.isFrozen(context.sourceIndexes)).toBe(true)
    }
    expect(JSON.stringify(source)).toBe(before)
  })

  it('focuses a stable hierarchy root and limits visible descendant rings', () => {
    const source = [
      { id: 'root', parent: null as string | null, value: 0 },
      { id: 'alpha', parent: 'root', value: 0 },
      { id: 'beta', parent: 'root', value: 7 },
      { id: 'branch', parent: 'alpha', value: 0 },
      { id: 'sibling', parent: 'alpha', value: 3 },
      { id: 'leaf', parent: 'branch', value: 5 },
    ]
    const scene = render(
      sunburst(source, {
        id: 'focused',
        nodeId: 'id',
        parentId: 'parent',
        value: 'value',
        rootId: 'alpha',
        visibleDepth: 1,
      }),
    )
    const byId = new Map(scene.points.map((point) => [point.datum.id, point]))

    expect([...byId.keys()]).toEqual(['branch', 'sibling'])
    expect(byId.get('branch')?.datum).toMatchObject({
      parentId: 'alpha',
      ancestorIds: ['alpha'],
      branchId: 'branch',
      depth: 1,
      height: 1,
      internal: true,
      external: false,
      value: 5,
    })
    expect(byId.get('sibling')?.datum.value).toBe(3)
    expect(scene.points.map((point) => point.key)).toEqual([
      'focused:node:string:6:branch',
      'focused:node:string:7:sibling',
    ])
    expect(areaNodes(scene.nodes).map(radialExtent)).toEqual([
      { minimum: 0, maximum: 80 },
      { minimum: 0, maximum: 80 },
    ])
  })

  it('keeps retained node keys stable while changing the active root', () => {
    const source = [
      { id: 'root', parent: null as string | null, value: 0 },
      { id: 'alpha', parent: 'root', value: 0 },
      { id: 'branch', parent: 'alpha', value: 0 },
      { id: 'leaf', parent: 'branch', value: 5 },
    ]
    const mark = (rootId: string) =>
      sunburst(source, {
        id: 'drill',
        nodeId: 'id',
        parentId: 'parent',
        value: 'value',
        rootId,
        visibleDepth: 2,
      })
    const overview = render(mark('root'))
    const focused = render(mark('alpha'))
    const overviewBranch = overview.points.find(
      (point) => point.datum.id === 'branch',
    )
    const focusedBranch = focused.points.find(
      (point) => point.datum.id === 'branch',
    )

    expect(overview.points.map((point) => point.datum.id)).toEqual([
      'alpha',
      'branch',
    ])
    expect(focused.points.map((point) => point.datum.id)).toEqual([
      'branch',
      'leaf',
    ])
    expect(focusedBranch?.key).toBe(overviewBranch?.key)
    expect(focusedBranch?.datum.depth).toBe(1)
    expect(overviewBranch?.datum.depth).toBe(2)
    expect(focusedBranch?.yValue).toBeLessThan(overviewBranch?.yValue ?? 0)
  })

  it('preserves slash-containing explicit ids as opaque names', () => {
    const scene = render(
      sunburst(
        [
          { id: 'root', parent: null as string | null, value: 0 },
          { id: 'org/team', parent: 'root', value: 1 },
        ],
        {
          nodeId: 'id',
          parentId: 'parent',
          value: 'value',
        },
      ),
    )

    expect(scene.points[0]?.datum).toMatchObject({
      id: 'org/team',
      name: 'org/team',
      branchId: 'org/team',
    })
  })

  it('resolves responsive radii and subtracts fixed gaps from the usable span', () => {
    const mark = sunburst(pathRows, {
      id: 'responsive',
      path: 'path',
      delimiter: '.',
      value: 'value',
      innerRadius: ({ radius }) => radius * 0.2,
      outerRadius: ({ radius }) => radius * 0.9,
      ringPadding: 4,
    })
    const wide = render(mark, { width: 200, height: 160 })
    const compact = render(mark, { width: 80, height: 80 })
    const wideAreas = areaNodes(wide.nodes)
    const compactAreas = areaNodes(compact.nodes)

    // radius=80: [16, 72] leaves 52px after one 4px gap, or 26px/ring.
    expect(radialExtent(wideAreas[0]!)).toEqual({ minimum: 16, maximum: 42 })
    expect(radialExtent(wideAreas[2]!)).toEqual({ minimum: 46, maximum: 72 })
    // radius=40: [8, 36] leaves 24px after the same 4px gap.
    expect(radialExtent(compactAreas[0]!)).toEqual({ minimum: 8, maximum: 20 })
    expect(radialExtent(compactAreas[2]!)).toEqual({ minimum: 24, maximum: 36 })
    expect(
      radialExtent(wideAreas[2]!).minimum - radialExtent(wideAreas[0]!).maximum,
    ).toBe(4)
    expect(
      radialExtent(compactAreas[2]!).minimum -
        radialExtent(compactAreas[0]!).maximum,
    ).toBe(4)
  })

  it('matches D3 arc paths and places interaction points at sector centroids', () => {
    const scene = render(
      sunburst(pathRows, {
        id: 'oracle',
        path: 'path',
        delimiter: '.',
        value: 'value',
        innerRadius: 16,
        outerRadius: 72,
        ringPadding: 4,
      }),
    )
    const areas = areaNodes(scene.nodes)
    const expected = arc()({
      startAngle: 0,
      endAngle: Math.PI * 0.8,
      innerRadius: 16,
      outerRadius: 42,
    })
    const [x, y] = pointRadial(Math.PI * 0.4, 29)

    expect(areas[0]?.path).toBe(expected)
    expect(areas[0]?.interaction?.point).toBe(scene.points[0])
    expect(areas[0]?.interaction?.affinity).toBe('geometry')
    expect(scene.points[0]).toMatchObject({
      xValue: Math.PI * 0.4,
      yValue: 29,
      x: 100 + x,
      y: 80 + y,
    })
  })

  it('maps partial reversed polar sweeps without reordering sectors', () => {
    const startAngle = Math.PI
    const endAngle = -Math.PI / 2
    const scene = render(
      sunburst(pathRows, {
        id: 'reversed',
        path: 'path',
        delimiter: '.',
        value: 'value',
        innerRadius: 20,
        outerRadius: 60,
      }),
      { startAngle, endAngle },
    )
    const expectedAlphaEnd = startAngle + (endAngle - startAngle) * 0.4
    const expected = arc()({
      startAngle,
      endAngle: expectedAlphaEnd,
      innerRadius: 20,
      outerRadius: 40,
    })

    expect(areaNodes(scene.nodes)[0]?.path).toBe(expected)
    expect(scene.points[0]?.datum.id).toBe('/root/alpha')
    expect(scene.points[0]?.xValue).toBe((startAngle + expectedAlphaEnd) / 2)
  })

  it('uses the paint-derived annular boundary for focus containment', () => {
    const datum = { id: 'child', parent: 'root' as string | null, value: 1 }
    const scene = render(
      sunburst(
        [{ id: 'root', parent: null as string | null, value: 0 }, datum],
        {
          id: 'focus',
          nodeId: 'id',
          parentId: 'parent',
          value: 'value',
          innerRadius: 20,
          outerRadius: 60,
        },
      ),
      { width: 200, height: 200 },
    )

    expect(nearestScenePoint(scene, 100, 100, 0)).toBeNull()
    expect(nearestScenePoint(scene, 140, 100, 0)?.datum.data).toBe(datum)
    expect(nearestScenePoint(scene, 161, 100, 0)).toBeNull()
  })

  it('omits zero-area nodes before invoking visual callbacks', () => {
    const fill = vi.fn(() => '#2563eb')
    const scene = render(
      sunburst(
        [
          { id: 'root', parent: null as string | null, value: null },
          { id: 'zero', parent: 'root', value: null },
          { id: 'visible', parent: 'root', value: 2 },
        ],
        {
          nodeId: 'id',
          parentId: 'parent',
          value: 'value',
          fill,
        },
      ),
    )

    expect(scene.points.map((point) => point.datum.id)).toEqual(['visible'])
    expect(fill).toHaveBeenCalledTimes(1)
  })

  it('excludes zero-area branches from color inference', () => {
    const source = [
      { id: 'root', parent: null as string | null, value: 0 },
      { id: 'zero', parent: 'root', value: 0 },
      { id: 'alpha', parent: 'root', value: 1 },
      { id: 'beta', parent: 'root', value: 1 },
    ]
    const mark = (rows: typeof source) =>
      sunburst(rows, {
        nodeId: 'id',
        parentId: 'parent',
        value: 'value',
        color: 'branchId',
      })
    const withZero = render(mark(source))
    const withoutZero = render(mark(source.filter(({ id }) => id !== 'zero')))
    const colors = (scene: typeof withZero) =>
      new Map(
        scene.points.map((point) => [point.datum.id, point.color] as const),
      )

    expect(withZero.points.map((point) => point.datum.id)).toEqual([
      'alpha',
      'beta',
    ])
    expect(colors(withZero)).toEqual(colors(withoutZero))
  })

  it('rejects invalid values, sorting, roots, depth, padding, and responsive radii', () => {
    for (const value of [-1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() =>
        sunburst(
          [
            { id: 'root', parent: null as string | null, value: 0 },
            { id: 'child', parent: 'root', value },
          ],
          { nodeId: 'id', parentId: 'parent', value: 'value' },
        ),
      ).toThrow('sunburst: value at index 1 must be nonnegative and finite')
    }

    expect(() =>
      sunburst(
        [
          { id: 'root', parent: null as string | null, value: 0 },
          { id: 'a', parent: 'root', value: Number.MAX_VALUE },
          { id: 'b', parent: 'root', value: Number.MAX_VALUE },
        ],
        { nodeId: 'id', parentId: 'parent', value: 'value' },
      ),
    ).toThrow(
      'sunburst: aggregate value for node "root" must be nonnegative and finite',
    )

    expect(() =>
      sunburst(pathRows, {
        path: 'path',
        delimiter: '.',
        value: 'value',
        ringPadding: -1,
      }),
    ).toThrow('sunburst: ringPadding must be nonnegative and finite')

    expect(() =>
      sunburst(pathRows, {
        path: 'path',
        delimiter: '.',
        value: 'value',
        sort: () => Number.NaN,
      }),
    ).toThrow('sunburst: sort result must be finite')

    expect(() =>
      sunburst(pathRows, {
        path: 'path',
        delimiter: '.',
        value: 'value',
        rootId: '',
      }),
    ).toThrow('sunburst: rootId must be a nonempty string')

    expect(() =>
      sunburst(pathRows, {
        path: 'path',
        delimiter: '.',
        value: 'value',
        rootId: '/root/missing',
      }),
    ).toThrow('sunburst: rootId "/root/missing" does not exist')

    for (const visibleDepth of [0, -1, 1.5, Number.NaN]) {
      expect(() =>
        sunburst(pathRows, {
          path: 'path',
          delimiter: '.',
          value: 'value',
          visibleDepth,
        }),
      ).toThrow('sunburst: visibleDepth must be a positive integer')
    }

    expect(() =>
      render(
        sunburst(pathRows, {
          path: 'path',
          delimiter: '.',
          value: 'value',
          innerRadius: () => Number.NaN,
        }),
      ),
    ).toThrow('sunburst: innerRadius must be nonnegative and finite')

    expect(() =>
      render(
        sunburst(pathRows, {
          path: 'path',
          delimiter: '.',
          value: 'value',
          outerRadius: -1,
        }),
      ),
    ).toThrow('sunburst: outerRadius must be nonnegative and finite')

    expect(() =>
      sunburst(
        [
          { id: 'root', parent: null as string | null, value: 0 },
          { id: 'child', parent: 'root', value: 1 },
          { id: 'child', parent: 'root', value: 2 },
        ],
        { nodeId: 'id', parentId: 'parent', value: 'value' },
      ),
    ).toThrow('sunburst: duplicate id "child"')
  })

  it('exposes the exact public option contracts', () => {
    expectTypeOf<SunburstPathOptions<PathRow>>().toMatchTypeOf<
      SunburstOptions<PathRow>
    >()
    expectTypeOf<
      SunburstParentOptions<{
        id: string
        parent: string | null
        value: number
      }>
    >().toMatchTypeOf<
      SunburstOptions<{
        id: string
        parent: string | null
        value: number
      }>
    >()
  })
})

function areaNodes(nodes: readonly SceneNode[]): SceneArea[] {
  return flatten(nodes).filter(
    (node): node is SceneArea => node.kind === 'area',
  )
}

function radialExtent(area: SceneArea) {
  const distances = area.points.map(([x, y]) => Math.hypot(x, y))
  return {
    minimum: round(Math.min(...distances)),
    maximum: round(Math.max(...distances)),
  }
}

function round(value: number) {
  return Math.round(value * 1e9) / 1e9
}

function flatten(nodes: readonly SceneNode[]): SceneNode[] {
  return nodes.flatMap((node) =>
    node.kind === 'group' ? [node, ...flatten(node.children)] : [node],
  )
}
