import { scaleBand, scaleLinear, scaleUtc } from 'd3-scale'
import { curveMonotoneY } from 'd3-shape'
import { describe, expect, expectTypeOf, it } from 'vitest'
import { d3Curve } from './d3-shape'
import { lineX, lineY } from './line'
import { createChartScene, defineChart } from './scene'
import { renderChartSvg } from './svg'
import type {
  ChartDefinition,
  ChartMark,
  SceneNode,
  ScenePolyline,
} from './types'

interface Row {
  id: string
  series: string
  category: string
  value: number
  at: Date
  enabled: boolean
}

const rows: readonly Row[] = [
  {
    id: 'a:1',
    series: 'A',
    category: 'Beta',
    value: 4,
    at: new Date('2026-01-01T00:00:00Z'),
    enabled: true,
  },
  {
    id: 'a:2',
    series: 'A',
    category: 'Alpha',
    value: 9,
    at: new Date('2026-01-02T00:00:00Z'),
    enabled: true,
  },
]

describe('lineX mark', () => {
  it('transposes the implicit value and index channels from lineY', () => {
    const values = [4, 9, 7]
    const xScene = createChartScene(
      defineChart({
        marks: [lineX(values)],
        x: { scale: scaleLinear },
        y: { scale: scaleLinear },
      }),
      { width: 480, height: 260 },
    )
    const yScene = createChartScene(
      defineChart({
        marks: [lineY(values)],
        x: { scale: scaleLinear },
        y: { scale: scaleLinear },
      }),
      { width: 480, height: 260 },
    )

    expect(
      xScene.points.map(({ xValue, yValue }) => ({ xValue, yValue })),
    ).toEqual([
      { xValue: 4, yValue: 0 },
      { xValue: 9, yValue: 1 },
      { xValue: 7, yValue: 2 },
    ])
    expect(
      yScene.points.map(({ xValue, yValue }) => ({ xValue, yValue })),
    ).toEqual([
      { xValue: 0, yValue: 4 },
      { xValue: 1, yValue: 9 },
      { xValue: 2, yValue: 7 },
    ])
    expect(xScene.scales.x.domain).toEqual([4, 9])
    expect(xScene.scales.y.domain).toEqual([0, 2])
    expect(yScene.scales.x.domain).toEqual([0, 2])
    expect(yScene.scales.y.domain).toEqual([4, 9])
  })

  it('infers the numeric x domain and first-seen categorical y domain', () => {
    const definition = defineChart({
      marks: [
        lineX(rows, {
          x: 'value',
          y: 'category',
          key: 'id',
        }),
      ],
      x: { scale: scaleLinear },
      y: { scale: scaleBand<string> },
    })
    const scene = createChartScene(definition, { width: 480, height: 260 })

    expectTypeOf(definition).toMatchTypeOf<ChartDefinition<Row>>()
    expect(scene.scales.x.domain).toEqual([4, 9])
    expect(scene.scales.y.domain).toEqual(['Beta', 'Alpha'])
    expect(scene.points.map((point) => point.xValue)).toEqual([4, 9])
    expect(scene.points.map((point) => point.yValue)).toEqual(['Beta', 'Alpha'])
  })

  it('retains source identity, grouping, and longitudinal focus affinity', () => {
    let iterations = 0
    const interleaved = [
      { id: 'a:1', series: 'A', position: 1, value: 2 },
      { id: 'b:1', series: 'B', position: 1, value: 5 },
      { id: 'a:2', series: 'A', position: 2, value: 4 },
      { id: 'b:2', series: 'B', position: 2, value: 7 },
    ]
    const source: Iterable<(typeof interleaved)[number]> = {
      *[Symbol.iterator]() {
        iterations += 1
        yield* interleaved
      },
    }
    const mark = lineX(source, {
      id: 'horizontal',
      x: 'value',
      y: 'position',
      z: 'series',
      key: 'id',
      points: true,
    })
    const definition = defineChart({
      marks: [mark],
      x: { scale: scaleLinear().domain([0, 8]) },
      y: { scale: scaleLinear().domain([0, 3]) },
    })
    const first = createChartScene(definition, { width: 480, height: 260 })
    const second = createChartScene(definition, { width: 600, height: 300 })
    const lines = flatten(first.nodes).filter(
      (node): node is ScenePolyline => node.kind === 'polyline',
    )

    expect(iterations).toBe(1)
    expect(first.points.map((point) => point.datum)).toEqual([
      interleaved[0],
      interleaved[2],
      interleaved[1],
      interleaved[3],
    ])
    expect(
      first.points.every((point) => interleaved.includes(point.datum)),
    ).toBe(true)
    expect(second.points.map((point) => point.datum)).toEqual(
      first.points.map((point) => point.datum),
    )
    expect(lines).toHaveLength(2)
    expect(lines.every((line) => line.interaction?.affinity === 'y')).toBe(true)
    expect(
      lines.map((line) =>
        line.interaction && 'points' in line.interaction
          ? line.interaction.points?.map((point) => point.datum)
          : undefined,
      ),
    ).toEqual([
      [interleaved[0], interleaved[2]],
      [interleaved[1], interleaved[3]],
    ])
  })

  it('splits invalid x values and emits renderer-neutral line topology', () => {
    const splitRows = [
      { id: 'a', position: 1, value: 2 },
      { id: 'gap', position: 2, value: Number.NaN },
      { id: 'b', position: 3, value: 6 },
    ]
    const scene = createChartScene(
      defineChart({
        marks: [
          lineX(splitRows, {
            x: 'value',
            y: 'position',
            key: 'id',
            curve: d3Curve(curveMonotoneY),
          }),
        ],
        x: { scale: scaleLinear().domain([0, 8]) },
        y: { scale: scaleLinear().domain([0, 4]) },
      }),
      { width: 480, height: 260 },
    )
    const lines = flatten(scene.nodes).filter(
      (node): node is ScenePolyline => node.kind === 'polyline',
    )
    const svg = renderChartSvg(scene, { ariaLabel: 'Horizontal line' })

    expect(lines).toHaveLength(2)
    expect(lines.map((line) => line.points.length)).toEqual([1, 1])
    expect(scene.points.map((point) => point.datum)).toEqual([
      splitRows[0],
      splitRows[2],
    ])
    expect(svg).toContain('<path')
    expect(svg).toContain(`data-ts-key="${lines[0]?.key}"`)
    expect(svg).toContain(`data-ts-key="${lines[1]?.key}"`)
  })

  it('supports temporal longitudinal channels with responsive domains', () => {
    const scene = createChartScene(
      defineChart({
        marks: [lineX(rows, { x: 'value', y: 'at', key: 'id' })],
        x: { scale: scaleLinear },
        y: { scale: scaleUtc },
      }),
      { width: 480, height: 260 },
    )

    expect(scene.scales.y.domain).toEqual([rows[0]?.at, rows[1]?.at])
    expect(scene.points[0]?.datum).toBe(rows[0])
    expect(scene.points[1]?.datum).toBe(rows[1])
  })
})

if (false) {
  const numeric = lineX(rows, { x: 'value', y: 'category' })
  const temporal = lineX(rows, { x: 'value', y: 'at' })

  expectTypeOf(numeric).toEqualTypeOf<ChartMark<Row, number, string>>()
  expectTypeOf(temporal).toEqualTypeOf<ChartMark<Row, number, Date>>()

  // @ts-expect-error Horizontal line values must be numeric.
  lineX(rows, { x: 'category', y: 'at' })

  // @ts-expect-error Longitudinal values must be chart values.
  lineX(rows, { x: 'value', y: 'enabled' })

  // @ts-expect-error The existing vertical line value channel stays numeric.
  lineY(rows, { x: 'at', y: 'enabled' })
}

function flatten(nodes: readonly SceneNode[]): SceneNode[] {
  return nodes.flatMap((node) =>
    node.kind === 'group' ? [node, ...flatten(node.children)] : [node],
  )
}
