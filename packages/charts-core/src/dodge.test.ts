import { scaleBand, scaleLinear } from 'd3-scale'
import { describe, expect, expectTypeOf, it, vi } from 'vitest'
import { dodgeX, dodgeY } from './dodge'
import { dodgeOffsets } from './dodge-internal'
import { dot } from './dot'
import { facet } from './facet'
import { createChartScene, defineChart } from './scene'
import type { SceneDot, SceneNode } from './types'

describe('dot dodge layouts', () => {
  it('places variable radii largest first with stable source-order ties', () => {
    expect(dodgeOffsets([50, 50, 50, 50], [2, 6, 6, 4], 0, false)).toEqual([
      16, 0, -12, 10,
    ])
  })

  it('preserves the measured coordinate and greedily centers equal circles', () => {
    const rows = [
      { id: 'a', value: 5 },
      { id: 'b', value: 5 },
      { id: 'c', value: 5 },
    ]
    const scene = createChartScene(
      defineChart({
        marks: [
          dot(rows, {
            x: 'value',
            key: 'id',
            r: 4,
            layout: dodgeY({ anchor: 'middle', padding: 1 }),
          }),
        ],
        guides: false,
        margin: 0,
        x: { scale: scaleLinear().domain([0, 10]) },
      }),
      { width: 100, height: 100 },
    )

    expect(scene.points.map((point) => point.x)).toEqual([50, 50, 50])
    expect(scene.points.map((point) => point.y)).toEqual([50, 41, 59])
    expect(scene.points.map((point) => point.xValue)).toEqual([5, 5, 5])
    expect(scene.points.map((point) => point.yValue)).toEqual([
      'middle',
      'middle',
      'middle',
    ])
    expectTypeOf(scene.points[0]!.yValue).toEqualTypeOf<'middle'>()
  })

  it('supports every anchor and variable radii without overlap', () => {
    const rows = [
      { id: 'a', value: 5, radius: 2 },
      { id: 'b', value: 5, radius: 6 },
      { id: 'c', value: 5.15, radius: 4 },
      { id: 'd', value: 5.3, radius: 3 },
    ]

    for (const anchor of ['top', 'middle', 'bottom'] as const) {
      const scene = createChartScene(
        defineChart({
          marks: [
            dot(rows, {
              x: 'value',
              key: 'id',
              r: 'radius',
              layout: dodgeY({ anchor, padding: 2 }),
            }),
          ],
          guides: false,
          margin: 0,
          x: { scale: scaleLinear().domain([0, 10]) },
        }),
        { width: 200, height: 120 },
      )

      expectNoOverlap(sceneDots(scene.nodes), 2)
      scene.points.forEach((point) => {
        expect(point.x).toBe(scene.scales.x!.map(point.xValue))
      })
      if (anchor === 'top') {
        sceneDots(scene.nodes).forEach((node) =>
          expect(node.y).toBeGreaterThanOrEqual(node.radius + 2),
        )
      }
      if (anchor === 'bottom') {
        sceneDots(scene.nodes).forEach((node) =>
          expect(node.y).toBeLessThanOrEqual(120 - node.radius - 2),
        )
      }
    }
  })

  it('transposes the layout and accepts a categorical measured scale', () => {
    const rows = [
      { id: 'a', category: 'A' },
      { id: 'b', category: 'A' },
      { id: 'c', category: 'B' },
    ]
    const scene = createChartScene(
      defineChart({
        marks: [
          dot(rows, {
            y: 'category',
            key: 'id',
            r: 4,
            layout: dodgeX({ anchor: 'right', padding: 1 }),
          }),
        ],
        guides: false,
        margin: 0,
        y: { scale: scaleBand<string>().domain(['A', 'B']) },
      }),
      { width: 120, height: 100 },
    )

    expect(scene.points.map((point) => point.xValue)).toEqual([
      'right',
      'right',
      'right',
    ])
    expect(scene.points.map((point) => point.yValue)).toEqual(['A', 'A', 'B'])
    expect(scene.points.map((point) => point.y)).toEqual([
      scene.scales.y!.map('A'),
      scene.scales.y!.map('A'),
      scene.scales.y!.map('B'),
    ])
    sceneDots(scene.nodes).forEach((node) => {
      expect(node.x).toBeLessThanOrEqual(120 - node.radius - 1)
    })
  })

  it('retains source indexes and identity while omitting invalid rows', () => {
    const rows = [
      { id: 'a', value: 2 },
      { id: 'invalid', value: null },
      { id: 'c', value: 2 },
    ]
    const definition = defineChart({
      marks: [
        dot(rows, {
          x: 'value',
          key: 'id',
          layout: dodgeY({ anchor: 'middle' }),
        }),
      ],
      guides: false,
      margin: 0,
      x: { scale: scaleLinear().domain([0, 4]) },
    })
    const first = createChartScene(definition, { width: 160, height: 80 })
    const second = createChartScene(definition, { width: 160, height: 80 })

    expect(first.points.map((point) => point.datumIndex)).toEqual([0, 2])
    expect(first.points.map((point) => point.datum)).toEqual([rows[0], rows[2]])
    expect(first.points.map((point) => point.key)).toEqual([
      'dot-0:object:null:string:1:a',
      'dot-0:object:null:string:1:c',
    ])
    expect(second.points).toEqual(first.points)
  })

  it('runs independently inside facet cells', () => {
    const rows = [
      { id: 'a', group: 'A', value: 1 },
      { id: 'b', group: 'A', value: 1 },
      { id: 'c', group: 'B', value: 1 },
      { id: 'd', group: 'B', value: 1 },
    ]
    const scene = createChartScene(
      defineChart({
        marks: [
          facet(rows, {
            by: 'group',
            columns: 2,
            gap: 0,
            label: false,
            axes: 'cell',
            chart: (cellRows) => ({
              marks: [
                dot(cellRows, {
                  x: 'value',
                  key: 'id',
                  r: 3,
                  layout: dodgeY({ anchor: 'middle', padding: 1 }),
                }),
              ],
              guides: false,
              margin: 0,
              x: { scale: scaleLinear().domain([0, 2]) },
            }),
          }),
        ],
        guides: false,
        x: null,
        y: null,
      }),
      { width: 200, height: 100 },
    )

    expect(scene.points).toHaveLength(4)
    expect(scene.points.map((point) => point.datumIndex)).toEqual([0, 1, 0, 1])
  })

  it('retains dot state and motion ownership', () => {
    const rows = [
      { id: 'a', value: 1 },
      { id: 'b', value: 1 },
    ]
    const motion = vi.fn(() => ({ delay: 20 }))
    const mark = dot(rows, {
      x: 'value',
      key: 'id',
      layout: dodgeY({ anchor: 'middle' }),
      motion,
      states: [
        {
          when: { focus: 'primary' },
          style: { r: 8, opacity: 0.5 },
        },
      ],
    })
    const initialized = mark.initialize({ markIndex: 0 })
    const scene = createChartScene(
      defineChart({
        marks: [mark],
        guides: false,
        x: { scale: scaleLinear().domain([0, 2]) },
      }),
      { width: 120, height: 80 },
    )

    expect(mark.motion).toBe(motion)
    expect(initialized.states?.data).toBe(rows)
    expect(initialized.states?.definitions).toHaveLength(1)
    expect(
      scene.nodes.some(
        (node) =>
          node.kind === 'group' &&
          node.key === 'marks' &&
          node.children.some(
            (child) => child.kind === 'group' && child.states !== undefined,
          ),
      ),
    ).toBe(true)
  })

  it('rejects ambiguous channels and invalid layout options', () => {
    expect(() => dodgeY({ padding: -1 })).toThrow(
      'padding must be a nonnegative finite number',
    )
    expect(() => dodgeX({ anchor: 'nope' as 'left' })).toThrow('unknown anchor')
    expect(() =>
      createChartScene(
        defineChart({
          marks: [
            dot([{ x: 1, y: 1 }], {
              x: 'x',
              y: 'y',
              layout: dodgeY(),
            }),
          ],
          x: { scale: scaleLinear() },
        }),
        { width: 100, height: 100 },
      ),
    ).toThrow('y is derived by dodgeY')
  })
})

function sceneDots(nodes: readonly SceneNode[]): SceneDot[] {
  return nodes.flatMap((node) =>
    node.kind === 'group'
      ? sceneDots(node.children)
      : node.kind === 'dot' && node.interaction
        ? [node]
        : [],
  )
}

function expectNoOverlap(dots: readonly SceneDot[], padding: number): void {
  dots.forEach((dot, index) => {
    dots.slice(index + 1).forEach((other) => {
      expect(
        Math.hypot(dot.x - other.x, dot.y - other.y),
      ).toBeGreaterThanOrEqual(dot.radius + other.radius + padding - 1e-6)
    })
  })
}
