import { scaleOrdinal } from 'd3-scale'
import { describe, expect, expectTypeOf, it } from 'vitest'
import { colorLegend } from './legend'
import { motion } from './motion'
import { createChartScene, defineChart } from './scene'
import { findNearestPoint } from './scene'
import { renderChartSvg } from './svg'
import { svgChartRenderer } from './svg-surface'
import { waffleX, waffleY } from './waffle'
import type { ChartScene, SceneNode, SceneRect } from './types'

describe('waffle marks', () => {
  it('rounds cumulative boundaries and preserves source-level identity', () => {
    const rows = [
      { id: 'a', value: 0.126, series: 'A' },
      { id: 'b', value: 0.084, series: 'B' },
      { id: 'c', value: 0.79, series: 'C' },
    ]
    const before = rows.map((row) => ({ ...row }))
    const scene = createChartScene(
      defineChart({
        marks: [
          waffleY(rows, {
            y: 'value',
            color: 'series',
            key: 'id',
            unit: 0.01,
            round: true,
            columns: 10,
            gap: 2,
            radius: 2,
          }),
        ],
        guides: false,
        focusRing: false,
        color: {
          scale: scaleOrdinal<string, string>().range([
            '#2563eb',
            '#10b981',
            '#f97316',
          ]),
        },
      }),
      { width: 240, height: 240 },
    )
    const rects = sceneRects(scene)

    expectTypeOf(scene.points[0]!.xValue).toEqualTypeOf<string | number>()
    expectTypeOf(scene.points[0]!.yValue).toEqualTypeOf<number>()
    expect(rects).toHaveLength(100)
    expect(
      rects.filter((rect) => rect.key.includes(':string:1:A:')),
    ).toHaveLength(13)
    expect(
      rects.filter((rect) => rect.key.includes(':string:1:B:')),
    ).toHaveLength(8)
    expect(
      rects.filter((rect) => rect.key.includes(':string:1:C:')),
    ).toHaveLength(79)
    expect(scene.points).toHaveLength(3)
    expect(scene.points.map((point) => point.datum)).toEqual(rows)
    expect(scene.points.map((point) => point.datumIndex)).toEqual([0, 1, 2])
    expect(scene.points[0]?.y1Value).toBe(0)
    expect(scene.points[1]?.y1Value).toBeCloseTo(0.126)
    expect(scene.points[2]?.y1Value).toBeCloseTo(0.21)
    expect(scene.points[0]?.y2Value).toBeCloseTo(0.126)
    expect(scene.points[1]?.y2Value).toBeCloseTo(0.21)
    expect(scene.points[2]?.y2Value).toBe(1)
    expect(rects.every((rect) => rect.radius === 2)).toBe(true)
    const svg = renderChartSvg(scene, { ariaLabel: 'Rounded waffle' })
    expect(svg).toContain('class="ts-chart__waffle ts-chart__waffle-y"')
    expect(svg.match(/:unit:/g)).toHaveLength(100)
    expect(rows).toEqual(before)
  })

  it('shares fractional cells without inserting a category boundary gap', () => {
    const rows = [
      { id: 'a', value: 0.4 },
      { id: 'b', value: 0.6 },
    ]
    const scene = createChartScene(
      defineChart({
        marks: [
          waffleY(rows, {
            y: 'value',
            color: 'id',
            key: 'id',
            unit: 1,
            columns: 1,
            gap: 2,
            radius: 8,
          }),
        ],
        guides: false,
        focusRing: false,
      }),
      { width: 100, height: 100 },
    )
    const [bottom, top] = sceneRects(scene)

    expect(scene.points).toHaveLength(2)
    expect(bottom).toMatchObject({ x: 1, y: 59.8, width: 98, height: 39.2 })
    expect(top).toMatchObject({ x: 1, y: 1, width: 98, height: 58.8 })
    expect(top!.y + top!.height).toBeCloseTo(bottom!.y)
    expect(bottom?.radius).toBeUndefined()
    expect(top?.radius).toBeUndefined()
    expect(findNearestPoint(scene, 50, 80)?.datum).toBe(rows[0])
    expect(findNearestPoint(scene, 50, 20)?.datum).toBe(rows[1])
  })

  it('re-packs square cells from final bounds after legend layout', () => {
    const rows = Array.from({ length: 24 }, (_, index) => ({
      id: `row-${index}`,
      value: 1,
      series: `Series ${index % 3}`,
    }))
    const definition = defineChart({
      marks: [
        waffleY(rows, {
          y: 'value',
          color: 'series',
          key: 'id',
          gap: 2,
        }),
      ],
      guides: false,
      focusRing: false,
      color: {
        domain: ['Series 0', 'Series 1', 'Series 2'],
        range: ['#2563eb', '#10b981', '#f97316'],
        legend: colorLegend({ label: 'Series' }),
      },
    })
    const narrow = createChartScene(definition, { width: 240, height: 260 })
    const wide = createChartScene(definition, { width: 720, height: 260 })
    const narrowRects = sceneRects(narrow)
    const wideRects = sceneRects(wide)

    expect(narrow.margin.top).toBeGreaterThan(0)
    expect(wide.margin.top).toBeGreaterThan(0)
    expect(new Set(wideRects.map((rect) => rect.x)).size).toBeGreaterThan(
      new Set(narrowRects.map((rect) => rect.x)).size,
    )
    expect(wideRects.map((rect) => rect.key)).toEqual(
      narrowRects.map((rect) => rect.key),
    )
    for (const [scene, rects] of [
      [narrow, narrowRects],
      [wide, wideRects],
    ] as const) {
      expect(rects.every((rect) => rect.width === rect.height)).toBe(true)
      expect(rects.every((rect) => contains(scene, rect))).toBe(true)
    }
  })

  it('transposes value semantics and fixed packing for waffleX', () => {
    const rows = [
      { id: 'a', value: 2 },
      { id: 'b', value: 2 },
    ]
    const scene = createChartScene(
      defineChart({
        marks: [
          waffleX(rows, {
            x: 'value',
            key: 'id',
            unit: 1,
            rows: 2,
            gap: 0,
          }),
        ],
        guides: false,
        focusRing: false,
      }),
      { width: 200, height: 200 },
    )
    const rects = sceneRects(scene)

    expectTypeOf(scene.points[0]!.xValue).toEqualTypeOf<number>()
    expectTypeOf(scene.points[0]!.yValue).toEqualTypeOf<string | number>()
    expect(rects).toHaveLength(4)
    expect(new Set(rects.map((rect) => rect.x))).toEqual(new Set([0, 100]))
    expect(new Set(rects.map((rect) => rect.y))).toEqual(new Set([0, 100]))
    expect(scene.points.map((point) => point.xValue)).toEqual([2, 2])
    expect(scene.points.map((point) => point.x1Value)).toEqual([0, 2])
    expect(scene.points.map((point) => point.x2Value)).toEqual([2, 4])
  })

  it('keeps zero-cell colors in the legend domain and states every source tile', () => {
    const rows = [
      { id: 'tiny', value: 0.004, series: 'Tiny' },
      { id: 'rest', value: 0.996, series: 'Rest' },
    ]
    const scene = createChartScene(
      defineChart({
        marks: [
          waffleY(rows, {
            y: 'value',
            color: 'series',
            key: 'id',
            unit: 0.01,
            round: true,
            columns: 10,
            states: [
              {
                when: { focus: 'primary' },
                style: { opacity: 0.2 },
              },
            ],
          }),
        ],
        guides: false,
        focusRing: false,
      }),
      { width: 200, height: 200 },
    )

    expect(scene.colors.domain).toEqual(['Tiny', 'Rest'])
    expect(scene.points).toHaveLength(1)
    expect(scene.points[0]?.datum).toBe(rows[1])

    const container = document.createElement('div')
    const surface = svgChartRenderer.mount(container, () => {})
    surface.render(scene, { ariaLabel: 'Stateful waffle' })
    const point = scene.points[0]!
    surface.paintFocus({
      primary: point,
      group: [point],
      source: 'pointer',
      pinned: false,
    })
    const tiles = [
      ...container.querySelectorAll<SVGRectElement>('.ts-chart__waffle > rect'),
    ]
    expect(tiles).toHaveLength(100)
    expect(tiles.every((tile) => tile.getAttribute('opacity') === '0.2')).toBe(
      true,
    )
    surface.destroy()
  })

  it('gives every tile motion callback its source point and datum', () => {
    const rows = [
      { id: 'a', value: 2 },
      { id: 'b', value: 2 },
    ]
    const contexts: { key: string; datum: unknown; point: unknown }[] = []
    const definition = defineChart({
      marks: [
        waffleY(rows, {
          y: 'value',
          key: 'id',
          columns: 2,
          gap: 0,
          motion(context) {
            contexts.push(context)
            return { transition: { type: 'tween', duration: 0 } }
          },
        }),
      ],
      guides: false,
      focusRing: false,
    })
    const first = createChartScene(definition, { width: 100, height: 100 })
    const next = createChartScene(definition, { width: 200, height: 100 })
    const container = document.createElement('div')
    const surface = motion({ initial: false, resize: true }).mount(
      container,
      () => {},
    )

    surface.render(first, { ariaLabel: 'Waffle motion' })
    surface.render(next, { ariaLabel: 'Waffle motion' })

    const tiles = contexts.filter((context) => context.key.includes(':unit:'))
    expect(tiles).toHaveLength(4)
    expect(
      tiles.every((context) => rows.includes(context.datum as never)),
    ).toBe(true)
    expect(tiles.every((context) => context.point !== undefined)).toBe(true)
    surface.destroy()
  })

  it('keeps source-keyed tile identities across source reordering', () => {
    const rows = [
      { id: 'a', value: 2 },
      { id: 'b', value: 2 },
      { id: 'c', value: 2 },
    ]
    const render = (data: typeof rows) =>
      createChartScene(
        defineChart({
          marks: [
            waffleY(data, {
              y: 'value',
              key: 'id',
              columns: 3,
              gap: 0,
            }),
          ],
          guides: false,
          focusRing: false,
        }),
        { width: 180, height: 120 },
      )
    const initial = render(rows)
    const reordered = render([rows[2]!, rows[0]!, rows[1]!])

    expect(
      sceneRects(reordered)
        .map((rect) => rect.key)
        .sort(),
    ).toEqual(
      sceneRects(initial)
        .map((rect) => rect.key)
        .sort(),
    )
    expect(reordered.points.map((point) => point.datum.id)).toEqual([
      'c',
      'a',
      'b',
    ])
  })

  it('omits nullish and nonfinite channel values', () => {
    const rows = [
      { id: 'missing', value: null },
      { id: 'nan', value: Number.NaN },
      { id: 'valid', value: 1 },
    ]
    const scene = createChartScene(
      defineChart({
        marks: [waffleY(rows, { y: 'value', key: 'id' })],
        guides: false,
        focusRing: false,
      }),
      { width: 100, height: 100 },
    )

    expect(scene.points).toHaveLength(1)
    expect(scene.points[0]?.datum).toBe(rows[2])
    expect(sceneRects(scene)).toHaveLength(1)
  })

  it('rejects invalid units, gaps, packing counts, and values', () => {
    const rows = [{ value: 1 }]

    expect(() => waffleY(rows, { y: 'value', unit: 0 })).toThrow(
      'waffle: unit must be a positive finite number',
    )
    expect(() => waffleY(rows, { y: 'value', gap: -1 })).toThrow(
      'waffle: gap must be a nonnegative finite number',
    )
    expect(() => waffleY(rows, { y: 'value', columns: 1.5 })).toThrow(
      'waffleY: columns must be a positive integer',
    )
    expect(() => waffleX(rows, { x: 'value', rows: 0 })).toThrow(
      'waffleX: rows must be a positive integer',
    )
    expect(() =>
      createChartScene(
        defineChart({
          marks: [waffleY([{ value: -1 }], { y: 'value' })],
          guides: false,
        }),
        { width: 100, height: 100 },
      ),
    ).toThrow('waffle: values must be nonnegative finite numbers')
    expect(() =>
      createChartScene(
        defineChart({
          marks: [waffleY(rows, { y: 'value', unit: Number.MIN_VALUE })],
          guides: false,
        }),
        { width: 100, height: 100 },
      ),
    ).toThrow(
      'waffle: cumulative unit coordinates must remain finite safe numbers',
    )
  })
})

function sceneRects(scene: ChartScene): SceneRect[] {
  const output: SceneRect[] = []
  const visit = (nodes: readonly SceneNode[]) => {
    for (const node of nodes) {
      if (node.kind === 'group') visit(node.children)
      else if (node.kind === 'rect' && node.key.includes(':unit:')) {
        output.push(node)
      }
    }
  }
  visit(scene.nodes)
  return output
}

function contains(scene: ChartScene, rect: SceneRect): boolean {
  return (
    rect.x >= scene.chart.x - 1e-9 &&
    rect.y >= scene.chart.y - 1e-9 &&
    rect.x + rect.width <= scene.chart.x + scene.chart.width + 1e-9 &&
    rect.y + rect.height <= scene.chart.y + scene.chart.height + 1e-9
  )
}
