import { describe, expect, expectTypeOf, it, vi } from 'vitest'
import { defineChart, createChartScene } from './scene'
import { treeLayout } from './hierarchy-tree'
import { treemap } from './hierarchy-treemap'
import type { TreemapMethod, TreemapNode } from './hierarchy-treemap'
import type {
  ChartMark,
  ChartScene,
  ChartTextMeasurer,
  SceneNode,
} from './types'

interface PathRow {
  path: string
  value: number
  family: string
}

const rows = [
  { path: 'root', value: 0, family: 'root' },
  { path: 'root.alpha', value: 0, family: 'alpha' },
  { path: 'root.alpha.a', value: 8, family: 'alpha' },
  { path: 'root.alpha.b', value: 5, family: 'alpha' },
  { path: 'root.beta', value: 0, family: 'beta' },
  { path: 'root.beta.c', value: 3, family: 'beta' },
  { path: 'root.beta.d', value: 2, family: 'beta' },
] satisfies PathRow[]

function scene(
  mark: ReturnType<typeof treemap<PathRow, 'path'>>,
  width = 240,
  height = 120,
  measureText?: ChartTextMeasurer,
  margin:
    number | { top: number; right: number; bottom: number; left: number } = 0,
) {
  return createChartScene(
    defineChart({
      marks: [mark],
      guides: false,
      focusRing: false,
      margin,
    }),
    { width, height },
    { measureText },
  ) as ChartScene<TreemapNode<PathRow>, string, number>
}

function allNodes(nodes: readonly SceneNode[]): SceneNode[] {
  return nodes.flatMap((node) =>
    node.kind === 'group' ? [node, ...allNodes(node.children)] : [node],
  )
}

describe('treemap', () => {
  it('renders path leaves in final chart bounds with exact metadata and lineage', () => {
    const source = Object.freeze(rows.map((row) => Object.freeze({ ...row })))
    const before = JSON.stringify(source)
    const value = vi.fn(({ datum }: { datum: PathRow }) => datum.value)
    const rendered = scene(
      treemap(source, {
        path: 'path',
        delimiter: '.',
        value,
        inset: 0,
      }),
      300,
      180,
      undefined,
      { top: 11, right: 13, bottom: 17, left: 19 },
    )

    expect(value).toHaveBeenCalledTimes(source.length)
    expect(rendered.points.map((point) => point.datum.name)).toEqual([
      'a',
      'b',
      'c',
      'd',
    ])
    const leaf = rendered.points[0]!.datum
    expect(leaf).toMatchObject({
      id: '/root/alpha/a',
      parentId: '/root/alpha',
      ancestorIds: ['/root', '/root/alpha'],
      name: 'a',
      data: source[2],
      depth: 2,
      height: 0,
      internal: false,
      external: true,
      value: 8,
    })
    expect(leaf.source).toEqual([source[2]])
    expect(leaf.source[0]).toBe(source[2])
    expect(leaf.sourceIndexes).toEqual([2])
    const rects = allNodes(rendered.nodes).filter(
      (node) => node.kind === 'rect',
    )
    for (const rect of rects) {
      if (rect.kind !== 'rect') continue
      expect(rect.x).toBeGreaterThanOrEqual(rendered.chart.x)
      expect(rect.y).toBeGreaterThanOrEqual(rendered.chart.y)
      expect(rect.x + rect.width).toBeLessThanOrEqual(
        rendered.chart.x + rendered.chart.width,
      )
      expect(rect.y + rect.height).toBeLessThanOrEqual(
        rendered.chart.y + rendered.chart.height,
      )
    }
    expect(
      Math.min(
        ...rects.map((rect) => (rect.kind === 'rect' ? rect.x : Infinity)),
      ),
    ).toBe(rendered.chart.x)
    expect(
      Math.max(
        ...rects.map((rect) =>
          rect.kind === 'rect' ? rect.x + rect.width : -Infinity,
        ),
      ),
    ).toBe(rendered.chart.x + rendered.chart.width)
    expect(rendered.points[0]).toMatchObject({
      xValue: '/root/alpha/a',
      yValue: 8,
    })
    expect(JSON.stringify(source)).toBe(before)
    expectTypeOf(leaf.data).toEqualTypeOf<PathRow | null>()
    expectTypeOf(leaf.source).toEqualTypeOf<readonly PathRow[]>()
  })

  it('uses responsive final-screen topology and stable keys deterministically', () => {
    const mark = treemap(rows, {
      path: 'path',
      delimiter: '.',
      value: 'value',
      inset: 0,
    })
    const wide = scene(mark, 360, 100)
    const tall = scene(mark, 100, 360)
    const repeated = scene(mark, 360, 100)
    const normalized = (rendered: typeof wide) =>
      allNodes(rendered.nodes)
        .filter((node) => node.kind === 'rect')
        .map((node) =>
          node.kind === 'rect'
            ? [
                node.x / rendered.chart.width,
                node.y / rendered.chart.height,
                node.width / rendered.chart.width,
                node.height / rendered.chart.height,
              ]
            : [],
        )

    expect(normalized(tall)).not.toEqual(normalized(wide))
    expect(normalized(repeated)).toEqual(normalized(wide))
    expect(repeated.points.map((point) => point.key)).toEqual(
      wide.points.map((point) => point.key),
    )
    expectTypeOf(mark).toMatchTypeOf<
      ChartMark<TreemapNode<PathRow>, string, number, never, never>
    >()
  })

  it('supports explicit node identity, authored order, and frozen sort contexts', () => {
    const source = [
      { key: 'root', parent: null as string | null, amount: 0 },
      { key: 'first', parent: 'root', amount: 1 },
      { key: 'second', parent: 'root', amount: 3 },
    ]
    const baseline = createChartScene(
      defineChart({
        marks: [
          treemap(source, {
            id: 'bundle',
            nodeId: 'key',
            parentId: 'parent',
            value: 'amount',
            method: 'dice',
            inset: 0,
          }),
        ],
        guides: false,
        focusRing: false,
        margin: 0,
      }),
      { width: 100, height: 50 },
    )
    const compared: string[] = []
    const sorted = createChartScene(
      defineChart({
        marks: [
          treemap(source, {
            id: 'bundle',
            nodeId: 'key',
            parentId: 'parent',
            value: 'amount',
            method: 'dice',
            inset: 0,
            sort: (left, right) => {
              expect(Object.isFrozen(left)).toBe(true)
              expect(Object.isFrozen(right)).toBe(true)
              expect(Object.isFrozen(left.source)).toBe(true)
              compared.push(`${left.id}:${right.id}`)
              return right.value - left.value
            },
          }),
        ],
        guides: false,
        focusRing: false,
        margin: 0,
      }),
      { width: 100, height: 50 },
    )

    expect(compared.length).toBeGreaterThan(0)
    expect(baseline.points.map((point) => point.datum.id)).toEqual([
      'first',
      'second',
    ])
    expect(sorted.points.map((point) => point.datum.id)).toEqual([
      'second',
      'first',
    ])
    expect(sorted.points.every((point) => point.markId === 'bundle')).toBe(true)
  })

  it('retains imputed ancestors in ancestry and comparator contexts', () => {
    const source = [
      { path: 'root.alpha.one', amount: 2 },
      { path: 'root.beta.two', amount: 1 },
    ]
    const contexts: unknown[] = []
    const rendered = createChartScene(
      defineChart({
        marks: [
          treemap(source, {
            path: 'path',
            delimiter: '.',
            value: 'amount',
            sort: (left, right) => {
              contexts.push(left, right)
              return 0
            },
          }),
        ],
        guides: false,
        focusRing: false,
        margin: 0,
      }),
      { width: 120, height: 80 },
    )
    const imputed = contexts.find(
      (candidate) => (candidate as { id?: string }).id === '/root/alpha',
    ) as
      | {
          data: unknown
          source: readonly unknown[]
          sourceIndexes: readonly number[]
        }
      | undefined

    expect(imputed).toEqual(
      expect.objectContaining({ data: null, source: [], sourceIndexes: [] }),
    )
    expect(rendered.points[0]!.datum.ancestorIds).toEqual([
      '/root',
      '/root/alpha',
    ])
    expect(rendered.points[0]!.datum.source).toEqual([source[0]])
    expect(rendered.points[0]!.datum.sourceIndexes).toEqual([0])
  })

  it('applies pixel padding, screen-space y, rounding, and every built-in method', () => {
    const source = [
      { id: 'root', parent: null as string | null, value: 0 },
      { id: 'a', parent: 'root', value: 1 },
      { id: 'b', parent: 'root', value: 1 },
    ]
    const renderMethod = (method: TreemapMethod) =>
      createChartScene(
        defineChart({
          marks: [
            treemap(source, {
              nodeId: 'id',
              parentId: 'parent',
              value: 'value',
              method,
              paddingInner: 10,
              paddingOuter: 5,
              round: true,
              inset: 0,
            }),
          ],
          guides: false,
          focusRing: false,
          margin: 0,
        }),
        { width: 100, height: 50 },
      )

    for (const method of [
      'squarify',
      'binary',
      'dice',
      'slice',
      'slice-dice',
    ] satisfies TreemapMethod[]) {
      const rendered = renderMethod(method)
      expect(rendered.points).toHaveLength(2)
      for (const node of allNodes(rendered.nodes)) {
        if (node.kind !== 'rect') continue
        expect(
          [node.x, node.y, node.width, node.height].every(Number.isInteger),
        ).toBe(true)
        expect(node.height).toBeGreaterThan(0)
      }
    }
    const dice = renderMethod('dice')
    const [a, b] = allNodes(dice.nodes).filter((node) => node.kind === 'rect')
    expect(a).toMatchObject({ x: 5, y: 5, width: 40, height: 40 })
    expect(b).toMatchObject({ x: 55, y: 5, width: 40, height: 40 })
  })

  it('omits leaves whose resolved rectangle has no positive area', () => {
    const source = [
      { id: 'root', parent: null as string | null, value: null },
      { id: 'visible', parent: 'root', value: 1 },
      { id: 'empty', parent: 'root', value: null },
    ]
    const rendered = createChartScene(
      defineChart({
        marks: [
          treemap(source, {
            nodeId: 'id',
            parentId: 'parent',
            value: 'value',
            method: 'dice',
          }),
        ],
        guides: false,
        focusRing: false,
        margin: 0,
      }),
      { width: 100, height: 50 },
    )

    expect(rendered.points.map((point) => point.datum.id)).toEqual(['visible'])
    expect(
      allNodes(rendered.nodes).filter((node) => node.kind === 'rect'),
    ).toHaveLength(1)
  })

  it('infers color, renders fitted labels, and preserves mark behavior', () => {
    const measureText = vi.fn<ChartTextMeasurer>((text, options) => {
      const width = text === 'a' ? 6 : 200
      return {
        x: -width / 2,
        y: -options.fontSize / 2,
        width,
        height: options.fontSize,
      }
    })
    const motion = {
      transition: { type: 'tween' as const, duration: 180 },
    }
    const mark = treemap(rows, {
      path: 'path',
      delimiter: '.',
      value: 'value',
      color: (node) => node.ancestorIds[1] ?? node.id,
      fill: (_node, index) => (index === 0 ? '#111111' : '#222222'),
      fillOpacity: 0.8,
      stroke: '#ffffff',
      strokeOpacity: 0.7,
      strokeWidth: 2,
      inset: 1,
      label: 'name',
      labelFill: '#f8fafc',
      labelFontSize: 9,
      labelFontWeight: 600,
      labelPadding: 3,
      states: [
        {
          when: { focus: 'primary' },
          style: { inset: 2, fillOpacity: 1 },
        },
      ],
      motion,
    })
    const rendered = scene(mark, 240, 120, measureText)
    const nodes = allNodes(rendered.nodes)
    const rects = nodes.filter((node) => node.kind === 'rect')
    const labels = nodes.filter((node) => node.kind === 'label')

    expect(new Set(rendered.colors.domain)).toEqual(
      new Set(['/root/alpha', '/root/beta']),
    )
    expect(rects).toHaveLength(4)
    expect(labels).toHaveLength(1)
    expect(labels[0]).toMatchObject({
      kind: 'label',
      text: 'a',
      anchor: 'middle',
      baseline: 'middle',
      fontSize: 9,
      fontWeight: 600,
      style: { fill: '#f8fafc' },
    })
    expect(measureText).toHaveBeenCalledWith('a', {
      fontSize: 9,
      fontWeight: 600,
      anchor: 'middle',
      baseline: 'middle',
    })
    expect(
      nodes.some(
        (node) => node.kind === 'group' && node.key.startsWith('states:'),
      ),
    ).toBe(true)
    expect(mark.motion).toBe(motion)
    expect(rects[0]).toMatchObject({
      inset: 1,
      style: {
        fill: '#111111',
        fillOpacity: 0.8,
        stroke: '#ffffff',
        strokeOpacity: 0.7,
        strokeWidth: 2,
      },
    })
  })

  it('rejects invalid values and layout options', () => {
    const base = [{ path: 'root', value: 1 }]
    expect(() => treemap(base, { path: 'path', value: () => -1 })).toThrow(
      'value at index 0 must be nonnegative and finite',
    )
    expect(() =>
      treemap(base, { path: 'path', value: () => Number.NaN }),
    ).toThrow('value at index 0 must be nonnegative and finite')
    expect(() =>
      treemap(
        [
          { path: 'root', value: null },
          { path: 'root.a', value: Number.MAX_VALUE },
          { path: 'root.b', value: Number.MAX_VALUE },
        ],
        { path: 'path', delimiter: '.', value: 'value' },
      ),
    ).toThrow('aggregate value for node "/root" must be nonnegative and finite')
    expect(() =>
      treemap([{ path: 'root', value: null }], {
        path: 'path',
        value: 'value',
      }),
    ).not.toThrow()
    expect(() =>
      treemap(base, {
        path: 'path',
        value: 'value',
        method: 'spiral' as TreemapMethod,
      }),
    ).toThrow('invalid method "spiral"')
    expect(() =>
      treemap(base, {
        path: 'path',
        value: 'value',
        method: 'binary',
        ratio: 2,
      }),
    ).toThrow('ratio is only valid with method "squarify"')
    expect(() =>
      treemap(base, { path: 'path', value: 'value', ratio: 0.5 }),
    ).toThrow('ratio must be finite and at least 1')
    expect(() =>
      treemap(base, { path: 'path', value: 'value', paddingInner: -1 }),
    ).toThrow('paddingInner must be nonnegative and finite')
    expect(() =>
      treemap(base, { path: 'path', value: 'value', paddingOuter: Infinity }),
    ).toThrow('paddingOuter must be nonnegative and finite')
    expect(() =>
      treemap(base, { path: 'path', value: 'value', labelPadding: -1 }),
    ).toThrow('labelPadding must be nonnegative and finite')
    expect(() =>
      treemap(
        [
          { id: 'root', parent: null, value: 0 },
          { id: 'a', parent: 'root', value: 1 },
          { id: 'b', parent: 'root', value: 1 },
        ],
        {
          nodeId: 'id',
          parentId: 'parent',
          value: 'value',
          sort: () => Number.NaN,
        },
      ),
    ).toThrow('sort result must be finite')
  })

  it('keeps tidy-tree output unchanged after sharing hierarchy contexts', () => {
    const source = [
      { path: 'root', value: 0 },
      { path: 'root.a', value: 1 },
      { path: 'root.b', value: 2 },
    ]
    expect(treeLayout(source, { path: 'path', delimiter: '.' })).toEqual({
      nodes: [
        expect.objectContaining({
          id: '/root',
          parentId: null,
          source: [source[0]],
          sourceIndexes: [0],
        }),
        expect.objectContaining({
          id: '/root/a',
          parentId: '/root',
          source: [source[1]],
          sourceIndexes: [1],
        }),
        expect.objectContaining({
          id: '/root/b',
          parentId: '/root',
          source: [source[2]],
          sourceIndexes: [2],
        }),
      ],
      links: [
        expect.objectContaining({ id: '/root/a', sourceIndexes: [1] }),
        expect.objectContaining({ id: '/root/b', sourceIndexes: [2] }),
      ],
    })
  })
})
