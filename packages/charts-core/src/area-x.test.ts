import { area as createAreaPath, curveBasis } from 'd3-shape'
import { describe, expect, expectTypeOf, it } from 'vitest'
import { areaX } from './area-x'
import { d3AreaXCurve } from './d3-area-x'
import { createChartScene, defineChart } from './scene'
import { linearAxes } from './test-scales'
import type { ChartDefinition, SceneArea, SceneNode } from './types'

interface Row {
  id: string
  series: string
  value: number
  x1: number
  x2: number
  enabled: boolean
}

const rows: readonly Row[] = [
  {
    id: 'a:1',
    series: 'A',
    value: 1,
    x1: 0.8,
    x2: 1.2,
    enabled: true,
  },
  {
    id: 'a:2',
    series: 'A',
    value: 2,
    x1: 0.6,
    x2: 1.4,
    enabled: true,
  },
  {
    id: 'a:3',
    series: 'A',
    value: 3,
    x1: 0.9,
    x2: 1.1,
    enabled: true,
  },
]

describe('areaX mark', () => {
  it('renders a typed horizontal interval area with native D3 topology', () => {
    const definition = defineChart({
      marks: [
        areaX(rows, {
          x1: 'x1',
          x2: 'x2',
          y: 'value',
          z: 'series',
          key: 'id',
          fillOpacity: 0.58,
          stroke: '#2563eb',
          curve: d3AreaXCurve(curveBasis),
        }),
      ],
      ...linearAxes([0, 2], [0, 4]),
    })
    const scene = createChartScene(definition, { width: 480, height: 260 })
    const area = flatten(scene.nodes).find(
      (node): node is SceneArea => node.kind === 'area',
    )
    const expectedPath = createAreaPath<Row>()
      .x0((row) => scene.scales.x.map(row.x1))
      .x1((row) => scene.scales.x.map(row.x2))
      .y((row) => scene.scales.y.map(row.value))
      .curve(curveBasis)(rows)

    expectTypeOf(definition).toMatchTypeOf<ChartDefinition<Row>>()
    expect(area).toMatchObject({
      kind: 'area',
      path: expectedPath,
      style: {
        fillOpacity: 0.58,
        stroke: '#2563eb',
      },
    })
    expect(scene.points).toHaveLength(rows.length)
    expect(scene.points[1]).toMatchObject({
      datum: rows[1],
      xValue: rows[1]?.x2,
      yValue: rows[1]?.value,
    })
  })

  it('splits invalid intervals without losing later segments', () => {
    const splitRows = [
      { id: 'a', y: 1, x1: 0.5, x2: 1.5 },
      { id: 'gap', y: 2, x1: 0.5, x2: Number.NaN },
      { id: 'b', y: 3, x1: 0.75, x2: 1.25 },
    ]
    const scene = createChartScene(
      defineChart({
        marks: [
          areaX(splitRows, {
            x1: 'x1',
            x2: 'x2',
            y: 'y',
            key: 'id',
          }),
        ],
        ...linearAxes([0, 2], [0, 4]),
      }),
      { width: 480, height: 260 },
    )
    const areas = flatten(scene.nodes).filter(
      (node): node is SceneArea => node.kind === 'area',
    )

    expect(areas).toHaveLength(2)
    expect(scene.points.map((point) => point.datum)).toEqual([
      splitRows[0],
      splitRows[2],
    ])
  })
})

if (false) {
  // @ts-expect-error Horizontal interval endpoints must be numeric.
  areaX(rows, { x1: 'series', x2: 'x2', y: 'value' })

  // @ts-expect-error Longitudinal values must be chart values.
  areaX(rows, { x1: 'x1', x2: 'x2', y: 'enabled' })
}

function flatten(nodes: readonly SceneNode[]): SceneNode[] {
  return nodes.flatMap((node) =>
    node.kind === 'group' ? [node, ...flatten(node.children)] : [node],
  )
}
